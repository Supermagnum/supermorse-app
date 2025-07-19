/**
 * morse-learning-program.js
 * 
 * A Node.js program that follows the suggested learning order for Morse code characters
 * from alphabets.js and emulates serial communication for the Supermorse app.
 * 
 * Features:
 * - Follows the suggested learning order from alphabets.js
 * - Supports keyboard input with simultaneous key detection for prosigns
 * - Emulates serial communication to work with the Supermorse app
 * - Provides progressive learning through different character categories
 */

const readline = require('readline');
const { SerialPort } = require('serialport');
const { stdin } = process;
const keypress = require('keypress');

// Enable keypress events on stdin
keypress(stdin);
stdin.setRawMode(true);
stdin.resume();

// Learning sequences from alphabets.js
const learningSequences = {
    // International standard Morse code (letters and numbers)
    international: [
        'K', 'M',                         // First two characters to learn (distinct sounds)
        'R', 'S', 'U', 'A', 'T',          // Common and simple patterns
        'O', 'E', 'I', 'N', 'D',          // More common letters
        'W', 'G', 'H', 'J', 'P',          // Medium difficulty
        'B', 'F', 'L', 'V', 'X',          // Less common or more complex
        'C', 'Y', 'Z', 'Q',               // Least common letters
        '5', '0',                         // Numbers starting with simplest
        '9', '1', '2', '3', '4', '6', '7', '8' // Remaining numbers
    ],
    
    // Prosigns (procedural signals)
    prosigns: ['AR', 'SK', 'BT', 'KN'],
    
    // Punctuation and special characters
    special: [
        '.', ',', '?', '/',               // Most common punctuation first
        '!', ':', ';', '(', ')',          // Secondary punctuation
        '=', '+', '-', '@',               // Mathematical and common symbols
        '&', '_', '"', '$', '\''          // Less common symbols
    ]
};

// Morse code mappings
const morseMap = {
    // Letters
    'A': '.-',
    'B': '-...',
    'C': '-.-.',
    'D': '-..',
    'E': '.',
    'F': '..-.',
    'G': '--.',
    'H': '....',
    'I': '..',
    'J': '.---',
    'K': '-.-',
    'L': '.-..',
    'M': '--',
    'N': '-.',
    'O': '---',
    'P': '.--.',
    'Q': '--.-',
    'R': '.-.',
    'S': '...',
    'T': '-',
    'U': '..-',
    'V': '...-',
    'W': '.--',
    'X': '-..-',
    'Y': '-.--',
    'Z': '--..',
    
    // Numbers
    '0': '-----',
    '1': '.----',
    '2': '..---',
    '3': '...--',
    '4': '....-',
    '5': '.....',
    '6': '-....',
    '7': '--...',
    '8': '---..',
    '9': '----.',
    
    // Prosigns (as combinations of simultaneous keypresses)
    'AR': '.-.-.',     // A+R pressed simultaneously
    'SK': '...-.-',    // S+K pressed simultaneously
    'BT': '-...-',     // B+T pressed simultaneously
    'KN': '-.-.',      // K+N pressed simultaneously
    
    // Punctuation and special characters
    '.': '.-.-.-',
    ',': '--..--',
    '?': '..--..',
    '!': '-.-.--',
    '/': '-..-.',
    '(': '-.--.',
    ')': '-.--.-',
    '&': '.-...',
    ':': '---...',
    ';': '-.-.-.',
    '=': '-...-',
    '+': '.-.-.',
    '-': '-....-',
    '_': '..--.-',
    '"': '.-..-.',
    '$': '...-..-',
    '@': '.--.-.',
    '\'': '.----.'
};

// Prosigns as key combinations
const prosignKeyCombinations = {
    'AR': ['a', 'r'],   // A+R pressed simultaneously
    'SK': ['s', 'k'],   // S+K pressed simultaneously
    'BT': ['b', 't'],   // B+T pressed simultaneously
    'KN': ['k', 'n']    // K+N pressed simultaneously
};

