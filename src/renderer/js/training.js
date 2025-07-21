/**
 * training.js
 * Handles Morse code training, progression, and evaluation
 */

export class MorseTrainer {
    /**
     * Initialize Morse trainer
     * @param {Object} app - Reference to the main application
     */
    constructor(app) {
        this.app = app;
        
        // Training state
        this.isTraining = false;
        this.lessonActive = false;
        this.currentCharacters = [];
        this.currentSequence = '';
        this.userInput = '';
        this.sequenceGroups = [];
        this.groupIndex = 0;
        this.correctGroups = 0;
        this.totalGroups = 0;
        this.newCharIntroduction = false;
        
        // Timing
        this.sessionStartTime = null;
        this.sessionDuration = 30 * 60 * 1000; // 30 minutes in milliseconds
        this.sessionTimer = null;
        this.groupTimer = null;
        
        // Speed settings
        this.wpm = 13; // Words per minute
        this.farnsworthWpm = 13; // Character spacing WPM for speeds <= 18 WPM
        
        // Progress tracking
        this.learnedCharacters = [];
        this.charactersInProgress = [];
        this.currentCharacter = null;
        this.mastery = {};
        
        // Audio player reference
        this.morseAudio = null;
    }
    
    /**
     * Load the ALPHABETS module from the global scope
     * This is defined in alphabets.js which is loaded in the HTML
     * @returns {Object} - The ALPHABETS module
     */
    getAlphabets() {
        // Use window.ALPHABETS which is loaded from alphabets.js
        // If it's not available yet, return a placeholder
        if (!window.ALPHABETS) {
            console.warn('ALPHABETS module not loaded');
            return {
                getLearningOrder: () => ['K', 'M'],
                charToMorse: (char) => char === 'K' ? '-.-' : '--'
            };
        }
        return window.ALPHABETS;
    }
    
    /**
     * Load user progress from storage
     * @param {string} userId - The user ID
     * @returns {Promise} - Resolves when progress is loaded
     */
    async loadUserProgress(userId) {
        try {
            // Load progress from the main process
            const progress = await window.electronAPI.getProgress(userId);
            
            if (progress) {
                this.learnedCharacters = progress.learnedCharacters || [];
                this.currentCharacter = progress.currentCharacter || null;
                this.mastery = progress.mastery || {};
                
                // Initialize based on progress
                this.initializeTrainingState();
                
                // Update progress display
                this.updateProgressDisplay();
            } else {
                // New user, start from scratch
                this.initializeNewUser();
            }
            
            return true;
        } catch (error) {
            console.error('Error loading user progress:', error);
            // Start from scratch on error
            this.initializeNewUser();
            return false;
        }
    }
    
    /**
     * Initialize a new user with no prior progress
     */
    initializeNewUser() {
        // Start with K and M as per requirements
        this.learnedCharacters = [];
        this.currentCharacter = 'K';
        this.mastery = {
            'international': 0,
            'prosigns': 0,
            'special': 0
        };
        
        // Initialize training state
        this.initializeTrainingState();
        
        // Update progress display
        this.updateProgressDisplay();
    }
    
    /**
     * Initialize training state based on current progress
     */
    initializeTrainingState() {
        const alphabets = this.getAlphabets();
        
        // If we have a current character but no learned characters, we're at the beginning
        if (this.currentCharacter && this.learnedCharacters.length === 0) {
            // Starting with K and M as per requirements
            if (this.currentCharacter === 'K') {
                this.charactersInProgress = ['K', 'M'];
                this.currentCharacters = ['K', 'M'];
            } else {
                this.charactersInProgress = [this.currentCharacter];
                this.currentCharacters = [this.currentCharacter];
            }
        } 
        // If we have learned characters, use those plus the current character
        else if (this.learnedCharacters.length > 0) {
            this.charactersInProgress = [...this.learnedCharacters];
            
            // Add current character if it exists and isn't already in the list
            if (this.currentCharacter && !this.learnedCharacters.includes(this.currentCharacter)) {
                this.charactersInProgress.push(this.currentCharacter);
            }
            
            // Use all characters for training
            this.currentCharacters = [...this.charactersInProgress];
        }
        // Default starting state if no progress found
        else {
            this.charactersInProgress = ['K', 'M'];
            this.currentCharacters = ['K', 'M'];
            this.currentCharacter = 'K';
        }
        
        // Display current character
        this.updateCurrentCharacterDisplay();
    }
    
