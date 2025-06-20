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
MARIADB_PORT=3306
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
if [[ "$DISTRO" == "ubuntu" || "$DISTRO" == "debian" || "$DISTRO" == "linuxmint" ]]; then
    print_info "Detected $DISTRO $DISTRO_VERSION (Ubuntu/Debian-based)"
    
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
    
    # Check if MariaDB is already installed
    if command -v mysql &> /dev/null; then
        print_info "MariaDB is already installed"
        
        # Check MariaDB version
        MARIADB_VERSION=$(mysql --version | grep -oP 'Distrib \K[0-9]+\.[0-9]+\.[0-9]+' || echo "unknown")
        print_info "Detected MariaDB version: $MARIADB_VERSION"
        
        # Check if version is compatible (MariaDB 10.2 or higher recommended for JSON support)
        MAJOR_VERSION=$(echo $MARIADB_VERSION | cut -d. -f1)
        MINOR_VERSION=$(echo $MARIADB_VERSION | cut -d. -f2)
        
        if [ "$MAJOR_VERSION" -lt 10 ] || ([ "$MAJOR_VERSION" -eq 10 ] && [ "$MINOR_VERSION" -lt 2 ]); then
            print_warning "Your MariaDB version ($MARIADB_VERSION) may not fully support JSON features"
            print_warning "MariaDB 10.2 or higher is recommended for optimal compatibility"
            echo "Do you want to continue anyway? (y/n)"
            read -r response
            if [[ "$response" != "y" ]]; then
                print_info "Please upgrade MariaDB to version 10.2 or higher and run this script again"
                exit 1
            fi
        else
            print_success "Your MariaDB version is compatible with Supermorse"
        fi
    else
        # Install MariaDB
        print_info "Installing MariaDB..."
        sudo apt-get install -y mariadb-server libmariadb-dev
        
        # Start MariaDB service
        print_info "Starting MariaDB service..."
        sudo systemctl enable mariadb
        sudo systemctl start mariadb
    fi
    
    # Check if MariaDB service is running
    if ! systemctl is-active --quiet mariadb; then
        print_error "MariaDB service is not running"
        print_info "Starting MariaDB service..."
        sudo systemctl start mariadb
        
        # Check again if service started successfully
        if ! systemctl is-active --quiet mariadb; then
            print_error "Failed to start MariaDB service"
            print_info "Checking MariaDB logs for errors:"
            sudo journalctl -u mariadb --no-pager -n 20
            exit 1
        fi
    fi
    
    # Check if database exists
    DB_NAME="supermorse"
    DB_USER="supermorse"
    DB_PASSWORD="supermorse"
    DB_SAFE_MODE="false"
    
    if sudo mysql -e "SHOW DATABASES LIKE '$DB_NAME';" | grep -q "$DB_NAME"; then
        print_info "Database $DB_NAME already exists"
        
        # Ask if user wants to use the existing database
        echo "Do you want to use the existing database? (y/n)"
        read -r response
        if [[ "$response" == "y" ]]; then
            print_info "Using existing database $DB_NAME"
            DB_SAFE_MODE="true"
        else
            print_warning "Creating a new database will drop the existing one"
            echo "Are you sure you want to proceed? (y/n)"
            read -r confirm
            if [[ "$confirm" == "y" ]]; then
                print_info "Dropping existing database $DB_NAME..."
                sudo mysql -e "DROP DATABASE $DB_NAME;"
                print_info "Creating database $DB_NAME..."
                sudo mysql -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
            else
                print_info "Keeping existing database $DB_NAME"
                DB_SAFE_MODE="true"
            fi
        fi
    else
        # Create database
        print_info "Creating database $DB_NAME..."
        sudo mysql -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    fi
    
    # Check if user exists
    if sudo mysql -e "SELECT User FROM mysql.user WHERE User='$DB_USER';" | grep -q "$DB_USER"; then
        print_info "User $DB_USER already exists"
        
        # Update privileges for the existing user
        sudo mysql -e "GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';"
        sudo mysql -e "FLUSH PRIVILEGES;"
    else
        # Create user
        print_info "Creating user $DB_USER..."
        sudo mysql -e "CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';"
        sudo mysql -e "GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';"
        sudo mysql -e "FLUSH PRIVILEGES;"
    fi
    
    # Create .env file for database connection
    print_info "Creating .env file for database connection..."
    cat > .env << EOL
DB_HOST=localhost
DB_PORT=3306
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_SAFE_MODE=$DB_SAFE_MODE
SESSION_SECRET=$(openssl rand -hex 32)
EOL
    
    # Test MariaDB connection
    print_info "Testing MariaDB connection..."
    if mysql -h localhost -u supermorse -psupermorse -D supermorse -e "SELECT 1;" > /dev/null 2>&1; then
        print_success "MariaDB connection successful."
    else
        print_error "Failed to connect to MariaDB. Please check the MariaDB service and configuration."
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
    
    # Install MariaDB
    print_info "Installing MariaDB..."
    sudo dnf install -y mariadb-server mariadb-devel
    
    # Initialize MariaDB database
    print_info "Initializing MariaDB database..."
    sudo systemctl enable mariadb
    sudo systemctl start mariadb
    
    # Create MariaDB user and database
    print_info "Setting up MariaDB for Supermorse..."
    sudo mysql -e "CREATE USER IF NOT EXISTS 'supermorse'@'localhost' IDENTIFIED BY 'supermorse';"
    sudo mysql -e "CREATE DATABASE IF NOT EXISTS supermorse;"
    sudo mysql -e "GRANT ALL PRIVILEGES ON supermorse.* TO 'supermorse'@'localhost';"
    sudo mysql -e "FLUSH PRIVILEGES;"
    
    # Create .env file for database connection
    print_info "Creating .env file for database connection..."
    cat > .env << EOL
DB_HOST=localhost
DB_PORT=3306
DB_NAME=supermorse
DB_USER=supermorse
DB_PASSWORD=supermorse
SESSION_SECRET=$(openssl rand -hex 32)
EOL
    
    # Test MariaDB connection
    print_info "Testing MariaDB connection..."
    if mysql -h localhost -u supermorse -psupermorse -D supermorse -e "SELECT 1;" > /dev/null 2>&1; then
        print_success "MariaDB connection successful."
    else
        print_error "Failed to connect to MariaDB. Please check the MariaDB service and configuration."
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
After=network.target mariadb.service

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
    echo "sudo ufw allow $MARIADB_PORT/tcp"
    echo "sudo ufw allow $MUMBLE_PORT/tcp"
    echo "sudo ufw allow $MUMBLE_PORT/udp"
elif command -v firewall-cmd &> /dev/null; then
    print_info "Firewalld detected. To allow necessary connections, run:"
    echo "sudo firewall-cmd --permanent --add-port=$MARIADB_PORT/tcp"
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
echo "MariaDB is running on: localhost:$MARIADB_PORT"
echo ""
echo "For more information, see the documentation in the docs/ directory."

# Return to the original directory
cd "$SCRIPT_DIR"