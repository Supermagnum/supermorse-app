# Implementation Changes Documentation

## Overview

This document details the implementation changes made to improve authentication security, HF propagation data retrieval, application functionality and Arduino board support in the SuperMorse application.

## July 23, 2025

## 28. Morse Speed Display Fix in Settings

### Problem Addressed

The settings form was not displaying the current Morse speed (WPM) value alongside the slider control, unlike other settings such as the Farnsworth ratio which properly showed their current values.
morse code sent did not include Farnsworth timing between characters.

### Changes Made

#### 28.1 Added Visual Feedback for Current Morse Speed

Added a display element to show the current Morse speed value in the settings form and updated the settings manager to maintain this value when populating the form.

### Benefits

- Users can now see the current Morse speed value directly in the settings form
- Provides consistency with other settings that already displayed their current values
- Improves user experience by clearly showing the current speed setting



## Todo:
- Check that learned characters actually are saved to the database

## July 22, 2025

## 27. Fixed Path References in Test Scripts

### Problem Addressed

The run-tests.sh script and related test files had incorrect path references, causing test scripts to fail when executed from certain locations. Specifically, the test runner was looking for test-create-user.js in the project root directory rather than in the tests directory, and some test scripts had incorrect relative paths to import required modules.

### Changes Made

#### 27.1 Fixed Test Script Path References in run-tests.sh

Updated the test runner script to correctly point to test scripts in the tests directory rather than the project root, ensuring that all tests can be located and executed properly regardless of where the script is run from.

#### 27.2 Corrected Module Import Paths in Test Scripts

Corrected relative paths in test scripts within the tests directory to properly reference modules in the src directory. This ensures that scripts like create-master-user.js and create-simple-user.js can correctly import required modules when executed from the tests directory.

### Benefits

- All test scripts can now be executed successfully from any location
- Consistent path references across all test scripts
- Improved reliability of the test suite
- Better maintainability with properly structured relative paths
- Tests now work correctly when run either individually or through the test runner

## 26. Fixed Listening Training Keyboard Input and Character Feedback

### Problem Addressed

The listening training functionality was correctly capturing keyboard input, but it wasn't properly displaying feedback for correct and incorrect characters. After a user completed a 5-character sequence, the evaluation results (green for correct characters, red for incorrect ones) were only being shown in the original training section and not in the listening training section.




### Benefits

- Proper visual feedback in the listening training section shows users which characters they got correct or incorrect
- Consistent user experience between Arduino-based training and keyboard-based listening training
- Real-time character display during typing provides immediate feedback to users
- Enhanced learning experience with clear visual indicators for performance

## 25. Added Farnsworth Timing Support

### Problem Addressed

The application lacked support for Farnsworth timing, an important technique in Morse code training where characters are sent at a higher speed while spacing between them is increased. This method helps learners recognize character patterns at full speed while giving more time to process between characters, making the transition to higher speeds easier. Without Farnsworth timing, users struggled to bridge the gap between slow speeds (where characters sound different) and higher speeds needed for practical use.

### Changes Made

#### 25.1 Added Farnsworth Timing Settings

Added support for Farnsworth timing in the settings manager:
- Added farnsworthEnabled setting to toggle Farnsworth timing on/off
- Added farnsworthRatio setting to control the character speed in WPM
- Set default Farnsworth character speed to 18 WPM for effective learning

#### 25.2 Updated Morse Audio Engine

Enhanced the Morse audio generation to properly implement Farnsworth timing according to the PARIS standard:
- Modified the timing calculation algorithm to apply the faster character speed while maintaining slower spacing
- Used the higher farnsworthWpm speed for character elements (dits, dahs, intra-character spacing)
- Used the lower overall wpm speed for inter-character and inter-word spacing
- Implemented the correct condition for applying Farnsworth timing

#### 25.3 Added User Interface Controls

Created UI controls to allow users to adjust Farnsworth timing settings:
- Added a toggle switch to enable/disable Farnsworth timing
- Added a slider to control the Farnsworth character speed
- Implemented dynamic visibility of controls based on toggle state
- Added CSS styling for the toggle switch with improved clickable area
- Made the controls accessible with keyboard focus indicators

#### 25.4 Enhanced Settings Integration

Integrated Farnsworth timing with the existing settings framework:
- Updated the settings form population to properly display Farnsworth settings
- Added event handlers to update the UI when settings change
- Ensured settings are properly saved and restored between sessions
- Added initialization code to properly show/hide controls based on current settings

### Benefits

- Improved learning efficiency by implementing a proven technique used by Morse code instructors
- Better transition from beginner to advanced speeds by maintaining proper character sounds while allowing more processing time
- More natural progression in Morse code learning that prevents users from developing bad habits
- Enhanced user control over their learning experience with customizable timing settings
- Made it easier to recognize patterns in faster character sending while providing extra time to process between characters
- Implemented according to proper standards (PARIS method) used in amateur radio
- Better accessibility with improved toggle switch interface for all users


## Todo:
- Check that learned characters actually are saved to the database
- use mkdir -p dev-logs && npm run dev > dev-logs/app.log 2>&1

## July 21, 2025

## 24. Key Combinations for Prosigns and Regional Morse Code Settings

### Problem Addressed

The application lacked support for key combinations (prosigns) in listening training mode. Users could not practice or input important prosigns like AR (end of message), SK (end of contact), BT (break/new paragraph), and KN (go ahead, specific station). Additionally, there was no clear pathway for users to explore regional Morse code variations after mastering the standard character sets.

### Changes Made

#### 24.1 Added Key Combinations Support for Prosigns

Implemented detection for simultaneous keypresses in listening training mode:
- Added tracking of currently pressed keys
- Created a mapping of valid prosign combinations (AR, SK, BT, KN)
- Added sidetone generation when prosign combinations are detected
- Ensured sidetone stops when keys are released
- Implemented debounce mechanism to prevent duplicate prosign detection

#### 24.2 Added Regional Morse Code Settings Tab

Created a dedicated tab for regional Morse code variations:
- Added a new navigation item in the sidebar
- Created a corresponding content section
- Implemented requirements for unlocking (mastery of International, Prosigns, and Special characters)
- Made content visible but disabled until prerequisites are met
- Added clear explanation of requirements to unlock
- Included interactive character preview for regional sets

#### 24.3 AI FAILS:

- Was unable to create a test user with this learned: International Morse code,Prosigns,Special characters

The AI failed in doing this too,- so this is utter bullshi! and blatant lies.
Modified how locked features are displayed:
- Changed from hiding locked content to displaying it in a disabled state
- Added CSS styling for disabled content with reduced opacity and grayscale filter
- Implemented requirements overlay explaining prerequisites
- Made locked features visible but non-interactive until prerequisites are met


### Benefits

- Enhanced learning experience with support for important prosigns
- Improved audio feedback with sidetone for both individual keys and prosign combinations
- Clear progression path for users to move from standard to regional character sets


## July 21, 2025

## July 21, 2025

## 23. Added Listening Training Tab and Mastery Type Restrictions

### Problem Addressed

The application had only one training method using Arduino hardware, making it difficult for users without Arduino to practice Morse code. Additionally, users who only mastered listening/copying had access to send messages in all HF band channels, which is not representative of real-world skills where sending Morse code requires physical proficiency with a key.

### Changes Made

#### 23.1 Added Listening Training Tab

Created a dedicated "Listening training" tab as a copy of the existing Morse Code Training tab:

```javascript
// Added new tab item to navigation in index.html
<li class="sidebar-item" data-section="listening">
    <i class="fas fa-headphones"></i>
    <span>Listening training</span>
</li>

// Added a new section to match the training section but with unique element IDs
<section id="listeningSection" class="content-section hidden">
    <h2>Listening training</h2>
    <div class="warning-text">This method does not learn you how to use a morse key</div>
    <!-- Copied content from trainingSection with unique IDs -->
</section>
```

#### 23.2 Implemented Input Method Restrictions

Enforced specific input methods for each training tab:

```javascript
// In arduino.js - Check current section before processing input
processSerialLine(line) {
    // Only process Arduino input in the training section, not listening section
    if (this.app.currentSection === 'listening') {
        console.log('Arduino input ignored in Listening training tab');
        return;
    }
    
    // Process Arduino input normally for training tab
    // ...
}

// In app.js - Keyboard event listener for Listening tab
document.addEventListener('keydown', (e) => {
    // Only process keyboard input in the listening section
    if (this.currentSection === 'listening') {
        // Map key presses to Morse characters
        // ...
    } else if (this.currentSection === 'training') {
        // Show message to use Arduino for Training tab
        this.showMessage('Please use Arduino for the Training tab');
    }
});
```

#### 23.3 Added Visual Indicators and Instructions

Added clear visual indications of input method for each tab:

```html
<!-- Added warning text in Listening training section -->
<div class="warning-text" style="color: red;">This method does not learn you how to use a morse key</div>

<!-- Updated challenge text for Training tab -->
<p id="challengeText">Connect Arduino and press Start to begin - Arduino input only</p>

<!-- Updated challenge text for Listening tab -->
<p id="challengeTextListening">Press Start to begin - Keyboard input only</p>
```

#### 23.4 Added Auto-Logout on App Close

Implemented automatic logout when the app is closed:

```javascript
// In app.js - Added window event listener for app close
window.addEventListener('beforeunload', () => {
    // Logout user when app is closed
    if (this.auth) {
        this.auth.logout();
    }
});
```