    /**
     * Save user progress to storage
     * @param {string} userId - The user ID
     * @returns {Promise} - Resolves when progress is saved
     */
    async saveProgress(userId) {
        try {
            const progressData = {
                userId,
                learnedCharacters: this.learnedCharacters,
                currentCharacter: this.currentCharacter,
                mastery: this.mastery
            };
            
            await window.electronAPI.saveProgress(progressData);
            return true;
        } catch (error) {
            console.error('Error saving progress:', error);
            return false;
        }
    }
    
    /**
     * Check if all standard character sets are mastered
     * @returns {boolean} - True if all standard character sets are mastered
     */
    areAllCharactersMastered() {
        // Check if mastery levels for all character sets are at 100%
        return this.mastery.international === 100 && 
               this.mastery.prosigns === 100 && 
               this.mastery.special === 100;
    }
    
    /**
     * Start a training lesson
     */
    startLesson() {
        console.log("Starting lesson");
        
        // Don't start if already training
        if (this.isTraining && this.lessonActive) {
            console.log("Already training, ignoring start request");
            return;
        }
        
        // Check if all standard characters (international, prosigns, special) are mastered
        if (this.areAllCharactersMastered()) {
            console.log("All characters mastered, showing completion message");
            
            // Show completion message with options for regional characters
            this.app.showModal('Training Complete', 
                `<p>Congratulations! You've mastered all International Morse Code characters, prosigns, and special characters.</p>
                <p>You've unlocked the Murmur HF Communication feature!</p>
                <p>To continue learning, you can select a regional character set:</p>
                <div class="regional-options">
                    <button id="startRegionalEuropean" class="button primary">European Characters</button>
                    <button id="startRegionalCyrillic" class="button primary">Cyrillic Characters</button>
                    <button id="startRegionalArabic" class="button primary">Arabic Numerals</button>
                </div>
                <p>Or practice what you've already learned:</p>
                <button id="startPracticeMode" class="button secondary">Practice Mode</button>`,
                () => {
                    // Setup event listeners for the regional buttons when modal is shown
                    document.getElementById('startRegionalEuropean')?.addEventListener('click', () => {
                        // Implementation for starting European character training would go here
                        console.log("Starting European character training");
                        this.app.hideModal();
                    });
                    
                    document.getElementById('startRegionalCyrillic')?.addEventListener('click', () => {
                        // Implementation for starting Cyrillic character training would go here
                        console.log("Starting Cyrillic character training");
                        this.app.hideModal();
                    });
                    
                    document.getElementById('startRegionalArabic')?.addEventListener('click', () => {
                        // Implementation for starting Arabic numeral training would go here
                        console.log("Starting Arabic numeral training");
                        this.app.hideModal();
                    });
                    
                    document.getElementById('startPracticeMode')?.addEventListener('click', () => {
                        // Start practice mode with all learned characters
                        console.log("Starting practice mode with all learned characters");
                        this.startPracticeMode();
                        this.app.hideModal();
                    });
                }
            );
            return;
        }
        
        // Reset all state flags
        this.isTraining = true;
        this.lessonActive = true;
        this.newCharIntroduction = false;
        this.isIntroducing = false;
        this.shouldStop = false;
        
        // Reset counters
        this.correctGroups = 0;
        this.totalGroups = 0;
        this.userInput = '';
        this.groupIndex = 0;
        
        // Reset any existing timers
        if (this.groupTimer) {
            clearTimeout(this.groupTimer);
            this.groupTimer = null;
        }
        
        // Update UI
        document.getElementById('startLessonBtn').classList.add('hidden');
        document.getElementById('stopLessonBtn').classList.remove('hidden');
        
        // Start session timer
        this.sessionStartTime = Date.now();
        this.startSessionTimer();
        
        // Special case for first-time users: Always introduce K and M
        if (this.learnedCharacters.length === 0) {
            console.log("First-time user detected - introducing K and M");
            this.newCharIntroduction = true;
            this.introduceNewCharacter();
        }
        // If we're introducing a new character, first play it 5 times while displaying it
        else if (this.currentCharacter && !this.learnedCharacters.includes(this.currentCharacter)) {
            console.log(`Introducing new character: ${this.currentCharacter}`);
            this.newCharIntroduction = true;
            this.introduceNewCharacter();
        } else {
            // Start with normal practice
            console.log("Starting normal practice");
            this.newCharIntroduction = false;
            this.generatePracticeGroups();
            this.startNextGroup();
        }
        
        // Save the user's ID to use for progress updates
        this.currentUserId = this.app.auth.getCurrentUser()?.id;
    }
    
