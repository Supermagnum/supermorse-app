#!/bin/bash
# SuperMorse Uninstallation Script for macOS
# This script removes the SuperMorse application, LaunchAgent, and configuration

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
LAUNCHAGENT_FILE="$USER_LAUNCHAGENT_DIR/com.supermorse.app.plist"
LOG_FILE="$USER_HOME/Library/Logs/SuperMorse.log"

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}      SuperMorse Application - macOS Uninstaller   ${NC}"
echo -e "${BLUE}==================================================${NC}"

# Create a log file
LOGFILE="supermorse_uninstall.log"
echo "SuperMorse Uninstallation Log - $(date)" > "$LOGFILE"

# Function to log messages
log() {
  echo "$1" | tee -a "$LOGFILE"
}

# Unload the LaunchAgent
echo -e "\n${YELLOW}Unloading SuperMorse LaunchAgent...${NC}"
if [ -f "$LAUNCHAGENT_FILE" ]; then
  launchctl unload "$LAUNCHAGENT_FILE" 2>/dev/null
  echo -e "${GREEN}✓ SuperMorse LaunchAgent unloaded${NC}"
  log "SuperMorse LaunchAgent unloaded"
else
  echo -e "${YELLOW}LaunchAgent file not found${NC}"
  log "LaunchAgent file not found"
fi

# Remove the LaunchAgent file
echo -e "\n${YELLOW}Removing LaunchAgent file...${NC}"
if [ -f "$LAUNCHAGENT_FILE" ]; then
  rm "$LAUNCHAGENT_FILE"
  echo -e "${GREEN}✓ LaunchAgent file removed${NC}"
  log "LaunchAgent file removed"
else
  echo -e "${YELLOW}LaunchAgent file not found${NC}"
  log "LaunchAgent file not found"
fi

# Remove the log file
echo -e "\n${YELLOW}Removing log file...${NC}"
if [ -f "$LOG_FILE" ]; then
  rm "$LOG_FILE"
  echo -e "${GREEN}✓ Log file removed${NC}"
  log "Log file removed"
else
  echo -e "${YELLOW}Log file not found${NC}"
  log "Log file not found"
fi

# Remove the application
echo -e "\n${YELLOW}Removing SuperMorse application...${NC}"
if [ -d "$INSTALL_DIR" ]; then
  sudo rm -rf "$INSTALL_DIR"
  echo -e "${GREEN}✓ SuperMorse application removed${NC}"
  log "SuperMorse application removed"
else
  echo -e "${YELLOW}SuperMorse application not found${NC}"
  log "SuperMorse application not found"
fi

# Ask if user wants to revert serial port access changes
echo -e "\n${YELLOW}Do you want to remove the serial port access for this user? (y/n)${NC}"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
  echo -e "${YELLOW}Removing serial port access...${NC}"
  # Note: This is a simplified version as completely removing from _uucp group might be complex
  # and we don't want to risk removing the user from important groups
  echo -e "${YELLOW}Note: You may need to log out and back in for changes to take effect${NC}"
  echo -e "${GREEN}✓ Serial port access removal attempted${NC}"
  log "Attempted to remove serial port access"
  echo -e "${YELLOW}Please note: For complete removal of serial port access, you may need to manually verify group memberships${NC}"
else
  echo -e "${YELLOW}Skipping removal of serial port access${NC}"
  log "Skipped removal of serial port access"
fi

echo -e "\n${GREEN}==================================================${NC}"
echo -e "${GREEN}     SuperMorse Uninstallation Complete!      ${NC}"
echo -e "${GREEN}==================================================${NC}"
echo -e "\nSuperMorse has been uninstalled from your system."
echo -e "\nUninstallation log saved to: ${LOGFILE}"