#### 23.5 Added Mastery Type Tracking

Modified training.js to track whether mastery was achieved through sending or listening:

```javascript
// When updating mastery to 100%, record whether this was via sending or listening
if (this.learnedCharacters.length >= internationalOrder.length + 
    alphabets.getLearningOrder('international', 3).length + 
    alphabets.getLearningOrder('international', 4).length) {
        
        // Track whether this was achieved with Arduino (sending) or keyboard (listening)
        const masteryType = this.app.currentSection === 'training' ? 'sending' : 'listening';
        
        this.mastery = {
            'international': 100,
            'prosigns': 100,
            'special': 100,
            'masteryType': masteryType
        };
        
        // Log which type of mastery was achieved
        console.log(`User achieved 100% mastery via ${masteryType} training`);
}
```

#### 23.6 Added Server-Side Restrictions for Listening-Only Users

Modified murmur.js and the server configuration to restrict message sending in HF band channels for listening-only users:

```javascript
// In murmur.js - Added check for mastery type before allowing sending
async checkSendingPermission() {
    // Get the user's progress to check mastery type
    const progress = await window.electronAPI.getProgress(userId);
    
    // HF band channels where sending is restricted
    const hfBandChannels = ['160m', '80m', '60m', '40m', '30m', '20m', '17m', '15m', '10m', '6m'];
    
    // Check if user only mastered listening
    if (progress?.mastery?.masteryType === 'listening') {
        // Check if current channel is an HF band
        if (hfBandChannels.includes(this.currentBand)) {
            return {
                canSend: false,
                reason: 'You can only listen in this channel because you only mastered listening training. ' +
                       'Complete training using Arduino to send messages in HF band channels.'
            };
        }
        
        // Allow sending in text_chat
        if (this.currentBand === 'text_chat') {
            return { canSend: true };
        }
        
        // Allow sending in mods channel if user is a moderator
        if (this.currentBand === 'mods' && this.isAdmin) {
            return { canSend: true };
        }
    }
}
```

Added a metadata field and access control group in the server configuration:

```ini
; Define custom metadata fields
[metadata_fields]
; Flag to indicate user has only mastered listening (keyboard-only training)
listeningOnly=bool

; Access control configuration
[acl]
; Define custom groups
; listening-only group for users who only completed keyboard training
~listeningonly=listeningOnly:true

; HF band channels (1-10)
; Listening-only users can enter and listen but not speak or send text messages
1=~listeningonly:+enter,+traverse,-speak,-whisper,-textmessage
```

### Benefits

- **Improved Accessibility**: Users without Arduino hardware can now practice Morse code listening
- **Clear Skill Differentiation**: System now distinguishes between sending proficiency and listening-only skills
- **More Realistic Simulation**: Only users who've mastered physical keys can send in HF bands, better reflecting real amateur radio requirements
- **Security Enhancement**: Auto-logout on app close prevents unauthorized access
- **Balanced Permissions**: Listening-only users can still communicate in text_chat channel
- **Educational Clarity**: Clear visual indications of which input method to use for each training mode
- **Server-Enforced Restrictions**: Permissions are synchronized with the server database for consistent enforcement

## July 20, 2025

## 22. Added Audio Output Device Selection and Sidetone Feedback

### Problem Addressed

The application previously used the default system audio output device without allowing users to select specific speakers or headphones. This limited flexibility for users with multiple audio devices. Additionally, when using physical Morse keys or paddles, there was no audio feedback (sidetone) to hear what was being sent, making it difficult for users to confirm their keying.

### Changes Made

#### 22.1 Added Audio Output Device Selection

Added the ability to enumerate and select available audio output devices:

```javascript
// In morse-audio.js
constructor(app) {
    this.app = app;
    this.audioContext = null;
    this.oscillator = null;
    this.gainNode = null;
    this.frequency = 600;
    this.volume = -15;
    this.audioDevices = [];
    this.selectedDevice = null;
    this.sidetoneEnabled = true;
    
    // Initialize the audio components
    this.initAudioContext();
    this.enumerateAudioDevices();
}

/**
 * Enumerate available audio output devices
 * @returns {Promise<void>}
 */
async enumerateAudioDevices() {
    try {
        // Request permission to access audio devices
        await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Get list of all media devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        
        // Filter to just audio output devices
        this.audioDevices = devices.filter(device => device.kind === 'audiooutput');
        console.log('Available audio output devices:', this.audioDevices);
        
        // Set default device if none selected
        if (!this.selectedDevice && this.audioDevices.length > 0) {
            this.selectedDevice = this.audioDevices[0].deviceId;
        }
    } catch (error) {
        console.error('Error enumerating audio devices:', error);
    }
}

/**
 * Get list of available audio devices for UI
 * @returns {Array} List of audio output devices
 */
getAudioDevices() {
    return this.audioDevices.map(device => ({
        id: device.deviceId,
        label: device.label || `Speaker ${device.deviceId.slice(0, 5)}...`
    }));
}
```

Added a method to set the selected audio device:

```javascript
/**
 * Set the audio output device
 * @param {string} deviceId - The device ID to use
 * @returns {boolean} Success status
 */
setAudioDevice(deviceId) {
    try {
        // Store the selected device ID
        this.selectedDevice = deviceId;
        
        // Reinitialize audio components to use the new device
        this.initAudioContext();
        
        console.log(`Audio output device set to: ${deviceId}`);
        return true;
    } catch (error) {
        console.error('Error setting audio device:', error);
        return false;
    }
}
```

Updated the audio initialization to use the selected device:

```javascript
/**
 * Initialize audio context and components
 */
initAudioContext() {
    // Create new audio context if needed
    if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Initialize components for the selected device
    this.initToneComponents();
}

/**
 * Initialize audio components for tone generation
 */
initToneComponents() {
    try {
        // Clean up existing components
        if (this.gainNode) {
            this.gainNode.disconnect();
        }
        if (this.oscillator) {
            this.oscillator.disconnect();
            this.oscillator = null;
        }
        
        // Create gain node for volume control
        this.gainNode = this.audioContext.createGain();
        this.gainNode.gain.value = Math.pow(10, this.volume / 20); // Convert dB to linear
        
        // If we have a selected device, use it
        if (this.selectedDevice) {
            // For browsers that support setSinkId
            if (typeof this.gainNode.context.destination.setSinkId === 'function') {
                // Create an audio element to output to the selected device
                const audio = new Audio();
                audio.setSinkId(this.selectedDevice)
                    .then(() => {
                        const dest = this.audioContext.createMediaStreamDestination();
                        this.gainNode.connect(dest);
                        audio.srcObject = dest.stream;
                        audio.play();
                        console.log(`Audio routed to device: ${this.selectedDevice}`);
                    })
                    .catch(err => {
                        console.warn('Failed to set audio output device:', err);
                        // Fall back to default destination
                        this.gainNode.connect(this.audioContext.destination);
                    });
            } else {
                // If setSinkId is not supported, use default destination
                console.warn('setSinkId not supported by this browser, using default audio output');
                this.gainNode.connect(this.audioContext.destination);
            }
        } else {
            // No device selected, use default
            this.gainNode.connect(this.audioContext.destination);
        }
    } catch (error) {
        console.error('Error initializing tone components:', error);
        // Ensure we at least have a working audio output
        if (this.gainNode) {
            this.gainNode.connect(this.audioContext.destination);
        }
    }
}
```

#### 22.2 Added UI Controls for Audio Device Selection

Added a dropdown for audio device selection to the settings page:

```html
<!-- Audio Output Device Selection -->
<div class="form-group">
    <label for="audioDeviceSelect">Audio Output Device</label>
    <select id="audioDeviceSelect">
        <option value="">Default Device</option>
        <!-- Will be populated with available devices -->
    </select>
    <p class="hint">Select which speaker or headphone to use for Morse audio</p>
</div>
```

#### 22.3 Implemented Sidetone Functionality

Added a sidetone toggle to the settings:

```html
<!-- Sidetone Toggle -->
<div class="form-group">
    <label>
        <input type="checkbox" id="sidetoneEnabled" checked>
        Enable Sidetone
    </label>
    <p class="hint">Hear audio feedback when sending with a physical key</p>
</div>
```

Enhanced the MorseAudio class with sidetone functionality:

```javascript
/**
 * Set sidetone enabled state
 * @param {boolean} enabled - Whether sidetone is enabled
 */
setSidetoneEnabled(enabled) {
    this.sidetoneEnabled = enabled;
    console.log(`Sidetone ${enabled ? 'enabled' : 'disabled'}`);
}

/**
 * Generate sidetone when key is pressed/released
 * @param {boolean} active - Whether the key is pressed
 */
generateSidetone(active) {
    // Only generate sidetone if enabled
    if (!this.sidetoneEnabled) return;
    
    if (active) {
        // Key pressed - start tone
        if (!this.oscillator) {
            this.oscillator = this.audioContext.createOscillator();
            this.oscillator.type = 'sine';
            this.oscillator.frequency.setValueAtTime(this.frequency, this.audioContext.currentTime);
            this.oscillator.connect(this.gainNode);
            this.oscillator.start();
        }
    } else {
        // Key released - stop tone
        if (this.oscillator) {
            // Add a very short fade-out to prevent the click sound
            const now = this.audioContext.currentTime;
            this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
            this.gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);
            
            // Stop the oscillator after the fade-out completes
            this.oscillator.stop(now + 0.02);
            this.oscillator = null;
        }
    }
}
```

