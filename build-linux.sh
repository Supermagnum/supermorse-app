#!/bin/bash

# Supermorse Linux Build Script
# This script automates the process of building or setting up the Supermorse application
# or the modified Mumble server on Linux.

# Ensure script stops on errors
set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

function print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

function print_info() {
    echo -e "${CYAN}[SUPERMORSE]${NC} $1"
}

function print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

function print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please do not run this script as root or with sudo."
    exit 1
fi

# Configuration
MUMBLE_DIR="../supermorse-mumble"  # Path to the supermorse-mumble directory
POSTGRESQL_PORT=5432
MUMBLE_PORT=64738
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Step 1: Check for required tools
print_info "Checking for required tools..."

# Check for Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is required but not installed."
    echo "Please install Node.js from https://nodejs.org/ or your package manager."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d 'v' -f 2)
NODE_MAJOR=$(echo $NODE_VERSION | cut -d '.' -f 1)
if [ "$NODE_MAJOR" -lt 14 ]; then
    print_error "Node.js v14 or later is required. Found v$NODE_VERSION"
    exit 1
fi
echo "Node.js v$NODE_VERSION found."

# Check for npm
if ! command -v npm &> /dev/null; then
    print_error "npm is required but not installed."
    exit 1
fi
NPM_VERSION=$(npm -v)
echo "npm v$NPM_VERSION found."

# Check for Git
if ! command -v git &> /dev/null; then
    print_error "Git is required but not installed."
    echo "Please install Git from https://git-scm.com/ or your package manager."
    exit 1
fi
GIT_VERSION=$(git --version | cut -d ' ' -f 3)
echo "Git v$GIT_VERSION found."

# Step 2: Install dependencies
print_info "Installing dependencies..."

# Detect Linux distribution
if [ -f /etc/os-release ]; then
    . /etc/os-release
    DISTRO=$ID
    DISTRO_VERSION=$VERSION_ID
else
    print_error "Could not detect Linux distribution."
    exit 1
fi

# Install dependencies based on distribution
if [[ "$DISTRO" == "ubuntu" || "$DISTRO" == "debian" ]]; then
    print_info "Detected $DISTRO $DISTRO_VERSION"
    
    # Update package lists
    print_info "Updating package lists..."
    sudo apt-get update
    
    # Install build dependencies
    print_info "Installing build dependencies..."
    sudo apt-get install -y build-essential cmake pkg-config libssl-dev libboost-all-dev \
                           libprotobuf-dev protobuf-compiler libqt5core5a libqt5network5 \
                           libqt5sql5 libqt5sql5-sqlite libqt5xml5 qtbase5-dev \
                           libcap-dev libsndfile1-dev libspeechd-dev libavahi-compat-libdnssd-dev \
                           libzeroc-ice-dev libpulse-dev
    
    # Install PostgreSQL
    print_info "Installing PostgreSQL..."
    sudo apt-get install -y postgresql postgresql-contrib libpq-dev
    
    # Start PostgreSQL service
    print_info "Starting PostgreSQL service..."
    sudo systemctl enable postgresql
    sudo systemctl start postgresql
    
    # Create PostgreSQL user and database
    print_info "Setting up PostgreSQL for Supermorse..."
    sudo -u postgres psql -c "CREATE USER supermorse WITH PASSWORD 'supermorse';"
    sudo -u postgres psql -c "CREATE DATABASE supermorse OWNER supermorse;"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE supermorse TO supermorse;"
    
    # Configure PostgreSQL for local connections
    print_info "Configuring PostgreSQL for local connections..."
    PG_HBA_CONF=$(sudo -u postgres psql -t -c "SHOW hba_file;" | xargs)
    sudo cp "$PG_HBA_CONF" "$PG_HBA_CONF.bak"
    echo "# Supermorse local connection" | sudo tee -a "$PG_HBA_CONF"
    echo "host    supermorse      supermorse      127.0.0.1/32            md5" | sudo tee -a "$PG_HBA_CONF"
    echo "host    supermorse      supermorse      ::1/128                 md5" | sudo tee -a "$PG_HBA_CONF"
    
    # Restart PostgreSQL to apply changes
    print_info "Restarting PostgreSQL to apply changes..."
    sudo systemctl restart postgresql
    
    # Create .env file for database connection
    print_info "Creating .env file for database connection..."
    cat > .env << EOL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=supermorse
DB_USER=supermorse
DB_PASSWORD=supermorse
SESSION_SECRET=$(openssl rand -hex 32)
EOL
    
    # Test PostgreSQL connection
    print_info "Testing PostgreSQL connection..."
    if PGPASSWORD=supermorse psql -h localhost -U supermorse -d supermorse -c "SELECT 1;" > /dev/null 2>&1; then
        print_success "PostgreSQL connection successful."
    else
        print_error "Failed to connect to PostgreSQL. Please check the PostgreSQL service and configuration."
        exit 1
    fi
    
    # Install other dependencies
    print_info "Installing other dependencies..."
    sudo apt-get install -y python3 python3-pip
    pip3 install requests
    
