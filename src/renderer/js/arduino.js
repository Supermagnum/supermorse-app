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
        
        // Morse code processing
        this.morseBuffer = '';
        this.lastSignalTime = 0;
        this.pauseThreshold = 1000; // Default pause threshold in ms (1 second)
        
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
            // Single character decoded from Morse - only process in Training tab, not Listening tab
            if (this.app.trainer && this.app.trainer.lessonActive && this.app.currentSection === 'training') {
                this.app.trainer.handleUserInput(line);
            }
            return;
        }
        
        // Process lines containing dots and dashes as Morse code input
        if (line.includes('.') || line.includes('-')) {
            // Only process if this appears to be Morse code (only dots, dashes, and spaces)
            if (/^[.\- ]+$/.test(line)) {
                // Process with enhanced pause detection
                this.processMorseWithPauseDetection(line);
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
     * Process Morse code with enhanced pause detection
     * @param {string} line - The line containing Morse code (dots, dashes, spaces)
     */
    processMorseWithPauseDetection(line) {
        const currentTime = Date.now();
        const timeElapsed = currentTime - this.lastSignalTime;
        
        // If significant time has passed since last signal, clear the buffer
        if (this.lastSignalTime > 0 && timeElapsed > 2 * this.pauseThreshold) {
            // Process any remaining code in the buffer before clearing
            if (this.morseBuffer.trim()) {
                this.decodeMorseCharacter(this.morseBuffer.trim());
            }
            this.morseBuffer = '';
        }
        
        // Update last signal time
        this.lastSignalTime = currentTime;
        
        // Process each character in the input line
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '.' || char === '-') {
                // Add dot or dash to buffer
                this.morseBuffer += char;
            } else if (char === ' ') {
                // Space could be intra-character or inter-character
                // Count consecutive spaces to determine type
                let spaceCount = 1;
                while (i + 1 < line.length && line[i + 1] === ' ') {
                    spaceCount++;
                    i++;
                }
                
                if (spaceCount >= 3) {
                    // This is likely an inter-character space
                    // Process the current character and reset buffer
                    if (this.morseBuffer.trim()) {
                        this.decodeMorseCharacter(this.morseBuffer.trim());
                    }
                    this.morseBuffer = '';
                } else {
                    // This is likely an intra-character space (element separation)
                    // Keep accumulating in the same buffer
                }
            }
        }
        
        // If the line ends without spaces, we may need to process the buffer
        // But we'll wait for more input or a pause to confirm
    }
    
    /**
     * Decode a Morse code character and handle it
     * @param {string} morse - The Morse code to decode
     */
    decodeMorseCharacter(morse) {
        // Try to decode the Morse code to a character
        const char = window.ALPHABETS.morseToChar(morse);
        
        if (char) {
            console.log(`Decoded Morse "${morse}" to character "${char}"`);
            // Send the decoded character to the trainer only when in Training tab
            if (this.app.trainer && this.app.trainer.lessonActive && this.app.currentSection === 'training') {
                this.app.trainer.handleUserInput(char);
            }
        } else {
            console.log(`Could not decode Morse pattern: "${morse}"`);
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
            
            // Set pause threshold from settings if available
            if (settings.pauseThreshold !== undefined) {
                this.setPauseThreshold(settings.pauseThreshold);
            }
            // Otherwise, calculate based on WPM
            else if (settings.morseSpeed) {
                // Base timing unit in milliseconds at this WPM
                const unitLength = 60 / (50 * settings.morseSpeed) * 1000;
                // Inter-character space is 3 units by standard
                this.pauseThreshold = Math.max(3 * unitLength, 150); // Minimum 150ms
                console.log(`Pause threshold calculated to ${this.pauseThreshold}ms at ${settings.morseSpeed} WPM`);
            }
            
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
     * Set the pause threshold for Morse code character detection
     * @param {number} threshold - Pause threshold in milliseconds
     * @returns {boolean} - True if successful
     */
    setPauseThreshold(threshold) {
        if (threshold >= 500 && threshold <= 3000) {
            this.pauseThreshold = threshold;
            console.log(`Pause threshold set to ${this.pauseThreshold}ms`);
            return true;
        } else {
            console.warn(`Invalid pause threshold: ${threshold}ms. Must be between 500-3000ms`);
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