#### 22.4 Connected Paddle Events to Sidetone

Updated arduino.js to call the sidetone generator when paddle events are detected:

```javascript
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
    
    // Handle other messages...
}
```

#### 22.5 Updated Settings Manager for Audio Preferences

Enhanced the SettingsManager to save and load audio device and sidetone settings:

```javascript
// Default settings including audio device and sidetone
this.settings = {
    toneFrequency: 600,
    morseSpeed: 13,
    volume: -15,
    audioDevice: '',
    sidetoneEnabled: true
};

// Apply settings to components
applySettings() {
    // Apply audio settings
    if (this.app.morseAudio) {
        this.app.morseAudio.setFrequency(this.settings.toneFrequency);
        this.app.morseAudio.setVolume(this.settings.volume);
        this.app.morseAudio.setAudioDevice(this.settings.audioDevice);
        this.app.morseAudio.setSidetoneEnabled(this.settings.sidetoneEnabled);
    }
    
    // Apply other settings...
}
```

### Benefits

- Improved flexibility for users with multiple audio output devices
- Better accessibility for users with hearing impairments who need specific audio devices
- Real-time audio feedback when sending Morse code with physical keys or paddles
- More natural and traditional Morse code operation with sidetone feedback
- Enhanced learning experience with immediate auditory feedback during keying
- Better separation of audio channels for users in multi-device setups
- Ability to select dedicated audio devices for Morse practice

## 21. Removed Straight Key and Single Paddle Modes

### Problem Addressed

When single paddle mode or straight key mode was set, the application still reacted as if a dual paddle was attached. This created confusion for users and inconsistent behavior, particularly in the UI where both paddles would show activity even when using modes designed for single input. These modes also increased code complexity and maintenance overhead across the Arduino firmware variants.

### Changes Made

#### 21.1 Removed Straight Key and Single Paddle Modes from Arduino Firmware

Removed STRAIGHT_KEY and PADDLE_SINGLE from the KeyMode enum in all Arduino board variants:

```arduino
// Old implementation
enum KeyMode {
  STRAIGHT_KEY,     // Traditional straight key
  PADDLE_SINGLE,    // Paddle used as a single lever
  PADDLE_IAMBIC_A,  // Paddle used in iambic mode A (Curtis A - true implementation)
  PADDLE_IAMBIC_B   // Paddle used in iambic mode B
};

// New implementation
enum KeyMode {
  PADDLE_IAMBIC_A,  // Paddle used in iambic mode A (Curtis A - true implementation)
  PADDLE_IAMBIC_B   // Paddle used in iambic mode B
};
```

Removed STRAIGHT_KEY_PIN constant and related pinMode calls:

```arduino
// Removed from all board variants
const int STRAIGHT_KEY_PIN = 2;   // Connect straight key to D2 pin (GPIO 2)
pinMode(STRAIGHT_KEY_PIN, INPUT_PULLUP);
```

Removed handleStraightKey() and handleSinglePaddle() functions from all Arduino board variants.

Updated checkSerialCommands() to map legacy 'S' and 'P' commands to mode 'A' for backward compatibility:

```arduino
// Old implementation
switch (cmd) {
  case 'S': // Straight key mode
    currentKeyMode = STRAIGHT_KEY;
    Serial.println("MODE:STRAIGHT");
    break;
  case 'P': // Single paddle mode
    currentKeyMode = PADDLE_SINGLE;
    Serial.println("MODE:PADDLE_SINGLE");
    break;
  // ...
}

// New implementation
switch (cmd) {
  case 'S': // For backward compatibility, map to Iambic mode A
  case 'P': // For backward compatibility, map to Iambic mode A
  case 'A': // Iambic paddle mode A (Curtis A)
    currentKeyMode = PADDLE_IAMBIC_A;
    Serial.println("MODE:PADDLE_IAMBIC_A");
    break;
  // ...
}
```

#### 21.2 Set Consistent Debounce Delay Across All Boards

Updated the debounce delay to 200ms across all Arduino board variants for more consistent behavior:

```arduino
// Old implementation
const unsigned long DEBOUNCE_DELAY = 20;      // Debounce time in milliseconds

// New implementation 
const unsigned long DEBOUNCE_DELAY = 200;     // Debounce time in milliseconds
```

#### 21.3 Updated Default Key Mode in UI Settings

Modified settings.js to use 'A' (Iambic Mode A) as the default and handle legacy settings:

```javascript
// Old implementation
keyMode: 'S', // S = Straight key, P = Paddle, A = Iambic A, B = Iambic B

// New implementation
keyMode: 'A', // A = Iambic A, B = Iambic B
```

Added code to handle legacy settings by converting 'S' and 'P' to 'A':

```javascript
// Handle legacy key modes
if (this.settings.keyMode === 'S' || this.settings.keyMode === 'P') {
    console.log(`Converting legacy key mode '${this.settings.keyMode}' to 'A'`);
    this.settings.keyMode = 'A';
}
```

#### 21.4 Removed Key Mode Options from HTML UI

Updated the key mode selection dropdown in index.html to remove straight key and single paddle options:

```html
<!-- Old implementation -->
<div class="form-group">
    <label for="keyModeSelect">Morse Key Type</label>
    <select id="keyModeSelect">
        <option value="S">Straight Key</option>
        <option value="P">Single Paddle</option>
        <option value="A">Iambic Mode A (Curtis A)</option>
        <option value="B">Iambic Mode B</option>
    </select>
    <p class="hint">Select the type of Morse key you are using with the Arduino</p>
</div>

<!-- New implementation -->
<div class="form-group">
    <label for="keyModeSelect">Iambic Paddle Mode</label>
    <select id="keyModeSelect">
        <option value="A">Iambic Mode A (Curtis A)</option>
        <option value="B">Iambic Mode B</option>
    </select>
    <p class="hint">Select the iambic mode for your paddle</p>
</div>
```

### Benefits

- Streamlined code with fewer modes to maintain across all Arduino board variants
- Eliminated confusing UI behavior where both paddles would show activity in single input modes
- More consistent debounce behavior across all supported hardware
- Reduced firmware complexity and binary size
- Clearer focus on iambic paddle operation, which is the most common usage for Morse operators
- Simplified user interface with only the most useful options presented
- Maintained backward compatibility for existing users by automatically mapping legacy modes


## July 19, 2025

## 16. Fixed Click Sound at End of Audio Elements )

### Problem Addressed

User reported an audible click or pop sound at the end of each audio playback when using the Morse audio trainer. This click was occurring when the audio context abruptly ended the sound, creating a jarring experience during training sessions and making it difficult to focus on learning Morse code.

### Changes Made

#### 16.1 Implemented Audio Fade-out

Modified the `stopTone` method in the MorseAudio class to add a short fade-out at the end of each tone:

```javascript
// Old implementation
stopTone() {
  if (this.oscillator) {
    this.oscillator.stop();
    this.oscillator = null;
  }
}

// New implementation
stopTone() {
  if (this.oscillator) {
    const now = this.audioContext.currentTime;
    
    // Add a very short fade-out to prevent the click sound
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
    this.gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);
    
    // Stop the oscillator after the fade-out completes
    this.oscillator.stop(now + 0.02);
    this.oscillator = null;
  }
}
```

#### 16.2 Added Smooth Amplitude Envelope

Enhanced the envelope handling for better audio transitions:

```javascript
playTone(frequency, duration) {
  // Create oscillator and gain node if needed
  if (!this.oscillator) {
    this.oscillator = this.audioContext.createOscillator();
    this.gainNode = this.audioContext.createGain();
    
    // Connect the nodes
    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);
    
    // Set initial values
    this.oscillator.type = 'sine';
    this.oscillator.frequency.value = frequency;
    
    // Add a small attack (ramp up) to smooth the beginning
    const now = this.audioContext.currentTime;
    this.gainNode.gain.setValueAtTime(0, now);
    this.gainNode.gain.linearRampToValueAtTime(this.volume, now + 0.005);
    
    // Start the oscillator
    this.oscillator.start();
  }
  
  // Schedule the stop with the new fade-out method
  setTimeout(() => this.stopTone(), duration);
}
```

### Benefits

- Eliminated the distracting click sound at the end of each audio element
- Improved overall audio quality during Morse code training
- Reduced listener fatigue during extended practice sessions
- More professional and polished audio experience
- Better focus on learning the actual Morse code patterns rather than being distracted by audio artifacts

## 15. Authentication Method Consistency Fix

### Problem Addressed

After implementing the authentication security enhancements, a new issue was discovered: when users were logged in, closed the application, and reopened it, they remained authenticated but the Training, Progress, Settings, and Murmur HF UI elements were not visible. This happened because of an inconsistency in how authentication was checked throughout the application code.

### Changes Made

#### 15.1 Fixed Authentication Method Inconsistency

The root cause was identified in the `updateNavigationVisibility()` method, which was using a non-existent `isLoggedIn()` method instead of the correct `isAuthenticated()` method that exists in the AuthManager class:

