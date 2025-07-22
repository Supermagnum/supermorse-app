# SuperMorse App

# ⛔Under testing and debugging⛔


A comprehensive Morse code tutor and HF communication application with Arduino integration and progressive unlocking of features.

## About SuperMorse

SuperMorse is a modern implementation of the Koch method for learning Morse code, enhanced with features for physical key integration, visual feedback, and simulated HF communication. The application progressively unlocks features as you master Morse code elements, eventually enabling morse communication through a modified Murmur server.


## The Koch Method

The Koch method, named after German psychologist Ludwig Koch from Technische Hochschule, Braunschweig, in 1931, uses the full target speed from the outset but begins with just two characters. Once strings containing those two characters can be copied with 90% accuracy, an additional character is added, and so on until the full character set is mastered.

What makes this method so effective:

- **Full Speed from the Start**: Unlike other methods that start slow and speed up, Koch uses the target speed immediately, training your brain to recognize the sounds at the speed you'll actually use.
- **Progressive Character Introduction**: By starting with just two characters and adding more only after mastery, the method prevents overwhelm.
- **Proven Results**: Koch himself, with hand-picked students, got a group to master receiving Morse code at 13 WPM in a mere 13.5 hours - much faster than any other method in the psychological literature.
- **Based on Learned Reflexes**: The method builds muscle memory and auditory reflexes, making it effective for both receiving and sending Morse code.

SuperMorse implements this method while adding modern features like regional character support, visual feedback, and integration with physical keys through Arduino.

## Simple Data Storage

SuperMorse uses simple JSON files for all data storage:
- No database server required
- No potential package conflicts
- Easy to backup and restore
- Portable across different systems

All user data, progress tracking, and settings are stored in plain JSON files in the `data` directory.

## Screenshots

Get a visual overview of the SuperMorse application, with  all features unlocked:

