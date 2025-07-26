/**
 * settings.js
 * Manages application settings and preferences
 */

export class SettingsManager {
    /**
     * Initialize settings manager
     * @param {Object} app - Reference to the main application
     */
    constructor(app) {
        this.app = app;
        this.settings = {
            toneFrequency: 600,
            morseSpeed: 15,
            volume: -10, // Default volume in dB
            arduinoPort: '',
            keyMode: 'A', // A = Iambic A, B = Iambic B
            pauseThreshold: 1000, // Default pause threshold in ms (1 second)
            theme: 'light',
            maidenheadLocator: '',
            preferredBand: 'auto',
            serverAddress: '',
            audioDevice: 'default', // Audio output device
            sidetoneEnabled: 'on',    // Whether to play sidetone on key press
            farnsworthEnabled: false, // Whether to use Farnsworth timing (characters faster than spacing)
            farnsworthRatio: 6.5, // Ratio between inter-character spacing and dit duration (standard is 3.0)
            regionalCharacterSet: 'none', // Regional character set (none, european, cyrillic, arabic)
            regionalTrainingMode: 'progressive' // How to learn regional characters (progressive, immersive)
        };
    }
    
    /**
     * Load settings from electron-store
     * @returns {Promise} - Resolves when settings are loaded
     */
    async loadSettings() {
        try {
            // Load settings from the main process
            const storedSettings = await window.electronAPI.getSettings();
            
            // Merge with defaults (keeping defaults for missing properties)
            this.settings = { ...this.settings, ...storedSettings };
            
            // Handle legacy key modes
            if (this.settings.keyMode === 'S' || this.settings.keyMode === 'P') {
                console.log(`Converting legacy key mode '${this.settings.keyMode}' to 'A'`);
                this.settings.keyMode = 'A';
            }
            
            // Apply settings
            this.applySettings();
            
            return true;
        } catch (error) {
            console.error('Error loading settings:', error);
            return false;
        }
    }
    
    /**
     * Save settings to electron-store
     * @param {Object} newSettings - New settings to save
     * @returns {Promise} - Resolves when settings are saved
     */
    async saveSettings(newSettings) {
        try {
            // Update local settings
            this.settings = { ...this.settings, ...newSettings };
            
            // Save to the main process
            await window.electronAPI.saveSettings(this.settings);
            
            // Apply settings
            this.applySettings();
            
            return true;
        } catch (error) {
            console.error('Error saving settings:', error);
            return false;
        }
    }
    
    /**
     * Apply current settings to the application
     */
    applySettings() {
        // Apply theme
        this.setTheme(this.settings.theme);
        
        // Apply tone frequency and volume
        if (this.app.morseAudio) {
            this.app.morseAudio.setFrequency(this.settings.toneFrequency);
            this.app.morseAudio.setVolume(this.settings.volume);
            
            // Apply audio device and sidetone settings
            if (typeof this.app.morseAudio.setAudioDevice === 'function') {
                this.app.morseAudio.setAudioDevice(this.settings.audioDevice);
            }
            
            if (typeof this.app.morseAudio.setSidetoneEnabled === 'function') {
                this.app.morseAudio.setSidetoneEnabled(this.settings.sidetoneEnabled === 'on');
            }
        }
        
        // Apply morse speed and Farnsworth settings
        if (this.app.trainer) {
            this.app.trainer.setSpeed(this.settings.morseSpeed);
            
        // Apply Farnsworth timing if enabled
            if (this.settings.farnsworthEnabled) {
                // Pass the Farnsworth ratio to the trainer
                this.app.trainer.farnsworthRatio = this.settings.farnsworthRatio;
                // Set farnsworthWpm to true to indicate Farnsworth mode is active
                this.app.trainer.farnsworthWpm = true;
            } else {
                // When Farnsworth is disabled, reset both values
                this.app.trainer.farnsworthRatio = 3.0; // Standard ratio
                this.app.trainer.farnsworthWpm = null;
            }
        }
        
        // Update UI elements with current settings
        document.getElementById('toneFrequency').value = this.settings.toneFrequency;
        document.getElementById('frequencyValue').textContent = this.settings.toneFrequency;
        
        // Update volume slider if it exists
        const volumeSlider = document.getElementById('settingsVolume');
        if (volumeSlider) {
            // Convert dB value to percentage for slider (from -40dB to 0dB)
            const volumePercent = Math.round(((this.settings.volume + 40) / 40) * 100);
            volumeSlider.value = volumePercent;
        }
        
        document.getElementById('morseSpeed').value = this.settings.morseSpeed;
        document.getElementById('speedValue').textContent = this.settings.morseSpeed;
        
        document.getElementById('themeSelect').value = this.settings.theme;
        
        // Set Arduino settings if connected
        if (this.app.arduino && this.app.arduino.isConnected) {
            this.app.arduino.setKeyMode(this.settings.keyMode);
            
            // Apply pause threshold setting
            if (this.settings.pauseThreshold !== undefined) {
                this.app.arduino.pauseThreshold = this.settings.pauseThreshold;
            }
        }
    }
    