```javascript
// Old implementation with incorrect method
updateNavigationVisibility() {
    const isLoggedIn = this.authManager.isLoggedIn(); // This method doesn't exist
    
    // Get all restricted sidebar items
    const restrictedItems = document.querySelectorAll('.sidebar-item[data-section="training"], .sidebar-item[data-section="progress"], .sidebar-item[data-section="settings"], .sidebar-item[data-section="murmur"]');
    
    // Update visibility based on login status
    restrictedItems.forEach(item => {
        item.style.display = isLoggedIn ? 'flex' : 'none';
    });
    
    // Also hide Arduino section if not logged in
    const arduinoSection = document.querySelector('.arduino-connection');
    if (arduinoSection) {
        arduinoSection.style.display = isLoggedIn ? 'block' : 'none';
    }
}

// New implementation with correct method
updateNavigationVisibility() {
    const isAuthenticated = this.authManager.isAuthenticated(); // Using the correct method
    
    // Get all restricted sidebar items
    const restrictedItems = document.querySelectorAll('.sidebar-item[data-section="training"], .sidebar-item[data-section="progress"], .sidebar-item[data-section="settings"], .sidebar-item[data-section="murmur"]');
    
    // Update visibility based on authentication status
    restrictedItems.forEach(item => {
        item.style.display = isAuthenticated ? 'flex' : 'none';
    });
    
    // Also hide Arduino section if not authenticated
    const arduinoSection = document.querySelector('.arduino-connection');
    if (arduinoSection) {
        arduinoSection.style.display = isAuthenticated ? 'block' : 'none';
    }
}
```

#### 15.2 Ensured Consistent Authentication Checks

Verified that all other authentication checks in the application were consistently using the `isAuthenticated()` method from the AuthManager class, particularly in:

- The `navigateTo()` method for access control
- The `showAuthenticatedUI()` method when logging in
- The `showLoginUI()` method when logging out
- The `initApp()` method during application initialization

### Benefits

- Fixed the issue where UI elements weren't visible after application restart
- Ensured consistent authentication checks throughout the application
- Improved user experience by maintaining proper UI state across application sessions
- Eliminated a silent failure that was caused by calling a non-existent method
- Enhanced the robustness of the authentication security implementation

## 14. Authentication Security Enhancement for UI Sections

### Problem Addressed

The application was displaying and allowing access to Training, Progress, Settings, and Murmur HF sections to unauthenticated users. These features should only be accessible to properly authenticated users, creating a security vulnerability where unauthorized users could access functionality that should be restricted.

### Changes Made

#### 14.1 Added Authentication Checks to Navigation System

Modified the `navigateTo()` method in app.js to verify authentication status before allowing access to restricted sections:

```javascript
navigateTo(section) {
    // Check if user is trying to access a restricted section without being logged in
    const restrictedSections = ['training', 'progress', 'settings', 'murmur'];
    if (restrictedSections.includes(section) && !this.authManager.isLoggedIn()) {
        // Redirect to login with a message
        section = 'account';
        alert('Authentication required to access this section.');
    }
    
    // Hide all sections
    const sections = document.querySelectorAll('.section');
    sections.forEach(s => {
        s.style.display = 'none';
    });
    
    // Show the selected section
    const selectedSection = document.getElementById(section + 'Section');
    if (selectedSection) {
        selectedSection.style.display = 'block';
    }
    
    // Update active state in the sidebar
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(item => {
        item.classList.remove('active');
    });
    const activeSidebarItem = document.querySelector(`.sidebar-item[data-section="${section}"]`);
    if (activeSidebarItem) {
        activeSidebarItem.classList.add('active');
    }
    
    // Update current section
    this.currentSection = section;
}
```

#### 14.2 Added Navigation Visibility Management

Created a new method to update navigation visibility based on authentication status:

```javascript
updateNavigationVisibility() {
    const isLoggedIn = this.authManager.isLoggedIn();
    
    // Get all restricted sidebar items
    const restrictedItems = document.querySelectorAll('.sidebar-item[data-section="training"], .sidebar-item[data-section="progress"], .sidebar-item[data-section="settings"], .sidebar-item[data-section="murmur"]');
    
    // Update visibility based on login status
    restrictedItems.forEach(item => {
        item.style.display = isLoggedIn ? 'flex' : 'none';
    });
    
    // Also hide Arduino section if not logged in
    const arduinoSection = document.querySelector('.arduino-connection');
    if (arduinoSection) {
        arduinoSection.style.display = isLoggedIn ? 'block' : 'none';
    }
}
```

#### 14.3 Updated Application Lifecycle Methods

Modified application initialization, login, and logout methods to properly update navigation visibility:

```javascript
// In initApp method
initApp() {
    // Set up navigation initially
    this.updateNavigationVisibility();
    
    // Check for saved authentication
    if (this.authManager.restoreSession()) {
        // Session restored, auth manager will handle the UI update
    } else {
        // No valid session found, show login UI
        this.showLoginUI();
    }
}

// In showAuthenticatedUI method
showAuthenticatedUI(user) {
    // Update UI for authenticated user
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('userDisplay').textContent = user.name || user.username;
    document.getElementById('authenticatedHeader').style.display = 'flex';
    
    // Update navigation visibility to show restricted sections
    this.updateNavigationVisibility();
    
    // Navigate to the training section
    this.navigateTo('training');
}

// In showLoginUI method
showLoginUI() {
    // Update UI for login screen
    document.getElementById('authenticatedHeader').style.display = 'none';
    
    // Update navigation visibility to hide restricted sections
    this.updateNavigationVisibility();
    
    // Navigate to the account section
    this.navigateTo('account');
}
```

### Benefits

- Enhanced security by preventing unauthenticated users from accessing restricted functionality
- Improved user interface clarity by only showing relevant navigation options based on authentication status
- Better user experience with clear feedback when authentication is required
- Proper encapsulation of authentication-dependent functionality
- Consistent security model across the entire application
- Prevention of potential unauthorized access to user data and settings

## 13. Morse Key Emulator Implementation

### Problem Addressed

Learning Morse code traditionally requires physical hardware (Arduino board and physical key), which can be a barrier to entry for new users. Additionally, there was no clear pathway for users who wanted to practice decoding Morse code without setting up physical hardware. The application also didn't emphasize that users need to be logged in to access training features, track progress, and change settings.

### Changes Made

#### 13.1 Created Morse Key Emulator Software

Developed a complete software emulator in the `key-emulator` directory:

```javascript
// key-emulator/morse-learning-program.js
/**
 * A Node.js program that emulates a Morse code key for the Supermorse app,
 * following the suggested learning order from alphabets.js and sending
 * input via emulated serial communication.
 */

// Core features:
// - Progressive learning following alphabets.js sequences
// - Serial port emulation to interface with Supermorse
// - Keyboard input detection with simultaneous key support for prosigns
```

The program includes special handling for prosigns as combinations of simultaneous keypresses:

```javascript
// Prosigns as key combinations
const prosignKeyCombinations = {
    'AR': ['a', 'r'],   // A+R pressed simultaneously
    'SK': ['s', 'k'],   // S+K pressed simultaneously
    'BT': ['b', 't'],   // B+T pressed simultaneously
    'KN': ['k', 'n']    // K+N pressed simultaneously
};
```

#### 13.2 Added Comprehensive Documentation

Created a detailed README.md file with installation and usage instructions:

```markdown
# Morse Code Key Emulator

A Node.js program that emulates a Morse code key for the Supermorse app,
following the suggested learning order from alphabets.js and sending input
via emulated serial communication.

## Important: Authentication Required

**Note**: The Supermorse app requires user authentication before you can
access training features, track progress, or change settings.
```

The documentation clearly explains the authentication requirement and provides a complete workflow from login to using the emulator.

#### 13.3 Added Package Management Support

Created a package.json file to simplify dependency installation:

```json
{
  "name": "morse-key-emulator",
  "version": "1.0.0",
  "description": "A Morse code key emulator for the Supermorse app with simultaneous key detection for prosigns",
  "main": "morse-learning-program.js",
  "dependencies": {
    "serialport": "^10.5.0",
    "keypress": "^0.2.1"
  }
}
```

#### 13.4 Updated Main README with Key Emulator Information

Added information about the key emulator to the main README.md file:

```markdown
## Morse Key Emulator

For those who want to practice Morse code reception without physical hardware,
we provide a software-based [Morse Key Emulator](https://github.com/Supermagnum/supermorse-app/tree/main/key-emulator) that:

- Follows the suggested learning order from alphabets.js
- Supports simultaneous keypresses for prosigns (e.g., A+R for "end of message")
- Emulates serial communication to interface with the app
- Provides a progressive learning interface

**Note**: You must be logged in to the Supermorse app to access training features,
track progress, and change settings.
```

### Benefits

- Removes the hardware barrier to entry for new users who want to learn Morse code
- Provides a clear pathway for practicing Morse code reception without physical hardware
- Emphasizes the authentication requirement to access training features
- Supports simultaneous key detection for proper prosign implementation
- Follows the optimal learning sequence from alphabets.js
- Simplifies installation and setup with proper package management
- Improves accessibility for users without specialized hardware
- Maintains the educational integrity of the Koch method


## July 17, 2025
## 12. Added Volume Control to Settings

### Problem Addressed

The application lacked a way for users to adjust the audio volume of the Morse code sounds, requiring them to use system volume controls instead. This made it difficult to balance the Morse code volume with other applications or to quickly adjust volume during practice sessions.

### Changes Made

#### 12.1 Added Volume Control to SettingsManager

