/**
 * serial-port-worker.js
 * Worker thread for Arduino serial port communication
 * Offloads device detection, reading and writing to a separate CPU core
 */

const { parentPort, workerData } = require('worker_threads');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

// Track active connections
const activeConnections = new Map();

// Store available ports
let availablePorts = [];

// Last error message
let lastError = null;

// Flag to control automatic reconnection attempts
let autoReconnect = true;

// Handle messages from the main thread
parentPort.on('message', async (message) => {
  const { type, data, id } = message;
  
  try {
    let result;
    
    switch (type) {
      case 'list_ports':
        result = await listPorts();
        break;
        
      case 'connect':
        result = await connectToPort(data.port, data.options);
        break;
        
      case 'disconnect':
        result = disconnectFromPort(data.port);
        break;
        
      case 'write':
        result = writeToPort(data.port, data.data);
        break;
        
      case 'get_connection_status':
        result = getConnectionStatus(data.port);
        break;
        
      case 'set_auto_reconnect':
        autoReconnect = data.enabled;
        result = { autoReconnect };
        break;
        
      case 'get_error':
        result = { error: lastError };
        lastError = null; // Clear after reading
        break;
        
      default:
        result = { success: false, error: `Unknown operation type: ${type}` };
    }
    
    // Send result back to main thread
    parentPort.postMessage({ 
      type: `${type}_result`, 
      success: true, 
      data: result,
      id 
    });
  } catch (error) {
    console.error(`Serial port worker error (${type}):`, error);
    lastError = error.message;
    
    // Send error back to main thread
    parentPort.postMessage({ 
      type: `${type}_error`, 
      success: false, 
      error: error.message || 'Unknown error',
      id 
    });
  }
});

/**
 * List available serial ports
 * @returns {Promise<Object>} - Available serial ports
 */
async function listPorts() {
  try {
    availablePorts = await SerialPort.list();
    
    // Map ports to a more friendly format
    const portList = availablePorts.map(port => ({
      path: port.path,
      manufacturer: port.manufacturer || 'Unknown',
      serialNumber: port.serialNumber || 'Unknown',
      vendorId: port.vendorId || 'Unknown',
      productId: port.productId || 'Unknown',
      isArduino: isArduinoDevice(port)
    }));
    
    return { ports: portList };
  } catch (error) {
    console.error('Error listing serial ports:', error);
    throw new Error(`Failed to list serial ports: ${error.message}`);
  }
}

/**
 * Connect to a serial port
 * @param {string} portPath - Path to the serial port
 * @param {Object} options - Connection options (baudRate, etc.)
 * @returns {Promise<Object>} - Connection result
 */
async function connectToPort(portPath, options = {}) {
  try {
    // Check if already connected
    if (activeConnections.has(portPath)) {
      return { 
        success: true, 
        message: `Already connected to ${portPath}`,
        isNewConnection: false
      };
    }
    
    // Set default options
    const defaultOptions = {
      baudRate: 9600,
      dataBits: 8,
      parity: 'none',
      stopBits: 1,
      autoOpen: true
    };
    
    const connectionOptions = { ...defaultOptions, ...options };
    
    // Create new serial port connection
    const port = new SerialPort({
      path: portPath,
      baudRate: connectionOptions.baudRate,
      dataBits: connectionOptions.dataBits,
      parity: connectionOptions.parity,
      stopBits: connectionOptions.stopBits,
      autoOpen: false // We'll handle opening manually
    });
    
    // Create line parser
    const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));
    
    // Set up event handlers
    const connection = {
      port,
      parser,
      isOpen: false,
      lastData: null,
      lastError: null,
      buffer: [],
      options: connectionOptions
    };
    
    // Connect event handlers
    setupEventHandlers(portPath, connection);
    
    // Store connection
    activeConnections.set(portPath, connection);
    
    // Open the port
    await new Promise((resolve, reject) => {
      port.open(err => {
        if (err) {
          reject(err);
        } else {
          connection.isOpen = true;
          resolve();
        }
      });
    });
    
    return { 
      success: true, 
      message: `Connected to ${portPath}`,
      isNewConnection: true
    };
  } catch (error) {
    console.error(`Error connecting to port ${portPath}:`, error);
    
    // Clean up failed connection
    if (activeConnections.has(portPath)) {
      const connection = activeConnections.get(portPath);
      
      if (connection.port && connection.port.isOpen) {
        try {
          connection.port.close();
        } catch (closeError) {
          console.error(`Error closing port ${portPath}:`, closeError);
        }
      }
      
      activeConnections.delete(portPath);
    }
    
    throw new Error(`Failed to connect to ${portPath}: ${error.message}`);
  }
}

