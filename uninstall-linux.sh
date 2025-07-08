#!/bin/bash
# SuperMorse Uninstallation Script for Linux Ubuntu
# This script removes the SuperMorse application, services, and user/group

# Colors for console output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Installation directory
INSTALL_DIR="/opt/supermorse"

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}    SuperMorse Application - Linux Uninstaller    ${NC}"
echo -e "${BLUE}==================================================${NC}"

# Create a log file
LOGFILE="supermorse_uninstall.log"
echo "SuperMorse Uninstallation Log - $(date)" > "$LOGFILE"

# Function to log messages
log() {
  echo "$1" | tee -a "$LOGFILE"
}

# Check if running as root (avoid this)
if [ "$(id -u)" = "0" ]; then
   echo -e "${RED}This script should not be run as root${NC}"
   echo -e "Please run without sudo. The script will ask for sudo access when needed."
   exit 1
fi

# Stop and disable the systemd service
echo -e "\n${YELLOW}Stopping and disabling SuperMorse service...${NC}"
if systemctl is-active --quiet supermorse.service; then
  sudo systemctl stop supermorse.service
  echo -e "${GREEN}✓ SuperMorse service stopped${NC}"
  log "SuperMorse service stopped"
else
  echo -e "${YELLOW}SuperMorse service is not running${NC}"
  log "SuperMorse service not running"
fi

if systemctl is-enabled --quiet supermorse.service; then
  sudo systemctl disable supermorse.service
  echo -e "${GREEN}✓ SuperMorse service disabled${NC}"
  log "SuperMorse service disabled"
else
  echo -e "${YELLOW}SuperMorse service is not enabled${NC}"
  log "SuperMorse service not enabled"
fi

# Remove the systemd service file
echo -e "\n${YELLOW}Removing systemd service file...${NC}"
if [ -f /etc/systemd/system/supermorse.service ]; then
  sudo rm /etc/systemd/system/supermorse.service
  sudo systemctl daemon-reload
  echo -e "${GREEN}✓ Systemd service file removed${NC}"
  log "Systemd service file removed"
else
  echo -e "${YELLOW}Systemd service file not found${NC}"
  log "Systemd service file not found"
fi

# Remove desktop shortcut
echo -e "\n${YELLOW}Removing desktop shortcut...${NC}"
if [ -f /usr/share/applications/supermorse.desktop ]; then
  sudo rm /usr/share/applications/supermorse.desktop
  echo -e "${GREEN}✓ Desktop shortcut removed${NC}"
  log "Desktop shortcut removed"
else
  echo -e "${YELLOW}Desktop shortcut not found${NC}"
  log "Desktop shortcut not found"
fi

# Remove installation directory
echo -e "\n${YELLOW}Removing installation directory...${NC}"
if [ -d "$INSTALL_DIR" ]; then
  sudo rm -rf "$INSTALL_DIR"
  echo -e "${GREEN}✓ Installation directory removed${NC}"
  log "Installation directory removed"
else
  echo -e "${YELLOW}Installation directory not found${NC}"
  log "Installation directory not found"
fi

# Ask if user wants to remove the supermorse user and group
echo -e "\n${YELLOW}Do you want to remove the supermorse user and group? (y/n)${NC}"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
  # Remove supermorse user
  if id -u supermorse > /dev/null 2>&1; then
    sudo userdel supermorse
    echo -e "${GREEN}✓ Removed supermorse user${NC}"
    log "Removed supermorse user"
  else
    echo -e "${YELLOW}supermorse user not found${NC}"
    log "supermorse user not found"
  fi

  # Remove supermorse group
  if getent group supermorse > /dev/null; then
    sudo groupdel supermorse
    echo -e "${GREEN}✓ Removed supermorse group${NC}"
    log "Removed supermorse group"
  else
    echo -e "${YELLOW}supermorse group not found${NC}"
    log "supermorse group not found"
  fi
else
  echo -e "${YELLOW}Skipping removal of supermorse user and group${NC}"
  log "Skipped removal of supermorse user and group"
fi

echo -e "\n${GREEN}==================================================${NC}"
echo -e "${GREEN}     SuperMorse Uninstallation Complete!      ${NC}"
echo -e "${GREEN}==================================================${NC}"
echo -e "\nSuperMorse has been uninstalled from your system."
echo -e "\nUninstallation log saved to: ${LOGFILE}"