// Program state
let currentCategory = 'international';
let currentIndex = 0;
let currentCharacter = '';
let serialPort = null;
let practiceMode = 'sequence'; // 'sequence' or 'random'
let correctCount = 0;
let totalAttempts = 0;
let currentlyPressedKeys = new Set();
let displayPrompt = true;

// For handling input manually since we're in raw mode
let inputBuffer = '';
let inputCallback = null;

/**
 * Initialize the program
 */
async function init() {
    console.clear();
    console.log('====================================');
    console.log('  MORSE CODE LEARNING PROGRAM');
    console.log('====================================');
    console.log('Following the learning order from alphabets.js');
    console.log('This program will emulate serial communication for the Supermorse app');
    
    await setupSerialPort();
    setupKeyboardHandling();
    showMainMenu();
}

/**
 * Setup the serial port for emulating Arduino
 */
async function setupSerialPort() {
    try {
        // List available serial ports
        const ports = await SerialPort.list();
        
        if (ports.length === 0) {
            console.log('\nNo serial ports found. Running in simulation mode only.');
            return;
        }
        
        console.log('\nAvailable serial ports:');
        ports.forEach((port, i) => {
            console.log(`${i+1}. ${port.path} - ${port.manufacturer || 'Unknown'}`);
        });
        
        return new Promise((resolve) => {
            promptInput('\nSelect a port number (or press Enter to skip): ', (answer) => {
                if (answer.trim() === '') {
                    console.log('Skipping serial port setup. Running in simulation mode only.');
                    resolve();
                    return;
                }
                
                const index = parseInt(answer) - 1;
                if (isNaN(index) || index < 0 || index >= ports.length) {
                    console.log('Invalid selection. Running in simulation mode only.');
                    resolve();
                    return;
                }
                
                try {
                    serialPort = new SerialPort({ 
                        path: ports[index].path, 
                        baudRate: 9600 
                    });
                    
                    console.log(`Connected to ${ports[index].path}`);
                    
                    // Send a ready message similar to Arduino
                    setTimeout(() => {
                        if (serialPort && serialPort.isOpen) {
                            serialPort.write('Morse Decoder Ready\n');
                        }
                    }, 1000);
                    
                    resolve();
                } catch (err) {
                    console.error(`Error connecting to serial port: ${err.message}`);
                    console.log('Running in simulation mode only.');
                    resolve();
                }
            });
        });
    } catch (err) {
        console.error(`Error listing serial ports: ${err.message}`);
        console.log('Running in simulation mode only.');
    }
}

/**
 * Setup keyboard handling with support for simultaneous key detection
 */
function setupKeyboardHandling() {
    stdin.on('keypress', (ch, key) => {
        // Handle exit
        if (key && key.ctrl && key.name === 'c') {
            cleanup();
            return;
        }
        
        // For the input prompt handling
        if (inputCallback) {
            if (key && key.name === 'return') {
                const callback = inputCallback;
                const input = inputBuffer;
                inputBuffer = '';
                inputCallback = null;
                process.stdout.write('\n');
                callback(input);
                return;
            } else if (key && key.name === 'backspace') {
                if (inputBuffer.length > 0) {
                    inputBuffer = inputBuffer.slice(0, -1);
                    process.stdout.write('\b \b'); // Erase the character
                }
                return;
            } else if (ch) {
                inputBuffer += ch;
                process.stdout.write(ch);
                return;
            }
        }
        
        // Track currently pressed keys for prosign detection
        if (key) {
            if (key.name && !key.ctrl && !key.meta && !key.shift) {
                if (key.name !== 'return') {
                    // Key down
                    currentlyPressedKeys.add(key.name);
                    
                    // Check for prosign combinations
                    for (const [prosign, keys] of Object.entries(prosignKeyCombinations)) {
                        if (keys.every(k => currentlyPressedKeys.has(k)) && 
                            currentlyPressedKeys.size === keys.length) {
                            handleKeyInput(prosign);
                            return;
                        }
                    }
                    
                    // If not a prosign, handle as single key when released
                    if (key.name === 'space') {
                        handleKeyInput(' ');
                    } else if (key.name.length === 1) {
                        handleKeyInput(key.name);
                    }
                }
            }
        }
    });
    
    // Track key release for cleaner prosign detection
    stdin.on('keyup', (ch, key) => {
        if (key && key.name) {
            currentlyPressedKeys.delete(key.name);
        }
    });
}