elif [[ "$DISTRO" == "fedora" || "$DISTRO" == "rhel" || "$DISTRO" == "centos" ]]; then
    print_info "Detected $DISTRO $DISTRO_VERSION"
    
    # Update package lists
    print_info "Updating package lists..."
    sudo dnf check-update
    
    # Install build dependencies
    print_info "Installing build dependencies..."
    sudo dnf install -y gcc-c++ cmake pkgconfig openssl-devel boost-devel \
                       protobuf-devel protobuf-compiler qt5-qtbase-devel \
                       qt5-qtnetwork-devel qt5-qtsql-devel qt5-qtsql-sqlite \
                       qt5-qtxml-devel libcap-devel libsndfile-devel \
                       speech-dispatcher-devel avahi-compat-libdns_sd-devel \
                       zeroc-ice-devel pulseaudio-libs-devel
    
    # Install PostgreSQL
    print_info "Installing PostgreSQL..."
    sudo dnf install -y postgresql-server postgresql-contrib postgresql-devel
    
    # Initialize PostgreSQL database
    print_info "Initializing PostgreSQL database..."
    sudo postgresql-setup --initdb
    
    # Start PostgreSQL service
    print_info "Starting PostgreSQL service..."
    sudo systemctl enable postgresql
    sudo systemctl start postgresql
    
    # Create PostgreSQL user and database
    print_info "Setting up PostgreSQL for Supermorse..."
    sudo -u postgres psql -c "CREATE USER supermorse WITH PASSWORD 'supermorse';"
    sudo -u postgres psql -c "CREATE DATABASE supermorse OWNER supermorse;"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE supermorse TO supermorse;"
    
    # Configure PostgreSQL for local connections
    print_info "Configuring PostgreSQL for local connections..."
    PG_HBA_CONF=$(sudo -u postgres psql -t -c "SHOW hba_file;" | xargs)
    sudo cp "$PG_HBA_CONF" "$PG_HBA_CONF.bak"
    echo "# Supermorse local connection" | sudo tee -a "$PG_HBA_CONF"
    echo "host    supermorse      supermorse      127.0.0.1/32            md5" | sudo tee -a "$PG_HBA_CONF"
    echo "host    supermorse      supermorse      ::1/128                 md5" | sudo tee -a "$PG_HBA_CONF"
    
    # Restart PostgreSQL to apply changes
    print_info "Restarting PostgreSQL to apply changes..."
    sudo systemctl restart postgresql
    
    # Create .env file for database connection
    print_info "Creating .env file for database connection..."
    cat > .env << EOL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=supermorse
DB_USER=supermorse
DB_PASSWORD=supermorse
SESSION_SECRET=$(openssl rand -hex 32)
EOL
    
    # Test PostgreSQL connection
    print_info "Testing PostgreSQL connection..."
    if PGPASSWORD=supermorse psql -h localhost -U supermorse -d supermorse -c "SELECT 1;" > /dev/null 2>&1; then
        print_success "PostgreSQL connection successful."
    else
        print_error "Failed to connect to PostgreSQL. Please check the PostgreSQL service and configuration."
        exit 1
    fi
    
    # Install other dependencies
    print_info "Installing other dependencies..."
    sudo dnf install -y python3 python3-pip
    pip3 install requests
    
else
    print_error "Unsupported Linux distribution: $DISTRO"
    print_info "This script supports Ubuntu, Debian, Fedora, RHEL, and CentOS."
    print_info "For other distributions, please install the dependencies manually."
    exit 1
fi

# Step 3: Install Node.js dependencies or build the Electron application
print_info "Building Supermorse Electron application..."
cd "$SCRIPT_DIR"
npm install
npm run dist -- --linux

if [ ! -d "dist" ]; then
    print_error "Failed to build the Electron application."
    exit 1
fi

print_success "Electron application built successfully"

# Step 4: Build the modified Mumble server
print_info "Building modified Mumble server..."

# Create murmur-src directory if it doesn't exist
if [ ! -d "murmur-src" ]; then
    mkdir -p murmur-src
fi

