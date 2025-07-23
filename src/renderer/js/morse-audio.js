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
        
        // Playback state
        this.isPlaying = false;
        this.cancelPlayback = false;
        
        // Audio device settings
        this.audioDevices = [];
        this.selectedDevice = 'default';
        this.sidetoneEnabled = true;
        
        // Initialize Tone.js components
        this.initToneComponents();
        
        // Enumerate available audio devices
        this.enumerateAudioDevices();
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
     * Enumerate available audio output devices
     */
    async enumerateAudioDevices() {
        try {
            // Request permission to access media devices
            await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Get list of all media devices
            const devices = await navigator.mediaDevices.enumerateDevices();
            
            // Filter to only audio output devices
            const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
            
            // Store the list of available devices
            this.audioDevices = audioOutputs;
            
            console.log('Available audio output devices:', audioOutputs);
            
            // Populate the device selection dropdown
            this.populateAudioDeviceSelect();
            
            return audioOutputs;
        } catch (error) {
            console.error('Error enumerating audio devices:', error);
            return [];
        }
    }
    
    /**
     * Get the list of available audio devices
     * @returns {Promise<Array>} - Resolves with the list of audio output devices
     */
    async getAudioDevices() {
        // If we already have devices, return them
        if (this.audioDevices && this.audioDevices.length > 0) {
            return this.audioDevices;
        }
        
        // Otherwise, enumerate and return
        return await this.enumerateAudioDevices();
    }
    
    /**
     * Populate the audio device selection dropdown
     */
    populateAudioDeviceSelect() {
        const deviceSelect = document.getElementById('audioDeviceSelect');
        if (!deviceSelect) return;
        
        // Clear existing options
        deviceSelect.innerHTML = '';
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = 'default';
        defaultOption.text = 'Default Device';
        deviceSelect.appendChild(defaultOption);
        
        // Add each available device
        this.audioDevices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.text = device.label || `Device ${device.deviceId.substring(0, 5)}...`;
            deviceSelect.appendChild(option);
        });
        
        // Set the current value
        deviceSelect.value = this.selectedDevice;
    }
    
    /**
     * Set the audio output device
     * @param {string} deviceId - The device ID to use
     */
    setAudioDevice(deviceId) {
        if (!deviceId) return;
        
        this.selectedDevice = deviceId;
        console.log(`Audio output device set to: ${deviceId}`);
        
        // Update audio routing if possible
        if (Tone.context && Tone.context.destination && typeof Tone.context.setSinkId === 'function') {
            try {
                Tone.context.setSinkId(deviceId);
            } catch (error) {
                console.error('Error setting audio output device:', error);
            }
        }
    }
    
    /**
     * Set whether sidetone is enabled
     * @param {boolean} enabled - Whether sidetone is enabled
     */
    setSidetoneEnabled(enabled) {
        this.sidetoneEnabled = enabled;
        console.log(`Sidetone ${enabled ? 'enabled' : 'disabled'}`);
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
        return new Promise(async (resolve) => {
            try {
                // Check if playback has been canceled
                if (this.cancelPlayback) {
                    console.log("Playback canceled before tone start");
                    resolve();
                    return;
                }
                
                // Set frequency
                const freq = frequency || this.frequency;
                console.log(`Creating fresh oscillator at ${freq}Hz for ${duration}ms`);
                
                // COMPLETELY NEW APPROACH: Create a new oscillator for each tone
                // First stop and disconnect any existing oscillator/envelope
                if (this.oscillator) {
                    if (this.oscillator.state === 'started') {
                        this.oscillator.stop();
                    }
                    this.oscillator.disconnect();
                }
                
                if (this.envelope) {
                    this.envelope.disconnect();
                }
                
                // Create new oscillator and envelope for this tone
                const newOscillator = new Tone.Oscillator({
                    type: 'sine',
                    frequency: freq,
                    volume: this.volume
                }).toDestination();
                
                const newEnvelope = new Tone.AmplitudeEnvelope({
                    attack: 0.005,
                    decay: 0.001,
                    sustain: 1,
                    release: 0.030  // Significantly increased release time to smooth out the end
                }).connect(newOscillator.output);
                
                // Store references
                this.oscillator = newOscillator;
                this.envelope = newEnvelope;
                
                // Start the oscillator
                console.log("Starting fresh oscillator");
                newOscillator.start();
                
                // Wait a small amount of time to ensure oscillator is started
                await new Promise(r => setTimeout(r, 10));
                
                // Trigger attack for a clean start
                console.log("Triggering envelope attack");
                newEnvelope.triggerAttack();
                
                // Schedule the release after the duration
                setTimeout(async () => {
                    try {
                        // Check if playback was canceled during tone
                        if (this.cancelPlayback) {
                            console.log("Playback canceled during tone");
                            newEnvelope.triggerRelease();
                            setTimeout(() => {
                                newOscillator.stop();
                                resolve();
                            }, 20);
                            return;
                        }
                        
                        // Release the envelope
                        console.log("Tone complete, releasing envelope");
                        newEnvelope.triggerRelease();
                        
                        // Much longer delay to allow release to complete fully before stopping
                        await new Promise(r => setTimeout(r, 120));
                        
                        if (newOscillator.state === 'started') {
                            // Fade out volume before stopping to eliminate clicks
                            newOscillator.volume.rampTo(-60, 0.05);
                            await new Promise(r => setTimeout(r, 60));
                            newOscillator.stop();
                        }
                        
                        resolve();
                    } catch (err) {
                        console.error("Error in tone release:", err);
                        resolve();
                    }
                }, duration);
            } catch (err) {
                console.error("Error in playTone:", err);
                resolve();
            }
        });
    }
    
    /**
     * Stop any currently playing tone and cancel ongoing playback
     */
    stopTone() {
        // Set the cancel flag to interrupt any ongoing playback
        this.cancelPlayback = true;
        this.isPlaying = false;
        
        // Trigger envelope release with longer release time to silence the tone smoothly
        if (this.envelope) {
            // Temporarily increase the release time to ensure smooth ending
            const originalRelease = this.envelope.release;
            this.envelope.release = 0.050; // 50ms release
            this.envelope.triggerRelease();
            
            // Restore original release time after triggering
            setTimeout(() => {
                this.envelope.release = originalRelease;
            }, 100);
        }
        
        // Force stop the oscillator if it's running
        if (this.oscillator && this.oscillator.state === 'started') {
            // Use a longer timeout and volume ramping to avoid clicks
            setTimeout(() => {
                // Fade out volume before stopping
                this.oscillator.volume.rampTo(-60, 0.1);
                
                // Then stop after the fade
                setTimeout(() => {
                    this.oscillator.stop();
                }, 120);
            }, 60);
        }
    }
    
    /**
     * Temporarily silence the tone without canceling playback
     * Used for pauses between Morse code elements
     */
    silenceTone() {
        // Trigger envelope release with smoother transition
        if (this.envelope) {
            // Temporarily increase the release time to ensure smooth ending
            const originalRelease = this.envelope.release;
            this.envelope.release = 0.035; // 35ms release for silences between elements
            this.envelope.triggerRelease();
            
            // Restore original release time after a brief delay
            setTimeout(() => {
                this.envelope.release = originalRelease;
            }, 50);
        }
    }
    
    /**
     * Calculate timing based on WPM and Farnsworth ratio
     * @param {number} wpm - Words per minute (character speed)
     * @param {boolean|number} useFarnsworth - Whether to use Farnsworth timing or legacy WPM value
     * @param {number} farnsworthRatio - Ratio between inter-character spacing and dit duration (standard is 3.0)
     */
    calculateTiming(wpm, useFarnsworth = false, farnsworthRatio = 3.0) {
        // Paris standard: "PARIS" is 50 units (including spaces)
        // at 1 WPM, "PARIS" takes 60 seconds, so 1 unit = 60/(50*WPM) seconds
        
        // Handle legacy farnsworthWpm parameter (for backward compatibility)
        const isFarnsworth = useFarnsworth === true || 
                           (typeof useFarnsworth === 'number' && useFarnsworth > wpm);
        
        // Calculate dit duration based on character speed (WPM)
        this.ditLength = 60 / (50 * wpm);
        
        // Dah length (3 units)
        this.dahLength = 3 * this.ditLength;
        
        // Intra-character space (1 unit)
        this.intraCharSpace = this.ditLength;
        
        // Calculate inter-character and inter-word spacing
        if (isFarnsworth) {
            // In Farnsworth timing, we use the ratio to determine spacing between characters
            // Standard Morse uses a 3:1 ratio (inter-character space is 3× the dit duration)
            // Farnsworth uses a higher ratio (e.g., 6.5:1) to create more space between characters
            
            // For backward compatibility with the old dual-WPM approach
            if (typeof useFarnsworth === 'number') {
                // Legacy mode: Calculate ratio from the two WPM values
                const slowWpm = wpm;
                const fastWpm = useFarnsworth;
                // The ratio is inversely proportional to the speed ratio
                farnsworthRatio = (fastWpm / slowWpm) * 3.0;
                console.log(`Converted legacy Farnsworth: Character ${fastWpm} WPM, Text ${slowWpm} WPM to ratio ${farnsworthRatio.toFixed(1)}`);
            }
            
            // Use the ratio to set inter-character spacing
            this.interCharSpace = farnsworthRatio * this.ditLength;
            
            // Word spacing keeps the same proportional relationship to character spacing
            // Standard is 7:3 ratio between word and character spacing
            const wordSpacingRatio = 7 / 3; // Standard word:character spacing ratio
            this.interWordSpace = this.interCharSpace * wordSpacingRatio;
            
            console.log(`Using Farnsworth timing: Character speed ${wpm} WPM, Spacing ratio ${farnsworthRatio.toFixed(1)}:1`);
            console.log(`Dit: ${Math.round(this.ditLength * 1000)}ms, Inter-character space: ${Math.round(this.interCharSpace * 1000)}ms`);
        } else {
            // Standard timing - everything based on the same WPM
            // Inter-character space is 3× dit duration
            this.interCharSpace = 3 * this.ditLength;
            
            // Inter-word space is 7× dit duration
            this.interWordSpace = 7 * this.ditLength;
        }
    }
    
    /**
     * Play a Morse code sequence
     * @param {string} morseCode - The Morse code sequence to play (.-. .- etc.)
     * @param {number} wpm - Words per minute (character speed)
     * @param {boolean|number} farnsworthMode - Whether to use Farnsworth timing (true/false) or legacy WPM value
     * @param {number} farnsworthRatio - Ratio between inter-character spacing and dit duration when Farnsworth is enabled
     * @returns {Promise} - Resolves when the sequence is complete or canceled
     */
    async playMorseCode(morseCode, wpm = 13, farnsworthMode = null, farnsworthRatio = 6.5) {
        console.log(`**** STARTING: Playing Morse code: ${morseCode} at ${wpm} WPM ****`);
        
        // Validate the input
        if (!morseCode || morseCode.trim() === '') {
            console.warn('Empty Morse code sequence provided');
            return Promise.resolve();
        }
        
        // Reset state before starting new playback
        console.log("Resetting playback state flags");
        this.isPlaying = true;
        this.cancelPlayback = false;
        
        // Calculate timing based on WPM and Farnsworth settings
        this.calculateTiming(wpm, farnsworthMode, farnsworthRatio);
        console.log(`Calculated timing: dit=${this.ditLength}s, dah=${this.dahLength}s`);
        
        // Clean up the Morse code
        const cleanCode = morseCode.trim().replace(/\s+/g, ' ');
        console.log(`Cleaned Morse code: "${cleanCode}"`);
        
        try {
            // Completely reinitialize audio for clean start
            console.log("Resetting audio system for clean playback");
            
            // First stop any existing oscillator
            if (this.oscillator) {
                if (this.oscillator.state === 'started') {
                    console.log("Stopping existing oscillator");
                    this.oscillator.stop();
                    // Wait long enough for full stop
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
                
                // Start with a fresh oscillator
                console.log("Starting fresh oscillator");
                this.oscillator.start();
                
                // Brief delay to ensure oscillator is fully started
                await new Promise(resolve => setTimeout(resolve, 100));
            } else {
                console.warn("No oscillator available");
                return Promise.resolve();
            }
            
            // Play each character
            const characters = cleanCode.split(' ');
            console.log(`Ready to play ${characters.length} character groups`);
            
            for (let i = 0; i < characters.length; i++) {
                // Check for cancellation
                if (this.cancelPlayback) {
                    console.log("Playback canceled before character group");
                    return;
                }
                
                const character = characters[i];
                console.log(`Playing character group ${i+1}/${characters.length}: "${character}"`);
                
                // Skip empty characters
                if (!character) {
                    console.log("Skipping empty character");
                    continue;
                }
                
                // Play each element (dit/dah) in the character
                for (let j = 0; j < character.length; j++) {
                    // Check for cancellation
                    if (this.cancelPlayback) {
                        console.log("Playback canceled before element");
                        return;
                    }
                    
                    const element = character[j];
                    
                    if (element === '.') {
                        // Play dit
                        console.log(`Playing dit ${j+1}/${character.length} (${this.ditLength * 1000}ms)`);
                        try {
                            await this.playTone(this.frequency, this.ditLength * 1000);
                        } catch (err) {
                            console.error("Error playing dit:", err);
                        }
                    } else if (element === '-') {
                        // Play dah
                        console.log(`Playing dah ${j+1}/${character.length} (${this.dahLength * 1000}ms)`);
                        try {
                            await this.playTone(this.frequency, this.dahLength * 1000);
                        } catch (err) {
                            console.error("Error playing dah:", err);
                        }
                    } else {
                        console.warn(`Unknown element: "${element}"`);
                    }
                    
                    // Check for cancellation
                    if (this.cancelPlayback) {
                        console.log("Playback canceled after element");
                        return;
                    }
                    
                    // Add intra-character space (except after the last element)
                    if (j < character.length - 1) {
                        console.log(`Intra-character silence (${this.intraCharSpace * 1000}ms)`);
                        await this.silence(this.intraCharSpace * 1000);
                    }
                }
                
                // Check for cancellation
                if (this.cancelPlayback) {
                    console.log("Playback canceled after character");
                    return;
                }
                
                // Add inter-character space (except after the last character)
                if (i < characters.length - 1) {
                    console.log(`Inter-character silence (${this.interCharSpace * 1000}ms)`);
                    await this.silence(this.interCharSpace * 1000);
                }
            }
            
            console.log("**** COMPLETED: Morse code playback finished successfully ****");
        } catch (error) {
            console.error('Error during Morse code playback:', error);
        } finally {
            // Always clean up
            this.isPlaying = false;
            
            // Add a small delay before stopping to ensure clean completion
            if (!this.cancelPlayback) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            
            this.stopTone();
        }
    }
    
    /**
    /**
     * Silence for a specified duration
     * @param {number} duration - Duration in milliseconds
     * @returns {Promise} - Resolves after the duration
     */
    silence(duration) {
        return new Promise((resolve) => {
            // Check if playback has been canceled
            if (this.cancelPlayback) {
                resolve();
                return;
            }
            
            // Only silence the tone without canceling playback
            this.silenceTone();
            
            // Wait for the specified duration
            setTimeout(() => {
                // Check again if playback has been canceled
                if (this.cancelPlayback) {
                    resolve();
                    return;
                }
                
                resolve();
            }, duration);
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
        // Check if sidetone is enabled
        if (!this.sidetoneEnabled) {
            return;
        }
        
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