#!/bin/bash
# SuperMorse Installation Script for Linux Ubuntu
# This script installs all dependencies, builds and sets up the SuperMorse application

# Colors for console output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Installation directory
INSTALL_DIR="/opt/supermorse"

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}       SuperMorse Application - Linux Setup       ${NC}"
echo -e "${BLUE}==================================================${NC}"

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check if running as root (avoid this)
if [ "$(id -u)" = "0" ]; then
   echo -e "${RED}This script should not be run as root${NC}"
   echo -e "Please run without sudo. Dependencies will ask for sudo access when needed."
   exit 1
fi

# Create a log file
LOGFILE="supermorse_install.log"
echo "SuperMorse Installation Log - $(date)" > "$LOGFILE"

# Function to log messages
log() {
  echo "$1" | tee -a "$LOGFILE"
}

# Check and install system dependencies
echo -e "\n${YELLOW}Checking system dependencies...${NC}"

# List of required packages
REQUIRED_PACKAGES="build-essential python3 make g++ libudev-dev libpam0g-dev"

# Check if Node.js is installed
if command_exists node; then
  NODE_VERSION=$(node -v)
  echo -e "${GREEN}✓ Node.js is installed (${NODE_VERSION})${NC}"
  log "Node.js found: $NODE_VERSION"
else
  echo -e "${YELLOW}Installing Node.js...${NC}"
  log "Node.js not found. Installing..."

  
 # Update package index
sudo apt update

# Install Node.js and npm from official Ubuntu repositories
sudo apt install nodejs npm

  
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

# Install required system packages
echo -e "\n${YELLOW}Installing required system packages...${NC}"
sudo apt-get update
sudo apt-get install -y $REQUIRED_PACKAGES
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Required system packages installed successfully${NC}"
  log "Required system packages installed"
else
  echo -e "${RED}Failed to install some required packages. See error above.${NC}"
  log "Failed to install required system packages"
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

# Create installation directory
echo -e "\n${YELLOW}Creating installation directory...${NC}"
sudo mkdir -p $INSTALL_DIR
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Installation directory created${NC}"
  log "Installation directory created"
else
  echo -e "${RED}Failed to create installation directory.${NC}"
  log "Failed to create installation directory"
  exit 1
fi

# Copy application files to installation directory
echo -e "\n${YELLOW}Installing application...${NC}"
if [ -d "dist/Linux/linux-unpacked" ]; then
  sudo cp -r dist/Linux/linux-unpacked/* $INSTALL_DIR/
  echo -e "${GREEN}✓ Application installed successfully${NC}"
  log "Application installed from dist/Linux/linux-unpacked"
else
  # If no build was created, copy the source files directly
  sudo cp -r . $INSTALL_DIR/
  echo -e "${YELLOW}No build found, copied source files directly${NC}"
  log "Copied source files directly to installation directory"
fi

# Create data directory for JSON storage
echo -e "\n${YELLOW}Setting up data directory for JSON storage...${NC}"
sudo mkdir -p $INSTALL_DIR/data/users
sudo mkdir -p $INSTALL_DIR/data/progress
sudo mkdir -p $INSTALL_DIR/data/stats
echo -e "${GREEN}✓ Data directories created${NC}"
log "Data directories created"

# Make script files executable if they exist
echo -e "\n${YELLOW}Making scripts executable...${NC}"
if [ -f "$INSTALL_DIR/run-tests.sh" ]; then
  sudo chmod +x $INSTALL_DIR/run-tests.sh
  log "Scripts made executable"
else
  echo -e "${YELLOW}No run-tests.sh script found${NC}"
  log "No run-tests.sh script found"
fi

# Create a desktop shortcut for the application
echo -e "\n${YELLOW}Creating desktop shortcut...${NC}"
cat << EOF | sudo tee /usr/share/applications/supermorse.desktop > /dev/null
[Desktop Entry]
Name=SuperMorse
Comment=Morse code tutor and HF communication app
Exec=$INSTALL_DIR/supermorse-app
Icon=$INSTALL_DIR/resources/icon.png
Terminal=false
Type=Application
Categories=hamradio;
EOF

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Desktop shortcut created${NC}"
  log "Desktop shortcut created"
else
  echo -e "${YELLOW}Failed to create desktop shortcut.${NC}"
  log "Failed to create desktop shortcut"
fi

echo -e "\n${GREEN}==================================================${NC}"
echo -e "${GREEN}       SuperMorse Installation Complete!       ${NC}"
echo -e "${GREEN}==================================================${NC}"
echo -e "\nYou can now run SuperMorse from your applications menu or directly with:"
echo -e "${BLUE}$INSTALL_DIR/supermorse-app${NC}"
echo -e "\nTo run tests, use (if available):"
echo -e "${BLUE}cd $INSTALL_DIR && ./run-tests.sh${NC}"
echo -e "\nFor more information, see the README.md file."
echo -e "\nInstallation log saved to: ${LOGFILE}"