- [Login Screen](https://github.com/Supermagnum/supermorse-app/blob/main/Screenshots/login.png) - User authentication interface
- [Progress Tracking](https://github.com/Supermagnum/supermorse-app/blob/main/Screenshots/progress.png) - Track your Morse code learning progress
- [Training Interface](https://github.com/Supermagnum/supermorse-app/blob/main/Screenshots/training.png) - Morse code learning with Arduino input
- [Listening Mode](https://github.com/Supermagnum/supermorse-app/blob/main/Screenshots/listening.png) - Practice listening to Morse code with keyboard input
- [Regional Morse Code](https://github.com/Supermagnum/supermorse-app/blob/main/Screenshots/regional.png) - Unlock and practice regional Morse code variations
- [Murmur HF Communication](https://github.com/Supermagnum/supermorse-app/blob/main/Screenshots/murmur.png) - Communicate using Morse code in simulated HF bands



## Features

- Progressive Morse code learning using the Koch method (starting with K and M)
- User authentication with chase sensitive username/password and email registration
- Session tracking with 30-minute lessons and break recommendations
- Configurable sinusoidal tone with adjustable frequency
- Farnsworth timing support (faster characters with increased spacing) for more effective learning
- Selectable audio output device for different speakers or headphones
- Sidetone feedback to hear what you're sending with physical keys
- Arduino integration for physical Morse key input
- Two complementary training modes:
  - **Morse Code Training**: Arduino input only for learning to send Morse code with physical keys
  - **Listening training**: Keyboard input only for learning to copy/listen to Morse code
- Mastery type tracking that distinguishes between sending and listening-only skills
- Access control in Murmur channels based on mastery type (users who only master listening cannot send in HF band channels)
- Automatic logout when the application is closed
- Detailed progress tracking and statistics
- Progressive unlocking of character sets and features:
  1. International Morse code
  2. Prosigns
  3. Special characters
  4. Regional Morse code variations and Murmur HF communication with simulated band conditions
 
## Needed Hardware
One of these:
- **Seeeduino XIAO** – The smallest compatible Arduino board. Can fit into the morse key base.
- **Seeeduino XIAO ESP32-C6 boards**
- **Arduino Micro boards**
- **Arduino Nano boards**
- **Dual-paddle Morse key**
- **Suitable USB cable**
- **3-conductor wire**
- **Any computer** with USB ports, screen, and keyboard 



**Note**: You must be logged in to the Supermorse app to access training features, track progress, and change settings. These are hidden until you have logged in.

## Arduino Pin Configuration

The Arduino firmware supports iambic paddle keys. Here's how to connect your paddle:

### Pin Assignments
- **Pin 2** - Paddle dot contact
- **Pin 3** - Paddle dash contact

### Connection Instructions
Connect the dot paddle to pin 2, dash paddle to pin 3, and common to ground

All input pins use internal pull-up resistors, so paddles should connect to ground when pressed. The software supports two operating modes:

- Iambic paddle mode A (Curtis A)
- Iambic paddle mode B

You can switch between these modes in the application settings or by sending commands via the serial interface.

# Arduino firmware:
The SuperMorse app supports multiple Arduino boards. Choose the appropriate firmware for your board:

- [Xiao ESP32-C6](https://github.com/Supermagnum/supermorse-app/tree/main/arduino/morse_decoder/morse_decoder_Xiao_ESP32-C6/morse_decoder_Xiao_ESP32-C6.ino) - For Seeeduino XIAO ESP32-C6 boards
- [Xiao SAMD21](https://github.com/Supermagnum/supermorse-app/tree/main/arduino/morse_decoder/morse_decoder_Xiao_SAMD21.ino) - For Seeeduino XIAO SAMD21 boards, sometimes called Seeeduino XIAO.
- [Arduino Micro](https://github.com/Supermagnum/supermorse-app/tree/main/arduino/morse_decoder/morse_decoder_Arduino_Micro.ino) - For Arduino Micro boards
- [Arduino Nano](https://github.com/Supermagnum/supermorse-app/tree/main/arduino/morse_decoder/morse_decoder_Arduino_Nano.ino) - For Arduino Nano boards

Each version includes built-in LED diagnostic feedback that flashes the onboard LED when input is detected.


## Distribution

SuperMorse is built using Electron, which provides significant advantages for distribution:

### Cross-Platform Compatibility
- **One Codebase, Multiple Platforms**: The same application code runs on Windows, macOS, and Linux
- **Native-Like Experience**: Users get a consistent experience that feels native to their operating system
- **Automatic Updates**: Built-in mechanisms for keeping the application up-to-date

### Self-Contained Packages
- **No External Dependencies**: All required libraries and runtimes are bundled in the application package
- **No Installation Prerequisites**: Users don't need to install Node.js, npm, or other dependencies
- **Simplified Deployment**: The application works immediately after installation without additional setup

### Packaging Benefits
- **Optimized Binaries**: Application is packaged into optimized binaries for each target platform
- **Resource Bundling**: All resources (HTML, CSS, JavaScript, images) are bundled into the application
- **Security Sandboxing**: Application runs in a controlled environment with configurable permissions

SuperMorse leverages these capabilities to provide a seamless installation experience across all supported operating systems. When you download a distributed version of SuperMorse, everything needed to run the application is included in the package.

## Normal User Installation

If you just want to use SuperMorse without building it from source, follow these instructions to install the pre-built application for your operating system.

### Download

Download the latest version of SuperMorse for your platform from the [Releases page](https://github.com/Supermagnum/supermorse-app/releases).

### Linux Installation

1. **Debian/Ubuntu (.deb package)**:
   ```bash
   # Install the downloaded .deb package
   sudo dpkg -i supermorse_1.0.0_amd64.deb
   
   # If there are dependency issues, run
   sudo apt-get install -f
   ```

2. **AppImage**:
   ```bash
   # Make the AppImage executable
   chmod +x SuperMorse-1.0.0.AppImage
   
   # Run the application
   ./SuperMorse-1.0.0.AppImage
   ```

3. **USB Permissions for Arduino**:
   ```bash
   # Add your user to the dialout group to access serial ports
   sudo usermod -a -G dialout $USER
   
   # Log out and log back in for changes to take effect
   ```

4. **Starting SuperMorse**:
   - Launch from your applications menu, or
   - Run from terminal: `supermorse-app`

### macOS Installation

1. **Mount the DMG**:
   - Double-click the downloaded `SuperMorse-1.0.0.dmg` file
   - Drag the SuperMorse app to your Applications folder

2. **First Launch**:
   - Go to Applications in Finder
   - Right-click (or Control+click) on SuperMorse and select "Open"
   - Click "Open" on the security dialog (only needed the first time)

3. **USB Permissions**:
   - When connecting an Arduino, macOS may prompt for permissions
   - Open System Preferences > Security & Privacy > Privacy > USB
   - Ensure SuperMorse has permission to access USB devices

4. **Troubleshooting**:
   - If you see "App is damaged" message, open Terminal and run:
     ```bash
     xattr -cr /Applications/SuperMorse.app
     ```

### Windows Installation

1. **Run the Installer**:
   - Double-click the downloaded `SuperMorse-Setup-1.0.0.exe`
   - Follow the installation wizard prompts

2. **Windows Security**:
   - If Windows SmartScreen appears, click "More info" and "Run anyway"

3. **Arduino Drivers**:
   - For Arduino connectivity, you may need to install drivers
   - Windows 10/11 usually installs these automatically
   - For manual installation, visit [Arduino's driver page](https://www.arduino.cc/en/Guide/DriverInstallation)

4. **Starting SuperMorse**:
   - Launch from the Start menu, or
   - Use the desktop shortcut created during installation

### First-Time Setup

After installation on any platform:

1. **Create a User Account**:
   - Launch SuperMorse
   - Click "Register" to create a new user account
   - Fill in your details and complete registration

2. **Arduino Setup** (optional):
   - Connect your Arduino board via USB
   - Upload the appropriate firmware for your board from the Arduino firmware section
   - Select your board type in SuperMorse settings

3. **Audio Settings**:
   - Configure your preferred audio output device
   - Adjust the tone frequency and volume as needed

For more information on using SuperMorse, see the Features section above.

## Modified Mumble server.
It is located here.
https://github.com/Supermagnum/Supermorse-server

## Installation (For Building From Source)

**Note:** These installation steps are only necessary if you want to build the application from source. If you're using the distributed version of SuperMorse, it already contains everything needed to run the application, that does not include the server.

For a detailed changelog of all project modifications, see [changes.md](https://github.com/Supermagnum/supermorse-app/blob/main/changes.md).

Any help is appreciated.

Please read bug report:
https://github.com/Supermagnum/supermorse-app/blob/main/debug.md


⛔These scripts may be potentially unsafe, they haven't been fully  audited!⛔


### Linux (Ubuntu)
```bash
# Clone the repository
git clone https://github.com/Supermagnum/supermorse-app.git
cd supermorse-app

# Run the Linux installation script
./install-linux.sh
```

### Windows
```bash
# Clone the repository
git clone https://github.com/Supermagnum/supermorse-app.git
cd supermorse-app

# Run the Windows installation script
.\install-windows.bat
```

### running the app in debug mode:
To run the SuperMorse app in debug mode, use the following command:

npm run dev


### macOS
```bash
# Clone the repository
git clone https://github.com/Supermagnum/supermorse-app.git
cd supermorse-app

# Run the macOS installation script
./install-mac.sh
```

Arduino pinouts and board sizes
https://github.com/Supermagnum/supermorse-app/tree/main/Arduino_variants_pinouts

## Testing User Creation Functionality

To verify that the registration form can successfully create users:

### Quick Test

Run the standalone test script:

```bash
node test-create-user.js
```

This script directly tests the user creation functionality without requiring the full Electron app.

### Using the Test Runner

For more comprehensive testing, use the test runner script:

```bash
./run-tests.sh
```

This will present a menu of available tests:

1. **Simple User Creation Test** - Direct standalone test of user creation
2. **Verify User Creation** - Full verification of user creation functionality
3. **End-to-End Registration Test** - Complete test of registration form
4. **Run All Tests** - Run all available tests

## Development Notes

This application was developed with the assistance of AI (Claude from Anthropic) due to a neurological condition related to dyscalculia that makes programming extremely difficult for me. The AI assistance made it possible to implement complex features and functionality despite these challenges.

For more detailed information, see the documentation in the `tests` directory.