    /**
     * Introduce a new character by playing it 5 times while showing it
     */
    introduceNewCharacter() {
        this.isIntroducing = true;
        this.shouldStop = false;
        
        // For beginners (no learned characters)
        if (this.learnedCharacters.length === 0) {
            console.log("First-time user: Will introduce both K and M");
            this.charactersToIntroduce = ['K', 'M'];
            
            // Ensure currentCharacter is set
            if (!this.currentCharacter) {
                this.currentCharacter = 'K';
            }
        } else if (this.currentCharacter) {
            // Introduce the current character if it's valid
            console.log(`Introducing character: ${this.currentCharacter}`);
            this.charactersToIntroduce = [this.currentCharacter];
        } else {
            // Fallback if currentCharacter is somehow null
            console.log("No character specified, defaulting to K");
            this.currentCharacter = 'K';
            this.charactersToIntroduce = ['K'];
        }
        
        console.log(`Characters to introduce: ${this.charactersToIntroduce.join(', ')}`);
        this.currentIntroductionIndex = 0;
        this.continueCharacterIntroduction();
    }
    
    /**
     * Continue introducing characters in the sequence
     */
    continueCharacterIntroduction() {
        // Check if we've introduced all characters
        if (this.currentIntroductionIndex >= this.charactersToIntroduce.length) {
            console.log("All characters introduced, moving to practice");
            
            // Only if we're still active
            if (this.lessonActive && !this.shouldStop) {
                this.newCharIntroduction = false;
                
                // Add a longer delay before starting practice to ensure proper cleanup
                console.log("Adding delay before starting practice...");
                setTimeout(() => {
                    // Reset audio state completely
                    if (this.app.morseAudio) {
                        this.app.morseAudio.stopTone();
                    }
                    
                    // Reset any flags that might interfere with new playback
                    if (this.app.morseAudio) {
                        this.app.morseAudio.cancelPlayback = false;
                        this.app.morseAudio.isPlaying = false;
                    }
                    
                    console.log("Starting practice groups after character introduction");
                    this.generatePracticeGroups();
                    this.startNextGroup();
                }, 1000);
            }
            return;
        }
        
        // Get the current character to introduce
        const charToIntroduce = this.charactersToIntroduce[this.currentIntroductionIndex];
        console.log(`Introducing character ${this.currentIntroductionIndex + 1}/${this.charactersToIntroduce.length}: ${charToIntroduce}`);
        
        // Show the character being introduced
        document.getElementById('displayCharacter').textContent = charToIntroduce;
        
        // Show its Morse pattern
        const morsePattern = this.getAlphabets().charToMorse(charToIntroduce);
        document.getElementById('morsePattern').textContent = morsePattern;
        
        // Update challenge text
        document.getElementById('challengeText').textContent = `Learning new character: ${charToIntroduce}`;
        document.getElementById('userInput').textContent = '';
        
        // Get the stop button
        const stopButton = document.getElementById('stopLessonBtn');
        
        // Create a handler function for the stop button
        const stopHandler = () => {
            console.log("Stop button clicked during introduction");
            this.shouldStop = true;
            
            // Ensure tone is stopped immediately
            if (this.app.morseAudio) {
                this.app.morseAudio.stopTone();
            }
        };
        
        // Add the event listener
        stopButton.addEventListener('click', stopHandler);
        
        // Use an IIFE to handle the async sequence with proper cleanup
        (async () => {
            try {
                console.log(`Starting introduction for character: ${charToIntroduce}`);
                
                // Play the character 5 times with proper delays
                for (let i = 0; i < 5; i++) {
                    // Check if we should stop
                    if (this.shouldStop || !this.lessonActive) {
                        console.log("Introduction stopped early");
                        break;
                    }
                    
                    console.log(`Playing character ${charToIntroduce}, iteration ${i + 1}/5`);
                    
                    // Ensure any previous audio is completely stopped
                    if (this.app.morseAudio) {
                        this.app.morseAudio.stopTone();
                        // Small delay to ensure clean audio separation
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                    
                    // Play the character
                    if (this.shouldStop || !this.lessonActive) break;
                    
                    try {
                        await this.playMorseCharacter(charToIntroduce);
                    } catch (err) {
                        console.error("Error playing character:", err);
                    }
                    
                    // Wait between plays (only if not the last one and not stopping)
                    if (i < 4 && !this.shouldStop && this.lessonActive) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
                
                // Move to next character if not stopped
                if (!this.shouldStop && this.lessonActive) {
                    console.log(`Character ${charToIntroduce} introduction complete`);
                    this.currentIntroductionIndex++;
                    
                    // Brief pause between character introductions
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    
                    // Continue with next character
                    this.continueCharacterIntroduction();
                }
            } catch (error) {
                console.error("Error in character introduction:", error);
            } finally {
                // Always clean up
                console.log(`Cleaning up after introducing ${charToIntroduce}`);
                stopButton.removeEventListener('click', stopHandler);
                
                // Ensure audio is stopped
                if (this.app.morseAudio) {
                    this.app.morseAudio.stopTone();
                }
            }
        })();
    }
    
    /**
     * Generate practice groups based on current characters
     */
    generatePracticeGroups() {
        console.log("Generating practice groups");
        this.sequenceGroups = [];
        
        // Check if we have valid characters to use
        if (!this.currentCharacters || this.currentCharacters.length === 0) {
            console.warn("No current characters available, defaulting to K and M");
            this.currentCharacters = ['K', 'M'];
        }
        
        console.log(`Current characters: ${this.currentCharacters.join(', ')}`);
        console.log(`Learned characters: ${this.learnedCharacters.join(', ') || 'none'}`);
        
        // Generate 10 groups of 5 characters each
        for (let i = 0; i < 10; i++) {
            let group = '';
            
            // If we're introducing a new character, include it in each group
            // and fill the rest with random characters from learned ones
            if (this.newCharIntroduction) {
                console.log(`New character introduction for ${this.currentCharacter}`);
                // Add the new character in a random position
                const position = Math.floor(Math.random() * 5);
                
                // Make sure we have learned characters before using them
                if (this.learnedCharacters.length === 0) {
                    // If no learned characters yet, use K and M
                    const fallbackChars = ['K', 'M'];
                    const fallbackCharsWithoutCurrent = fallbackChars.filter(c => c !== this.currentCharacter);
                    
                    for (let j = 0; j < 5; j++) {
                        if (j === position) {
                            group += this.currentCharacter;
                        } else {
                            // Use K or M as fallback
                            if (fallbackCharsWithoutCurrent.length > 0) {
                                const fbIndex = Math.floor(Math.random() * fallbackCharsWithoutCurrent.length);
                                group += fallbackCharsWithoutCurrent[fbIndex];
                            } else {
                                group += 'K'; // Default to K if nothing else available
                            }
                        }
                    }
                } else {
                    // Use learned characters to fill the rest
                    for (let j = 0; j < 5; j++) {
                        if (j === position) {
                            group += this.currentCharacter;
                        } else {
                            const randomIndex = Math.floor(Math.random() * this.learnedCharacters.length);
                            group += this.learnedCharacters[randomIndex];
                        }
                    }
                }
            } 
            // Otherwise, use all current characters randomly
            else {
                for (let j = 0; j < 5; j++) {
                    const randomIndex = Math.floor(Math.random() * this.currentCharacters.length);
                    group += this.currentCharacters[randomIndex];
                }
            }
            
            this.sequenceGroups.push(group);
        }
        
        console.log("Generated groups:", this.sequenceGroups);
    }
    
    /**
     * Start the next group in the sequence
     */
    startNextGroup() {
        if (!this.lessonActive || this.groupIndex >= this.sequenceGroups.length) {
            // End of groups, check progress
            this.evaluateOverallProgress();
            return;
        }
        
        // Get the next group
        this.currentSequence = this.sequenceGroups[this.groupIndex];
        this.userInput = '';
        
        // Update display
        document.getElementById('challengeText').textContent = 'Listen and type what you hear:';
        document.getElementById('userInput').innerHTML = '';
        
        // Play the Morse code for this group
        this.playMorseSequence(this.currentSequence);
        
        // Wait for user input (handled by Arduino/keyboard events)
        // When user submits 5 characters, evaluateUserInput will be called
    }
    
    /**
     * Evaluate user input against the current sequence
     */
    evaluateUserInput() {
        // Compare user input with current sequence
        let correct = 0;
        let displayHtml = '';
        
        for (let i = 0; i < this.currentSequence.length; i++) {
            const expectedChar = this.currentSequence[i];
            const userChar = this.userInput[i] || '';
            
            if (userChar.toUpperCase() === expectedChar.toUpperCase()) {
                correct++;
                displayHtml += `<span class="correct">${userChar.toUpperCase()}</span>`;
            } else {
                displayHtml += `<span class="incorrect">${userChar.toUpperCase()}</span>`;
            }
        }
        
        // Update display
        document.getElementById('userInput').innerHTML = displayHtml;
        
        // Calculate accuracy for this group
        const accuracy = (correct / this.currentSequence.length) * 100;
        
        // Update counters
        this.totalGroups++;
        if (accuracy >= 80) { // Count as correct if at least 4/5 characters are correct
            this.correctGroups++;
        }
        
        // Update progress bar
        const progressPercent = (this.correctGroups / this.totalGroups) * 100;
        document.getElementById('progressIndicator').style.width = `${progressPercent}%`;
        document.getElementById('progressText').textContent = `${Math.round(progressPercent)}%`;
        
        // Update accuracy display
        document.getElementById('accuracyRate').textContent = `${Math.round(progressPercent)}%`;
        
        // Wait a moment to show the results, then move to next group
        setTimeout(() => {
            this.groupIndex++;
            this.startNextGroup();
        }, 2000);
    }
    
    /**
     * Handle user input (from Arduino or keyboard)
     * @param {string} char - The character input
     */
    handleUserInput(char) {
        if (!this.lessonActive || this.newCharIntroduction) return;
        
        // Add to user input if we don't have 5 characters yet
        if (this.userInput.length < 5) {
            this.userInput += char.toUpperCase();
            
            // Update display
            document.getElementById('userInput').textContent = this.userInput;
            
            // If we have 5 characters, evaluate the input
            if (this.userInput.length === 5) {
                this.evaluateUserInput();
            }
        }
    }
    
    /**
     * Evaluate overall progress at the end of the lesson or groups
     */
    evaluateOverallProgress() {
        // Calculate overall accuracy
        const accuracy = this.totalGroups > 0 ? (this.correctGroups / this.totalGroups) * 100 : 0;
        
        // Check if we've reached the threshold for introducing a new character
        if (accuracy >= 90) {
            // If we've been practicing a new character, mark it as learned
            if (this.currentCharacter && !this.learnedCharacters.includes(this.currentCharacter)) {
                this.learnedCharacters.push(this.currentCharacter);
                
                // Show congratulations message
                this.app.showModal('Character Mastered!', 
                    `<p>Congratulations! You've mastered the character "${this.currentCharacter}".</p>
                    <p>Moving on to the next character.</p>`
                );
            }
            
            // Find the next character to learn
            this.findNextCharacterToLearn();
        } else {
            // Not enough accuracy, keep practicing the same characters
            this.app.showModal('Keep Practicing', 
                `<p>Your accuracy was ${Math.round(accuracy)}%.</p>
                <p>You need 90% accuracy to progress. Keep practicing!</p>`
            );
        }
        
        // Update progress display
        this.updateProgressDisplay();
        
        // Save progress
        if (this.currentUserId) {
            this.saveProgress(this.currentUserId);
        }
        
        // Reset lesson state but keep session timer running
        this.lessonActive = false;
        document.getElementById('startLessonBtn').classList.remove('hidden');
        document.getElementById('stopLessonBtn').classList.add('hidden');
        document.getElementById('challengeText').textContent = 'Press Start to begin a new lesson';
        document.getElementById('userInput').textContent = '';
    }
    
    /**
     * Find the next character to learn based on learning order
     */
    findNextCharacterToLearn() {
        const alphabets = this.getAlphabets();
        
        // Get the international learning order
        const internationalOrder = alphabets.getLearningOrder('international', 1);
        
        // Find the next character in the order that we haven't learned yet
        for (const char of internationalOrder) {
            if (!this.learnedCharacters.includes(char)) {
                this.currentCharacter = char;
                
                // Update display
                this.updateCurrentCharacterDisplay();
                
                // Update the characters in progress
                this.currentCharacters = [...this.learnedCharacters, this.currentCharacter];
                
                return;
            }
        }
        
        // If we've learned all international characters, check prosigns
        if (this.learnedCharacters.length >= internationalOrder.length) {
            const prosignsOrder = alphabets.getLearningOrder('international', 3);
            
            for (const char of prosignsOrder) {
                if (!this.learnedCharacters.includes(char)) {
                    this.currentCharacter = char;
                    
                    // Update display
                    this.updateCurrentCharacterDisplay();
                    
                    // Update the characters in progress
                    this.currentCharacters = [...this.learnedCharacters, this.currentCharacter];
                    
                    return;
                }
            }
        }
        
        // If we've learned all prosigns, check special characters
        if (this.learnedCharacters.length >= internationalOrder.length + alphabets.getLearningOrder('international', 3).length) {
            const specialOrder = alphabets.getLearningOrder('international', 4);
            
            for (const char of specialOrder) {
                if (!this.learnedCharacters.includes(char)) {
                    this.currentCharacter = char;
                    
                    // Update display
                    this.updateCurrentCharacterDisplay();
                    
                    // Update the characters in progress
                    this.currentCharacters = [...this.learnedCharacters, this.currentCharacter];
                    
                    return;
                }
            }
        }
        
        // If we've learned everything, show completion message and unlock regional
        if (this.learnedCharacters.length >= internationalOrder.length + 
            alphabets.getLearningOrder('international', 3).length + 
            alphabets.getLearningOrder('international', 4).length) {
            
                // Update mastery to 100%, and track whether this was achieved with Arduino (sending) or keyboard (listening)
                // The masteryType field indicates if the user can actually send Morse code or only listen
                const masteryType = this.app.currentSection === 'training' ? 'sending' : 'listening';
                
                this.mastery = {
                    'international': 100,
                    'prosigns': 100,
                    'special': 100,
                    'masteryType': masteryType
                };
                
                // Log which type of mastery was achieved
                console.log(`User achieved 100% mastery via ${masteryType} training`);
            
            // Show completion message
            this.app.showModal('Congratulations!', 
                `<p>You've mastered all International Morse characters, prosigns, and special characters!</p>
                <p>You've unlocked regional character sets and the Murmur HF Communication feature.</p>`
            );
            
            // Check for feature unlocks
            this.app.checkFeatureUnlocks();
        }
    }
    
    /**
     * Update the current character display
     */
    updateCurrentCharacterDisplay() {
        if (this.currentCharacter) {
            document.getElementById('displayCharacter').textContent = this.currentCharacter;
            
            // Show its Morse pattern
            const morsePattern = this.getAlphabets().charToMorse(this.currentCharacter);
            document.getElementById('morsePattern').textContent = morsePattern;
        }
    }
    
    /**
     * Update progress display in the progress section
     */
    updateProgressDisplay() {
        // Update mastery percentage
        const totalChars = this.getAlphabets().getLearningOrder('international', 1).length + 
                          this.getAlphabets().getLearningOrder('international', 3).length + 
                          this.getAlphabets().getLearningOrder('international', 4).length;
        
        const masteryPercent = Math.round((this.learnedCharacters.length / totalChars) * 100);
        
        // Update mastery display
        document.getElementById('masteryPercent').textContent = `${masteryPercent}%`;
        
        // Update progress circle using conic gradient
        const progressCircle = document.querySelector('.progress-circle');
        if (progressCircle) {
            progressCircle.style.background = `conic-gradient(var(--primary-color) ${masteryPercent}%, var(--border-color) 0%)`;
        }
        
        // Update learned characters list
        const learnedList = document.getElementById('learnedCharsList');
        if (learnedList) {
            learnedList.innerHTML = '';
            
            this.learnedCharacters.forEach(char => {
                const charSpan = document.createElement('span');
                charSpan.textContent = char;
                learnedList.appendChild(charSpan);
            });
        }
        
        // Update next characters to learn
        const nextList = document.getElementById('nextCharsList');
        if (nextList) {
            nextList.innerHTML = '';
            
            // Show current character in progress
            if (this.currentCharacter && !this.learnedCharacters.includes(this.currentCharacter)) {
                const charDiv = document.createElement('div');
                charDiv.className = 'preview-char';
                
                const charSpan = document.createElement('span');
                charSpan.className = 'char';
                charSpan.textContent = this.currentCharacter;
                
                const morseSpan = document.createElement('span');
                morseSpan.className = 'morse';
                morseSpan.textContent = this.getAlphabets().charToMorse(this.currentCharacter);
                
                charDiv.appendChild(charSpan);
                charDiv.appendChild(morseSpan);
                nextList.appendChild(charDiv);
            }
            
            // Show next few characters
            const alphabet = this.getAlphabets();
            const allChars = [
                ...alphabet.getLearningOrder('international', 1),
                ...alphabet.getLearningOrder('international', 3),
                ...alphabet.getLearningOrder('international', 4)
            ];
            
            let nextCharsCount = 0;
            for (const char of allChars) {
                if (!this.learnedCharacters.includes(char) && char !== this.currentCharacter) {
                    const charDiv = document.createElement('div');
                    charDiv.className = 'preview-char';
                    
                    const charSpan = document.createElement('span');
                    charSpan.className = 'char';
                    charSpan.textContent = char;
                    
                    const morseSpan = document.createElement('span');
                    morseSpan.className = 'morse';
                    morseSpan.textContent = alphabet.charToMorse(char);
                    
                    charDiv.appendChild(charSpan);
                    charDiv.appendChild(morseSpan);
                    nextList.appendChild(charDiv);
                    
                    nextCharsCount++;
                    if (nextCharsCount >= 4) break;
                }
            }
        }
        
        // Update learning stats
        // This would be populated with actual learning time data in a full implementation
        const statsGrid = document.getElementById('learningStats');
        if (statsGrid) {
            statsGrid.innerHTML = '';
            
            // For now, just show the learned characters with placeholder times
            this.learnedCharacters.slice(0, 10).forEach(char => {
                const statCard = document.createElement('div');
                statCard.className = 'stat-card';
                
                const charSpan = document.createElement('div');
                charSpan.className = 'char';
                charSpan.textContent = char;
                
                const timeSpan = document.createElement('div');
                timeSpan.className = 'time';
                timeSpan.textContent = '5 min';
                
                statCard.appendChild(charSpan);
                statCard.appendChild(timeSpan);
                statsGrid.appendChild(statCard);
            });
        }
    }
    
    /**
     * Start the session timer
     */
    startSessionTimer() {
        // Clear any existing timer
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
        }
        
        // Update timer displays
        this.updateTimerDisplays();
        
        // Start a new timer that updates every second
        this.sessionTimer = setInterval(() => {
            this.updateTimerDisplays();
            
            // Check if session time is up
            const elapsed = Date.now() - this.sessionStartTime;
            if (elapsed >= this.sessionDuration) {
                this.endSession();
            }
        }, 1000);
    }
    
    /**
     * Update timer displays
     */
    updateTimerDisplays() {
        if (!this.sessionStartTime) return;
        
        const elapsed = Date.now() - this.sessionStartTime;
        const remaining = Math.max(0, this.sessionDuration - elapsed);
        
        // Format times as MM:SS
        document.getElementById('timeElapsed').textContent = this.formatTime(elapsed);
        document.getElementById('timeRemaining').textContent = this.formatTime(remaining);
    }
    
    /**
     * Format time in milliseconds as MM:SS
     * @param {number} timeMs - Time in milliseconds
     * @returns {string} - Formatted time string
     */
    formatTime(timeMs) {
        const totalSeconds = Math.floor(timeMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    /**
     * End the training session
     */
    endSession() {
        // Stop the session timer
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
            this.sessionTimer = null;
        }
        
        // End the current lesson if active
        if (this.lessonActive) {
            this.lessonActive = false;
            document.getElementById('startLessonBtn').classList.remove('hidden');
            document.getElementById('stopLessonBtn').classList.add('hidden');
        }
        
        // Show session completion message
        this.app.showModal('Session Complete', 
            `<p>Your 30-minute training session is complete.</p>
            <p>Take at least a 1-hour break to let your brain absorb what you've learned.</p>
            <p>Remember to stay hydrated!</p>`
        );
        
        // Save progress
        if (this.currentUserId) {
            this.saveProgress(this.currentUserId);
        }
        
        // Reset training state
        this.isTraining = false;
    }
    
    /**
     * Stop the current lesson
     */
    stopLesson() {
        console.log("Stopping lesson");
        
        // Set all the state flags to stop
        this.lessonActive = false;
        this.shouldStop = true;
        this.isIntroducing = false;
        
        // Stop any audio playback
        if (this.app.morseAudio) {
            this.app.morseAudio.stopTone();
        }
        
        // Clear group timer
        if (this.groupTimer) {
            clearTimeout(this.groupTimer);
            this.groupTimer = null;
        }
        
        // Reset display
        document.getElementById('challengeText').textContent = 'Lesson stopped';
        document.getElementById('userInput').textContent = '';
        
        // Show start button, hide stop button
        document.getElementById('startLessonBtn').classList.remove('hidden');
        document.getElementById('stopLessonBtn').classList.add('hidden');
        
        // Wait a bit before allowing restart
        setTimeout(() => {
            console.log("Ready for restart");
            this.isTraining = false;
        }, 500);
    }
    
    /**
     * Play a Morse code sequence
     * @param {string} sequence - The sequence to play
     */
    playMorseSequence(sequence) {
        if (!this.app.morseAudio) {
            console.error("morseAudio not available");
            return;
        }
        
        if (!sequence || sequence.length === 0) {
            console.error("Empty sequence provided to playMorseSequence");
            return;
        }
        
        console.log(`Playing sequence: '${sequence}'`);
        
        // Validate the sequence contains only valid characters
        for (let i = 0; i < sequence.length; i++) {
            const char = sequence[i];
            if (!char.match(/[A-Za-z0-9]/)) {
                console.warn(`Invalid character in sequence at position ${i}: '${char}'`);
                // Replace with K as fallback
                sequence = sequence.substring(0, i) + 'K' + sequence.substring(i + 1);
            }
        }
        
        // Convert the sequence to Morse code
        const alphabets = this.getAlphabets();
        let morseSequence = '';
        
        for (const char of sequence) {
            const morse = alphabets.charToMorse(char);
            if (morse) {
                morseSequence += morse + ' ';
            } else {
                console.warn(`No Morse code found for character: '${char}'`);
                // Use K's Morse code as fallback
                morseSequence += '-.- ';
            }
        }
        
        if (morseSequence.trim().length === 0) {
            console.error("Empty Morse sequence generated");
            return;
        }
        
        console.log(`Playing Morse sequence: ${morseSequence}`);
        
        try {
            // Play the Morse code
            this.app.morseAudio.playMorseCode(morseSequence, this.wpm, this.farnsworthWpm);
        } catch (error) {
            console.error("Error playing Morse sequence:", error);
        }
    }
    
    /**
     * Play a single Morse character
     * @param {string} char - The character to play
     * @returns {Promise} - Resolves when the character playback is complete
     */
    playMorseCharacter(char) {
        if (!this.app.morseAudio) return Promise.resolve();
        
        // Convert the character to Morse code
        const alphabets = this.getAlphabets();
        const morseChar = alphabets.charToMorse(char);
        
        // Play the Morse code and return the promise
        return this.app.morseAudio.playMorseCode(morseChar, this.wpm, this.farnsworthWpm);
    }
    
    /**
     * Set the Morse code speed
     * @param {number} wpm - The speed in words per minute
     */
    setSpeed(wpm) {
        this.wpm = wpm;
        
        // Adjust Farnsworth speed if needed
        if (wpm > 18) {
            this.farnsworthWpm = wpm;
        } else {
            this.farnsworthWpm = Math.min(wpm, 13); // Minimum 13 WPM
        }
    }
}