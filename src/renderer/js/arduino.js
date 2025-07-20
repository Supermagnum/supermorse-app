/**
 * arduino.js
 * Handles communication with the Arduino Morse decoder
 */

export class ArduinoInterface {
    /**
     * Initialize Arduino interface
     * @param {Object} app - Reference to the main application
     */
    constructor(app) {
        this.app = app;
        this.isConnected = false;
        this.currentPort = null;
        this.buffer = '';
        
        // Set up event listeners
        this.setupEventListeners();
    }
    
    /**
     * Set up event listeners for Arduino data
     */
    setupEventListeners() {
        // Set up listeners for serial data and status
        const serialDataUnsubscribe = window.electronAPI.onSerialData((data) => {
            this.handleSerialData(data);
        });
        
        const serialStatusUnsubscribe = window.electronAPI.onSerialStatus((status) => {
            this.handleStatusChange(status);
        });
        
        // Store unsubscribe functions to clean up later
        this.unsubscribeFunctions = [
            serialDataUnsubscribe,
            serialStatusUnsubscribe
        ];
    }
    
    /**
     * Connect to an Arduino device
     * @param {string} port - The port to connect to
     * @returns {Promise} - Resolves when connected
     */
    async connect(port) {
        try {
            const success = await window.electronAPI.connectSerial(port);
            
            if (success) {
                this.currentPort = port;
                this.isConnected = true;
                
                // Update UI
                this.updateConnectionUI(true);
                
                // Configure the Arduino based on current settings
                await this.configureArduino();
                
                return true;
            } else {
                throw new Error('Failed to connect to port');
            }
        } catch (error) {
            console.error('Error connecting to Arduino:', error);
            this.updateConnectionUI(false);
            throw error;
        }
    }
    
    /**
     * Disconnect from the Arduino
     * @returns {Promise} - Resolves when disconnected
     */
    async disconnect() {
        try {
            // The main process handles the actual disconnection
            // Here we just update our state
            this.isConnected = false;
            this.currentPort = null;
            
            // Update UI
            this.updateConnectionUI(false);
            
            return true;
        } catch (error) {
            console.error('Error disconnecting from Arduino:', error);
            throw error;
        }
    }
    
    /**
     * Handle serial data from the Arduino
     * @param {string} data - The data received
     */
    handleSerialData(data) {
        // Add to buffer
        this.buffer += data;
        
        // Process complete lines
        const lines = this.buffer.split('\n');
        
        // Keep the last incomplete line in the buffer
        this.buffer = lines.pop() || '';
        
        // Process each complete line
        lines.forEach(line => {
            this.processSerialLine(line.trim());
        });
    }
    
    /**
     * Process a complete line from the Arduino
     * @param {string} line - The line to process
     */
    processSerialLine(line) {
        // Ignore empty lines
        if (!line) return;
        
        console.log('Arduino:', line);
        
        // Handle paddle press/release events for sidetone generation
        if (line === 'left_paddle_pressed' || line === 'right_paddle_pressed') {
            // Generate sidetone when paddle is pressed
            if (this.app.morseAudio) {
                this.app.morseAudio.generateSidetone(true);
            }
            return;
        }
        
        if (line === 'left_paddle_released' || line === 'right_paddle_released') {
            // Stop sidetone when paddle is released
            if (this.app.morseAudio) {
                this.app.morseAudio.generateSidetone(false);
            }
            return;
        }
        
        // Handle mode response
        if (line.startsWith('MODE:')) {
            const mode = line.substring(5);
            console.log('Arduino mode set to:', mode);
            return;
        }
        
        // Handle decoded Morse characters
        if (line.length === 1) {
            // Single character decoded from Morse
            if (this.app.trainer && this.app.trainer.lessonActive) {
                this.app.trainer.handleUserInput(line);
            }
            return;
        }
        
        // Process lines containing dots and dashes as Morse code input
        if (line.includes('.') || line.includes('-')) {
            // Only process if this appears to be Morse code (only dots, dashes, and spaces)
            if (/^[.\- ]+$/.test(line)) {
                // The Arduino is sending dots and dashes, we need to decode them
                // Split by spaces to get individual characters
                const morseCharacters = line.trim().split(' ');
                
                for (const morse of morseCharacters) {
                    if (morse) {
                        // Try to decode the Morse code to a character
                        const char = window.ALPHABETS.morseToChar(morse);
                        
                        if (char) {
                            console.log(`Decoded Morse "${morse}" to character "${char}"`);
                            // Send the decoded character to the trainer
                            if (this.app.trainer && this.app.trainer.lessonActive) {
                                this.app.trainer.handleUserInput(char);
                            }
                        }
                    }
                }
            }
            return;
        }
        
        // Handle other messages
        if (line === 'Morse Decoder Ready') {
            console.log('Arduino is ready');
            return;
        }
    }
    
