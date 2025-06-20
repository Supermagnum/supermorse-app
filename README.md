# Supermorse - Morse Code Training Application

Supermorse is a desktop application for learning Morse code progressively using sound output and a real physical Morse key connected through an Arduino. The application implements the Koch method, a scientifically-backed learning approach that has proven to be one of the most effective ways to learn Morse code.


## The programming:
I have a neurological condition that makes it impossible for me to understand programming.
I had to use a AI,Claude.

## It's untested and needs testing and debugging

## Features

- **Progressive Learning**: Start with just two characters and expand as you master them
- **Audio and Visual Feedback**: Characters are played as audio and shown visually during learning
- **Physical Key Integration**: Practice with a real Morse key connected via Arduino
- **Real-time Feedback**: Immediate color-coded feedback on your keying accuracy
- **Adaptive Difficulty**: New characters are introduced only when you reach 90% accuracy
- **Multiple Learning Stages**: Core International Morse, Regional Characters, Prosigns & Symbols, Confusion Mode
- **Regional Support**: Includes special characters for multiple countries
- **Session Management**: Recommended 30-minute sessions with breaks
- **Adjustable Speed**: Supports Farnsworth timing and different WPM settings
- **User Accounts**: Track your progress across sessions
- **Mumble Integration**: Connect with other Morse code enthusiasts.
- Please read this to understand what the modified Mumble server can do: https://github.com/Supermagnum/supermorse-app/blob/main/supermorse-mumble/README.md

## Electron Implementation

Supermorse is built using Electron, which allows it to run as a native desktop application on Windows, macOS, and Linux. The Electron implementation provides several advantages over a web application:

- **Native Serial Port Access**: More reliable communication with Arduino devices
- **Offline Support**: Use the application without an internet connection
- **Native UI**: System tray integration, native menus, and dialogs
- **Auto-updates**: Easily update to the latest version

## Development

### Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)
- MariaDB (for user accounts and progress tracking) - also used by cqrlog, a popular ham radio logging program
- Arduino IDE (for flashing the Arduino firmware)

### Setup

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/supermorse-app.git
   cd supermorse-app
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the application in development mode:
   ```
   npm run electron-dev
   ```

### Project Structure

- `main.js` - Electron main process
- `preload.js` - Preload script for Electron
- `server.js` - Express server for API endpoints
- `models/` - Sequelize models for MariaDB
- `config/` - Configuration files including database.js for Sequelize
- `routes/` - API routes
- `public/` - Web application files
  - `js/` - JavaScript modules
  - `css/` - CSS styles
  - `arduino/` - Arduino firmware
- `docs/` - Documentation
  - `mumble-server-setup.md` - Guide for deploying a Mumble server on Ubuntu

## Building

### General Build Instructions

To build the application for distribution:

1. For all platforms:
   ```
   npm run dist
   ```

2. For a specific platform:
   ```
   npm run dist -- --win    # Windows
   npm run dist -- --mac    # macOS
   npm run dist -- --linux  # Linux
   ```

The built applications will be in the `dist` directory.

### Platform-Specific Build Scripts

We provide automated build scripts for all major platforms that handle the entire setup process:

#### Linux Build Script

For Linux users, we provide an automated build script that handles the entire setup process, including:

1. Installing all required dependencies
2. Setting up MariaDB
3. Building the Electron application
4. Building the modified Mumble server
5. Configuring the Mumble server
6. Setting up system services

To use the build script:

1. Make sure the script is executable:
   ```
   chmod +x build-linux.sh
   ```

2. Run the script:
   ```
   ./build-linux.sh
   ```

3. Follow the prompts during the installation process

The script will guide you through the entire setup process and provide instructions for running the application when it's complete.

**Requirements for the Linux Build Script:**
- Ubuntu 20.04 or newer (or compatible distribution)
- Sudo privileges (for installing dependencies)
- Internet connection (for downloading dependencies)
- At least 4GB of free disk space