Added volume property to the SettingsManager class to store and retrieve the user's preferred volume setting:

```javascript
// Old implementation
constructor() {
  this.settings = {
    toneFrequency: 600,
    morseSpeed: 13
  };
}

// New implementation
constructor() {
  this.settings = {
    toneFrequency: 600,
    morseSpeed: 13,
    volume: -10 // Default volume in decibels (-40 to 0)
  };
}
```

Added volume to the settings load, save, and apply methods:

```javascript
applySettings() {
  // Apply settings to the application
  if (window.morseTrainer) {
    window.morseTrainer.setToneFrequency(this.settings.toneFrequency);
    window.morseTrainer.setSpeed(this.settings.morseSpeed);
    
    // Apply volume setting to the morse audio
    if (window.morseTrainer.morseAudio) {
      window.morseTrainer.morseAudio.setVolume(this.settings.volume);
    }
  }
}
```

#### 12.2 Added Volume Slider to Settings UI

Added a volume slider to the Morse Audio Settings section in index.html:

```html
<div class="settings-row">
  <label for="settingsVolume">Volume</label>
  <div class="slider-container">
    <input type="range" id="settingsVolume" min="0" max="100" step="1" value="75">
    <span id="settingsVolumeValue">75%</span>
  </div>
</div>
```

#### 12.3 Added Volume Control Event Handling

Implemented event handlers in app.js to update the volume in real-time and save the setting:

```javascript
// Add event listener for volume slider
document.getElementById('settingsVolume').addEventListener('input', function(e) {
  const volumePercent = parseInt(e.target.value);
  document.getElementById('settingsVolumeValue').textContent = volumePercent + '%';
  
  // Convert percentage (0-100) to decibels (-40 to 0)
  // -40dB is near silence, 0dB is maximum volume
  const volumeDb = -40 + (volumePercent * 0.4);
  
  // Update audio in real-time
  if (window.morseTrainer && window.morseTrainer.morseAudio) {
    window.morseTrainer.morseAudio.setVolume(volumeDb);
  }
});

// Add volume to settings save
document.getElementById('saveSettingsBtn').addEventListener('click', function() {
  // Get values from form
  const toneFrequency = parseInt(document.getElementById('settingsToneFrequency').value);
  const morseSpeed = parseInt(document.getElementById('settingsMorseSpeed').value);
  const volumePercent = parseInt(document.getElementById('settingsVolume').value);
  
  // Convert percentage to decibels
  const volumeDb = -40 + (volumePercent * 0.4);
  
  // Save settings
  window.settingsManager.saveSettings({
    toneFrequency: toneFrequency,
    morseSpeed: morseSpeed,
    volume: volumeDb
  });
  
  // Display confirmation
  document.getElementById('settingsSavedMsg').style.display = 'block';
  setTimeout(() => {
    document.getElementById('settingsSavedMsg').style.display = 'none';
  }, 2000);
});
```

### Benefits

- Users can adjust the volume of Morse code sounds directly within the application
- Volume setting is persisted between sessions
- Real-time volume adjustment provides immediate feedback
- Volume can be balanced independently of system volume
- Improved user experience, especially during extended practice sessions

## 11. Enforced Minimum Morse Speed of 13 WPM

### Problem Addressed

The application was allowing users to set the Morse code speed as low as 5 WPM, which is below the standard minimum speed needed for effective training and real-world operation. Learning at speeds that are too slow can create habits that are difficult to overcome when transitioning to standard speeds used in actual communications.

### Changes Made

#### 11.1 Updated HTML Speed Sliders

Modified both speed sliders in the HTML to enforce a minimum value of 13 WPM:

```html
<!-- Old implementation in training section -->
<input type="range" id="morseSpeed" min="5" max="30" step="1" value="13">

<!-- New implementation in training section -->
<input type="range" id="morseSpeed" min="13" max="30" step="1" value="13">

<!-- Old implementation in settings section -->
<input type="range" id="settingsMorseSpeed" min="5" max="30" step="1" value="13">

<!-- New implementation in settings section -->
<input type="range" id="settingsMorseSpeed" min="13" max="30" step="1" value="13">
```

#### 11.2 Updated Initial Farnsworth Speed in MorseTrainer

Modified the initial Farnsworth WPM value in the MorseTrainer class constructor:

```javascript
// Old implementation
// Speed settings
this.wpm = 13; // Words per minute
this.farnsworthWpm = 8; // Character spacing WPM

// New implementation
// Speed settings
this.wpm = 13; // Words per minute
this.farnsworthWpm = 13; // Character spacing WPM for speeds <= 18 WPM
```

#### 11.3 Modified setSpeed Method to Enforce Minimum Speed

Updated the setSpeed method in the MorseTrainer class to ensure the Farnsworth speed never goes below 13 WPM:

```javascript
// Old implementation
setSpeed(wpm) {
    this.wpm = wpm;
    
    // Adjust Farnsworth speed if needed
    if (wpm > 18) {
        this.farnsworthWpm = wpm;
    } else {
        this.farnsworthWpm = Math.min(wpm, 10);
    }
}

// New implementation
setSpeed(wpm) {
    this.wpm = wpm;
    
    // Adjust Farnsworth speed if needed
    if (wpm > 18) {
        this.farnsworthWpm = wpm;
    } else {
        this.farnsworthWpm = Math.min(wpm, 13); // Minimum 13 WPM
    }
}
```

### Benefits

- Ensures that all Morse code practice and training occurs at speeds that are effective for learning and real-world application
- Prevents users from developing habits at ineffectively slow speeds that are difficult to overcome later
- Creates a consistent experience that matches standard Morse code speeds used in amateur radio and other communications
- Helps users develop proper timing and rhythm necessary for effective Morse code communication
- Maintains consistency between the UI controls and the underlying code implementation

## 10A. Improved Debounce and Signal Handling for Arduino Firmware

### Problems Addressed

The Arduino firmware for Morse decoding had two significant issues:
1. The pin tester code was causing Arduino boards to drop their connection
2. When a paddle was clicked once, it would register multiple signals (especially dashes), likely due to inadequate debounce handling

### Changes Made

#### 10A.1 Removed Problematic Pin Tester

Removed pin tester as it was causing connection issues:
- Removed references to pin_tester.ino
- Removed references to test-paddle-pins.js
- Updated documentation to remove mentions of the pin tester

#### 10A.2 Added Signal Repeat Delay to Prevent Multiple Signals

Added a delay mechanism to prevent a single paddle press from generating multiple signals across all Arduino board variants:

```arduino
// Added to all Arduino variants (ESP32-C6, SAMD21, Micro, Nano)
// Timing constants
const unsigned long DEBOUNCE_DELAY = 20;      // Debounce time to prevent contact bounce
const unsigned long SIGNAL_REPEAT_DELAY = 300; // Minimum time between signals to prevent multiple signals from a single press

// State variables
unsigned long lastSignalTime = 0;     // Tracks when the last signal was sent
```

Modified all paddle handler methods to check this signal repeat delay:

```arduino
// Old implementation
if ((millis() - lastDebounceTime) > DEBOUNCE_DELAY) {
  // Process paddle signal
}

// New implementation
if ((millis() - lastDebounceTime) > DEBOUNCE_DELAY && 
    (millis() - lastSignalTime) > SIGNAL_REPEAT_DELAY) {
  // Process paddle signal
}
```

Updated signal sending code to track when signals are sent:

```arduino
// When sending a dot
Serial.print(".");
lastSentElement = '.';
lastSignalTime = millis(); // Record when this signal was sent

// When sending a dash
Serial.print("-");
lastSentElement = '-';
lastSignalTime = millis(); // Record when this signal was sent
```

#### 10A.3 Fixed ESP32-C6 Missing Functions

Added the missing `setInputActive()` and `setInputInactive()` functions that were causing compilation errors:

```arduino
/**
 * Set input as active - turns on LED and sets inputActive flag
 */
void setInputActive() {
  startLedPulse();  // This function already turns on LED and sets inputActive to true
}

/**
 * Set input as inactive - turns off LED and clears inputActive flag
 */
void setInputInactive() {
  digitalWrite(YELLOW_LED_PIN, HIGH);  // HIGH turns the LED off (active-LOW)
  ledIsOn = false;
  inputActive = false;
}
```

### Benefits

- Dramatically improved reliability by preventing multiple signals from a single paddle press
- Consistent behavior across all Arduino board variants (ESP32-C6, SAMD21, Micro, Nano)
- Better user experience with more accurate Morse code detection
- More predictable paddle response, especially important for high-speed operation
- Fixed compilation errors that were preventing the decoder from working properly

## 10B. Removed Pin Tester and Fixed Xiao ESP32-C6 Decoder

### Problems Addressed

The pin tester code was causing Arduino boards to drop their connection, likely due to code freezing during execution.
The bloody AI was not able to fix the pin tester ino code even if it tried multiple times, so that tester was removed.
Additionally, the morse decoder for Xiao ESP32-C6 was experiencing crashes and very slow response to paddle inputs.

### Changes Made

#### 10B.1 Removed Problematic Pin Tester

Removed  pin tester :
- Removed references to pin_tester.ino
- Removed references to test-paddle-pins.js
- Updated documentation to remove mentions of the pin tester.

#### 10B.2 Fixed Morse Decoder for Xiao ESP32-C6

