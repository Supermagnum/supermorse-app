/**
 * test-paddle-pins.js
 * A script to run the pin tester Arduino sketch and monitor the results
 * 
 * This helps identify which GPIO pins are receiving signals from the paddle
 * Supports all board types: ESP32-C6, SAMD21, Arduino Micro, and Arduino Nano
 */

const { SerialPort } = require('serialport');

// Define supported board types
const BOARD_TYPES = {
  ESP32C6: { name: 'Xiao ESP32-C6', command: 'e', pinPrefix: 'GPIO' },
  SAMD21: { name: 'Xiao SAMD21', command: 's', pinPrefix: 'PIN' },
  MICRO: { name: 'Arduino Micro', command: 'm', pinPrefix: 'PIN' },
  NANO: { name: 'Arduino Nano', command: 'n', pinPrefix: 'PIN' }
};

// Parse command line arguments
const args = process.argv.slice(2);
let selectedBoard = BOARD_TYPES.ESP32C6; // Default to ESP32-C6

if (args.length > 0) {
  const boardArg = args[0].toLowerCase();
  if (boardArg === 'esp32c6' || boardArg === 'esp32-c6') {
    selectedBoard = BOARD_TYPES.ESP32C6;
  } else if (boardArg === 'samd21') {
    selectedBoard = BOARD_TYPES.SAMD21;
  } else if (boardArg === 'micro') {
    selectedBoard = BOARD_TYPES.MICRO;
  } else if (boardArg === 'nano') {
    selectedBoard = BOARD_TYPES.NANO;
  } else {
    console.warn(`Unknown board type: ${boardArg}. Defaulting to ${selectedBoard.name}`);
  }
}

// Define port parameters, ttyACM0 might be other ports so it might need adjustment of the const portpath value.
const portPath = '/dev/ttyACM0';
const baudRate = 9600;

// Buffer for collecting partial data
let dataBuffer = '';

console.log(`Connecting to ${selectedBoard.name} on ${portPath} to test paddle pins...`);
console.log(`Press your paddle keys and watch which ${selectedBoard.pinPrefix} pins detect the signals`);
console.log('Press Ctrl+C to exit when you\'ve identified the correct pins\n');

// Create serial connection
const port = new SerialPort({
  path: portPath,
  baudRate: baudRate
});

// Set up event handlers
port.on('open', () => {
  console.log(`Connected to ${portPath}`);
  console.log(`Setting board type to ${selectedBoard.name}...`);
  
  // Send command to switch to the selected board type
  setTimeout(() => {
    port.write(selectedBoard.command);
    console.log('Waiting for pin tester output...\n');
  }, 2000); // Wait for Arduino to initialize
});

port.on('data', (data) => {
  // Convert buffer to string and add to existing buffer
  const dataStr = data.toString();
  dataBuffer += dataStr;
  
  // Process complete lines
  const lines = dataBuffer.split('\n');
  // Keep the last incomplete line in the buffer
  dataBuffer = lines.pop() || '';
  
  // Process each complete line
  lines.forEach(line => {
    processSerialLine(line.trim());
  });
});

port.on('error', (err) => {
  console.error('Serial port error:', err.message);
  process.exit(1);
});

/**
 * Process a complete line from the Arduino
 * @param {string} line - The line to process
 */
function processSerialLine(line) {
  // Ignore empty lines
  if (!line) return;
  
  // Print the line with timestamp
  const now = new Date();
  const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
  
  // Highlight important lines about signal detection
  if (line.includes('Signal detected')) {
    console.log(`[${timestamp}] 🟢 ${line}`);
  } else if (line.includes('Signal ended')) {
    console.log(`[${timestamp}] 🔴 ${line}`);
  } else {
    console.log(`[${timestamp}] ${line}`);
  }
}

// Handle script termination
process.on('SIGINT', () => {
  console.log('\nClosing connection...');
  port.close(() => {
    console.log('Connection closed');
    console.log('\nNext steps:');
    console.log(`1. Note which ${selectedBoard.pinPrefix} pins responded to your paddle inputs`);
    console.log(`2. Update the morse_decoder.ino sketch for your ${selectedBoard.name} with these pin numbers:`);
    console.log('   const int PADDLE_DOT_PIN = X;  // Replace X with the pin number for your dot paddle');
    console.log('   const int PADDLE_DASH_PIN = Y; // Replace Y with the pin number for your dash paddle');
    
    // Provide board-specific file path instructions
    let sketchFile = '';
    switch(selectedBoard) {
      case BOARD_TYPES.ESP32C6:
        sketchFile = 'morse_decoder_Xiao_ESP32-C6';
        break;
      case BOARD_TYPES.SAMD21:
        sketchFile = 'morse_decoder_Xiao_SAMD21';
        break;
      case BOARD_TYPES.MICRO:
        sketchFile = 'morse_decoder_Arduino_Micro';
        break;
      case BOARD_TYPES.NANO:
        sketchFile = 'morse_decoder_Arduino_Nano';
        break;
    }
    
    console.log(`3. Upload the updated ${sketchFile}.ino to your ${selectedBoard.name}`);
    console.log('4. Run the connect-arduino.js script to connect to the paddle interface');
    process.exit(0);
  });
});
