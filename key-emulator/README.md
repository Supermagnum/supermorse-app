# Morse Code Key Emulator

A Node.js program that emulates a Morse code key for the Supermorse app, following the suggested learning order from alphabets.js and sending input via emulated serial communication.

> **Important Note**: This emulator is designed to help you learn how to receive Morse code (decode), not how to send using a physical Morse key. For proper keying technique, you should practice with an actual telegraph key.

## Features

- **Progressive Learning**: Follows the exact learning sequence from alphabets.js for:
  - International characters (letters and numbers)
  - Prosigns (procedural signals)
  - Punctuation and special characters

- **Simultaneous Key Detection**: 
  - Supports simultaneous keypresses for prosigns
  - Example: Press 'A' + 'R' keys together to send the 'AR' prosign

- **Serial Emulation**:
  - Emulates an Arduino device sending Morse code via serial
  - Compatible with the Supermorse app's Arduino interface
  - Sends Morse code in the format expected by the application

- **Training Interface**:
  - Interactive console-based interface
  - Tracks progress and provides feedback
  - Supports both sequential and random practice modes

## Important: Authentication Required

**Note**: The Supermorse app requires user authentication before you can access training features, track progress, or change settings.

Before using this emulator:
1. Launch the Supermorse application
2. Complete the login or registration process
3. Once authenticated, you'll have access to the training section
4. Connect the emulated serial device as described below

Without logging in to the Supermorse app first, you won't be able to:
- Access the training module
- Save your progress
- Change Morse code settings
- Use the Arduino interface for input

## Installation
- npm (Node Package Manager)

### Dependencies

This program requires the following npm packages:

- `serialport`: For serial communication
- `keypress`: For detecting simultaneous keypresses

### Setup

1. **Install dependencies**:

```bash
cd key-emulator
npm install serialport keypress
```

2. **Configure serial port** (optional):

You can use a real serial port or a virtual one:

- For real hardware: Connect your computer to the device you want to use with Supermorse.
- For virtual ports: On Windows, you can use tools like [com0com](https://sourceforge.net/projects/com0com/); on macOS/Linux, you can use `socat`.

## Usage

### Starting the Program

Run the program from the key-emulator directory:

```bash
node morse-learning-program.js
```

### Main Menu

The program will display a menu with the following options:

1. Practice in sequence (follows learning order)
2. Practice randomly (within current category) 
3. Select category
4. View statistics
5. Exit

### Practicing Morse Code

When in practice mode:

1. The program will display a character to type
2. Type the character on your keyboard:
   - For regular characters, just press the corresponding key
   - For prosigns, press the keys simultaneously (e.g., press A+R together for the AR prosign)
3. The program will:
   - Convert your input to Morse code
   - Display the code visually
   - Send it via the selected serial port (if connected)
   - Provide feedback on correctness

### Prosign Input Guide

Prosigns are special Morse code sequences sent as a single character. To send them, press both keys simultaneously:

| Prosign | Keys to Press | Morse Representation | Meaning |
|---------|--------------|---------------------|---------|
| AR      | A + R        | .-.-. | End of message |
| SK      | S + K        | ...-.- | End of contact |
| BT      | B + T        | -...- | Break/new paragraph |
| KN      | K + N        | -.-. | Go ahead, specific station |

### Categories

The program follows the learning order from alphabets.js, divided into three categories:

1. **International Characters**: Letters (A-Z) and numbers (0-9), starting with K and M
2. **Prosigns**: AR, SK, BT, KN
3. **Special Characters**: Punctuation and symbols (.,:?+/=, etc.)

## Troubleshooting

### Serial Connection Issues

- Ensure you have the correct permissions to access the serial port
- On Linux, you might need to add your user to the 'dialout' group
- Check if other programs are using the same serial port

### Keyboard Detection Problems

- Make sure your keyboard supports N-key rollover for simultaneous key detection
- Some keyboard layouts might require adjustments to the key codes

### Program Crashes

- Check the Node.js version (should be v14 or higher)
- Ensure all dependencies are properly installed

## Integration with Supermorse

### Complete Workflow

1. **Start the Supermorse app**
2. **Log in to your account**:
   - Use your existing credentials or register a new account
   - Authentication is required to access training features
   - Your training progress is tied to your user account

3. **Start this emulator program**:
   ```bash
   npm start
   ```

4. **Select a serial port** when prompted by the emulator

5. **In the Supermorse app**:
   - Navigate to the Arduino connection section
   - Connect to the same serial port you selected in the emulator
   - The app should show "Connected" status once successful

6. **Access the training section** in Supermorse:
   - The app will now receive input from the emulator
   - Your training progress will be saved to your account

7. **Use the emulator**:
   - Type characters to send Morse code
   - For prosigns, press the corresponding keys simultaneously (e.g., A+R for AR)
   - Follow the suggested learning order for optimal progression

### Troubleshooting Authentication

If you encounter issues with authentication:
- Ensure you're using the correct username and password
- Check your internet connection (if authentication requires server validation)
- If the Supermorse app is in offline mode, it may use local authentication

## License

This software is open source and available under the MIT License.