/**
 * Set up event handlers for a serial port connection
 * @param {string} portPath - Path to the serial port
 * @param {Object} connection - Connection object
 */
function setupEventHandlers(portPath, connection) {
  const { port, parser } = connection;
  
  // Handle data received
  parser.on('data', data => {
    // Store in connection
    connection.lastData = data;
    connection.buffer.push({
      data,
      timestamp: Date.now()
    });
    
    // Limit buffer size
    if (connection.buffer.length > 100) {
      connection.buffer.shift();
    }
    
    // Notify main thread
    parentPort.postMessage({
      type: 'data_received',
      port: portPath,
      data: data,
      timestamp: Date.now()
    });
  });
  
  // Handle errors
  port.on('error', error => {
    console.error(`Serial port error (${portPath}):`, error);
    
    connection.lastError = error.message;
    connection.isOpen = false;
    
    // Notify main thread
    parentPort.postMessage({
      type: 'port_error',
      port: portPath,
      error: error.message,
      timestamp: Date.now()
    });
    
    // Auto-reconnect if enabled
    if (autoReconnect) {
      setTimeout(() => {
        // Check if connection still exists
        if (activeConnections.has(portPath)) {
          console.log(`Attempting to reconnect to ${portPath}`);
          
          // Try to reconnect
          port.open(err => {
            if (err) {
              console.error(`Failed to reconnect to ${portPath}:`, err);
              
              // Notify main thread
              parentPort.postMessage({
                type: 'reconnect_failed',
                port: portPath,
                error: err.message,
                timestamp: Date.now()
              });
            } else {
              connection.isOpen = true;
              
              // Notify main thread
              parentPort.postMessage({
                type: 'reconnected',
                port: portPath,
                timestamp: Date.now()
              });
            }
          });
        }
      }, 2000); // Wait 2 seconds before reconnecting
    }
  });
  
  // Handle close
  port.on('close', () => {
    connection.isOpen = false;
    
    // Notify main thread
    parentPort.postMessage({
      type: 'port_closed',
      port: portPath,
      timestamp: Date.now()
    });
  });
  
  // Handle open
  port.on('open', () => {
    connection.isOpen = true;
    
    // Notify main thread
    parentPort.postMessage({
      type: 'port_opened',
      port: portPath,
      timestamp: Date.now()
    });
  });
}

/**
 * Disconnect from a serial port
 * @param {string} portPath - Path to the serial port
 * @returns {Object} - Disconnection result
 */
function disconnectFromPort(portPath) {
  try {
    // Check if connected
    if (!activeConnections.has(portPath)) {
      return { 
        success: true, 
        message: `Not connected to ${portPath}`,
        wasConnected: false
      };
    }
    
    const connection = activeConnections.get(portPath);
    
    // Close the port
    if (connection.port && connection.port.isOpen) {
      connection.port.close();
    }
    
    // Remove connection
    activeConnections.delete(portPath);
    
    return { 
      success: true, 
      message: `Disconnected from ${portPath}`,
      wasConnected: true
    };
  } catch (error) {
    console.error(`Error disconnecting from port ${portPath}:`, error);
    throw new Error(`Failed to disconnect from ${portPath}: ${error.message}`);
  }
}

/**
 * Write data to a serial port
 * @param {string} portPath - Path to the serial port
 * @param {string|Buffer} data - Data to write
 * @returns {Object} - Write result
 */
