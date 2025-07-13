# SuperMorse App

# ⛔Under testing and debugging⛔

⛔These scripts and code  may be potentially unsafe, they haven't been audited!⛔

Any help is appreciated.

Please read bug report:
https://github.com/Supermagnum/supermorse-app/blob/main/debug.md

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

## Modified Mumble server.
It is located here.
https://github.com/Supermagnum/Supermorse-server

## Installation
⛔These scripts may be potentially unsafe, they haven't been audited!⛔

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

### macOS
```bash
# Clone the repository
git clone https://github.com/Supermagnum/supermorse-app.git
cd supermorse-app

# Run the macOS installation script
./install-mac.sh
```

## Features

- Progressive Morse code learning using the Koch method (starting with K and M)
- User authentication with username/password and email registration
- Session tracking with 30-minute lessons and break recommendations
- Configurable sinusoidal tone with adjustable frequency
- Arduino integration for physical Morse key input
- Detailed progress tracking and statistics
- Progressive unlocking of character sets and features:
  1. International Morse code
  2. Prosigns
  3. Special characters
  4. Regional Morse code variations
  5. Murmur HF communication with simulated band conditions
 
## Needed Hardware

• **Seeeduino XIAO** – The smallest compatible Arduino board. Can fit into the morse key base.
  Other Arduino boards are also supported.
  
  Note: Arduino Pro mini does not have a built in USB port.

• **Dual-paddle Morse key** (other types also supported)

• **Suitable USB cable**

• **3-conductor wire**

• **Any computer** with USB ports, screen, and keyboard

## Arduino Pin Configuration

The Arduino firmware supports multiple Morse key types. Here's how to connect your key:

### Pin Assignments
- **Pin 2** - Straight key input or Paddle dot contact
- **Pin 3** - Paddle dash contact

### Connection Instructions
1. **For a straight key**: Connect your key to pin 2 and ground
2. **For a paddle key**: Connect the dot paddle to pin 2, dash paddle to pin 3, and common to ground

All input pins use internal pull-up resistors, so keys should connect to ground when pressed. The software can be configured to operate in different modes:

- Straight key mode
- Single paddle mode
- Iambic paddle mode A (Curtis A)
- Iambic paddle mode B

You can switch between these modes in the application settings or by sending commands via the serial interface.

# Arduino firmware:
https://github.com/Supermagnum/supermorse-app/tree/main/arduino

Arduino pinouts and board sizes
https://github.com/Supermagnum/supermorse-app/tree/main/Arduino_variants_pinouts

# Arduino Pin Tester Tool
for the Xiao ESP32-C6
This helps determine the correct GPIO
pins to use in the morse_decoder.ino sketch. Use this tool if:
- You are unsure if you have soldered correctly
- Some pins have stopped responding
- You need to verify your Arduino configuration

You will need these two files:
- [test-paddle-pins.js](https://github.com/Supermagnum/supermorse-app/blob/main/test-paddle-pins.js) - JavaScript tester for pin detection
- [pin_tester.ino](https://github.com/Supermagnum/supermorse-app/blob/main/arduino/pin_tester/pin_tester.ino) - Arduino sketch to interact with the tester

**Note:** The default port in test-paddle-pins.js is `ttyACM0`. 
You might need to adjust the `const portpath` value if your Arduino connects on a different port.

## Screenshots

Get a visual overview of the SuperMorse application:

- [Login Screen](https://github.com/Supermagnum/supermorse-app/blob/main/Screenshots/login.jpeg) - User authentication interface
- [Progress Tracking](https://github.com/Supermagnum/supermorse-app/blob/main/Screenshots/progress.jpeg) - Track your Morse code learning progress
- [Settings Interface](https://github.com/Supermagnum/supermorse-app/blob/main/Screenshots/settings.jpeg) - Configure your learning experience
- [Training Interface](https://github.com/Supermagnum/supermorse-app/blob/main/Screenshots/training.jpeg) - Morse code learning and practice
- [Murmur Communication](https://github.com/Supermagnum/supermorse-app/blob/main/Screenshots/murmur.jpeg) - HF communication feature

## Learning Progression

1. Start with K and M characters at full target speed (13 WPM default)
2. Achieve 90% accuracy to unlock new characters
3. 30-minute sessions with break recommendations for optimal learning
4. Progress to full international Morse code, prosigns, and special characters
5. Unlock regional character sets after mastering the standard sets
6. Finally unlock Murmur HF communication features for simulated radio communication

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

