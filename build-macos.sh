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

# Functions for colored output
function success_message() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

function info_message() {
    echo -e "${CYAN}[SUPERMORSE] $1${NC}"
}

function warning_message() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

function error_message() {
    echo -e "${RED}[ERROR] $1${NC}"
}

# Configuration
MUMBLE_DIR="../supermorse-mumble"  # Path to the supermorse-mumble directory
MONGODB_PORT=27017
MUMBLE_PORT=64738
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Step 1: Check for required tools
info_message "Checking for required tools..."

# Check for Homebrew
if ! command -v brew &> /dev/null; then
    error_message "Homebrew is required but not installed."
    echo "Please install Homebrew from https://brew.sh/"
    exit 1
fi
echo "Homebrew found."

# Check for Node.js
if ! command -v node &> /dev/null; then
    error_message "Node.js is required but not installed."
    echo "Please install Node.js using Homebrew: brew install node"
    exit 1
fi
NODE_VERSION=$(node -v | cut -c2-)
NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 14 ]; then
    error_message "Node.js v14 or later is required. Found v$NODE_VERSION"
    exit 1
fi
echo "Node.js v$NODE_VERSION found."

# Check for npm
if ! command -v npm &> /dev/null; then
    error_message "npm is required but not installed."
    exit 1
fi
NPM_VERSION=$(npm -v)
echo "npm v$NPM_VERSION found."

# Check for Git
if ! command -v git &> /dev/null; then
    error_message "Git is required but not installed."
    echo "Please install Git using Homebrew: brew install git"
    exit 1
fi
GIT_VERSION=$(git --version | cut -d' ' -f3)
echo "Git v$GIT_VERSION found."

# Step 2: Install dependencies
info_message "Installing dependencies..."

# Install MongoDB
info_message "Installing MongoDB..."
brew tap mongodb/brew
brew install mongodb-community

# Install Qt (needed for Mumble)
info_message "Installing Qt..."
brew install qt@5

# Install Python (needed for Mumble)
info_message "Installing Python..."
brew install python

# Install Python dependencies
info_message "Installing Python dependencies..."
pip3 install requests

# Install build tools
info_message "Installing build tools..."
brew install cmake
brew install boost
brew install openssl

# Step 3: Set up MongoDB
info_message "Setting up MongoDB..."

# Start MongoDB service
brew services start mongodb-community

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    error_message "Failed to start MongoDB. Please check the MongoDB service."
    exit 1
fi

success_message "MongoDB is running on port $MONGODB_PORT"

# Step 4: Install Node.js dependencies or build the Electron application
info_message "Building Supermorse Electron application..."
cd "$SCRIPT_DIR"
npm install
npm run dist -- --mac

if [ ! -d "dist" ]; then
    error_message "Failed to build the Electron application."
    exit 1
fi

success_message "Electron application built successfully"

# Step 5: Build the modified Mumble server
info_message "Building modified Mumble server..."

# Create murmur-src directory if it doesn't exist
if [ ! -d "murmur-src" ]; then
    mkdir -p murmur-src
fi

# Copy the modified Mumble source code
cd murmur-src
if [ ! -f "CMakeLists.txt" ]; then
    info_message "Copying Mumble source code..."
    cp -r $MUMBLE_DIR/* .
else
    info_message "Updating Mumble source code..."
    cp -r $MUMBLE_DIR/* .
fi

# Configure or build
info_message "Building Mumble server..."
warning_message "Building Mumble on macOS can be complex."
warning_message "Please follow the detailed instructions in the Mumble documentation."
warning_message "This script will create a placeholder for the Mumble server executable."

# Create a placeholder script for the Mumble server
cat > murmur << 'EOF'
#!/bin/bash

echo "ERROR: This is a placeholder for the modified Mumble server executable."
echo "You need to build the actual executable and place it here."
echo
echo "Please follow the instructions in the Mumble Server Deployment Guide:"
echo "../docs/mumble-server-setup.md"
echo
echo "After building the server, replace this placeholder with the compiled executable."
exit 1
EOF

chmod +x murmur

info_message "Created placeholder for Mumble server executable."
info_message "To build the actual Mumble server, please follow the instructions in the documentation."

# Step 6: Set up Mumble server configuration
info_message "Setting up Mumble server configuration..."

# Create configuration directories
MUMBLE_CONFIG_DIR="$HOME/Library/Application Support/Supermorse/Mumble"
mkdir -p "$MUMBLE_CONFIG_DIR"

# Copy configuration file
cp "$SCRIPT_DIR/config/mumble-server.ini" "$MUMBLE_CONFIG_DIR/mumble-server.ini"

# Generate SSL certificates
info_message "Generating SSL certificates..."
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout "$MUMBLE_CONFIG_DIR/key.pem" \
  -out "$MUMBLE_CONFIG_DIR/cert.pem" \
  -subj "/CN=supermorse-mumble-server"

# Create authentication script directory
MUMBLE_SCRIPT_DIR="$HOME/Library/Application Support/Supermorse/Scripts"
mkdir -p "$MUMBLE_SCRIPT_DIR"

# Create authentication script
cat > "$MUMBLE_SCRIPT_DIR/mumble-auth.py" << 'EOF'
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

chmod +x "$MUMBLE_SCRIPT_DIR/mumble-auth.py"

success_message "Mumble server configuration completed"

# Step 7: Create LaunchAgent for Mumble server
info_message "Creating LaunchAgent for Mumble server..."

LAUNCH_AGENT_DIR="$HOME/Library/LaunchAgents"
mkdir -p "$LAUNCH_AGENT_DIR"

cat > "$LAUNCH_AGENT_DIR/com.supermorse.mumble.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.supermorse.mumble</string>
    <key>ProgramArguments</key>
    <array>
        <string>$SCRIPT_DIR/murmur-src/murmur</string>
        <string>-ini</string>
        <string>$MUMBLE_CONFIG_DIR/mumble-server.ini</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardErrorPath</key>
    <string>$HOME/Library/Logs/Supermorse/mumble-error.log</string>
    <key>StandardOutPath</key>
    <string>$HOME/Library/Logs/Supermorse/mumble-output.log</string>
    <key>WorkingDirectory</key>
    <string>$SCRIPT_DIR/murmur-src</string>
</dict>
</plist>
EOF

# Create log directory
mkdir -p "$HOME/Library/Logs/Supermorse"

info_message "LaunchAgent created. To load it, run:"
echo "launchctl load $LAUNCH_AGENT_DIR/com.supermorse.mumble.plist"

# Step 8: Final instructions
info_message "Build or setup completed successfully!"
echo
echo "To run the Supermorse application:"
echo "  1. Open the application from: $SCRIPT_DIR/dist/mac/Supermorse.app"
echo
echo "To manage the Mumble server:"
echo "  - Start: launchctl load $LAUNCH_AGENT_DIR/com.supermorse.mumble.plist"
echo "  - Stop: launchctl unload $LAUNCH_AGENT_DIR/com.supermorse.mumble.plist"
echo "  - Check logs: cat $HOME/Library/Logs/Supermorse/mumble-output.log"
echo
echo "The Mumble server is accessible at: localhost:$MUMBLE_PORT"
echo "MongoDB is running on: localhost:$MONGODB_PORT"
echo
echo "For more information, see the documentation in the docs/ directory."
echo
warning_message "Important: You need to build the actual Mumble server executable."
warning_message "The script has created a placeholder. Please follow the instructions in the documentation."

# Return to the original directory
cd "$SCRIPT_DIR"