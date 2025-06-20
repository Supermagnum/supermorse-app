/**
 * serialReader.js
 * Handles communication with Arduino via Electron IPC
 */

const SERIAL_READER = (function() {
    // Connection status
    let connected = false;
    
    // Callback for when a character is received
    let onCharacterReceived = null;
    
    // Callback for connection status changes
    let onConnectionChange = null;
    
    // Check if running in Electron
    const isElectron = () => {
        return window.electronAPI !== undefined;
    };
    
    /**
     * Initialize the serial reader
     */
    function initialize() {
        if (isElectron()) {
            // Set up event listeners for Electron IPC
            window.electronAPI.onSerialData((data) => {
                if (data && onCharacterReceived) {
                    // Process each character in the data
                    for (const char of data) {
                        onCharacterReceived(char);
                    }
                }
            });
            
            window.electronAPI.onSerialConnection((status) => {
                connected = status.connected;
                if (onConnectionChange) {
                    onConnectionChange(status.connected);
                }
            });
        }
    }
    
    /**
     * Check if serial communication is supported
     * @returns {boolean} Whether serial communication is supported
     */
    function isSupported() {
        return isElectron() || 'serial' in navigator;
    }
    
    /**
     * Connect to an Arduino device
     * @returns {Promise} Resolves when connected, rejects on error
     */
    async function connect() {
        if (!isSupported()) {
            throw new Error('Serial communication is not supported in this environment');
        }
        
        try {
            if (isElectron()) {
                // In Electron, list ports and let user select one
                const ports = await window.electronAPI.listSerialPorts();
                
                if (ports.length === 0) {
                    throw new Error('No serial ports found');
                }
                
                // For simplicity, connect to the first port
                // In a real app, you would show a selection dialog
                await window.electronAPI.connectSerialPort(ports[0].path);
                
                // Connection status will be updated via the onSerialConnection event
                return true;
            } else {
                // Web Serial API fallback for browsers
                // Request port from user
                const port = await navigator.serial.requestPort();
                
                // Open the port
                await port.open({
                    baudRate: 9600,
                    dataBits: 8,
                    stopBits: 1,
                    parity: 'none'
                });
                
                // Set up reading and writing (simplified for brevity)
                // ... Web Serial API implementation ...
                
                // Update connection status
                connected = true;
                if (onConnectionChange) {
                    onConnectionChange(true);
                }
                
                return true;
            }
        } catch (error) {
            console.error('Error connecting to serial device:', error);
            
            // Update connection status
            connected = false;
            if (onConnectionChange) {
                onConnectionChange(false);
            }
            
            throw error;
        }
    }
    
    /**
     * Disconnect from the Arduino device
     * @returns {Promise} Resolves when disconnected
     */
    async function disconnect() {
        try {
            if (isElectron()) {
                await window.electronAPI.disconnectSerialPort();
                
                // Connection status will be updated via the onSerialConnection event
                return true;
            } else {
                // Web Serial API fallback for browsers
                // ... Web Serial API implementation ...
                
                // Update connection status
                connected = false;
                if (onConnectionChange) {
                    onConnectionChange(false);
                }
                
                return true;
            }
        } catch (error) {
            console.error('Error disconnecting from serial device:', error);
            throw error;
        }
    }
    
    /**
     * Send a command to the Arduino
     * @param {string} command - The command to send
     * @returns {Promise} Resolves when the command is sent
     */
    async function sendCommand(command) {
        if (!isConnected()) {
            throw new Error('Serial port is not connected');
        }
        
        try {
            if (isElectron()) {
                await window.electronAPI.sendSerialCommand(command);
                return true;
            } else {
                // Web Serial API fallback for browsers
                // ... Web Serial API implementation ...
                return true;
            }
        } catch (error) {
            console.error('Error sending command to Arduino:', error);
            throw error;
        }
    }
    
    /**
     * Set the key type mode on the Arduino
     * @param {string} keyType - The key type ('straight', 'paddle-single', 'paddle-iambic-a', 'paddle-iambic-b')
     * @returns {Promise} Resolves when the command is sent
     */
    async function setKeyType(keyType) {
        if (!isConnected()) {
            console.warn('Cannot set key type: not connected to device');
            return;
        }
        
        try {
            if (isElectron()) {
                await window.electronAPI.setKeyType(keyType);
                console.log('Key type set to:', keyType);
                return true;
            } else {
                // Use the existing implementation for browsers
                let command = '';
                
                switch (keyType) {
                    case 'straight':
                        command = 'S'; // Straight key mode
                        break;
                    case 'paddle-single':
                        command = 'P'; // Single paddle mode
                        break;
                    case 'paddle-iambic-a':
                        command = 'A'; // Iambic paddle mode A (Curtis A)
                        break;
                    case 'paddle-iambic-b':
                        command = 'B'; // Iambic paddle mode B
                        break;
                    default:
                        console.warn('Unknown key type:', keyType);
                        return;
                }
                
                await sendCommand(command);
                console.log('Key type set to:', keyType);
                return true;
            }
        } catch (error) {
            console.error('Error setting key type:', error);
        }
    }
    
    /**
     * Set the callback for when a character is received
     * @param {function} callback - Function to call with the received character
     */
    function setCharacterCallback(callback) {
        onCharacterReceived = callback;
    }
    
    /**
     * Set the callback for connection status changes
     * @param {function} callback - Function to call with the connection status
     */
    function setConnectionCallback(callback) {
        onConnectionChange = callback;
        
        // Call immediately with current status
        if (callback) {
            callback(connected);
        }
    }
    
    /**
     * Get the current connection status
     * @returns {boolean} Whether connected to a device
     */
    function isConnected() {
        return connected;
    }
    
    /**
     * Set up automatic reconnection
     * @param {number} interval - Interval in milliseconds to attempt reconnection
     * @returns {number} Interval ID for clearing
     */
    function setupAutoReconnect(interval = 5000) {
        if (isElectron()) {
            console.warn('Auto-reconnect is handled by the Electron main process');
            return null;
        }
        
        // Web Serial API fallback for browsers
        // ... Web Serial API implementation ...
        
        return null;
    }
    
    // Initialize on load
    initialize();
    
    // Public API
    return {
        isSupported,
        connect,
        disconnect,
        sendCommand,
        setCharacterCallback,
        setConnectionCallback,
        isConnected,
        setupAutoReconnect,
        setKeyType
    };
})();