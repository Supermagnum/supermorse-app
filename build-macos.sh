#!/bin/bash

# Supermorse macOS Build Script
# This script automates the process of building or setting up the Supermorse application
# or the modified Mumble server on macOS.

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
if [ "$(id -u)" -eq 0 ]; then
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

# Check for Homebrew
if ! command -v brew &> /dev/null; then
    print_info "Homebrew not found. Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Add Homebrew to PATH
    if [[ $(uname -m) == 'arm64' ]]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/opt/homebrew/bin/brew shellenv)"
    else
        echo 'eval "$(/usr/local/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/usr/local/bin/brew shellenv)"
    fi
fi

# Check for Node.js
if ! command -v node &> /dev/null; then
    print_info "Node.js not found. Installing Node.js..."
    brew install node
fi

NODE_VERSION=$(node -v | cut -d 'v' -f 2)
NODE_MAJOR=$(echo $NODE_VERSION | cut -d '.' -f 1)
if [ "$NODE_MAJOR" -lt 14 ]; then
    print_error "Node.js v14 or later is required. Found v$NODE_VERSION"
    print_info "Upgrading Node.js..."
    brew upgrade node
    NODE_VERSION=$(node -v | cut -d 'v' -f 2)
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d '.' -f 1)
    if [ "$NODE_MAJOR" -lt 14 ]; then
        print_error "Failed to upgrade Node.js to v14 or later."
        exit 1
    fi
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
    print_info "Git not found. Installing Git..."
    brew install git
fi
GIT_VERSION=$(git --version | cut -d ' ' -f 3)
echo "Git v$GIT_VERSION found."

# Step 2: Install dependencies
print_info "Installing dependencies..."

# Check if MariaDB is already installed
if brew list mariadb &>/dev/null; then
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
            print_info "You can upgrade with: brew upgrade mariadb"
            exit 1
        fi
    else
        print_success "Your MariaDB version is compatible with Supermorse"
    fi
else
    # Install MariaDB
    print_info "Installing MariaDB..."
    brew install mariadb
fi

# Check if MariaDB service is running
if ! brew services list | grep mariadb | grep started &>/dev/null; then
    print_info "Starting MariaDB service..."
    brew services start mariadb
    
    # Wait for MariaDB to start
    print_info "Waiting for MariaDB to start..."
    sleep 5
    
    # Check again if service started successfully
    if ! brew services list | grep mariadb | grep started &>/dev/null; then
        print_error "Failed to start MariaDB service"
        print_info "Please check the MariaDB logs for errors"
        exit 1
    fi
else
    print_success "MariaDB service is already running"
fi

# Check if database exists
DB_NAME="supermorse"
DB_USER="supermorse"
DB_PASSWORD="supermorse"
DB_SAFE_MODE="false"

if mysql -u root -e "SHOW DATABASES LIKE '$DB_NAME';" 2>/dev/null | grep -q "$DB_NAME"; then
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
            mysql -u root -e "DROP DATABASE $DB_NAME;" 2>/dev/null
            print_info "Creating database $DB_NAME..."
            mysql -u root -e "CREATE DATABASE IF NOT EXISTS $DB_NAME;" 2>/dev/null
        else
            print_info "Keeping existing database $DB_NAME"
            DB_SAFE_MODE="true"
        fi
    fi
else
    # Create database
    print_info "Creating database $DB_NAME..."
    mysql -u root -e "CREATE DATABASE IF NOT EXISTS $DB_NAME;" 2>/dev/null || true
fi

# Check if user exists
if mysql -u root -e "SELECT User FROM mysql.user WHERE User='$DB_USER';" 2>/dev/null | grep -q "$DB_USER"; then
    print_info "User $DB_USER already exists"
    
    # Update privileges for the existing user
    mysql -u root -e "GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';" 2>/dev/null || true
    mysql -u root -e "FLUSH PRIVILEGES;" 2>/dev/null || true
else
    # Create user
    print_info "Creating user $DB_USER..."
    mysql -u root -e "CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';" 2>/dev/null || true
    mysql -u root -e "GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';" 2>/dev/null || true
    mysql -u root -e "FLUSH PRIVILEGES;" 2>/dev/null || true
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
if mysql -h localhost -u $DB_USER -p$DB_PASSWORD -D $DB_NAME -e "SELECT 1;" > /dev/null 2>&1; then
    print_success "MariaDB connection successful"
else
    print_error "Failed to connect to MariaDB"
    print_info "Troubleshooting..."
    
    # Check if MariaDB is running
    if ! brew services list | grep mariadb | grep started &>/dev/null; then
        print_error "MariaDB service is not running"
        print_info "Restarting MariaDB service..."
        brew services restart mariadb
        sleep 5
    fi
    
    # Check if password authentication is correct
    print_info "Checking password authentication..."
    mysql -u root -e "ALTER USER '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';" 2>/dev/null || true
    mysql -u root -e "FLUSH PRIVILEGES;" 2>/dev/null || true
    
    # Try connection again
    print_info "Trying connection again..."
    if mysql -h localhost -u $DB_USER -p$DB_PASSWORD -D $DB_NAME -e "SELECT 1;" > /dev/null 2>&1; then
        print_success "MariaDB connection successful after troubleshooting"
    else
        print_error "Connection to MariaDB still failing"
        print_info "Please check your MariaDB configuration manually"
        exit 1
    fi
