/**
 * connect-arduino.js
 * A script to connect to an Arduino Morse key interface on /dev/ttyACM0
 * configured for dual lever (iambic) paddle mode
 */

const { SerialPort } = require('serialport');

// Define port parameters
const portPath = '/dev/ttyACM0';
const baudRate = 9600;

// Buffer for collecting partial data
let dataBuffer = '';

console.log(`Attempting to connect to Arduino dual lever paddle interface on ${portPath}...`);

// Create serial connection
const port = new SerialPort({
  path: portPath,
  baudRate: baudRate
});

// Set up event handlers
port.on('open', () => {
  console.log(`Connected to Arduino dual lever paddle interface on ${portPath}`);
  console.log('Serial port is now open. Listening for Morse signals...');
  
  // Send initialization commands to the Arduino after a short delay
  setTimeout(() => {
    console.log("Initializing Arduino dual lever paddle interface...");
    
    // Send key mode command (B = Iambic Mode B for dual lever paddles)
    port.write('B', (err) => {
      if (err) {
        console.error('Error sending key mode command:', err.message);
      } else {
        console.log('Sent key mode command: B (Iambic Mode B for dual lever paddle)');
      }
    });
    
    // You can add more initialization commands here if needed
  }, 1000);
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
  
  console.log('Raw data from Arduino:', line);
  
  // Handle mode response
  if (line.startsWith('MODE:')) {
    const mode = line.substring(5);
    console.log('Arduino mode set to:', mode);
    return;
  }
  
  // Handle iambic paddle-specific signals (might include timing information)
  if (line.startsWith('PADDLE:') || line.startsWith('IAMBIC:')) {
    console.log('PADDLE SIGNAL:', line.substring(line.indexOf(':') + 1));
    return;
  }
  
  // Process lines containing dots and dashes as Morse code input
  if (line.includes('.') || line.includes('-')) {
    console.log('MORSE SIGNAL DETECTED: ' + line);
    
    // Only process if this appears to be Morse code (only dots, dashes, and spaces)
    if (/^[.\- ]+$/.test(line)) {
      // Split by spaces to get individual characters
      const morseCharacters = line.trim().split(' ');
      
      for (const morse of morseCharacters) {
        if (morse) {
          console.log(`Morse signal: ${morse}`);
          
          // Display dits and dahs in a more visual way
          const visualMorse = morse
            .replace(/\./g, '· ')  // Replace dots with a more visible character
            .replace(/\-/g, '— '); // Replace dashes with a more visible character
          
          console.log(`Visual signal: ${visualMorse}`);
        }
      }
    }
    return;
  }
  
  // Handle single character responses (already decoded by Arduino)
  if (line.length === 1) {
    console.log('DECODED CHARACTER: ' + line);
    return;
  }
  
  // Handle dit/dah directly from iambic paddle
  if (line === 'dit' || line === 'dah') {
    console.log(`PADDLE INPUT: ${line === 'dit' ? '·' : '—'}`);
    return;
  }
  
  // Handle dual lever inputs (left/right paddle)
  if (line.includes('left') || line.includes('right')) {
    console.log(`DUAL LEVER: ${line}`);
    return;
  }
  
  // Handle ready message
  if (line === 'Morse Decoder Ready') {
    console.log('Arduino Morse decoder is ready');
    return;
  }
  
  // Log any other data
  console.log('Other Arduino data:', line);
}

// Handle script termination
process.on('SIGINT', () => {
  console.log('\nClosing connection...');
  port.close(() => {
    console.log('Connection closed');
    process.exit(0);
  });
});

console.log('Press Ctrl+C to exit');