    /**
     * Populate the settings form with current values
     */
    populateSettingsForm() {
        // Set form values from current settings
        document.getElementById('settingsToneFrequency').value = this.settings.toneFrequency;
        document.getElementById('settingsMorseSpeed').value = this.settings.morseSpeed;
        document.getElementById('settingsMorseSpeedValue').textContent = this.settings.morseSpeed;
        document.getElementById('settingsVolume').value = Math.round(((this.settings.volume + 40) / 40) * 100); // Convert dB to percentage
        document.getElementById('keyModeSelect').value = this.settings.keyMode;
        document.getElementById('themeSelect').value = this.settings.theme;
        
        // Set audio device and sidetone settings
        const audioDeviceSelect = document.getElementById('audioDeviceSelect');
        const sidetoneToggle = document.getElementById('sidetoneToggle');
        
        if (audioDeviceSelect) {
            // Populate audio devices dropdown
            this.populateAudioDevices();
        }
        
        // Set pause threshold slider if it exists
        const pauseThresholdSlider = document.getElementById('pauseThresholdSlider');
        if (pauseThresholdSlider) {
            pauseThresholdSlider.value = this.settings.pauseThreshold;
            document.getElementById('pauseThresholdValue').textContent = (this.settings.pauseThreshold / 1000).toFixed(1);
        }
        
        if (sidetoneToggle) {
            sidetoneToggle.value = this.settings.sidetoneEnabled;
        }
        
        // Set Farnsworth settings
        const farnsworthToggle = document.getElementById('farnsworthEnabled');
        const farnsworthRatio = document.getElementById('farnsworthRatio');
        const farnsworthRatioGroup = document.getElementById('farnsworthRatioGroup');
        
        if (farnsworthToggle) {
            farnsworthToggle.checked = this.settings.farnsworthEnabled;
        }
        
        if (farnsworthRatio) {
            farnsworthRatio.value = this.settings.farnsworthRatio;
            document.getElementById('farnsworthRatioValue').textContent = this.settings.farnsworthRatio.toFixed(1);
        }
        
        // Show/hide farnsworth ratio control based on toggle state
        if (farnsworthRatioGroup) {
            if (this.settings.farnsworthEnabled) {
                farnsworthRatioGroup.classList.remove('hidden');
            } else {
                farnsworthRatioGroup.classList.add('hidden');
            }
        }
        
        // Only set these if they're visible (Murmur unlocked)
        const maidenheadInput = document.getElementById('maidenheadLocator');
        const bandSelect = document.getElementById('preferredBand');
        const serverAddressInput = document.getElementById('serverAddress');
        
        if (maidenheadInput && !maidenheadInput.closest('.hidden')) {
            maidenheadInput.value = this.settings.maidenheadLocator || '';
        }
        
        if (bandSelect && !bandSelect.closest('.hidden')) {
            bandSelect.value = this.settings.preferredBand || 'auto';
        }
        
        if (serverAddressInput && !serverAddressInput.closest('.hidden')) {
            serverAddressInput.value = this.settings.serverAddress || '';
        }
        
        // Populate Arduino port select
        this.populatePortSelect();
    }
    
    /**
     * Populate the Arduino port select dropdown
     * @returns {Promise} - Resolves when ports are loaded
     */
    async populatePortSelect() {
        const portSelect = document.getElementById('arduinoPortSelect');
        portSelect.innerHTML = '<option value="">Select port...</option>';
        
        try {
            const ports = await window.electronAPI.getSerialPorts();
            
            ports.forEach(port => {
                const option = document.createElement('option');
                option.value = port.path;
                option.textContent = `${port.path} - ${port.manufacturer || 'Unknown'}`;
                
                // Select the currently configured port
                if (port.path === this.settings.arduinoPort) {
                    option.selected = true;
                }
                
                portSelect.appendChild(option);
            });
            
            return true;
        } catch (error) {
            console.error('Error loading serial ports:', error);
            return false;
        }
    }
    
    /**
     * Set the application theme
     * @param {string} theme - Theme name (light or dark)
     */
    setTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
        
        // Save theme setting
        this.settings.theme = theme;
    }
    
    /**
     * Get the current settings
     * @returns {Object} - Current settings
     */
    getSettings() {
        return { ...this.settings };
    }
    
    /**
     * Get a specific setting
     * @param {string} key - Setting key
     * @returns {*} - Setting value
     */
    getSetting(key) {
        return this.settings[key];
    }
    
    /**
     * Validate a Maidenhead grid locator
     * @param {string} locator - Maidenhead locator to validate
     * @returns {boolean} - True if valid, false otherwise
     */
    validateMaidenhead(locator) {
        // Basic validation for 4 or 6 character Maidenhead locator
        // Format: 2 letters + 2 digits + optional 2 letters
        const regex = /^[A-R]{2}[0-9]{2}([A-X]{2})?$/i;
        return regex.test(locator);
    }
    
    /**
     * Populate the audio devices dropdown
     * @returns {Promise} - Resolves when audio devices are loaded
     */
    async populateAudioDevices() {
        const audioDeviceSelect = document.getElementById('audioDeviceSelect');
        if (!audioDeviceSelect) return false;
        
        // Clear the current options
        audioDeviceSelect.innerHTML = '<option value="default">Default Output Device</option>';
        
        try {
            // Get the available audio devices from MorseAudio
            const devices = await this.app.morseAudio.getAudioDevices();
            
            // Add each device to the dropdown
            devices.forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = device.label || `Output Device ${device.deviceId}`;
                
                // Select the currently configured device
                if (device.deviceId === this.settings.audioDevice) {
                    option.selected = true;
                }
                
                audioDeviceSelect.appendChild(option);
            });
            
            return true;
        } catch (error) {
            console.error('Error loading audio devices:', error);
            return false;
        }
    }
}