# Copy the modified Mumble source code
cd murmur-src
if [ ! -f "CMakeLists.txt" ]; then
    print_info "Copying Mumble source code..."
    cp -r "$MUMBLE_DIR"/* .
else
    print_info "Updating Mumble source code..."
    cp -r "$MUMBLE_DIR"/* .
fi

# Configure and build
print_info "Configuring Mumble build..."
mkdir -p build
cd build
cmake .. -Dclient=OFF -Dserver=ON -Dice=OFF -Doverlay=OFF -Dplugins=OFF -Dzeroconf=OFF

print_info "Building Mumble server..."
make -j$(nproc)

if [ ! -f "mumble-server" ]; then
    print_warning "Failed to build the Mumble server. Creating a placeholder..."
    cd ..
    echo '#!/bin/bash
echo "ERROR: This is a placeholder for the modified Mumble server executable."
echo "You need to build the actual executable and place it here."
echo ""
echo "Please follow the instructions in the Mumble Server Deployment Guide:"
echo "../docs/mumble-server-setup.md"
echo ""
echo "After building the server, replace this placeholder with the compiled executable."
exit 1' > mumble-server
    chmod +x mumble-server
else
    print_success "Mumble server built successfully"
    cp mumble-server ..
    cd ..
fi

# Step 5: Set up Mumble server configuration
print_info "Setting up Mumble server configuration..."

# Create configuration directories
MUMBLE_CONFIG_DIR="$HOME/.config/Supermorse/Mumble"
mkdir -p "$MUMBLE_CONFIG_DIR"

# Copy configuration file
cp "$SCRIPT_DIR/config/mumble-server.ini" "$MUMBLE_CONFIG_DIR/mumble-server.ini"

# Generate SSL certificates
print_info "Generating SSL certificates..."
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout "$MUMBLE_CONFIG_DIR/key.pem" \
  -out "$MUMBLE_CONFIG_DIR/cert.pem" \
  -subj "/CN=supermorse-mumble-server"

# Create authentication script directory
MUMBLE_SCRIPT_DIR="$HOME/.local/share/Supermorse/Scripts"
mkdir -p "$MUMBLE_SCRIPT_DIR"

# Create authentication script
cat > "$MUMBLE_SCRIPT_DIR/mumble-auth.py" << 'EOL'
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
EOL

chmod +x "$MUMBLE_SCRIPT_DIR/mumble-auth.py"

print_success "Mumble server configuration completed"

# Step 6: Create systemd service for Mumble server
print_info "Creating systemd service for Mumble server..."

# Create systemd service file
cat > supermorse-mumble.service << EOL
[Unit]
Description=Supermorse Mumble Server
After=network.target postgresql.service

[Service]
Type=simple
User=$USER
ExecStart=$SCRIPT_DIR/murmur-src/mumble-server -ini $MUMBLE_CONFIG_DIR/mumble-server.ini
Restart=on-failure
RestartSec=30
WorkingDirectory=$SCRIPT_DIR

[Install]
WantedBy=multi-user.target
EOL

print_info "To install the systemd service, run the following commands:"
echo "sudo cp $SCRIPT_DIR/supermorse-mumble.service /etc/systemd/system/"
echo "sudo systemctl daemon-reload"
echo "sudo systemctl enable supermorse-mumble.service"
echo "sudo systemctl start supermorse-mumble.service"

# Step 7: Configure firewall
print_info "Configuring firewall..."

if command -v ufw &> /dev/null; then
    print_info "UFW firewall detected. To allow necessary connections, run:"
    echo "sudo ufw allow $POSTGRESQL_PORT/tcp"
    echo "sudo ufw allow $MUMBLE_PORT/tcp"
    echo "sudo ufw allow $MUMBLE_PORT/udp"
elif command -v firewall-cmd &> /dev/null; then
    print_info "Firewalld detected. To allow necessary connections, run:"
    echo "sudo firewall-cmd --permanent --add-port=$POSTGRESQL_PORT/tcp"
    echo "sudo firewall-cmd --permanent --add-port=$MUMBLE_PORT/tcp"
    echo "sudo firewall-cmd --permanent --add-port=$MUMBLE_PORT/udp"
    echo "sudo firewall-cmd --reload"
else
    print_warning "No supported firewall detected. Please configure your firewall manually."
fi

# Step 8: Final instructions
print_info "Build or setup completed successfully!"
echo ""
echo "To run the Supermorse application:"
echo "  1. Start the server: npm run server"
echo "  2. In another terminal, start the Electron app: npm start"
echo ""
echo "To run the built Electron application:"
echo "  ./dist/linux-unpacked/supermorse"
echo ""
echo "To manage the Mumble server:"
echo "  - Start: systemctl --user start supermorse-mumble"
echo "  - Stop: systemctl --user stop supermorse-mumble"
echo "  - Check status: systemctl --user status supermorse-mumble"
echo ""
echo "The Mumble server is accessible at: localhost:$MUMBLE_PORT"
echo "PostgreSQL is running on: localhost:$POSTGRESQL_PORT"
echo ""
echo "For more information, see the documentation in the docs/ directory."

# Return to the original directory
cd "$SCRIPT_DIR"