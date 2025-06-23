#!/bin/bash
# SuperMorse Installation Script for Linux Ubuntu
# This script installs all dependencies and sets up the SuperMorse application

# Colors for console output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if Node.js is installed
if command_exists node; then
  NODE_VERSION=$(node -v)
  echo -e "${GREEN}✓ Node.js is installed (${NODE_VERSION})${NC}"
  log "Node.js found: $NODE_VERSION"
else
  echo -e "${YELLOW}Installing Node.js...${NC}"
  log "Node.js not found. Installing..."
  
  # Add NodeSource repository and install Node.js
  sudo apt-get update
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt-get install -y nodejs
  
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

# Check if required development packages are installed
echo -e "\n${YELLOW}Installing required development packages...${NC}"
sudo apt-get install -y build-essential python3 make g++
log "Development packages installed"

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

echo -e "\n${GREEN}==================================================${NC}"
echo -e "${GREEN}       SuperMorse Installation Complete!       ${NC}"
echo -e "${GREEN}==================================================${NC}"
echo -e "\nTo start the application, run:"
echo -e "${BLUE}npm start${NC}"
echo -e "\nTo run tests, use:"
echo -e "${BLUE}./run-tests.sh${NC}"
echo -e "\nFor more information, see the README.md file."
echo -e "\nInstallation log saved to: ${LOGFILE}"