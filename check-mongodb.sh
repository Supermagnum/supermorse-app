#!/bin/bash

# Script to check MongoDB status and start it if needed

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'  # No Color

# Print colored message
print_message() {
    echo -e "${BLUE}[SUPERMORSE]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if MongoDB is installed
print_message "Checking if MongoDB is installed..."
if command -v mongod &> /dev/null; then
    print_success "MongoDB is installed"
else
    print_error "MongoDB is not installed"
    print_message "Please run the build-linux.sh script to install MongoDB:"
    echo "  ./build-linux.sh"
    exit 1
fi

# Check if MongoDB service is running
print_message "Checking if MongoDB service is running..."
if systemctl is-active --quiet mongod; then
    print_success "MongoDB service is running"
else
    print_warning "MongoDB service is not running"
    print_message "Starting MongoDB service..."
    sudo systemctl start mongod
    
    # Check if MongoDB service started successfully
    if systemctl is-active --quiet mongod; then
        print_success "MongoDB service started successfully"
    else
        print_error "Failed to start MongoDB service"
        print_message "Please check MongoDB installation and try again"
        exit 1
    fi
fi

# Check if MongoDB is accessible
print_message "Checking if MongoDB is accessible..."
if nc -z localhost 27017; then
    print_success "MongoDB is accessible at localhost:27017"
else
    print_error "MongoDB is not accessible at localhost:27017"
    print_message "Please check MongoDB configuration and firewall settings"
    exit 1
fi

print_success "MongoDB is installed, running, and accessible"
print_message "You can now start the Supermorse application"