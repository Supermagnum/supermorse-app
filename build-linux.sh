#!/bin/bash

# Supermorse Linux Build Script
# This script automates the process of building or setting up the Supermorse application
# or the modified Mumble server on Linux.

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'  # No Color

# Print colored message
print_message() {
    echo -e "${BLUE}[SUPERMORSE]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please do not run this script as root or with sudo."
    exit 1
fi

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# Configuration
MUMBLE_DIR="../supermorse-mumble"  # Path to the supermorse-mumble directory
MONGODB_PORT=27017
MUMBLE_PORT=64738

# Check for required commands
check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 is required but not installed."
        exit 1
    fi
}

# Step 1: Check for required tools
print_message "Checking for required tools..."
check_command git
check_command node
check_command npm

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2)
NODE_MAJOR=$(echo $NODE_VERSION | cut -d '.' -f 1)
if [ $NODE_MAJOR -lt 14 ]; then
    print_error "Node.js v14 or later is required. Found v$NODE_VERSION"
    exit 1
fi
print_success "Node.js v$NODE_VERSION found."

# Check npm version
NPM_VERSION=$(npm -v)
NPM_MAJOR=$(echo $NPM_VERSION | cut -d '.' -f 1)
if [ $NPM_MAJOR -lt 6 ]; then
    print_error "npm v6 or later is required. Found v$NPM_VERSION"
    exit 1
fi
print_success "npm v$NPM_VERSION found."

# Step 2: Install system dependencies
print_message "Installing system dependencies..."
sudo apt update
sudo apt install -y build-essential libqt5core5a libqt5network5 libqt5sql5 libqt5sql5-sqlite \
                    libqt5xml5 libssl-dev libprotobuf-dev protobuf-compiler \
                    libboost-dev libcap-dev libxi-dev libsndfile1-dev libspeechd-dev \
                    libzeroc-ice-dev libavahi-compat-libdnssd-dev libpoco-dev \
                    python3 python3-pip

# Install Python dependencies
pip3 install requests

# Step 3: Install and set up MongoDB 8.0
print_message "Installing MongoDB 8.0..."

# Import MongoDB public GPG key
print_message "Importing MongoDB public GPG key..."
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg \
   --dearmor

# Add MongoDB repository to sources list
print_message "Adding MongoDB repository to sources list..."
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/8.0 multiverse" | \
   sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list

# Update package database
print_message "Updating package database..."
sudo apt-get update

# Install MongoDB packages
print_message "Installing MongoDB packages..."
sudo apt-get install -y mongodb-org

# Start and enable MongoDB service
print_message "Starting MongoDB service..."
sudo systemctl start mongod
sudo systemctl enable mongod

# Check if MongoDB is running
if ! systemctl is-active --quiet mongod; then
    print_error "Failed to start MongoDB. Please check the MongoDB service."
    exit 1
fi

print_success "MongoDB 8.0 is running on port $MONGODB_PORT"

# Step 4: Install Node.js dependencies or build the Electron application
print_message "Building Supermorse Electron application..."
npm install
npm run dist -- --linux

if [ ! -d "dist" ]; then
    print_error "Failed to build the Electron application."
    exit 1
fi

print_success "Electron application built successfully"