fi

# Check for cqrlog compatibility
if command -v cqrlog &> /dev/null; then
    print_info "cqrlog detected on the system"
    print_info "Checking for cqrlog database..."
    
    if mysql -u root -e "SHOW DATABASES LIKE 'cqrlog';" 2>/dev/null | grep -q "cqrlog"; then
        print_info "cqrlog database found"
        print_warning "Both cqrlog and Supermorse use MariaDB"
        print_info "They can coexist without issues as they use separate databases"
    fi
fi

# Install Qt (needed for Mumble)
print_info "Installing Qt..."
brew install qt@5

# Install other dependencies
print_info "Installing other dependencies..."
brew install cmake pkg-config openssl boost protobuf libsndfile

# Install Python dependencies
print_info "Installing Python dependencies..."
pip3 install requests

# Step 3: Install Node.js dependencies or build the Electron application
print_info "Building Supermorse Electron application..."
cd "$SCRIPT_DIR"
npm install
npm run dist -- --mac

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

# Create a placeholder for the Mumble server executable
print_warning "Building Mumble on macOS requires Xcode and can be complex."
print_warning "Please follow the detailed instructions in the Mumble documentation."
print_warning "This script will create a placeholder for the Mumble server executable."

# Create a placeholder shell script for the Mumble server
cat > murmur << 'EOL'
#!/bin/bash
echo "ERROR: This is a placeholder for the modified Mumble server executable."
echo "You need to build the actual executable and place it here."
echo ""
echo "Please follow the instructions in the Mumble Server Deployment Guide:"
echo "../docs/mumble-server-setup.md"
echo ""
echo "After building the server, replace this placeholder with the compiled executable."
exit 1
EOL

chmod +x murmur

print_info "Created placeholder for Mumble server executable."
print_info "To build the actual Mumble server, please follow the instructions in the documentation."

# Step 5: Set up Mumble server configuration
print_info "Setting up Mumble server configuration..."

# Create configuration directories
MUMBLE_CONFIG_DIR="$HOME/Library/Application Support/Supermorse/Mumble"
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
MUMBLE_SCRIPT_DIR="$HOME/Library/Application Support/Supermorse/Scripts"
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

# Step 6: Create LaunchAgent for Mumble server
print_info "Creating LaunchAgent for Mumble server..."

# Create LaunchAgent directory if it doesn't exist
LAUNCH_AGENT_DIR="$HOME/Library/LaunchAgents"
mkdir -p "$LAUNCH_AGENT_DIR"

# Create LaunchAgent plist file
cat > "$LAUNCH_AGENT_DIR/com.supermorse.mumble.plist" << EOL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.supermorse.mumble</string>
    <key>ProgramArguments</key>
    <array>
        <string>${SCRIPT_DIR}/murmur-src/murmur</string>
        <string>-ini</string>
        <string>${MUMBLE_CONFIG_DIR}/mumble-server.ini</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>WorkingDirectory</key>
    <string>${SCRIPT_DIR}</string>
    <key>StandardErrorPath</key>
    <string>${HOME}/Library/Logs/supermorse-mumble.log</string>
    <key>StandardOutPath</key>
    <string>${HOME}/Library/Logs/supermorse-mumble.log</string>
</dict>
</plist>
EOL

print_info "To load the LaunchAgent, run:"
echo "launchctl load $LAUNCH_AGENT_DIR/com.supermorse.mumble.plist"

# Step 7: Final instructions
print_info "Build or setup completed successfully!"
echo ""
echo "To run the Supermorse application:"
echo "  1. Start the server: npm run server"
echo "  2. In another terminal, start the Electron app: npm start"
echo ""
echo "To run the built Electron application:"
echo "  open ./dist/mac/Supermorse.app"
echo ""
echo "To manage the Mumble server:"
echo "  - Start: launchctl start com.supermorse.mumble"
echo "  - Stop: launchctl stop com.supermorse.mumble"
echo "  - Load at login: launchctl load $LAUNCH_AGENT_DIR/com.supermorse.mumble.plist"
echo "  - Unload: launchctl unload $LAUNCH_AGENT_DIR/com.supermorse.mumble.plist"
echo ""
echo "The Mumble server is accessible at: localhost:$MUMBLE_PORT"
echo "MariaDB is running on: localhost:$MARIADB_PORT"
echo ""
echo "For more information, see the documentation in the docs/ directory."
echo ""
print_warning "Important: You need to build the actual Mumble server executable."
print_warning "The script has created a placeholder. Please follow the instructions in the documentation."

# Return to the original directory
cd "$SCRIPT_DIR"