#!/bin/bash
# Build and installation script for the Supermorse Mumble Server

# Exit on error
set -e

# Determine if running as root
if [[ $EUID -ne 0 ]]; then
    echo "This script requires some steps to be run as root. You may be prompted for your password."
fi

# Function to check if a package is installed
check_package() {
    if command -v apt-get &> /dev/null; then
        # Debian/Ubuntu
        if ! dpkg -l | grep -q "$1"; then
            echo "Package $1 is not installed. Installing..."
            sudo apt-get update
            sudo apt-get install -y "$1"
        fi
    elif command -v dnf &> /dev/null; then
        # Fedora/RHEL
        if ! dnf list installed "$1" &> /dev/null; then
            echo "Package $1 is not installed. Installing..."
            sudo dnf install -y "$1"
        fi
    elif command -v pacman &> /dev/null; then
        # Arch Linux
        if ! pacman -Q "$1" &> /dev/null; then
            echo "Package $1 is not installed. Installing..."
            sudo pacman -S --noconfirm "$1"
        fi
    else
        echo "WARNING: Unsupported package manager. Please install $1 manually."
    fi
}

# Check and install required packages
echo "Checking for required packages..."
required_packages=("cmake" "g++" "make" "qtbase5-dev" "libqt5core5a" "libqt5network5")

# Install required packages
for package in "${required_packages[@]}"; do
    check_package "$package"
done

# Create build directory
echo "Creating build directory..."
mkdir -p build
cd build

# Configure with CMake
echo "Configuring with CMake..."
cmake ..

# Build
echo "Building the project..."
cmake --build . --config Release

# Check if installation should be performed
read -p "Do you want to install the server? This requires sudo privileges. (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Create supermorse user and group if they don't exist
    echo "Setting up supermorse user and group..."
    if ! getent group supermorse > /dev/null; then
        sudo groupadd supermorse
    fi
    if ! getent passwd supermorse > /dev/null; then
        sudo useradd -r -g supermorse -s /bin/false -d /var/lib/supermorse supermorse
    fi

    # Install the server
    echo "Installing the server..."
    sudo cmake --install .

    # Create data directory for JSON file storage
    sudo mkdir -p /var/lib/supermorse/data
    sudo touch /var/lib/supermorse/data/users.json
    sudo chown -R supermorse:supermorse /var/lib/supermorse
    sudo chmod 750 /var/lib/supermorse
    sudo chmod 640 /var/lib/supermorse/data/users.json

    # Create log directory
    sudo mkdir -p /var/log/supermorse
    sudo chown supermorse:supermorse /var/log/supermorse

    # Copy config file to /etc and update it to use JSON file
    sudo mkdir -p /etc/supermorse
    sudo cp ../config/mumble-server.ini /etc/supermorse/
    
    # Update the config to use JSON file instead of SQLite
    sudo sed -i 's/^database=.*/database=\/var\/lib\/supermorse\/data\/users.json/' /etc/supermorse/mumble-server.ini
    
    sudo chown -R supermorse:supermorse /etc/supermorse
    sudo chmod 750 /etc/supermorse
    sudo chmod 640 /etc/supermorse/mumble-server.ini

    # Create systemd service file
    echo "Creating systemd service..."
    cat << EOF | sudo tee /etc/systemd/system/supermorse.service > /dev/null
[Unit]
Description=SuperMorse Mumble Server
After=network.target

[Service]
Type=simple
User=supermorse
Group=supermorse
ExecStart=/usr/local/bin/murmur -ini /etc/supermorse/mumble-server.ini
WorkingDirectory=/var/lib/supermorse
Restart=on-failure
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

    # Reload systemd configuration
    sudo systemctl daemon-reload

    # Ask if the service should be enabled and started
    read -p "Do you want to enable and start the SuperMorse service now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo systemctl enable supermorse.service
        sudo systemctl start supermorse.service
        echo "SuperMorse service has been enabled and started."
        echo "Check status with: sudo systemctl status supermorse.service"
    else
        echo "SuperMorse service has been created but not started."
        echo "To start it later, run: sudo systemctl start supermorse.service"
    fi

    echo "Installation completed successfully!"
    echo "User database is stored as a JSON file at: /var/lib/supermorse/data/users.json"
else
    echo "Installation skipped. The murmur executable can be found in build/bin/"
fi