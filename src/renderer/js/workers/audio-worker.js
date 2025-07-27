/**
 * audio-worker.js
 * Web Worker for offloading Morse code audio processing
 * This runs on a separate thread to improve performance and UI responsiveness
 */

// Global state for audio generation
let audioContext = null;
let oscillator = null;
let gainNode = null;

// Audio parameters
let frequency = 600; // Default frequency in Hz
let volume = -10; // Default volume in dB

// Timing parameters
let ditLength = 0.08; // Base timing unit in seconds (at 15 WPM)
let dahLength = 0.24; // 3x dit length
let intraCharSpace = 0.08; // Same as dit length
let interCharSpace = 0.24; // 3x dit length (standard)
let interWordSpace = 0.56; // 7x dit length (standard)

// Worker message handler
self.onmessage = function(e) {
  const { type, data } = e.data;
  
  switch(type) {
    case 'generate_morse':
      generateMorseAudio(data.morseCode, data.wpm, data.farnsworthMode, data.farnsworthRatio, data.frequency);
      break;
    
    case 'set_parameters':
      // Update audio parameters
      if (data.frequency) frequency = data.frequency;
      if (data.volume !== undefined) volume = data.volume;
      break;
    
    case 'stop':
      // Clean up resources if needed
      break;
  }
};

/**
 * Generate audio data for Morse code sequence
 * This runs entirely on the worker thread to avoid blocking the UI
 * 
 * @param {string} morseCode - The Morse code to generate (dots and dashes)
 * @param {number} wpm - Words per minute speed
 * @param {boolean|number} farnsworthMode - Whether to use Farnsworth timing
 * @param {number} farnsworthRatio - Ratio for Farnsworth timing
 * @param {number} freq - Frequency in Hz
 */
async function generateMorseAudio(morseCode, wpm, farnsworthMode, farnsworthRatio, freq) {
  // Update frequency if provided
  if (freq) frequency = freq;
  
  // Calculate timing based on WPM
  calculateTiming(wpm, farnsworthMode, farnsworthRatio);
  
  // Clean up the Morse code
  const cleanCode = morseCode.trim().replace(/\s+/g, ' ');
  
  try {
    // Generate timing data for all elements
    const timingData = generateTimingData(cleanCode);
    
    // Send the timing data back to the main thread
    self.postMessage({
      type: 'timing_data_ready',
      timingData: timingData,
      params: {
        frequency,
        wpm,
        farnsworthMode,
        farnsworthRatio
      }
    });
    
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error.message
    });
  }
}

/**
 * Generate timing data for all elements in the Morse sequence
 * 
 * @param {string} cleanCode - Cleaned Morse code sequence
 * @returns {Array} - Array of timing data objects
 */
function generateTimingData(cleanCode) {
  const timingData = [];
  
  // Split into characters
  const characters = cleanCode.split(' ');
  
  for (let i = 0; i < characters.length; i++) {
    const character = characters[i];
    
    // Process each element in the character
    for (let j = 0; j < character.length; j++) {
      const element = character[j];
      
      if (element === '.') {
        // Add dit
        timingData.push({
          type: 'dit',
          duration: ditLength * 1000, // Convert to ms
          isSound: true
        });
      } else if (element === '-') {
        // Add dah
        timingData.push({
          type: 'dah',
          duration: dahLength * 1000, // Convert to ms
          isSound: true
        });
      }
      
      // Add intra-character space (except after the last element)
      if (j < character.length - 1) {
        timingData.push({
          type: 'intra',
          duration: intraCharSpace * 1000, // Convert to ms
          isSound: false
        });
      }
    }
    
    // Add inter-character space (except after the last character)
    if (i < characters.length - 1) {
      timingData.push({
        type: 'inter',
        duration: interCharSpace * 1000, // Convert to ms
        isSound: false
      });
    }
  }
  
  return timingData;
}

/**
 * Calculate timing based on WPM and Farnsworth settings
 * 
 * @param {number} wpm - Words per minute
 * @param {boolean|number} useFarnsworth - Farnsworth mode flag or value
 * @param {number} farnsworthRatio - Ratio for Farnsworth timing
 */
function calculateTiming(wpm, useFarnsworth = false, farnsworthRatio = 6.5) {
  // Paris standard: "PARIS" is 50 units (including spaces)
  // at 1 WPM, "PARIS" takes 60 seconds, so 1 unit = 60/(50*WPM) seconds
  
  // Handle legacy farnsworthWpm parameter (for backward compatibility)
  const isFarnsworth = useFarnsworth === true || 
                     (typeof useFarnsworth === 'number' && useFarnsworth > wpm);
  
  // Calculate dit duration based on character speed (WPM)
  ditLength = 60 / (50 * wpm);
  
  // Dah length (3 units)
  dahLength = 3 * ditLength;
  
  // Intra-character space (1 unit)
  intraCharSpace = ditLength;
  
  // Calculate inter-character and inter-word spacing
  if (isFarnsworth) {
    // In Farnsworth timing, we use the ratio to determine spacing between characters
    
    // For backward compatibility with the old dual-WPM approach
    if (typeof useFarnsworth === 'number') {
      // Legacy mode: Calculate ratio from the two WPM values
      const slowWpm = wpm;
      const fastWpm = useFarnsworth;
      // The ratio is inversely proportional to the speed ratio
      farnsworthRatio = (fastWpm / slowWpm) * 3.0;
    }
    
    // Use the ratio to set inter-character spacing
    interCharSpace = farnsworthRatio * ditLength;
    
    // Word spacing keeps the same proportional relationship to character spacing
    // Standard is 7:3 ratio between word and character spacing
    const wordSpacingRatio = 7 / 3; // Standard word:character spacing ratio
    interWordSpace = interCharSpace * wordSpacingRatio;
    
  } else {
    // Standard timing - everything based on the same WPM
    // Inter-character space is 3× dit duration
    interCharSpace = 3 * ditLength;
    
    // Inter-word space is 7× dit duration
    interWordSpace = 7 * ditLength;
  }
}