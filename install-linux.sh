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

# Create supermorse user and group if they don't exist
echo -e "\n${YELLOW}Setting up supermorse user and group...${NC}"
if ! getent group supermorse > /dev/null; then
  sudo groupadd supermorse
  echo -e "${GREEN}✓ Created supermorse group${NC}"
  log "Created supermorse group"
else
  echo -e "${GREEN}✓ supermorse group already exists${NC}"
  log "supermorse group already exists"
fi

if ! id -u supermorse > /dev/null 2>&1; then
  sudo useradd -r -g supermorse -s /bin/false -d /opt/supermorse supermorse
  echo -e "${GREEN}✓ Created supermorse user${NC}"
  log "Created supermorse user"
else
  echo -e "${GREEN}✓ supermorse user already exists${NC}"
  log "supermorse user already exists"
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
if [ -d "dist/linux-unpacked" ]; then
  sudo cp -r dist/linux-unpacked/* $INSTALL_DIR/
  echo -e "${GREEN}✓ Application installed successfully${NC}"
  log "Application installed from dist/linux-unpacked"
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

# Set ownership and permissions
echo -e "\n${YELLOW}Setting permissions...${NC}"
sudo chown -R supermorse:supermorse $INSTALL_DIR
sudo chmod -R 755 $INSTALL_DIR
echo -e "${GREEN}✓ Permissions set${NC}"
log "Permissions set for supermorse user"

# Create systemd service file
echo -e "\n${YELLOW}Creating systemd service...${NC}"
cat << EOF | sudo tee /etc/systemd/system/supermorse.service > /dev/null
[Unit]
Description=SuperMorse Application Service
After=network.target

[Service]
Type=simple
User=supermorse
Group=supermorse
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/bin/node $INSTALL_DIR/main.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=supermorse

[Install]
WantedBy=multi-user.target
EOF

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Systemd service created${NC}"
  log "Systemd service created"
else
  echo -e "${RED}Failed to create systemd service.${NC}"
  log "Failed to create systemd service"
  exit 1
fi

# Make script files executable
echo -e "\n${YELLOW}Making scripts executable...${NC}"
sudo chmod +x $INSTALL_DIR/run-tests.sh
log "Scripts made executable"

# Enable and start the service
echo -e "\n${YELLOW}Enabling and starting SuperMorse service...${NC}"
sudo systemctl daemon-reload
sudo systemctl enable supermorse.service
sudo systemctl start supermorse.service
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ SuperMorse service enabled and started${NC}"
  log "SuperMorse service enabled and started"
else
  echo -e "${RED}Failed to enable or start SuperMorse service.${NC}"
  log "Failed to enable or start SuperMorse service"
  exit 1
fi

# Create a desktop shortcut for the application
echo -e "\n${YELLOW}Creating desktop shortcut...${NC}"
cat << EOF | sudo tee /usr/share/applications/supermorse.desktop > /dev/null
[Desktop Entry]
Name=SuperMorse
Comment=Morse code tutor and HF communication app
Exec=$INSTALL_DIR/supermorse
Icon=$INSTALL_DIR/resources/icon.png
Terminal=false
Type=Application
Categories=Education;Utility;
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
echo -e "\nThe SuperMorse service is now running!"
echo -e "\nTo check service status, run:"
echo -e "${BLUE}sudo systemctl status supermorse.service${NC}"
echo -e "\nTo stop the service, run:"
echo -e "${BLUE}sudo systemctl stop supermorse.service${NC}"
echo -e "\nTo run tests, use:"
echo -e "${BLUE}cd $INSTALL_DIR && ./run-tests.sh${NC}"
echo -e "\nFor more information, see the README.md file."
echo -e "\nInstallation log saved to: ${LOGFILE}"