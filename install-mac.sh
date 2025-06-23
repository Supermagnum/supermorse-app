#!/bin/bash
# SuperMorse Installation Script for macOS
# This script installs all dependencies and sets up the SuperMorse application

# Colors for console output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Create data directory for JSON storage
echo -e "\n${YELLOW}Setting up data directory for JSON storage...${NC}"
mkdir -p data/users
mkdir -p data/progress
mkdir -p data/stats
echo -e "${GREEN}✓ Data directories created${NC}"
log "Data directories created"

# Make script files executable
echo -e "\n${YELLOW}Making scripts executable...${NC}"
chmod +x run-tests.sh
log "Scripts made executable"

# Check for serial port access
echo -e "\n${YELLOW}Checking for serial port access...${NC}"
if groups | grep -q -e dialout -e uucp; then
  echo -e "${GREEN}✓ User has serial port access${NC}"
  log "User has serial port access"
else
  echo -e "${YELLOW}You may need additional permissions to access Arduino devices.${NC}"
  echo -e "If you have issues accessing Arduino, try running:"
  echo -e "${BLUE}sudo dscl . -append /Groups/_uucp GroupMembership $(whoami)${NC}"
  log "User may need additional serial port access"
fi

echo -e "\n${GREEN}==================================================${NC}"
echo -e "${GREEN}       SuperMorse Installation Complete!       ${NC}"
echo -e "${GREEN}==================================================${NC}"
echo -e "\nTo start the application, run:"
echo -e "${BLUE}npm start${NC}"
echo -e "\nTo run tests, use:"
echo -e "${BLUE}./run-tests.sh${NC}"
echo -e "\nFor more information, see the README.md file."
echo -e "\nInstallation log saved to: ${LOGFILE}"