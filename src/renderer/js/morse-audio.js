/**
 * morse-audio.js
 * Handles Morse code audio generation using the Tone.js library
 */

export class MorseAudio {
    /**
     * Initialize Morse audio generator
     * @param {Object} app - Reference to the main application
     */
    constructor(app) {
        this.app = app;
        
        // Default audio parameters
        this.frequency = 600; // Hz
        this.volume = -10; // dB
        
        // Timing parameters based on Paris standard
        this.unitLength = 60 / (50 * 13); // Base timing unit in seconds (at 13 WPM)
        
        // Initialize Tone.js components
        this.initToneComponents();
    }
    
    /**
     * Initialize Tone.js components
     */
    initToneComponents() {
        // Ensure Tone.js is available
        if (!window.Tone) {
            console.error('Tone.js is not loaded');
            return;
        }
        
        try {
            // Create oscillator for tone generation
            this.oscillator = new Tone.Oscillator({
                type: 'sine',
                frequency: this.frequency,
                volume: this.volume
            }).toDestination();
            
            // Create envelope to shape the tone
            this.envelope = new Tone.AmplitudeEnvelope({
                attack: 0.005,
                decay: 0.001,
                sustain: 1,
                release: 0.005
            }).connect(this.oscillator.output);
            
            // Initialize audio context
            Tone.start();
            
            console.log('Tone.js components initialized');
        } catch (error) {
            console.error('Error initializing Tone.js components:', error);
        }
    }
    
    /**
     * Set the oscillator frequency
     * @param {number} freq - Frequency in Hz
     */
    setFrequency(freq) {
        this.frequency = freq;
        
        if (this.oscillator) {
            this.oscillator.frequency.value = freq;
        }
    }
    
    /**
     * Set the audio volume
     * @param {number} vol - Volume in dB
     */
    setVolume(vol) {
        this.volume = vol;
        
        if (this.oscillator) {
            this.oscillator.volume.value = vol;
        }
    }
    
    /**
     * Play a tone for a specific duration
     * @param {number} frequency - Frequency in Hz
     * @param {number} duration - Duration in milliseconds
     * @returns {Promise} - Resolves when the tone is complete
     */
    playTone(frequency, duration) {
        return new Promise((resolve) => {
            // Set frequency if provided
            if (frequency) {
                this.setFrequency(frequency);
            }
            
            // Start the oscillator if it's not already started
            if (this.oscillator && this.oscillator.state !== 'started') {
                this.oscillator.start();
            }
            
            // Use the envelope to shape the tone
            if (this.envelope) {
                this.envelope.triggerAttack();
                
                // Schedule the release
                setTimeout(() => {
                    this.envelope.triggerRelease();
                    
                    // Wait for release to complete before resolving
                    setTimeout(() => {
                        resolve();
                    }, 10);
                }, duration);
            } else {
                // Fallback if envelope isn't available
                setTimeout(() => {
                    this.stopTone();
                    resolve();
                }, duration);
            }
        });
    }
    
    /**
     * Stop any currently playing tone
     */
    stopTone() {
        if (this.envelope) {
            this.envelope.triggerRelease();
        }
        
        if (this.oscillator && this.oscillator.state === 'started') {
            // We don't actually stop the oscillator to avoid clicks
            // Just use the envelope to silence it
        }
    }
    
    /**
     * Calculate timing based on WPM
     * @param {number} wpm - Words per minute
     * @param {number} farnsworthWpm - Farnsworth character speed (optional)
     */
    calculateTiming(wpm, farnsworthWpm = null) {
        // Paris standard: "PARIS" is 50 units (including spaces)
        // at 1 WPM, "PARIS" takes 60 seconds, so 1 unit = 60/(50*WPM) seconds
        const characterWpm = farnsworthWpm || wpm;
        
        // Dit length (1 unit)
        this.ditLength = 60 / (50 * characterWpm);
        
        // Dah length (3 units)
        this.dahLength = 3 * this.ditLength;
        
        // Intra-character space (1 unit)
        this.intraCharSpace = this.ditLength;
        
        if (farnsworthWpm && farnsworthWpm < wpm) {
            // Inter-character space (Farnsworth timing)
            const effectiveWpm = farnsworthWpm;
            this.interCharSpace = (60 / (50 * effectiveWpm)) * 3;
            
            // Inter-word space (Farnsworth timing)
            this.interWordSpace = (60 / (50 * effectiveWpm)) * 7;
        } else {
            // Standard timing
            // Inter-character space (3 units)
            this.interCharSpace = 3 * this.ditLength;
            
            // Inter-word space (7 units)
            this.interWordSpace = 7 * this.ditLength;
        }
    }
    
