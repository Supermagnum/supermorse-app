#!/bin/bash
# SuperMorse Installation Script for macOS
# This script installs all dependencies, builds and sets up the SuperMorse application

# Colors for console output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Installation directory
INSTALL_DIR="/Applications/SuperMorse.app"
USER_HOME=$(eval echo ~$USER)
USER_LAUNCHAGENT_DIR="$USER_HOME/Library/LaunchAgents"

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}        SuperMorse Application - macOS Setup       ${NC}"
echo -e "${BLUE}==================================================${NC}"

# Create a log file
LOGFILE="supermorse_install.log"
echo "SuperMorse Installation Log - $(date)" > "$LOGFILE"

# Function to log messages
log() {
  echo "$1" | tee -a "$LOGFILE"
}

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check if Homebrew is installed
echo -e "\n${YELLOW}Checking for Homebrew...${NC}"
if command_exists brew; then
  echo -e "${GREEN}✓ Homebrew is installed${NC}"
  log "Homebrew found"
else
  echo -e "${YELLOW}Installing Homebrew...${NC}"
  log "Homebrew not found. Installing..."
  
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  
  if command_exists brew; then
    echo -e "${GREEN}✓ Homebrew installed successfully${NC}"
    log "Homebrew installed"
  else
    echo -e "${RED}Failed to install Homebrew. Please install it manually.${NC}"
    log "Failed to install Homebrew"
    exit 1
  fi
fi

# Update Homebrew
echo -e "\n${YELLOW}Updating Homebrew...${NC}"
brew update
log "Homebrew updated"

# List of required packages
echo -e "\n${YELLOW}Installing additional required packages...${NC}"
brew install python3 make
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Required packages installed successfully${NC}"
  log "Required packages installed"
else
  echo -e "${RED}Failed to install some required packages. See error above.${NC}"
  log "Failed to install required packages"
  exit 1
fi

# Check if Node.js is installed
echo -e "\n${YELLOW}Checking system dependencies...${NC}"
if command_exists node; then
  NODE_VERSION=$(node -v)
  echo -e "${GREEN}✓ Node.js is installed (${NODE_VERSION})${NC}"
  log "Node.js found: $NODE_VERSION"
else
  echo -e "${YELLOW}Installing Node.js...${NC}"
  log "Node.js not found. Installing..."
  
  brew install node
  
  if command_exists node; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓ Node.js installed successfully (${NODE_VERSION})${NC}"
    log "Node.js installed: $NODE_VERSION"
  else
    echo -e "${RED}Failed to install Node.js. Please install it manually.${NC}"
    log "Failed to install Node.js"
    exit 1
  fi
fi

# Check if npm is installed
if command_exists npm; then
  NPM_VERSION=$(npm -v)
  echo -e "${GREEN}✓ npm is installed (${NPM_VERSION})${NC}"
  log "npm found: $NPM_VERSION"
else
  echo -e "${RED}npm is not installed. Something is wrong with your Node.js installation.${NC}"
  log "npm not found"
  exit 1
fi

# Install npm dependencies
echo -e "\n${YELLOW}Installing npm dependencies...${NC}"
npm install
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Dependencies installed successfully${NC}"
  log "npm dependencies installed"
else
  echo -e "${RED}Failed to install dependencies. See error above.${NC}"
  log "Failed to install npm dependencies"
  exit 1
fi

# Build the application
echo -e "\n${YELLOW}Building the application...${NC}"
npm run build
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Application built successfully${NC}"
  log "Application built successfully"
else
  echo -e "${RED}Failed to build the application. See error above.${NC}"
  log "Failed to build application"
  exit 1
fi