function writeToPort(portPath, data) {
  return new Promise((resolve, reject) => {
    try {
      // Check if connected
      if (!activeConnections.has(portPath)) {
        reject(new Error(`Not connected to ${portPath}`));
        return;
      }
      
      const connection = activeConnections.get(portPath);
      
      // Check if port is open
      if (!connection.port || !connection.isOpen) {
        reject(new Error(`Port ${portPath} is not open`));
        return;
      }
      
      // Write data to the port
      connection.port.write(data, error => {
        if (error) {
          reject(new Error(`Failed to write to ${portPath}: ${error.message}`));
        } else {
          // Flush data to ensure it's sent
          connection.port.drain(drainError => {
            if (drainError) {
              reject(new Error(`Failed to flush ${portPath}: ${drainError.message}`));
            } else {
              resolve({ 
                success: true, 
                message: `Data written to ${portPath}`,
                bytesWritten: Buffer.isBuffer(data) ? data.length : String(data).length
              });
            }
          });
        }
      });
    } catch (error) {
      console.error(`Error writing to port ${portPath}:`, error);
      reject(new Error(`Failed to write to ${portPath}: ${error.message}`));
    }
  });
}

/**
 * Get connection status for a port
 * @param {string} portPath - Path to the serial port
 * @returns {Object} - Connection status
 */
function getConnectionStatus(portPath) {
  // Check if connected
  if (!activeConnections.has(portPath)) {
    return { 
      connected: false,
      isOpen: false,
      lastData: null,
      lastError: null,
      buffer: []
    };
  }
  
  const connection = activeConnections.get(portPath);
  
  return {
    connected: true,
    isOpen: connection.isOpen,
    lastData: connection.lastData,
    lastError: connection.lastError,
    buffer: connection.buffer,
    options: connection.options
  };
}

/**
 * Check if a port is likely an Arduino device
 * @param {Object} port - Port info from SerialPort.list()
 * @returns {boolean} - True if likely an Arduino
 */
function isArduinoDevice(port) {
  // Common Arduino manufacturers or identifiers
  const arduinoIdentifiers = [
    'arduino',
    'arduino llc',
    'arduino srl',
    'arduino.cc',
    'arduino ag',
    'wch.cn',        // CH340 chipset used in many Arduino clones
    'ftdi',          // FTDI chipset used in many Arduinos
    'silabs',        // Silicon Labs chipset used in some Arduinos
    '1a86',          // QinHeng Electronics (CH340 manufacturer)
    '2341',          // Arduino vendor ID
    '2a03'           // Arduino vendor ID (newer)
  ];
  
  // Check manufacturer
  if (port.manufacturer && arduinoIdentifiers.some(id => 
    port.manufacturer.toLowerCase().includes(id.toLowerCase()))) {
    return true;
  }
  
  // Check vendor ID
  if (port.vendorId && arduinoIdentifiers.some(id => 
    port.vendorId.toLowerCase() === id.toLowerCase())) {
    return true;
  }
  
  // Check product ID for common Arduino boards
  const arduinoProductIds = [
    '0043', // Arduino Uno
    '0001', // Arduino Mega
    '0010', // Arduino Leonardo
    '0036', // Arduino Leonardo Bootloader
    '0042', // Arduino Mega 2560
    '0036', // Arduino Leonardo
    '0237', // Arduino Micro
    '8037'  // Arduino Mini
  ];
  
  if (port.productId && arduinoProductIds.includes(port.productId.toLowerCase())) {
    return true;
  }
  
  return false;
}

// Clean up function to close all ports
function closeAllPorts() {
  for (const [portPath, connection] of activeConnections.entries()) {
    try {
      if (connection.port && connection.port.isOpen) {
        console.log(`Closing port ${portPath}`);
        connection.port.close();
      }
    } catch (error) {
      console.error(`Error closing port ${portPath}:`, error);
    }
  }
  
  // Clear connections
  activeConnections.clear();
}

// Handle worker thread exit
process.on('exit', () => {
  closeAllPorts();
});

// Notify main thread that the worker is ready
// Use ID 0 for the ready message to ensure compatibility
parentPort.postMessage({ type: 'ready', success: true, id: 0 });