# Step 5: Ask if user wants to build the Mumble server
read -p "Do you want to build the Mumble server? (y/n): " BUILD_MUMBLE
if [[ $BUILD_MUMBLE =~ ^[Yy]$ ]]; then
    print_message "Building modified Mumble server..."

    # Create murmur-src directory if it doesn't exist
    if [ ! -d "murmur-src" ]; then
        mkdir -p murmur-src
    fi

    # Copy the modified Mumble source code
    cd murmur-src
    if [ ! -f "CMakeLists.txt" ]; then
        print_message "Copying Mumble source code..."
        cp -r $MUMBLE_DIR/* .
    else
        print_message "Mumble source code already exists, updating..."
        cp -r $MUMBLE_DIR/* .
    fi

    # Configure or build
    print_message "Configuring Mumble build..."
    qmake -recursive CONFIG+=no-client CONFIG+=no-ice

    print_message "Building Mumble server..."
    make -j$(nproc)

    # Check if build was successful
    if [ ! -f "release/murmurd" ]; then
        print_error "Failed to build the Mumble server."
        exit 1
    fi

    print_success "Mumble server built successfully"
    
    # Step 6: Set up Mumble server configuration
    print_message "Setting up Mumble server configuration..."

    # Create configuration directories
    sudo mkdir -p /etc/supermorse-mumble
    sudo mkdir -p /var/log/supermorse-mumble
    sudo mkdir -p /var/run/supermorse-mumble

    # Copy configuration file
    sudo cp "$SCRIPT_DIR/config/mumble-server.ini" /etc/supermorse-mumble/

    # Generate SSL certificates
    print_message "Generating SSL certificates..."
    sudo openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
      -keyout /etc/supermorse-mumble/key.pem \
      -out /etc/supermorse-mumble/cert.pem \
      -subj "/CN=supermorse-mumble-server"

    sudo chmod 600 /etc/supermorse-mumble/key.pem

    # Create authentication script directory
    sudo mkdir -p /usr/local/bin/supermorse

    # Copy authentication script
    cat > /tmp/mumble-auth.py << 'EOF'
#!/usr/bin/env python3

import sys
import json
import requests

def authenticate(username, password):
    try:
        # Supermorse API endpoint for authentication
        response = requests.post('http://localhost:3030/api/auth/mumble-verify', 
                                json={'username': username, 'password': password})
        
        if response.status_code == 200:
            data = response.json()
            if data.get('authenticated'):
                # Return user_id, username, groups
                return (data.get('user_id', 1), 
                        username, 
                        data.get('groups', []))
        return (-1, None, None)
    except Exception as e:
        print(f"Authentication error: {e}", file=sys.stderr)
        return (-2, None, None)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: mumble-auth.py <username> <password>")
        sys.exit(1)
    
    username = sys.argv[1]
    password = sys.argv[2]
    
    user_id, name, groups = authenticate(username, password)
    
    if user_id > 0:
        print(f"{user_id}:{name}:{','.join(groups)}")
        sys.exit(0)
    else:
        sys.exit(user_id)
EOF

    sudo cp /tmp/mumble-auth.py /usr/local/bin/supermorse/
    sudo chmod +x /usr/local/bin/supermorse/mumble-auth.py

    # Create systemd service file
    cat > /tmp/supermorse-mumble.service << EOF
[Unit]
Description=Supermorse Mumble Server
After=network.target

[Service]
Type=simple
User=nobody
ExecStart=/usr/local/bin/murmur -ini /etc/supermorse-mumble/mumble-server.ini
Restart=on-failure
LimitNOFILE=65535
TimeoutStopSec=10

[Install]
WantedBy=multi-user.target
EOF

    sudo cp /tmp/supermorse-mumble.service /etc/systemd/system/

    # Create symbolic link to the Mumble server binary
    sudo ln -sf "$SCRIPT_DIR/murmur-src/release/murmurd" /usr/local/bin/murmur

    # Reload systemd
    sudo systemctl daemon-reload

    print_success "Mumble server configuration completed"

    # Step 7: Configure firewall
    print_message "Configuring firewall..."
    if command -v ufw &> /dev/null; then
        sudo ufw allow $MUMBLE_PORT/tcp
        sudo ufw allow $MUMBLE_PORT/udp
        print_success "Firewall configured"
    else
        print_warning "UFW not found. Please manually configure your firewall to allow port $MUMBLE_PORT (TCP/UDP)."
    fi

    # Step 8: Create SuperUser account for Mumble server
    print_message "Creating SuperUser account for Mumble server..."
    read -p "Enter SuperUser password: " SUPERUSER_PASSWORD
    sudo /usr/local/bin/murmur -ini /etc/supermorse-mumble/mumble-server.ini -supw $SUPERUSER_PASSWORD

    # Step 9: Start services
    print_message "Starting services..."
    sudo systemctl start supermorse-mumble
    sudo systemctl enable supermorse-mumble

    # Check if Mumble server is running
    if ! systemctl is-active --quiet supermorse-mumble; then
        print_error "Failed to start Mumble server. Please check the logs with: sudo journalctl -u supermorse-mumble"
    else
        print_success "Mumble server is running on port $MUMBLE_PORT"
    fi
else
    print_message "Skipping Mumble server build."
fi


# Step 10: Final instructions
print_message "Build or setup completed successfully!"
echo ""
echo "To run the Supermorse application:"
echo "  1. Start the application with: ./dist/linux-unpacked/supermorse"
echo ""
if [[ $BUILD_MUMBLE =~ ^[Yy]$ ]]; then
    echo "To manage the Mumble server:"
    echo "  - Start: sudo systemctl start supermorse-mumble"
    echo "  - Stop: sudo systemctl stop supermorse-mumble"
    echo "  - Restart: sudo systemctl restart supermorse-mumble"
    echo "  - Check status: sudo systemctl status supermorse-mumble"
    echo "  - View logs: sudo journalctl -u supermorse-mumble"
    echo ""
    echo "The Mumble server is accessible at: localhost:$MUMBLE_PORT"
fi
echo "To manage MongoDB:"
echo "  - Start: sudo systemctl start mongod"
echo "  - Stop: sudo systemctl stop mongod"
echo "  - Restart: sudo systemctl restart mongod"
echo "  - Check status: sudo systemctl status mongod"
echo "  - View logs: sudo journalctl -u mongod"
echo ""
echo "MongoDB is running on: localhost:$MONGODB_PORT"
echo ""
echo "For more information, see the documentation in the docs/ directory."

exit 0