/**
 * Custom input prompt that works with our raw mode
 */
function promptInput(prompt, callback) {
    if (displayPrompt) {
        process.stdout.write(prompt);
        displayPrompt = false;
    }
    inputBuffer = '';
    inputCallback = callback;
}

/**
 * Show the main menu
 */
function showMainMenu() {
    console.clear();
    console.log('====================================');
    console.log('  MORSE CODE LEARNING PROGRAM');
    console.log('====================================');
    console.log('1. Practice in sequence (follows learning order)');
    console.log('2. Practice randomly (within current category)');
    console.log('3. Select category');
    console.log('4. View statistics');
    console.log('5. Exit');
    
    promptInput('\nSelect an option: ', (answer) => {
        displayPrompt = true;
        switch (answer) {
            case '1':
                practiceMode = 'sequence';
                startPractice();
                break;
            case '2':
                practiceMode = 'random';
                startPractice();
                break;
            case '3':
                selectCategory();
                break;
            case '4':
                viewStatistics();
                break;
            case '5':
                cleanup();
                break;
            default:
                console.log('Invalid option. Please try again.');
                setTimeout(showMainMenu, 1500);
                break;
        }
    });
}

/**
 * Select a category to practice
 */
function selectCategory() {
    console.clear();
    console.log('====================================');
    console.log('  SELECT CATEGORY');
    console.log('====================================');
    console.log('1. International characters (letters and numbers)');
    console.log('2. Prosigns (AR, SK, BT, KN)');
    console.log('3. Special characters (punctuation and symbols)');
    console.log('4. Back to main menu');
    
    promptInput('\nSelect a category: ', (answer) => {
        displayPrompt = true;
        switch (answer) {
            case '1':
                currentCategory = 'international';
                currentIndex = 0;
                showMainMenu();
                break;
            case '2':
                currentCategory = 'prosigns';
                currentIndex = 0;
                showMainMenu();
                break;
            case '3':
                currentCategory = 'special';
                currentIndex = 0;
                showMainMenu();
                break;
            case '4':
                showMainMenu();
                break;
            default:
                console.log('Invalid option. Please try again.');
                setTimeout(selectCategory, 1500);
                break;
        }
    });
}

/**
 * View practice statistics
 */
function viewStatistics() {
    console.clear();
    console.log('====================================');
    console.log('  PRACTICE STATISTICS');
    console.log('====================================');
    
    const accuracy = totalAttempts > 0 ? (correctCount / totalAttempts * 100).toFixed(1) : 0;
    
    console.log(`Total attempts: ${totalAttempts}`);
    console.log(`Correct responses: ${correctCount}`);
    console.log(`Accuracy: ${accuracy}%`);
    console.log(`Current category: ${currentCategory}`);
    console.log(`Progress: ${currentIndex}/${learningSequences[currentCategory].length} characters`);
    
    promptInput('\nPress Enter to return to the main menu...', () => {
        displayPrompt = true;
        showMainMenu();
    });
}

/**
 * Start the practice session
 */
function startPractice() {
    console.clear();
    console.log('====================================');
    console.log('  MORSE CODE PRACTICE');
    console.log('====================================');
    console.log('Type the character shown to send its Morse code.');
    console.log('For prosigns, press the keys simultaneously (e.g., press A+R for AR)');
    console.log('Press Ctrl+C to return to the main menu.');
    console.log('');
    
    presentNextCharacter();
}

