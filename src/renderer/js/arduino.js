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
     * Process Morse code with pause detection
     * @param {string} line - The line containing Morse code (dots, dashes, spaces)
     */
    processMorseWithPauseDetection(line) {
        const currentTime = Date.now();
        const timeElapsed = currentTime - this.lastSignalTime;
        
        // Check if enhanced pattern recognition is enabled
        const usePatternRecognition = this.isPatternRecognitionEnabled();
        
        // If significant time has passed since last signal, clear the buffer
        if (this.lastSignalTime > 0 && timeElapsed > 2 * this.pauseThreshold) {
            // Process any remaining code in the buffer before clearing
            if (this.morseBuffer.trim()) {
                if (usePatternRecognition) {
                    // Use enhanced decoding with pattern recognition
                    const knownCharacters = this.getCurrentKnownCharacters();
                    this.validateAndDecodeCharacter(this.morseBuffer.trim(), knownCharacters);
                } else {
                    // Use standard decoding
                    this.decodeMorseCharacter(this.morseBuffer.trim());
                }
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
                
                if (usePatternRecognition) {
                    // Use enhanced decision logic for ambiguous pauses
                    this.processSpacesWithPatternRecognition(spaceCount);
                } else {
                    // Use the original simple space-counting approach
                    this.processSpacesWithSimpleThreshold(spaceCount);
                }
            }
        }
        
        // If the line ends without spaces, we may need to process the buffer
        // But we'll wait for more input or a pause to confirm
    }
    
    /**
     * Process spaces using the original simple threshold approach
     * @param {number} spaceCount - Number of consecutive spaces
     */
    processSpacesWithSimpleThreshold(spaceCount) {
        // Traditional approach: if 3+ spaces, treat as character boundary
        if (spaceCount >= 3) {
            // This is likely an inter-character space
            if (this.morseBuffer.trim()) {
                this.decodeMorseCharacter(this.morseBuffer.trim());
            }
            this.morseBuffer = '';
        }
        // Otherwise keep accumulating in the same buffer (intra-character space)
    }
    
    /**
     * Process spaces using pattern recognition for enhanced boundary detection
     * @param {number} spaceCount - Number of consecutive spaces
     */
    processSpacesWithPatternRecognition(spaceCount) {
        // Get current known character set
        const knownCharacters = this.getCurrentKnownCharacters();
        
        // Define clear thresholds and ambiguous range
        const CLEAR_INTRA_CHAR_THRESHOLD = 2;  // Clearly within a character if space count <= 2
        const CLEAR_INTER_CHAR_THRESHOLD = 4;  // Clearly between characters if space count >= 4
        
        // If clearly within a character
        if (spaceCount <= CLEAR_INTRA_CHAR_THRESHOLD) {
            // This is likely an intra-character space (element separation)
            // Keep accumulating in the same buffer
            return;
        }
        
        // If clearly between characters
        if (spaceCount >= CLEAR_INTER_CHAR_THRESHOLD) {
            // This is likely an inter-character space
            // Process the current character and reset buffer
            if (this.morseBuffer.trim()) {
                this.validateAndDecodeCharacter(this.morseBuffer.trim(), knownCharacters);
            }
            this.morseBuffer = '';
            return;
        }
        
        // AMBIGUOUS CASE (spaceCount = 3)
        // Use pattern recognition to decide
        
        // Current buffer - might be a complete character
        const currentPattern = this.morseBuffer.trim();
        
        // No pattern to evaluate
        if (!currentPattern) {
            return;
        }
        
        // Check if current buffer forms a valid character
        const currentCharacter = this.isValidMorsePattern(currentPattern, knownCharacters);
        
        if (currentCharacter) {
            // Current buffer forms a valid character, decode it
            console.log(`Pattern recognition validated: "${currentPattern}" as "${currentCharacter}"`);
            this.decodeMorseCharacter(currentPattern);
            this.morseBuffer = '';
            return;
        }
        
        // Current pattern doesn't form a valid character
        // Let's check if it could be the start of a valid character
        const possibleCompletions = this.getPossibleCompletions(currentPattern, knownCharacters);
        
        if (possibleCompletions.length === 0) {
            // Not the start of any valid character, treat as character boundary
            console.log(`Pattern "${currentPattern}" is not a valid start to any known character, treating as boundary`);
            this.morseBuffer = '';
        } else {
            // It could be the start of a valid character, keep accumulating
            console.log(`Pattern "${currentPattern}" could be the start of: ${possibleCompletions.join(', ')}`);
            // (do nothing, continue with current buffer)
        }
    }
    
    /**
     * Check if a Morse pattern is valid for a known character
     * @param {string} pattern - The Morse pattern to check
     * @param {Array} knownCharacters - Array of characters known to the user
     * @returns {string|null} - The character if valid, null otherwise
     */
    isValidMorsePattern(pattern, knownCharacters) {
        // No pattern
        if (!pattern) return null;
        
        // Check if this pattern forms a valid character
        const char = window.ALPHABETS.morseToChar(pattern);
        
        // If not a valid character at all, return null
        if (!char) return null;
        
        // If it's a valid character, check if it's in our known set
        if (knownCharacters && knownCharacters.includes(char)) {
            return char;
        }
        
        // It's a valid character but not in our known set
        // For beginners, be strict and only accept known characters
        // For advanced users, accept any valid character
        const isAdvancedUser = knownCharacters && knownCharacters.length >= 10;
        return isAdvancedUser ? char : null;
    }
    
    /**
     * Get possible completions for a partial Morse pattern
     * @param {string} partialPattern - The partial Morse pattern
     * @param {Array} knownCharacters - Array of characters known to the user
     * @returns {Array} - Array of possible character completions
     */
    getPossibleCompletions(partialPattern, knownCharacters) {
        if (!partialPattern) return [];
        
        const completions = [];
        const morseAlphabet = window.ALPHABETS.getCompleteMorseAlphabet();
        
        // Check each known character
        for (const char of knownCharacters) {
            const morsePattern = morseAlphabet[char];
            
            // If this character's pattern starts with our partial pattern
            if (morsePattern && morsePattern.startsWith(partialPattern)) {
                completions.push(char);
            }
        }
        
        return completions;
    }
    
    /**
     * Validate and decode a Morse character
     * @param {string} morse - The Morse pattern to decode
     * @param {Array} knownCharacters - Array of characters known to the user
     */
    validateAndDecodeCharacter(morse, knownCharacters) {
        // For a complete character, first check if it's in our known set
        const char = this.isValidMorsePattern(morse, knownCharacters);
        
        if (char) {
            // Valid character in our known set, decode it
            this.decodeMorseCharacter(morse);
        } else {
            // Not a valid character in our known set
            console.log(`Unrecognized Morse pattern: "${morse}"`);
        }
    }
    
    /**
     * Get current known characters from the trainer
     * @returns {Array} - Array of characters the user knows
     */
    getCurrentKnownCharacters() {
        // Default to basic characters if we can't get the current set
        const defaultCharacters = ['K', 'M'];
        
        // Try to get characters from the trainer
        if (!this.app || !this.app.trainer) {
            return defaultCharacters;
        }
        
        // Get characters in progress (current learning set)
        const charactersInProgress = this.app.trainer.charactersInProgress;
        if (charactersInProgress && charactersInProgress.length > 0) {
            return charactersInProgress;
        }
        
        // Fall back to current characters if available
        const currentCharacters = this.app.trainer.currentCharacters;
        if (currentCharacters && currentCharacters.length > 0) {
            return currentCharacters;
        }
        
        // Last resort - use default characters
        return defaultCharacters;
    }
    
    /**
     * Check if pattern recognition is enabled in settings
     * @returns {boolean} - True if enabled, false otherwise
     */
    isPatternRecognitionEnabled() {
        // If we don't have access to settings, default to false
        if (!this.app || !this.app.settings) {
            return false;
        }
        
        // Get the setting value
        return this.app.settings.getSetting('usePatternRecognition') === true;
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