**What the Linux Script Does:**
1. Installs system dependencies (build tools, Qt libraries, MariaDB, etc.)
2. Sets up MariaDB for user data storage
3. Builds the Electron application
4. Clones and builds the modified Mumble server
5. Configures the Mumble server with HF band channels
6. Sets up authentication between Supermorse and Mumble
7. Creates system services for the Mumble server
8. Configures the firewall to allow necessary connections

#### Windows Build Script

For Windows users, we provide a PowerShell script that automates the setup process:

1. Run PowerShell as a regular user (not as Administrator)
2. Navigate to the supermorse-app directory
3. Run the script:
   ```
   .\build-windows.ps1
   ```

4. Follow the prompts during the installation process

**Requirements for the Windows Build Script:**
- Windows 10 or newer
- PowerShell 5.1 or newer
- Administrator rights (for installing dependencies, but don't run the script as Administrator)
- Visual Studio with C++ development tools (for building Mumble)
- Internet connection (for downloading dependencies)
- At least 4GB of free disk space

**What the Windows Script Does:**
1. Installs Chocolatey package manager if not already installed
2. Uses Chocolatey to install MariaDB, Qt, and other dependencies
3. Builds the Electron application
4. Provides guidance for building the modified Mumble server
5. Configures the Mumble server
6. Sets up Windows services for the Mumble server
7. Generates SSL certificates for secure communication

#### macOS Build Script

For macOS users, we provide a shell script that automates the setup process:

1. Make sure the script is executable:
   ```
   chmod +x build-macos.sh
   ```

2. Run the script:
   ```
   ./build-macos.sh
   ```

3. Follow the prompts during the installation process

**Requirements for the macOS Build Script:**
- macOS 10.15 (Catalina) or newer
- Homebrew (will be installed if not present)
- Administrator rights (for installing dependencies)
- Internet connection (for downloading dependencies)
- At least 4GB of free disk space

**What the macOS Script Does:**
1. Installs Homebrew if not already installed
2. Uses Homebrew to install MariaDB, Qt, and other dependencies
3. Builds the Electron application
4. Provides guidance for building the modified Mumble server
5. Configures the Mumble server
6. Creates LaunchAgents for the Mumble server
7. Generates SSL certificates for secure communication

These scripts significantly simplify the setup process across all platforms, especially for the modified Mumble server component.

## Arduino Setup

1. Connect your Arduino board to your computer
2. Open the Arduino IDE
3. Load the `arduino/morse_decoder.ino` file
4. Upload the firmware to your Arduino

## Key Types

The application supports different types of Morse keys:

1. **Straight Key** - A simple up-down key
2. **Paddle (Single Lever)** - A paddle used as a single lever
3. **Paddle (Iambic Mode A)** - A dual-lever paddle with Curtis A timing
4. **Paddle (Iambic Mode B)** - A dual-lever paddle with alternating element timing

## Mumble Server Deployment

Supermorse includes integration with a customized version of Mumble, an open-source voice chat application, allowing users to connect and practice Morse code together. This is not a standard Mumble server, but a modified version with special features for amateur radio simulation. For detailed instructions on deploying this customized Mumble server on Ubuntu, see:

- [Supermorse Mumble Server Deployment Guide](docs/mumble-server-setup.md)

This guide covers:
- Installation and building of the modified server
- Configuration with HF band channels and propagation simulation
- User authentication and integration with Supermorse
- HF propagation simulation based on Maidenhead grid locators
- Security considerations and troubleshooting

## Architecture

The application uses a hybrid architecture:

1. **Electron Main Process** (`main.js`):
   - Manages the application lifecycle
   - Handles serial communication with Arduino
   - Provides native UI features

2. **Express Server** (`server.js`):
   - Runs within Electron
   - Provides API endpoints for authentication and progress tracking
   - Manages MariaDB connection using Sequelize

3. **Web Application** (`public/`):
   - Provides the user interface
   - Handles Morse code learning logic
   - Communicates with the main process via IPC

## License

This project is open source and available under the MIT License.

## Acknowledgments

- Special thanks to the Morse code community for preserving this historic communication method
- Inspired by modern spaced-repetition learning techniques
