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
            morseSpeed: 13,
            volume: -10, // Default volume in dB
            arduinoPort: '',
            keyMode: 'A', // A = Iambic A, B = Iambic B
            theme: 'light',
            maidenheadLocator: '',
            preferredBand: 'auto',
            serverAddress: ''
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
        }
        
        // Apply morse speed
        if (this.app.trainer) {
            this.app.trainer.setSpeed(this.settings.morseSpeed);
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
        
        // Set key mode on the Arduino if connected
        if (this.app.arduino && this.app.arduino.isConnected) {
            this.app.arduino.setKeyMode(this.settings.keyMode);
        }
    }
    
    /**
     * Populate the settings form with current values
     */
    populateSettingsForm() {
        // Set form values from current settings
        document.getElementById('settingsToneFrequency').value = this.settings.toneFrequency;
        document.getElementById('settingsMorseSpeed').value = this.settings.morseSpeed;
        document.getElementById('settingsVolume').value = Math.round(((this.settings.volume + 40) / 40) * 100); // Convert dB to percentage
        document.getElementById('keyModeSelect').value = this.settings.keyMode;
        document.getElementById('themeSelect').value = this.settings.theme;
        
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
}