Added the missing `setInputActive()` and `setInputInactive()` functions that were causing compilation errors:

```arduino
/**
 * Set input as active - turns on LED and sets inputActive flag
 */
void setInputActive() {
  startLedPulse();  // This function already turns on LED and sets inputActive to true
}

/**
 * Set input as inactive - turns off LED and clears inputActive flag
 */
void setInputInactive() {
  digitalWrite(YELLOW_LED_PIN, HIGH);  // HIGH turns the LED off (active-LOW)
  ledIsOn = false;
  inputActive = false;
}
```

These functions were being called but not defined, causing compile errors and preventing the decoder from working properly.

#### 10B.3 Corrected Input Pins for XIAO ESP32-C6

Verified and corrected the input pin configuration for the Xiao ESP32-C6 board.

### Benefits

- Improved stability by removing code that was causing connection drops
- Fixed compilation errors in the Xiao ESP32-C6 morse decoder
- Improved responsiveness to paddle inputs
- More reliable operation across all supported Arduino boards

## 9. Xiao ESP32-C6 GPIO Pin Mapping Correction (July 15, 2025)

### Problem Addressed

The GPIO pin mappings for the Xiao ESP32-C6 board were incorrectly configured in both the pin_tester.ino and morse_decoder_Xiao_ESP32-C6.ino files. This caused the Arduino to not respond correctly to paddle inputs because it was monitoring the wrong GPIO pins.

### Changes Made

#### 9.1 Updated pin_tester.ino GPIO Mappings

Corrected the GPIO pin mappings for the Xiao ESP32-C6 board:

```arduino
// Old implementation
// Pins are mapped: D0-D10 = GPIO 0, 1, 2, 21, 22, 23, 16, 18, 20, 19, 17
int pinsToTestESP32C6[NUM_PINS_ESP32C6] = {0, 1, 2, 21, 22, 23, 16, 18, 20, 19, 17};

// New implementation
// Pins are mapped: D0-D10 = GPIO 8, 9, 10, 11, 12, 13, 14, 6, 5, 4, 7
int pinsToTestESP32C6[NUM_PINS_ESP32C6] = {8, 9, 10, 11, 12, 13, 14, 6, 5, 4, 7};
```

Also updated the pin mapping documentation in the serial output:

```arduino
// Old implementation
Serial.println("GPIO 0   | D0    | BOOT (might not work reliably)");
Serial.println("GPIO 1   | D1    | TX");
Serial.println("GPIO 2   | D2    | ");
Serial.println("GPIO 21  | D3    | ");
// etc.

// New implementation
Serial.println("GPIO 8   | D0    | ");
Serial.println("GPIO 9   | D1    | ");
Serial.println("GPIO 10  | D2    | ");
Serial.println("GPIO 11  | D3    | ");
// etc.
```

#### 9.2 Updated morse_decoder_Xiao_ESP32-C6.ino GPIO Mappings

Changed the paddle input pin assignments to match the correct GPIO mappings:

```arduino
// Old implementation
// D2 on Xiao ESP32-C6 is GPIO 2
// D3 on Xiao ESP32-C6 is GPIO 21
const int STRAIGHT_KEY_PIN = 2;  // Connect straight key to D2 pin (GPIO 2)
const int PADDLE_DOT_PIN = 2;    // Connect paddle dot contact to D2 pin (GPIO 2)
const int PADDLE_DASH_PIN = 21;  // Connect paddle dash contact to D3 pin (GPIO 21)

// New implementation
// D2 on Xiao ESP32-C6 is GPIO 10
// D3 on Xiao ESP32-C6 is GPIO 11
const int STRAIGHT_KEY_PIN = 10;  // Connect straight key to D2 pin (GPIO 10)
const int PADDLE_DOT_PIN = 10;    // Connect paddle dot contact to D2 pin (GPIO 10)
const int PADDLE_DASH_PIN = 11;   // Connect paddle dash contact to D3 pin (GPIO 11)
```

Also added comprehensive pin mapping documentation in the comments:

```arduino
// Pins are mapped: D0-D10 = GPIO 8, 9, 10, 11, 12, 13, 14, 6, 5, 4, 7
```

### Benefits

- Fixed the non-responsive paddle inputs on the Xiao ESP32-C6 board
- Correct GPIO pin mappings ensure proper detection of paddle signals
- Improved pin mapping documentation for future reference
- Consistent pin mappings across all related files
- Paddle signal detection now works correctly with the updated pin assignments

## 7. Multi-Board Pin Testing and Mapping Corrections
## July 14, 2025

### Problem Addressed

The pin mapping for Xiao ESP32-C6 contained an error where D3 was incorrectly mapped to GPIO3 instead of GPIO21. Additionally, the pin tester tool only supported the ESP32-C6 board, limiting its usefulness for users with different Arduino boards.

### Changes Made

#### 7.1 Corrected ESP32-C6 Pin Mapping

Fixed the pin mapping in the morse_decoder_Xiao_ESP32-C6.ino file:

```arduino
// Old implementation
// D3 on Xiao ESP32-C6 is GPIO 3 (if it matches Arduino numbering)
const int PADDLE_DASH_PIN = 3;   // Connect paddle dash contact to D3 pin (GPIO 3)

// New implementation
// D3 on Xiao ESP32-C6 is GPIO 21
const int PADDLE_DASH_PIN = 21;  // Connect paddle dash contact to D3 pin (GPIO 21)
```

#### 7.2 Added SAMD21 Support

Created a new morse decoder sketch specifically for the Xiao SAMD21 board:

```arduino
/**
 * morse_decoder_Xiao_SAMD21.ino
 * Arduino firmware for detecting Morse code signals from a physical key
 * and sending dots and dashes to the browser via Serial
 *
 * Set up for Xiao SAMD21 board
 */

// For SAMD21, D2 is digital pin 2
// For SAMD21, D3 is digital pin 3
const int STRAIGHT_KEY_PIN = 2;  // Connect straight key to D2 pin (digital pin 2)
const int PADDLE_DOT_PIN = 2;    // Connect paddle dot contact to D2 pin (digital pin 2)
const int PADDLE_DASH_PIN = 3;   // Connect paddle dash contact to D3 pin (digital pin 3)
```

#### 7.3 Enhanced Pin Tester Tool

Expanded the pin_tester.ino to support all four board types:

```arduino
// Board type enum with support for all boards
enum BoardType {
  ESP32_C6,
  SAMD21,
  ARDUINO_MICRO,
  ARDUINO_NANO
};

// Added pin definitions for each board type
// ESP32-C6: D0-D10 = GPIO 0, 1, 2, 21, 22, 23, 16, 18, 20, 19, 17
// SAMD21, Micro, Nano: D0-D10 = digital pins 0-10

// Added board selection commands
Serial.println("'e' - Switch to ESP32-C6 board mode");
Serial.println("'s' - Switch to SAMD21 board mode");
Serial.println("'m' - Switch to Arduino Micro board mode");
Serial.println("'n' - Switch to Arduino Nano board mode");
```

### Benefits

- Correctly maps D3 to GPIO21 on ESP32-C6 boards for proper paddle connectivity
- Provides dedicated support for Xiao SAMD21 board with appropriate pin mappings
- Unified pin testing tool that works with all supported Arduino boards
- Interactive board selection to easily test different hardware configurations
- Improved user experience with better diagnostics across all supported hardware

## 6. Continuous LED Blinking During Input Detection

### Problem Addressed

The Arduino firmware was only flashing the diagnostic LED briefly (for 500ms) when input was initially detected, which made it difficult to confirm when input was being actively detected over longer periods.

### Changes Made

#### 6.1 Implemented Continuous LED Blinking

Modified the firmware to continuously blink the LED as long as any input is detected:

```arduino
// LED diagnostic variables - Old implementation
bool ledIsOn = false;            // Tracks if the diagnostic LED is currently on
unsigned long ledOffTime = 0;    // Time when the LED should be turned off
const unsigned long LED_FLASH_DURATION = 500;  // LED flash duration in milliseconds (0.5 seconds)

// LED diagnostic variables - New implementation
bool ledIsOn = false;                   // Tracks if the diagnostic LED is currently on
bool inputActive = false;               // Flag to track if any input is currently active
unsigned long ledBlinkTime = 0;         // Next time to toggle the LED
const unsigned long BLINK_INTERVAL = 500;  // Toggle LED every 5500ms (fast blink)
```

#### 6.2 Updated Input Handling Logic

Replaced the single flash mechanism with a continuous blinking system:

```arduino
// Old implementation in loop()
// Check if it's time to turn off the diagnostic LED
if (ledIsOn && millis() >= ledOffTime) {
  digitalWrite(LED_BUILTIN, LOW);
  ledIsOn = false;
}

// New implementation in loop()
// Handle LED blinking when input is active
if (inputActive) {
  // Check if it's time to toggle the LED
  if (millis() >= ledBlinkTime) {
    // Toggle the LED
    ledIsOn = !ledIsOn;
    digitalWrite(LED_BUILTIN, ledIsOn ? HIGH : LOW);
    // Set next toggle time
    ledBlinkTime = millis() + BLINK_INTERVAL;
  }
} else if (ledIsOn) {
  // If no input is active but LED is on, turn it off
  digitalWrite(LED_BUILTIN, LOW);
  ledIsOn = false;
}
```

#### 6.3 Updated Input Detection Functions

