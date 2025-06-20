/**
 * inputChecker.js
 * Handles checking user input against expected sequences
 */

const INPUT_CHECKER = (function() {
    // Current practice session data
    let currentSession = {
        expectedSequence: '',
        userInput: '',
        results: [],
        startTime: null,
        endTime: null
    };
    
    // Confusion tracking
    const confusionMatrix = {};
    
    // Callbacks
    let onInputUpdated = null;
    let onSessionComplete = null;
    
    /**
     * Start a new practice session with an expected sequence
     * @param {string} sequence - The expected character sequence
     */
    function startSession(sequence) {
        // Reset session data
        currentSession = {
            expectedSequence: sequence,
            userInput: '',
            results: [],
            startTime: new Date(),
            endTime: null
        };
        
        // Notify listeners
        if (onInputUpdated) {
            onInputUpdated(currentSession);
        }
    }
    
    /**
     * Process a received character from the user
     * @param {string} char - The character received
     */
    function processCharacter(char) {
        if (!currentSession.expectedSequence) {
            return; // No active session
        }
        
        // Add character to user input
        currentSession.userInput += char;
        
        // Check if the character is correct
        const position = currentSession.userInput.length - 1;
        const expected = position < currentSession.expectedSequence.length ? 
            currentSession.expectedSequence[position] : null;
        
        const isCorrect = expected === char;
        
        // Record the result
        currentSession.results.push({
            expected,
            received: char,
            isCorrect
        });
        
        // Update confusion matrix if incorrect
        if (!isCorrect && expected) {
            // Initialize confusion pair if it doesn't exist
            if (!confusionMatrix[expected]) {
                confusionMatrix[expected] = {};
            }
            
            if (!confusionMatrix[expected][char]) {
                confusionMatrix[expected][char] = 0;
            }
            
            // Increment confusion count
            confusionMatrix[expected][char]++;
        }
        
        // Check if session is complete
        if (currentSession.userInput.length >= currentSession.expectedSequence.length) {
            endSession();
        }
        
        // Notify listeners
        if (onInputUpdated) {
            onInputUpdated(currentSession);
        }
    }
    
    /**
     * End the current practice session
     */
    function endSession() {
        currentSession.endTime = new Date();
        
        // Calculate final statistics
        const stats = calculateSessionStats();
        
        // Notify listeners
        if (onSessionComplete) {
            onSessionComplete(stats);
        }
    }
    
    /**
     * Calculate statistics for the current session
     * @returns {Object} Session statistics
     */
    function calculateSessionStats() {
        if (!currentSession.expectedSequence) {
            return null;
        }
        
        // Count correct characters
        const correctCount = currentSession.results.filter(r => r.isCorrect).length;
        
        // Calculate accuracy
        const accuracy = currentSession.results.length > 0 ? 
            correctCount / currentSession.results.length : 0;
        
        // Calculate time taken
        const endTime = currentSession.endTime || new Date();
        const timeTaken = (endTime - currentSession.startTime) / 1000; // in seconds
        
        // Calculate character-specific accuracy
        const charAccuracy = {};
        
        currentSession.results.forEach(result => {
            if (!result.expected) return;
            
            if (!charAccuracy[result.expected]) {
                charAccuracy[result.expected] = {
                    correct: 0,
                    total: 0
                };
            }
            
            charAccuracy[result.expected].total++;
            
            if (result.isCorrect) {
                charAccuracy[result.expected].correct++;
            }
        });
        
        // Convert to percentages
        Object.keys(charAccuracy).forEach(char => {
            charAccuracy[char].accuracy = 
                charAccuracy[char].correct / charAccuracy[char].total;
        });
        
        return {
            expectedLength: currentSession.expectedSequence.length,
            inputLength: currentSession.userInput.length,
            correctCount,
            accuracy,
            timeTaken,
            charAccuracy,
            confusionMatrix: getConfusionPairs()
        };
    }
    
    /**
     * Get the current session data
     * @returns {Object} Current session data
     */
    function getCurrentSession() {
        return { ...currentSession };
    }
    
    /**
     * Get the most common confusion pairs
     * @param {number} limit - Maximum number of pairs to return
     * @returns {Array} Array of confusion pairs with counts
     */
    function getConfusionPairs(limit = 10) {
        const pairs = [];
        
        // Flatten the confusion matrix into an array of pairs
        Object.keys(confusionMatrix).forEach(expected => {
            Object.keys(confusionMatrix[expected]).forEach(received => {
                pairs.push({
                    expected,
                    received,
                    count: confusionMatrix[expected][received]
                });
            });
        });
        
        // Sort by count (descending)
        pairs.sort((a, b) => b.count - a.count);
        
        // Return the top pairs
        return pairs.slice(0, limit);
    }
    
    /**
     * Reset the confusion matrix
     */
    function resetConfusionMatrix() {
        Object.keys(confusionMatrix).forEach(key => {
            delete confusionMatrix[key];
        });
    }
    
    /**
     * Set callback for when input is updated
     * @param {function} callback - Function to call with updated session data
     */
    function setInputUpdatedCallback(callback) {
        onInputUpdated = callback;
    }
    
    /**
     * Set callback for when a session is completed
     * @param {function} callback - Function to call with session statistics
     */
    function setSessionCompleteCallback(callback) {
        onSessionComplete = callback;
    }
    
    /**
     * Get the current accuracy for the session
     * @returns {number} Accuracy as a decimal (0-1)
     */
    function getCurrentAccuracy() {
        return calculateSessionStats().accuracy;
    }
    
    /**
     * Format the user input with color coding
     * @returns {Array} Array of characters with correct/incorrect flags
     */
    function getFormattedInput() {
        return currentSession.results.map((result, index) => ({
            char: result.received,
            isCorrect: result.isCorrect
        }));
    }
    
    // Public API
    return {
        startSession,
        processCharacter,
        endSession,
        getCurrentSession,
        getConfusionPairs,
        resetConfusionMatrix,
        setInputUpdatedCallback,
        setSessionCompleteCallback,
        getCurrentAccuracy,
        getFormattedInput,
        calculateSessionStats
    };
})();