/**
 * Present the next character to practice
 */
function presentNextCharacter() {
    const sequence = learningSequences[currentCategory];
    
    if (practiceMode === 'sequence') {
        // In sequence mode, go through the learning order
        currentCharacter = sequence[currentIndex];
    } else {
        // In random mode, pick a character randomly up to current progress
        const maxIndex = Math.min(currentIndex + 5, sequence.length - 1);
        const randomIndex = Math.floor(Math.random() * (maxIndex + 1));
        currentCharacter = sequence[randomIndex];
    }
    
    const morse = morseMap[currentCharacter];
    
    // Display the character and its Morse code
    console.log(`Character: ${currentCharacter}`);
    console.log(`Morse code: ${morse}`);
    
    // Show special instructions for prosigns
    if (currentCategory === 'prosigns') {
        const keys = prosignKeyCombinations[currentCharacter];
        if (keys) {
            console.log(`To send, press these keys simultaneously: ${keys.join(' + ').toUpperCase()}`);
        }
    }
    
    console.log(`Category: ${currentCategory} (${currentIndex + 1}/${sequence.length})`);
    
    console.log('\nType the character shown (or press "m" for menu):');
}

/**
 * Handle keyboard input during practice
 */
function handleKeyInput(input) {
    if (input.toLowerCase() === 'm') {
        showMainMenu();
        return;
    }
    
    totalAttempts++;
    
    // Check if the input matches the character (case-insensitive)
    const normalizedInput = input.toUpperCase();
    if (normalizedInput === currentCharacter) {
        correctCount++;
        console.log('\n✓ Correct!');
        
        // Send the Morse code via serial
        sendMorseToSerial(currentCharacter);
        
        // In sequence mode, advance to the next character if correct
        if (practiceMode === 'sequence') {
            currentIndex = (currentIndex + 1) % learningSequences[currentCategory].length;
        }
    } else {
        console.log(`\n✗ Incorrect. The correct character is "${currentCharacter}".`);
    }
    
    // Pause briefly before next character
    setTimeout(() => {
        console.log('\nPress any key for the next character...');
        
        // Set up a one-time keypress handler for "next"
        const nextHandler = (ch, key) => {
            stdin.removeListener('keypress', nextHandler);
            startPractice();
        };
        
        stdin.once('keypress', nextHandler);
    }, 1000);
}

/**
 * Send Morse code to the serial port
 * @param {string} character - The character to send
 */
function sendMorseToSerial(character) {
    const morse = morseMap[character];
    
    if (!morse) {
        console.log(`No Morse code mapping for "${character}"`);
        return;
    }
    
    console.log(`Sending: ${morse}`);
    
    // Display visual representation
    let visual = '';
    for (const element of morse) {
        if (element === '.') {
            visual += '•'; // Visual representation of dit
        } else if (element === '-') {
            visual += '−'; // Visual representation of dah
        }
    }
    console.log(`Visual: ${visual}`);
    
    // Send to serial port if available
    if (serialPort && serialPort.isOpen) {
        try {
            // Send the Morse code directly as the Arduino would
            // This format matches what the ArduinoInterface class expects
            serialPort.write(morse + '\n');
            console.log('Sent to serial port');
        } catch (err) {
            console.error(`Error sending to serial port: ${err.message}`);
        }
    } else {
        console.log('(Serial output simulated - no actual serial connection)');
    }
}

/**
 * Clean up resources and exit
 */
function cleanup() {
    // Close the serial port if open
    if (serialPort && serialPort.isOpen) {
        serialPort.close();
    }
    
    // Restore terminal settings
    stdin.setRawMode(false);
    stdin.pause();
    
    console.log('\nThank you for using the Morse Learning Program!');
    process.exit(0);
}

// Start the program
init();