# Copy application to Applications directory
echo -e "\n${YELLOW}Installing application...${NC}"
if [ -d "dist/mac" ]; then
  # If we have a properly built macOS app, use it
  if [ -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}Removing previous installation...${NC}"
    sudo rm -rf "$INSTALL_DIR"
  fi
  
  sudo cp -R dist/mac/*.app "$INSTALL_DIR"
  echo -e "${GREEN}✓ Application installed to $INSTALL_DIR${NC}"
  log "Application installed from dist/mac"
else
  # If no build was created, create a basic app structure
  echo -e "${YELLOW}No app build found, creating basic app structure...${NC}"
  
  APP_CONTENTS="$INSTALL_DIR/Contents"
  APP_MACOS="$APP_CONTENTS/MacOS"
  APP_RESOURCES="$APP_CONTENTS/Resources"
  
  # Create directories
  sudo mkdir -p "$APP_MACOS"
  sudo mkdir -p "$APP_RESOURCES"
  
  # Copy files
  sudo cp -r . "$APP_RESOURCES/app"
  
  # Create launcher script
  sudo tee "$APP_MACOS/SuperMorse" > /dev/null << 'EOF'
#!/bin/bash
cd "$(dirname "$0")/../Resources/app"
/usr/local/bin/node main.js
EOF
  
  sudo chmod +x "$APP_MACOS/SuperMorse"
  
  # Create Info.plist
  sudo tee "$APP_CONTENTS/Info.plist" > /dev/null << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>SuperMorse</string>
  <key>CFBundleIdentifier</key>
  <string>com.supermorse.app</string>
  <key>CFBundleName</key>
  <string>SuperMorse</string>
  <key>CFBundleDisplayName</key>
  <string>SuperMorse</string>
  <key>CFBundleVersion</key>
  <string>1.0.0</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0.0</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>LSMinimumSystemVersion</key>
  <string>10.10</string>
  <key>NSHighResolutionCapable</key>
  <true/>
</dict>
</plist>
EOF
  
  echo -e "${GREEN}✓ Basic application structure created at $INSTALL_DIR${NC}"
  log "Created basic application structure"
fi

# Create data directory for JSON storage
echo -e "\n${YELLOW}Setting up data directory for JSON storage...${NC}"
sudo mkdir -p "$APP_RESOURCES/app/data/users"
sudo mkdir -p "$APP_RESOURCES/app/data/progress"
sudo mkdir -p "$APP_RESOURCES/app/data/stats"
echo -e "${GREEN}✓ Data directories created${NC}"
log "Data directories created"

# Make script files executable
echo -e "\n${YELLOW}Making scripts executable...${NC}"
sudo chmod +x "$APP_RESOURCES/app/run-tests.sh"
log "Scripts made executable"

# Set permissions
echo -e "\n${YELLOW}Setting permissions...${NC}"
sudo chown -R $USER:staff "$INSTALL_DIR"
sudo chmod -R 755 "$INSTALL_DIR"
echo -e "${GREEN}✓ Permissions set${NC}"
log "Set application permissions"

# No LaunchAgent setup needed as per updated installation process

# Check for serial port access
echo -e "\n${YELLOW}Checking for serial port access...${NC}"
if groups | grep -q -e dialout -e uucp; then
  echo -e "${GREEN}✓ User has serial port access${NC}"
  log "User has serial port access"
else
  echo -e "${YELLOW}Setting up serial port access...${NC}"
  sudo dscl . -append /Groups/_uucp GroupMembership $(whoami)
  echo -e "${GREEN}✓ Serial port access configured${NC}"
  echo -e "${YELLOW}Note: You may need to log out and back in for changes to take effect${NC}"
  log "Configured serial port access for user"
fi

echo -e "\n${GREEN}==================================================${NC}"
echo -e "${GREEN}       SuperMorse Installation Complete!       ${NC}"
echo -e "${GREEN}==================================================${NC}"
echo -e "\nThe SuperMorse application has been installed to your Applications folder."
echo -e "\nTo start the application now, you can click on it in the Applications folder"
echo -e "or run: ${BLUE}open ${INSTALL_DIR}${NC}"
echo -e "\nTo run tests, use:"
echo -e "${BLUE}cd ${INSTALL_DIR}/Contents/Resources/app && ./run-tests.sh${NC}"
echo -e "\nFor more information, see the README.md file."
echo -e "\nInstallation log saved to: ${LOGFILE}"