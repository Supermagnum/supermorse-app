/**
 * morseAudio.js
 * Handles playing Morse code audio with adjustable speed and Farnsworth spacing
 */

const MORSE_AUDIO = (function() {
    // Audio context
    let audioContext = null;
    
    // Default settings
    const defaults = {
        frequency: 700, // Standard Morse tone frequency in Hz
        ditDuration: 80, // Duration of a dit at 15 WPM in milliseconds
        farnsworthSpacing: true // Whether to use Farnsworth spacing
    };
    
    // Current settings
    let settings = { ...defaults };
    
    // Timing constants
    const TIMING = {
        DAH_MULTIPLIER: 3, // A dah is 3x the length of a dit
        ELEMENT_SPACE_MULTIPLIER: 1, // Space between elements is 1x dit
        CHAR_SPACE_MULTIPLIER: 3, // Space between characters is 3x dit
        WORD_SPACE_MULTIPLIER: 7, // Space between words is 7x dit
        FARNSWORTH_CHAR_SPACE_MULTIPLIER: 6, // Extended character space for Farnsworth
        FARNSWORTH_WORD_SPACE_MULTIPLIER: 14 // Extended word space for Farnsworth
    };
    
    /**
     * Initialize the audio context
     */
    function initAudio() {
        // Create audio context if it doesn't exist or is closed
        if (!audioContext || audioContext.state === 'closed') {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // Resume audio context if it's suspended (browser policy)
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
    }
    
    /**
     * Calculate timing values based on WPM and Farnsworth setting
     * @param {number} wpm - Words per minute
     * @param {boolean} farnsworth - Whether to use Farnsworth spacing
     * @returns {Object} Timing values in milliseconds
     */
    function calculateTiming(wpm, farnsworth) {
        // At standard Morse, 1 dit = 1200 / WPM milliseconds
        const ditDuration = 1200 / wpm;
        
        // Calculate other timings based on dit duration
        const dahDuration = ditDuration * TIMING.DAH_MULTIPLIER;
        const elementSpace = ditDuration * TIMING.ELEMENT_SPACE_MULTIPLIER;
        
        // Character and word spacing depends on Farnsworth setting
        const charSpace = ditDuration * (farnsworth ? 
            TIMING.FARNSWORTH_CHAR_SPACE_MULTIPLIER : 
            TIMING.CHAR_SPACE_MULTIPLIER);
            
        const wordSpace = ditDuration * (farnsworth ? 
            TIMING.FARNSWORTH_WORD_SPACE_MULTIPLIER : 
            TIMING.WORD_SPACE_MULTIPLIER);
            
        return {
            dit: ditDuration,
            dah: dahDuration,
            elementSpace,
            charSpace,
            wordSpace
        };
    }
    
    /**
     * Create a tone at the specified frequency
     * @param {number} frequency - Frequency in Hz
     * @param {number} startTime - Start time in seconds
     * @param {number} duration - Duration in seconds
     */
    function createTone(frequency, startTime, duration) {
        // Create oscillator
        const oscillator = audioContext.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        
        // Create gain node for envelope
        const gainNode = audioContext.createGain();
        
        // Apply slight attack and release to avoid clicks
        const attackTime = 0.005;
        const releaseTime = 0.005;
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(1, startTime + attackTime);
        gainNode.gain.setValueAtTime(1, startTime + duration - releaseTime);
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
        
        // Connect nodes
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Schedule oscillator
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
    }
    
    /**
     * Play a Morse code sequence
     * @param {string} morseCode - Morse code sequence (dots, dashes, spaces)
     * @param {function} onComplete - Callback when playback is complete
     */
    function playMorseSequence(morseCode, onComplete) {
        initAudio();
        
        // Calculate timing based on current settings
        const timing = calculateTiming(
            settings.wpm || 15, 
            settings.farnsworthSpacing
        );
        
        let currentTime = audioContext.currentTime;
        
        // Process each character in the Morse code sequence
        for (let i = 0; i < morseCode.length; i++) {
            const element = morseCode[i];
            
            if (element === '.') {
                // Play a dit
                createTone(settings.frequency, currentTime, timing.dit / 1000);
                currentTime += timing.dit / 1000;
            } else if (element === '-') {
                // Play a dah
                createTone(settings.frequency, currentTime, timing.dah / 1000);
                currentTime += timing.dah / 1000;
            } else if (element === ' ') {
                // Character space (already includes element space)
                currentTime += (timing.charSpace - timing.elementSpace) / 1000;
            } else if (element === '/') {
                // Word space (already includes character space)
                currentTime += (timing.wordSpace - timing.charSpace) / 1000;
            }
            
            // Add element space after each dit or dah (unless it's the last element)
            if ((element === '.' || element === '-') && i < morseCode.length - 1 && 
                (morseCode[i + 1] === '.' || morseCode[i + 1] === '-')) {
                currentTime += timing.elementSpace / 1000;
            }
        }
        
        // Schedule the completion callback
        if (onComplete) {
            setTimeout(onComplete, (currentTime - audioContext.currentTime) * 1000);
        }
        
        return (currentTime - audioContext.currentTime) * 1000; // Return duration in ms
    }
    
    /**
     * Play a character as Morse code
     * @param {string} character - The character to play
     * @param {function} onComplete - Callback when playback is complete
     * @param {string} country - The country code for language-specific Morse (optional)
     */
    function playCharacter(character, onComplete, country) {
        const morseCode = ALPHABETS.charToMorse(character, country);
        if (morseCode) {
            return playMorseSequence(morseCode, onComplete);
        }
        return 0;
    }
    
    /**
     * Play a word as Morse code
     * @param {string} word - The word to play
     * @param {function} onComplete - Callback when playback is complete
     * @param {string} country - The country code for language-specific Morse (optional)
     */
    function playWord(word, onComplete, country) {
        let morseCode = '';
        
        // Convert each character to Morse and add character spaces
        for (let i = 0; i < word.length; i++) {
            const charMorse = ALPHABETS.charToMorse(word[i], country);
            if (charMorse) {
                morseCode += charMorse;
                if (i < word.length - 1) {
                    morseCode += ' '; // Add character space
                }
            }
        }
        
        return playMorseSequence(morseCode, onComplete);
    }
    
    /**
     * Play a sequence of words as Morse code
     * @param {string} text - The text to play (words separated by spaces)
     * @param {function} onComplete - Callback when playback is complete
     * @param {string} country - The country code for language-specific Morse (optional)
     */
    function playText(text, onComplete, country) {
        let morseCode = '';
        const words = text.split(' ');
        
        // Convert each word to Morse and add word spaces
        for (let i = 0; i < words.length; i++) {
            for (let j = 0; j < words[i].length; j++) {
                const charMorse = ALPHABETS.charToMorse(words[i][j], country);
                if (charMorse) {
                    morseCode += charMorse;
                    if (j < words[i].length - 1) {
                        morseCode += ' '; // Add character space
                    }
                }
            }
            
            if (i < words.length - 1) {
                morseCode += '/'; // Add word space
            }
        }
        
        return playMorseSequence(morseCode, onComplete);
    }
    
    /**
     * Update audio settings
     * @param {Object} newSettings - New settings to apply
     */
    function updateSettings(newSettings) {
        settings = { ...settings, ...newSettings };
        
        // Convert WPM to dit duration
        if (settings.wpm) {
            settings.ditDuration = 1200 / settings.wpm;
        }
    }
    
    /**
     * Stop all audio playback
     */
    function stopAudio() {
        if (audioContext) {
            // Create a new audio context to stop all scheduled sounds
            audioContext.close().then(() => {
                audioContext = null;
            });
        }
    }
    
    // Public API
    return {
        playCharacter,
        playWord,
        playText,
        playMorseSequence,
        updateSettings,
        stopAudio,
        initAudio
    };
})();