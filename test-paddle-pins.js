/**
 * test-paddle-pins.js
 * A script to run the pin tester Arduino sketch and monitor the results
 * 
 * This helps identify which GPIO pins are receiving signals from the paddle
 */

const { SerialPort } = require('serialport');

// Define port parameters, ttyACM0 might be other ports so it might need adjustment of the const portpath value.
const portPath = '/dev/ttyACM0';
const baudRate = 9600;

// Buffer for collecting partial data
let dataBuffer = '';

console.log(`Connecting to Xiao ESP32-C6 on ${portPath} to test paddle pins...`);
console.log('Press your paddle keys and watch which GPIO pins detect the signals');
console.log('Press Ctrl+C to exit when you\'ve identified the correct pins\n');

// Create serial connection
const port = new SerialPort({
  path: portPath,
  baudRate: baudRate
});

// Set up event handlers
port.on('open', () => {
  console.log(`Connected to ${portPath}`);
  console.log('Waiting for pin tester output...\n');
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
    console.log('1. Note which GPIO pins responded to your paddle inputs');
    console.log('2. Update the morse_decoder.ino sketch with these pin numbers:');
    console.log('   const int PADDLE_DOT_PIN = X;  // Replace X with the GPIO for your dot paddle');
    console.log('   const int PADDLE_DASH_PIN = Y; // Replace Y with the GPIO for your dash paddle');
    console.log('3. Upload the updated morse_decoder.ino to your Xiao ESP32-C6');
    console.log('4. Run the connect-arduino.js script to connect to the paddle interface');
    process.exit(0);
  });
});