    /**
     * Handle status changes from the Arduino
     * @param {Object} status - The status object
     */
    handleStatusChange(status) {
        this.isConnected = status.connected;
        
        // Update UI
        this.updateConnectionUI(status.connected);
        
        // If disconnected unexpectedly, show a message
        if (!status.connected && this.currentPort) {
            this.currentPort = null;
            
            // Only show message if disconnected unexpectedly
            this.app.showModal('Arduino Disconnected', 
                'The connection to the Arduino device was lost. Please reconnect.'
            );
        }
    }
    
    /**
     * Update the UI to reflect connection status
     * @param {boolean} connected - Whether the Arduino is connected
     */
    updateConnectionUI(connected) {
        const statusElement = document.getElementById('arduinoStatus');
        const connectButton = document.getElementById('connectArduino');
        
        if (statusElement) {
            if (connected) {
                statusElement.classList.remove('disconnected');
                statusElement.classList.add('connected');
                statusElement.innerHTML = '<i class="fas fa-microchip"></i> <span>Connected</span>';
                
                connectButton.textContent = 'Disconnect';
            } else {
                statusElement.classList.remove('connected');
                statusElement.classList.add('disconnected');
                statusElement.innerHTML = '<i class="fas fa-microchip"></i> <span>Disconnected</span>';
                
                connectButton.textContent = 'Connect';
            }
        }
    }
    
    /**
     * Configure the Arduino based on current settings
     * @returns {Promise} - Resolves when configured
     */
    async configureArduino() {
        if (!this.isConnected) return false;
        
        try {
            // Get current settings
            const settings = this.app.settings.getSettings();
            
            // Set key mode
            await this.setKeyMode(settings.keyMode);
            
            return true;
        } catch (error) {
            console.error('Error configuring Arduino:', error);
            return false;
        }
    }
    
    /**
     * Set the key mode on the Arduino
     * @param {string} mode - The key mode to set (S, P, A, B)
     * @returns {Promise} - Resolves when the mode is set
     */
    async setKeyMode(mode) {
        if (!this.isConnected) return false;
        
        try {
            // Send the mode command to the Arduino
            await window.electronAPI.sendSerial(mode);
            return true;
        } catch (error) {
            console.error('Error setting key mode:', error);
            return false;
        }
    }
    
    /**
     * Send a command to the Arduino
     * @param {string} command - The command to send
     * @returns {Promise} - Resolves when the command is sent
     */
    async sendCommand(command) {
        if (!this.isConnected) return false;
        
        try {
            // Send the command to the Arduino
            await window.electronAPI.sendSerial(command);
            return true;
        } catch (error) {
            console.error('Error sending command to Arduino:', error);
            return false;
        }
    }
    
    /**
     * Clean up event listeners
     */
    cleanup() {
        // Call all unsubscribe functions
        if (this.unsubscribeFunctions) {
            this.unsubscribeFunctions.forEach(unsubscribe => {
                if (typeof unsubscribe === 'function') {
                    unsubscribe();
                }
            });
        }
        
        // Clear the list
        this.unsubscribeFunctions = [];
    }
}