    /**
     * Play a Morse code sequence
     * @param {string} morseCode - The Morse code sequence to play (.-. .- etc.)
     * @param {number} wpm - Words per minute
     * @param {number} farnsworthWpm - Farnsworth character speed (optional)
     * @returns {Promise} - Resolves when the sequence is complete
     */
    async playMorseCode(morseCode, wpm = 13, farnsworthWpm = null) {
        // Calculate timing based on WPM
        this.calculateTiming(wpm, farnsworthWpm);
        
        // Clean up the Morse code
        const cleanCode = morseCode.trim().replace(/\s+/g, ' ');
        
        // Start the oscillator
        if (this.oscillator && this.oscillator.state !== 'started') {
            this.oscillator.start();
        }
        
        // Play each character
        const characters = cleanCode.split(' ');
        
        for (let i = 0; i < characters.length; i++) {
            const character = characters[i];
            
            // Play each element (dit/dah) in the character
            for (let j = 0; j < character.length; j++) {
                const element = character[j];
                
                if (element === '.') {
                    // Play dit
                    await this.playTone(this.frequency, this.ditLength * 1000);
                } else if (element === '-') {
                    // Play dah
                    await this.playTone(this.frequency, this.dahLength * 1000);
                }
                
                // Add intra-character space (except after the last element)
                if (j < character.length - 1) {
                    await this.silence(this.intraCharSpace * 1000);
                }
            }
            
            // Add inter-character space (except after the last character)
            if (i < characters.length - 1) {
                await this.silence(this.interCharSpace * 1000);
            }
        }
        
        // Make sure oscillator is silent when done
        this.stopTone();
    }
    
    /**
     * Pause for a specified duration
     * @param {number} duration - Duration in milliseconds
     * @returns {Promise} - Resolves after the duration
     */
    silence(duration) {
        return new Promise((resolve) => {
            // Ensure tone is stopped
            this.stopTone();
            
            // Wait for the specified duration
            setTimeout(resolve, duration);
        });
    }
    
    /**
     * Play a character as Morse code
     * @param {string} char - The character to play
     * @param {number} wpm - Words per minute
     * @param {number} farnsworthWpm - Farnsworth character speed (optional)
     * @returns {Promise} - Resolves when the character is complete
     */
    playCharacter(char, wpm = 13, farnsworthWpm = null) {
        // Get the Morse code for the character
        const morseChar = this.getAlphabets().charToMorse(char);
        
        // Play the Morse code
        return this.playMorseCode(morseChar, wpm, farnsworthWpm);
    }
    
    /**
     * Get the ALPHABETS module from the global scope
     * This is defined in alphabets.js which is loaded in the HTML
     * @returns {Object} - The ALPHABETS module
     */
    getAlphabets() {
        // Use window.ALPHABETS which is loaded from alphabets.js
        // If it's not available yet, return a placeholder
        if (!window.ALPHABETS) {
            console.warn('ALPHABETS module not loaded');
            return {
                charToMorse: (char) => {
                    const basic = {
                        'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 
                        'F': '..-.', 'G': '--.', 'H': '....', 'I': '..', 'J': '.---',
                        'K': '-.-', 'L': '.-..', 'M': '--', 'N': '-.', 'O': '---',
                        'P': '.--.', 'Q': '--.-', 'R': '.-.', 'S': '...', 'T': '-',
                        'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-', 'Y': '-.--',
                        'Z': '--..', '0': '-----', '1': '.----', '2': '..---', 
                        '3': '...--', '4': '....-', '5': '.....', '6': '-....', 
                        '7': '--...', '8': '---..', '9': '----.'
                    };
                    return basic[char.toUpperCase()] || '';
                }
            };
        }
        return window.ALPHABETS;
    }
    
    /**
     * Generate a sidetone for keying
     * @param {boolean} isKeyDown - Whether the key is down
     */
    generateSidetone(isKeyDown) {
        if (isKeyDown) {
            // Key is down, start tone
            if (this.oscillator && this.oscillator.state !== 'started') {
                this.oscillator.start();
            }
            
            if (this.envelope) {
                this.envelope.triggerAttack();
            }
        } else {
            // Key is up, stop tone
            if (this.envelope) {
                this.envelope.triggerRelease();
            }
        }
    }
}