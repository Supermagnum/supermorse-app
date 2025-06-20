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
POSTGRESQL_PORT=5432
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

# Install PostgreSQL
print_info "Installing PostgreSQL..."
brew install postgresql

# Start PostgreSQL service
print_info "Starting PostgreSQL service..."
brew services start postgresql

# Wait for PostgreSQL to start
sleep 5

# Create PostgreSQL user and database
print_info "Setting up PostgreSQL for Supermorse..."
createuser -s postgres 2>/dev/null || true
psql -U postgres -c "CREATE USER supermorse WITH PASSWORD 'supermorse';" 2>/dev/null || true
psql -U postgres -c "CREATE DATABASE supermorse OWNER supermorse;" 2>/dev/null || true
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE supermorse TO supermorse;" 2>/dev/null || true

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
echo "PostgreSQL is running on: localhost:$POSTGRESQL_PORT"
echo ""
echo "For more information, see the documentation in the docs/ directory."
echo ""
print_warning "Important: You need to build the actual Mumble server executable."
print_warning "The script has created a placeholder. Please follow the instructions in the documentation."

# Return to the original directory
cd "$SCRIPT_DIR"