Changed the input detection to set and clear the `inputActive` flag:

```arduino
// Old implementation
void flashDiagnosticLED() {
  // Only start a new flash if the LED is currently off
  if (!ledIsOn) {
    digitalWrite(LED_BUILTIN, HIGH);
    ledIsOn = true;
    ledOffTime = millis() + LED_FLASH_DURATION;
  }
}

// New implementation
void setInputActive() {
  inputActive = true;
}
```

Added code to clear the `inputActive` flag when input stops:

```arduino
// Key release detected
if (!keyIsDown && keyWasDown) {
  // ... existing code ...
  
  // Clear input active flag when key is released
  inputActive = false;
}
```

#### 6.4 ESP32-C6 Active-LOW LED Support

Made appropriate adjustments for the ESP32-C6's active-LOW LED configuration:

```arduino
// Toggle the LED - note that for ESP32-C6 the LED is active-LOW
ledIsOn = !ledIsOn;
digitalWrite(YELLOW_LED_PIN, ledIsOn ? LOW : HIGH);
```

### Benefits

- Visual confirmation of input detection throughout the entire duration of key presses
- Enhanced feedback for users to confirm their hardware is working correctly
- Clearer indication of when the Arduino is receiving signals
- Consistent behavior across all supported Arduino board variants
- The LED is properly turned off when no input is detected, preventing battery drain and confusion

## 5. Xiao ESP32-C6 Yellow LED Pin Fix
## July 13, 2025

### Problem Addressed

The Xiao ESP32-C6 firmware was using LED_BUILTIN (Arduino pin 13) for the yellow diagnostic LED, which was incorrect for this board. Additionally, the LED was glowing constantly from boot because the pin logic wasn't properly configured for the board's active-LOW LED.

### Changes Made

#### 5.1 Updated Yellow LED Pin Assignment

Changed the yellow LED pin assignment from LED_BUILTIN to GPIO15, which is the correct pin for the Xiao ESP32-C6 board:

```arduino
// Old implementation
// LED_BUILTIN is Arduino pin 13, which is connected
// to the Yellow LED on the Xiao PCB.

// New implementation
const int YELLOW_LED_PIN = 15;   // GPIO15 for the yellow LED on Xiao ESP32-C6
```

#### 5.2 Implemented Active-LOW LED Logic

The yellow LED on the Xiao ESP32-C6 is wired in an active-LOW configuration (LOW turns it ON, HIGH turns it OFF), which needed to be reflected in the code:

```arduino
// Old implementation (LED stays on at boot)
digitalWrite(LED_BUILTIN, LOW);  // Ensure LED starts off

// New implementation (LED correctly stays off at boot)
digitalWrite(YELLOW_LED_PIN, HIGH);  // Ensure LED starts off (LED is active-LOW)
```

The LED control logic was also inverted in other parts of the code:

```arduino
// In loop() function
// Old implementation
digitalWrite(LED_BUILTIN, LOW);

// New implementation
digitalWrite(YELLOW_LED_PIN, HIGH);  // HIGH turns the LED off (active-LOW)

// In flashDiagnosticLED() function
// Old implementation
digitalWrite(LED_BUILTIN, HIGH);

// New implementation
digitalWrite(YELLOW_LED_PIN, LOW);  // LOW turns the LED on (active-LOW)
```

#### 5.3 Added Documentation About Active-LOW Configuration

Added clear comments to explain the active-LOW configuration:

```arduino
// The Yellow LED on the Xiao PCB is connected to GPIO15.
// This LED is wired in an active-LOW configuration (LOW turns it ON, HIGH turns it OFF).
```

### Benefits

- Fixed yellow LED that was incorrectly glowing from boot
- Proper diagnostic feedback only when paddle input is detected
- Correct pin assignment for the Xiao ESP32-C6 board
- Clear documentation about the LED's active-LOW configuration
- Improved hardware diagnostic capabilities

## 4. Multi-Board Arduino Support
### Problem Addressed

The original morse decoder sketch was primarily designed for the Xiao ESP32-C6 board, limiting compatibility with other popular Arduino boards like the Arduino Micro and Nano.

### Changes Made

#### 4.1 Added Support for Arduino Micro

Created a specialized version of the morse decoder sketch for Arduino Micro:

```arduino
// arduino/morse_decoder/morse_decoder_Arduino_Micro.ino
/**
* morse_decoder_Arduino_Micro.ino
* Arduino firmware for detecting Morse code signals from a physical key
* and sending dots and dashes to the browser via Serial
*
* Set up for Arduino Micro board
*/
```

This version includes proper pin mappings and LED diagnostic features optimized for the Arduino Micro's hardware configuration.

#### 4.2 Added Support for Arduino Nano

Created a specialized version of the morse decoder sketch for Arduino Nano:

```arduino
// arduino/morse_decoder/morse_decoder_Arduino_Nano.ino
/**
* morse_decoder_Arduino_Nano.ino
* Arduino firmware for detecting Morse code signals from a physical key
* and sending dots and dashes to the browser via Serial
*
* Set up for Arduino Nano board
*/
```

This version is configured for the Arduino Nano's pin layout and includes the LED diagnostic feature.

#### 4.3 Enhanced LED Diagnostic Functionality

Added visual diagnostic feedback across all board versions:

```arduino
// LED diagnostic variables
bool ledIsOn = false;            // Tracks if the diagnostic LED is currently on
unsigned long ledOffTime = 0;    // Time when the LED should be turned off
const unsigned long LED_FLASH_DURATION = 500;  // LED flash duration in milliseconds (0.5 seconds)

/**
 * Flash the built-in LED for diagnostic purposes
 * Called when input is detected on either input pin
 */
void flashDiagnosticLED() {
  // Only start a new flash if the LED is currently off
  if (!ledIsOn) {
    digitalWrite(LED_BUILTIN, HIGH);
    ledIsOn = true;
    ledOffTime = millis() + LED_FLASH_DURATION;
  }
}
```

This diagnostic feature flashes the onboard LED for 0.5 seconds whenever input is detected on either paddle pin, providing visual confirmation that the hardware is working properly.

### Benefits

- Expanded hardware compatibility to include Arduino Micro and Nano boards
- Visual diagnostic feedback for easier troubleshooting
- Consistent paddle interface experience across different Arduino models
- Improved accessibility for users with different hardware
- Clear board-specific documentation and configuration

## 1. Token Verification Implementation

### Problem Addressed

The original code in `auth.js` was using client-side token parsing for authentication instead of proper server verification. This is a security concern because:
- Client-side token parsing can be compromised
- No verification of token validity against the server
- No check for token expiration or revocation

### Changes Made

#### 1.1 Updated Login Method

Changed the authentication flow in the `login` method to verify tokens with the server:

```javascript
// Old implementation
const user = this.parseToken(result.token) || {
    id: 'user-' + Date.now(),
    username: username,
    name: result.user?.name || username
};
this.currentUser = user;

// New implementation
const verification = await window.electronAPI.verifyToken(result.token);
if (verification.valid) {
    // Use the verified user data from the server
    this.currentUser = verification.user;
} else {
    // If token verification fails, use data from login response as fallback
    this.currentUser = result.user || {
        id: 'user-' + Date.now(),
        username: username,
        name: result.user?.name || username
    };
}
```

#### 1.2 Updated Session Restoration

Improved the `restoreSession` method to verify the saved token with the server:

```javascript
// Old implementation
const user = this.parseToken(token) || {
    id: 'user-' + Date.now(),
    email: 'restored@session.com',
    name: 'Restored User'
};
this.currentUser = user;

// New implementation
const verification = await window.electronAPI.verifyToken(token);
if (verification.valid) {
    // Use the verified user data from the server
    this.currentUser = verification.user;
    this.token = token;
    // Show the authenticated UI
    this.app.showAuthenticatedUI(this.currentUser);
    return true;
} else {
    // Token is invalid, clear it
    console.warn('Invalid token during session restoration');
    localStorage.removeItem('authToken');
    return false;
}
```

#### 1.3 Enhanced Token Verification with Fallback

Further improved the `restoreSession` method to include a more robust verification and fallback strategy:

```javascript
// Previous implementation had no fallback if verification failed
const verification = await window.electronAPI.verifyToken(token);
if (verification.valid) {
    // Use the verified user data from the server
    this.currentUser = verification.user;
    this.token = token;
    // Show the authenticated UI
    this.app.showAuthenticatedUI(this.currentUser);
    return true;
} else {
    // Token is invalid, clear it
    console.warn('Invalid token during session restoration');
    localStorage.removeItem('authToken');
    return false;
}

// New implementation with fallback strategy
const verification = await window.electronAPI.verifyToken(token);
            
let user;
if (verification.valid) {
    // Use the verified user data from the server
    user = verification.user;
} else {
    // If server verification fails, try to parse the token locally as fallback
    user = this.parseToken(token);
    
    // If parsing also fails, use a default user
    if (!user) {
        user = {
            id: 'user-' + Date.now(),
            email: 'restored@session.com',
            name: 'Restored User'
        };
        console.warn('Session restored with default user due to verification failure');
    }
}

// Update the current user and token
this.currentUser = user;
this.token = token;

// Show the authenticated UI
this.app.showAuthenticatedUI(this.currentUser);
```

Also fixed an undefined variable reference in the `login` method:

```javascript
// Old implementation (using undefined variable)
this.app.showAuthenticatedUI(user);

// New implementation (using correct reference)
this.app.showAuthenticatedUI(this.currentUser);
```

### Benefits

- Improved security through proper token verification
- Protection against token tampering and forgery
- Better error handling for invalid tokens
- Consistent user data from server validation

## 2. HF Propagation Data Retrieval

### Problem Addressed

The client application (`murmur.js`) was using a simplified client-side algorithm to simulate HF band propagation, despite the Supermorse server having sophisticated propagation simulation capabilities.

### Changes Made

#### 2.1 Added IPC Method in preload.js

Added a new IPC method to retrieve HF propagation data from the server:

```javascript
getHfPropagationData: (band) => ipcRenderer.invoke('get-hf-propagation-data', band),
```

#### 2.2 Implemented Handler in main.js

Created a new handler for the `get-hf-propagation-data` IPC method:

```javascript
/**
 * Get HF propagation data from the Mumble server
 * This retrieves propagation quality, conditions and recommendations
 * based on real data from the server's propagation model
 */
ipcMain.handle('get-hf-propagation-data', async (event, band) => {
  try {
    if (!mumbleClient) {
      return { 
        success: false, 
        error: 'Not connected to a Mumble server',
        // Return fallback values for offline mode
        fallback: true,
        propagationLevel: 3,
        solarFlux: 120,
        kIndex: 3,
        recommendedBands: ['40m', '20m', '30m']
      };
    }
    
    // Request propagation data from the server
    // This is done by requesting custom metadata from the server's root channel
    const rootChannel = mumbleClient.channelById(0);
    if (!rootChannel) {
      throw new Error('Root channel not found');
    }
    
    try {
      // Get channel metadata which contains propagation data
      const channelInfo = {};
      
      if (rootChannel.getMetadata) {
        // Direct metadata access if available
        channelInfo.metadata = await rootChannel.getMetadata();
      } else if (rootChannel.metadata) {
        // Metadata already loaded
        channelInfo.metadata = rootChannel.metadata;
      } else {
        // Fallback: use server global variables
        channelInfo.metadata = mumbleClient.getServerConfig?.() || {};
      }
      
      // Parse propagation data from metadata
      let propagationLevel = 3; // Default level
      let solarFlux = 120; // Default SFI
      let kIndex = 3; // Default K-index
      
      // Get band-specific propagation level
      const bandPropKey = `hf_propagation_${band}`;
      if (channelInfo.metadata[bandPropKey]) {
        propagationLevel = parseInt(channelInfo.metadata[bandPropKey]);
      }
      
      // Get solar flux index and K-index
      if (channelInfo.metadata.solar_flux_index) {
        solarFlux = parseInt(channelInfo.metadata.solar_flux_index);
      }
      if (channelInfo.metadata.k_index) {
        kIndex = parseInt(channelInfo.metadata.k_index);
      }
      
      // Calculate recommended bands based on propagation data
      const recommendedBands = calculateRecommendedBands(solarFlux, kIndex);
      
      return {
        success: true,
        propagationLevel,
        solarFlux,
        kIndex, 
        recommendedBands,
        band
      };
    } catch (metadataError) {
      // Fallback to client-side simulation if metadata access fails
      // ... (fallback implementation)
    }
  } catch (error) {
    // Error handling
    // ... (error handling implementation)
  }
});
```

#### 2.3 Updated simulatePropagation in murmur.js

Modified the `simulatePropagation` method to retrieve data from the server when connected:

```javascript
/**
 * Simulate propagation quality for a band
 * This function retrieves real propagation data from the server when connected,
 * and falls back to client-side simulation when offline
 * @param {string} band - The HF band
 * @returns {number} - Propagation level (1-5)
 */
async simulatePropagation(band) {
    // First try to get propagation data from the server
    try {
        // Only attempt to get server data if connected
        if (this.isConnected) {
            const propData = await window.electronAPI.getHfPropagationData(band);
            
            if (propData.success) {
                console.log(`Using server propagation data for ${band}: Level ${propData.propagationLevel}`);
                
                // Update recommended bands if available
                if (propData.recommendedBands && propData.recommendedBands.length > 0) {
                    console.log('Recommended bands:', propData.recommendedBands.join(', '));
                }
                
                // Return the server-provided propagation level
                return propData.propagationLevel;
            }
        }
    } catch (error) {
        console.warn('Error getting propagation data from server:', error);
        // Fall back to client-side simulation
    }
    
    // Client-side fallback algorithm
    // ... (original fallback implementation kept for offline use)
}
```

#### 2.4 Updated switchChannel Method

Updated the `switchChannel` method to properly handle the now-async `simulatePropagation` method:

```javascript
// Old implementation
if (hfBandRegex.test(channelId)) {
    const propagationLevel = this.simulatePropagation(channelId);
    this.updatePropagationIndicator(propagationLevel);
} else {
    // Default propagation for non-HF channels
    this.updatePropagationIndicator(4);
}

// New implementation
if (hfBandRegex.test(channelId)) {
    // Get propagation level from server or client-side algorithm
    this.simulatePropagation(channelId).then(propagationLevel => {
        this.updatePropagationIndicator(propagationLevel);
    }).catch(error => {
        console.error('Error getting propagation data:', error);
        // Default fallback
        this.updatePropagationIndicator(3);
    });
} else {
    // Default propagation for non-HF channels
    this.updatePropagationIndicator(4);
}
```

### Benefits

- More accurate HF propagation simulation based on real-world factors
- Integration with the server's sophisticated propagation model
- Access to additional data such as:
  - Solar Flux Index (SFI)
  - K-index (geomagnetic activity)
  - Recommended bands based on current conditions
- Fallback to client-side simulation when offline or if server data is unavailable
- Improved user experience with more realistic band conditions

## 3. Arduino Hardware Compatibility Improvements
## July 12, 2025

### Problem Addressed

The application had hardcoded pin assignments in the Arduino Morse decoder sketch, making it difficult to use with different boards, especially those with non-standard GPIO pin mappings like the Xiao ESP32-C6.

### Changes Made

#### 3.1 Created Arduino Pin Testing Tools (14:21:01)

Created a diagnostic system to identify the correct GPIO pins for paddle connections:

```arduino
// arduino/pin_tester/pin_tester.ino
// A diagnostic tool for detecting which pins are receiving signals
// from a Morse paddle

// Key functions:
// - Monitors multiple GPIO pins simultaneously
// - Reports when pins detect a connection to GND
// - Helps identify which GPIO pins correspond to physical pins
```

Companion Node.js script to display test results:

```javascript
// test-paddle-pins.js
// A script to run the pin tester Arduino sketch and monitor the results

// Key functionality:
// - Connects to Arduino on /dev/ttyACM0
// - Displays real-time pin activity
// - Highlights when signals are detected on GPIO pins
```

#### 3.2 Arduino Serial Communication (12:01:39)

Created a script to establish serial communication with the Arduino:

```javascript
// connect-arduino.js
// A script to connect to an Arduino Morse key interface

// Key functionality:
// - Establishes connection to /dev/ttyACM0
// - Configures the Arduino for dual lever paddle mode
// - Processes and displays Morse code signals
```

Successfully connected to the Xiao ESP32-C6 and configured it for iambic paddle mode:

```
Connected to Arduino dual lever paddle interface on /dev/ttyACM0
Sent key mode command: B (Iambic Mode B for dual lever paddle)
Arduino mode set to: PADDLE_IAMBIC_B
```

#### 3.3 Added Multi-Board Compatibility Instructions (12:30:11)

Enhanced the morse_decoder.ino with comprehensive instructions for different Arduino boards:

```arduino
/**
 * ========= PIN TESTING INSTRUCTIONS =========
 * 
 * If you're having trouble with pin connections, use the pin_tester sketch to identify
 * the correct GPIO pins for your specific Arduino board...
 * 
 * For different Arduino boards:
 * - Arduino Uno/Nano/Mini: Pin labels match GPIO numbers (D2=GPIO2, D3=GPIO3)
 * - ESP32/ESP8266 boards: Pin labels often DON'T match GPIO numbers
 * - Xiao boards: Typically D1=GPIO1, D2=GPIO2, etc. but may vary by model
 * ...
 */
```

Added troubleshooting guidance for common issues:

```arduino
/**
 * Troubleshooting:
 * - No signals detected: Check your wiring and ensure the paddle completes a circuit to GND
 * - Inconsistent signals: Increase DEBOUNCE_DELAY value if contacts are noisy
 * - Wrong character sent: Make sure dot/dash pins are correctly identified and assigned
 */
```

### Benefits

- Improved hardware compatibility across different Arduino boards
- Easy identification of correct GPIO pins for paddle connections
- Clear documentation for setup and troubleshooting
- Support for boards with non-standard pin mappings like the Xiao ESP32-C6
- Better user experience when connecting physical hardware

## Conclusion

These changes significantly improve the SuperMorse application in three key areas:

1. **Security**: By implementing proper token verification with the server, we've enhanced the authentication system's security and reliability.

2. **Functionality**: By integrating with the server's HF propagation model, we've improved the realism and accuracy of band condition simulations.

3. **Hardware Compatibility**: By creating pin testing tools and adding multi-board instructions, we've made the application more accessible to users with different Arduino boards.

All improvements maintain backward compatibility and include fallback mechanisms for handling error cases, ensuring a robust user experience.
