/**
 * app.js
 * Main entry point for the renderer process
 */

// Import modules
import { AuthManager } from './auth.js';
import { MorseTrainer } from './training.js';
import { ArduinoInterface } from './arduino.js';
import { SettingsManager } from './settings.js';
import { MorseAudio } from './morse-audio.js';
import { MurmurInterface } from './murmur.js';

// Main application class
class SuperMorseApp {
    constructor() {
        // Initialize module instances
        this.auth = new AuthManager(this);
        this.settings = new SettingsManager(this);
        this.morseAudio = new MorseAudio(this);
        this.arduino = new ArduinoInterface(this);
        this.trainer = new MorseTrainer(this);
        this.murmur = new MurmurInterface(this);
        
        // State variables
        this.currentUser = null;
        this.currentSection = 'training';
        
        // Initialize app
        this.initApp();
    }
    
    /**
     * Initialize application
     */
    async initApp() {
        // Set up event listeners
        this.setupEventListeners();
        
        // Load settings
        await this.settings.loadSettings();
        
        // Initial update of navigation visibility
        this.updateNavigationVisibility();
        
        // Check for saved authentication
        const savedAuth = localStorage.getItem('authToken');
        if (savedAuth) {
            try {
                // Attempt to restore session
                await this.auth.restoreSession(savedAuth);
            } catch (error) {
                console.error('Failed to restore session:', error);
                // Show login UI if session restoration fails
                this.showLoginUI();
            }
        } else {
            // No saved auth, show login UI
            this.showLoginUI();
        }
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.sidebar nav ul li').forEach(item => {
            item.addEventListener('click', () => {
                const section = item.getAttribute('data-section');
                // Don't allow navigation to locked sections
                if (item.classList.contains('locked')) {
                    this.showModal('Feature Locked', 'This feature is locked until you complete the required training.');
                    return;
                }
                this.navigateTo(section);
            });
        });
        
        // Login and Register tab switching
        document.querySelectorAll('.auth-tabs .tab').forEach(tab => {
            tab.addEventListener('click', () => {
                // Set active tab
                document.querySelectorAll('.auth-tabs .tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Show corresponding content
                const tabId = tab.getAttribute('data-tab');
                document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
                document.getElementById(`${tabId}Tab`).classList.add('active');
            });
        });
        
        // Login form
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;
            await this.auth.login(username, password);
        });
        
        // Registration form
        document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('registerUsername').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('registerConfirmPassword').value;
            const maidenhead = document.getElementById('registerMaidenhead').value;
            
            if (password !== confirmPassword) {
                document.getElementById('registerMessage').textContent = 'Passwords do not match';
                document.getElementById('registerMessage').classList.add('error');
                return;
            }
            
            // Use username as name if needed
            await this.auth.register(username, username, email, password, maidenhead);
        });
        
        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.auth.logout();
        });
        
        // Arduino connection
        document.getElementById('connectArduino').addEventListener('click', async () => {
            try {
                const ports = await window.electronAPI.getSerialPorts();
                if (ports.length === 0) {
                    this.showModal('No Ports Found', 'No serial ports were detected. Please connect your Arduino device.');
                    return;
                }
                
                // If we have a saved port, use it
                const settings = await window.electronAPI.getSettings();
                if (settings.arduinoPort && ports.some(port => port.path === settings.arduinoPort)) {
                    await this.arduino.connect(settings.arduinoPort);
                    return;
                }
                
                // Otherwise, let the user choose from available ports
                this.showPortSelectionModal(ports);
            } catch (error) {
                console.error('Error listing serial ports:', error);
                this.showModal('Connection Error', 'Failed to list serial ports. ' + error.message);
            }
        });
        
        // Training controls
        document.getElementById('startLessonBtn').addEventListener('click', () => {
            document.getElementById('startLessonBtn').classList.add('hidden');
            document.getElementById('pauseLessonBtn').classList.remove('hidden');
            document.getElementById('stopLessonBtn').classList.remove('hidden');
            this.trainer.startLesson();
        });
        
        document.getElementById('pauseLessonBtn').addEventListener('click', () => {
            this.trainer.pauseLesson();
        });
        
        document.getElementById('resumeLessonBtn').addEventListener('click', () => {
            this.trainer.resumeLesson();
        });
        
        document.getElementById('stopLessonBtn').addEventListener('click', () => {
            document.getElementById('stopLessonBtn').classList.add('hidden');
            document.getElementById('pauseLessonBtn').classList.add('hidden');
            document.getElementById('resumeLessonBtn').classList.add('hidden');
            document.getElementById('startLessonBtn').classList.remove('hidden');
            this.trainer.stopLesson();
        });
        
        // Tone frequency adjustment
        document.getElementById('toneFrequency').addEventListener('input', (e) => {
            const frequency = parseInt(e.target.value);
            document.getElementById('frequencyValue').textContent = frequency;
            this.morseAudio.setFrequency(frequency);
        });
        
        // Morse speed adjustment
        document.getElementById('morseSpeed').addEventListener('input', (e) => {
            const speed = parseInt(e.target.value);
            document.getElementById('speedValue').textContent = speed;
            this.trainer.setSpeed(speed);
        });
        
        // Volume adjustment in training section
        document.getElementById('settingsVolume')?.addEventListener('input', (e) => {
            const volumePercent = parseInt(e.target.value);
            // Convert percentage (0-100) to dB (-40 to 0)
            const volumeDb = -40 + (volumePercent / 100 * 40);
            this.morseAudio.setVolume(volumeDb);
        });
        
        // Test tone button
        document.getElementById('playToneBtn').addEventListener('click', () => {
            const frequency = parseInt(document.getElementById('toneFrequency').value);
            this.morseAudio.playTone(frequency, 500);
        });
        
        // Listening training controls with event listeners and current character syncing
        document.getElementById('startLessonBtnListening').addEventListener('click', () => {
            document.getElementById('startLessonBtnListening').classList.add('hidden');
            document.getElementById('pauseLessonBtnListening').classList.remove('hidden');
            document.getElementById('stopLessonBtnListening').classList.remove('hidden');
            
            // Use the original training tab's start lesson functionality
            this.trainer.startLesson();
            
            // Sync the display to the listening training tab
            this.syncListeningDisplay();
            
            // Set explicit instruction for keyboard input when lesson starts
            document.getElementById('challengeTextListening').textContent = 
                'Listen and type on keyboard what you hear - Keyboard input only';
        });
        
        document.getElementById('pauseLessonBtnListening').addEventListener('click', () => {
            this.trainer.pauseLesson();
        });
        
        document.getElementById('resumeLessonBtnListening').addEventListener('click', () => {
            this.trainer.resumeLesson();
        });
        
        document.getElementById('stopLessonBtnListening').addEventListener('click', () => {
            document.getElementById('stopLessonBtnListening').classList.add('hidden');
            document.getElementById('pauseLessonBtnListening').classList.add('hidden');
            document.getElementById('resumeLessonBtnListening').classList.add('hidden');
            document.getElementById('startLessonBtnListening').classList.remove('hidden');
            
            // Use the original training tab's stop lesson functionality
            this.trainer.stopLesson();
        });
        
        // Listening training tone frequency adjustment
        document.getElementById('toneFrequencyListening').addEventListener('input', (e) => {
            const frequency = parseInt(e.target.value);
            document.getElementById('frequencyValueListening').textContent = frequency;
            this.morseAudio.setFrequency(frequency);
        });
        
        // Listening training morse speed adjustment
        document.getElementById('morseSpeedListening').addEventListener('input', (e) => {
            const speed = parseInt(e.target.value);
            document.getElementById('speedValueListening').textContent = speed;
            this.trainer.setSpeed(speed);
        });
        
        // Listening training test tone button
        document.getElementById('playToneBtnListening').addEventListener('click', () => {
            const frequency = parseInt(document.getElementById('toneFrequencyListening').value);
            this.morseAudio.playTone(frequency, 500);
        });
        
        // Set up MutationObserver to watch for changes in the displayCharacter element
        // This allows us to sync the current character between tabs without modifying training.js
        const displayCharacterObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'characterData' || mutation.type === 'childList') {
                    this.syncListeningDisplay();
                }
            });
        });
        
        // Start observing the original training tab's character display
        const displayCharacterElement = document.getElementById('displayCharacter');
        if (displayCharacterElement) {
            displayCharacterObserver.observe(displayCharacterElement, { 
                characterData: true, 
                childList: true,
                subtree: true 
            });
        }
        
        // Track currently pressed keys for prosigns
        this.pressedKeys = new Set();
        this.lastProsignTime = 0;
        
        // Map of valid prosign combinations
        this.prosignCombinations = {
            'AR': ['A', 'R'],
            'SK': ['S', 'K'],
            'BT': ['B', 'T'],
            'KN': ['K', 'N']
        };
        
        // Add keyboard event listeners for single keys and combinations
        document.addEventListener('keydown', (event) => {
            // Only process keyboard input when in the Listening training tab
            // Specifically BLOCK keyboard input for the Training tab (Arduino only)
            if (this.currentSection === 'listening' && 
                this.trainer && 
                this.trainer.lessonActive) {
                
                // Get the pressed key and add to tracking set
                const key = event.key.toUpperCase();
                
                // Only track alphanumeric keys
                if (/^[A-Z0-9]$/.test(key)) {
                    // Add to pressed keys
                    this.pressedKeys.add(key);
                    
                    // Check if we have a valid prosign combination
                    const detectedProsign = this.checkForProsign();
                    
                    if (detectedProsign) {
                        // Handle prosign - this should be treated as a single input
                        this.trainer.handleUserInput(detectedProsign);
                        
                        // Generate sidetone for the prosign
                        if (this.morseAudio) {
                            this.morseAudio.generateSidetone(true);
                            
                            // Get the Morse code for this prosign
                            const prosignMorse = window.ALPHABETS.charToMorse(detectedProsign);
                            if (prosignMorse) {
                                // Display the prosign being sent
                                console.log(`Sending prosign: ${detectedProsign} (${prosignMorse})`);
                            }
                        }
                        
                        // Set timestamp to prevent duplicate prosign detection
                        this.lastProsignTime = Date.now();
                    } 
                    // If not a prosign, handle as a regular key but only if it's a single key press
                    else if (this.pressedKeys.size === 1) {
                        // Generate sidetone for the key
                        if (this.morseAudio) {
                            this.morseAudio.generateSidetone(true);
                        }
                        
                        // Pass to the trainer
                        this.trainer.handleUserInput(key);
                    }
                }
            } else if (this.currentSection === 'training' &&
                      this.trainer && 
                      this.trainer.lessonActive) {
                // If in the Training tab, prevent keyboard input
                // Don't call handleUserInput for keyboard in Training tab
                
                // Display a message if they try to use keyboard in training tab
                // Only for alphanumeric keys that would normally be accepted
                if (/^[A-Z0-9]$/.test(event.key.toUpperCase())) {
                    // Optional: Show a message explaining keyboard isn't allowed
                    document.getElementById('challengeText').textContent = 
                        'Training tab only accepts Arduino input. Use the Listening tab for keyboard.';
                    
                    // Reset the message after a short delay
                    setTimeout(() => {
                        if (this.currentSection === 'training' && this.trainer.lessonActive) {
                            document.getElementById('challengeText').textContent = 
                                'Listen and type using Arduino.';
                        }
                    }, 2000);
                }
            }
        });
        
        
        // Settings form
        document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
            const toneFrequency = parseInt(document.getElementById('settingsToneFrequency').value);
            const morseSpeed = parseInt(document.getElementById('settingsMorseSpeed').value);
            const volumePercent = parseInt(document.getElementById('settingsVolume').value);
            const arduinoPort = document.getElementById('arduinoPortSelect').value;
            const keyMode = document.getElementById('keyModeSelect').value;
            const theme = document.getElementById('themeSelect').value;
            const maidenheadLocator = document.getElementById('maidenheadLocator').value;
            const preferredBand = document.getElementById('preferredBand').value;
            const pauseThreshold = parseInt(document.getElementById('pauseThresholdSlider').value);
            
            // Get Farnsworth timing settings
            const farnsworthEnabled = document.getElementById('farnsworthEnabled').checked;
            const farnsworthRatio = parseInt(document.getElementById('farnsworthRatio').value);
            
            // Convert volume percentage to dB
            const volume = -40 + (volumePercent / 100 * 40);
            
            await this.settings.saveSettings({
                toneFrequency,
                morseSpeed,
                volume,
                arduinoPort,
                keyMode,
                theme,
                maidenheadLocator,
                preferredBand,
                farnsworthEnabled,
                farnsworthRatio,
                pauseThreshold
            });
            
            this.showModal('Settings Saved', 'Your settings have been saved successfully.');
        });
        
        // Refresh ports button
        document.getElementById('refreshPortsBtn').addEventListener('click', async () => {
            const portSelect = document.getElementById('arduinoPortSelect');
            portSelect.innerHTML = '<option value="">Select port...</option>';
            
            try {
                const ports = await window.electronAPI.getSerialPorts();
                ports.forEach(port => {
                    const option = document.createElement('option');
                    option.value = port.path;
                    option.textContent = `${port.path} - ${port.manufacturer || 'Unknown'}`;
                    portSelect.appendChild(option);
                });
            } catch (error) {
                console.error('Error refreshing ports:', error);
                this.showModal('Error', 'Failed to refresh serial ports. ' + error.message);
            }
        });
        
        // Farnsworth toggle
        document.getElementById('farnsworthEnabled').addEventListener('change', (e) => {
            const farnsworthRatioGroup = document.getElementById('farnsworthRatioGroup');
            if (e.target.checked) {
                farnsworthRatioGroup.classList.remove('hidden');
            } else {
                farnsworthRatioGroup.classList.add('hidden');
            }
        });
        
        // Farnsworth ratio adjustment
        document.getElementById('farnsworthRatio').addEventListener('input', (e) => {
            const ratio = parseInt(e.target.value);
            document.getElementById('farnsworthRatioValue').textContent = ratio;
        });
        
        // Pause threshold adjustment
        document.getElementById('pauseThresholdSlider').addEventListener('input', (e) => {
            const threshold = parseInt(e.target.value);
            document.getElementById('pauseThresholdValue').textContent = (threshold / 1000).toFixed(1);
            
            // If Arduino is connected, update the pause threshold immediately
            if (this.arduino && this.arduino.isConnected) {
                this.arduino.pauseThreshold = threshold;
            }
        });
        
        // Theme change
        document.getElementById('themeSelect').addEventListener('change', (e) => {
            const theme = e.target.value;
            this.settings.setTheme(theme);
        });
        
        // Modal close button
        document.getElementById('closeModal').addEventListener('click', () => {
            this.hideModal();
        });
        
        // Modal primary button
        document.getElementById('modalPrimaryBtn').addEventListener('click', () => {
            // The action will be set when showing the modal
            if (this.modalPrimaryAction) {
                this.modalPrimaryAction();
            }
            this.hideModal();
        });
        
        // Modal secondary button
        document.getElementById('modalSecondaryBtn').addEventListener('click', () => {
            if (this.modalSecondaryAction) {
                this.modalSecondaryAction();
            }
            this.hideModal();
        });
        
        // About link
        document.getElementById('aboutLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.showModal('About SuperMorse', 
                `<p>SuperMorse is a Morse code tutor and HF communication application designed to help you learn Morse code effectively.</p>
                <p>Version: 1.0.0</p>
                <p>© 2025 SuperMorse Team</p>`
            );
        });
        
        // Handle key up events to stop sidetones and track released keys
        document.addEventListener('keyup', (event) => {
            const key = event.key.toUpperCase();
            
            // Only process for listening section
            if (this.currentSection === 'listening' && this.trainer && this.trainer.lessonActive) {
                // Remove from pressed keys
                this.pressedKeys.delete(key);
                
                // If all keys are released, stop the sidetone
                if (this.pressedKeys.size === 0 && this.morseAudio) {
                    this.morseAudio.generateSidetone(false);
                }
            }
        });
        
        // No Alt+M shortcut - removed as requested
    }
    
    /**
     * Helper method to check if a valid prosign combination is currently pressed
     * @returns {string|null} The detected prosign or null if none detected
     */
    checkForProsign() {
        // Don't detect another prosign too quickly to avoid duplicate detection
        if (Date.now() - this.lastProsignTime < 300) {
            return null;
        }
        
        // Check each prosign combination
        for (const [prosign, keys] of Object.entries(this.prosignCombinations)) {
            // Check if all keys for this prosign are currently pressed
            const allKeysPressed = keys.every(k => this.pressedKeys.has(k));
            
            // Check that only the keys for this prosign are pressed (no extra keys)
            const onlyProsignKeys = this.pressedKeys.size === keys.length;
            
            if (allKeysPressed && onlyProsignKeys) {
                return prosign;
            }
        }
        
        return null;
    }
    
    /**
     * Navigate to a specific section
     * @param {string} section - The section to navigate to
     */
    navigateTo(section) {
        // Check if section requires authentication
        const restrictedSections = ['training', 'listening', 'progress', 'settings', 'regional', 'murmur'];
        if (restrictedSections.includes(section) && !this.auth.isAuthenticated()) {
            // Show authentication required modal
            this.showModal('Authentication Required', 
                'You must be logged in to access this feature. Please log in or create an account.', 
                null, null, 'OK', '');
            
            // Navigate to account section instead
            section = 'account';
        }
        
        // Update active section in sidebar
        document.querySelectorAll('.sidebar nav ul li').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`.sidebar nav ul li[data-section="${section}"]`).classList.add('active');
        
        // Show corresponding section content
        document.querySelectorAll('.content section').forEach(content => {
            content.classList.add('hidden');
            content.classList.remove('active');
        });
        document.getElementById(`${section}Section`).classList.remove('hidden');
        document.getElementById(`${section}Section`).classList.add('active');
        
        // Update current section
        this.currentSection = section;
        
        // Section-specific initializations
        if (section === 'settings') {
            this.settings.populateSettingsForm();
        } else if (section === 'progress') {
            this.trainer.updateProgressDisplay();
        } else if (section === 'murmur') {
            this.murmur.initMurmurUI();
        } else if (section === 'listening') {
            // Sync the listening training display with the main training display
            this.syncListeningDisplay();
        }
    }
    
    /**
     * Update navigation visibility based on authentication status
     * Controls which sections are accessible in the sidebar
     */
    updateNavigationVisibility() {
        // Get all navigation items
        const navItems = document.querySelectorAll('.sidebar nav ul li');
        const isAuthenticated = this.auth.isAuthenticated();
        
        // Show/hide navigation items based on authentication
        navItems.forEach(item => {
            const section = item.getAttribute('data-section');
            
            // Account section is always visible
            if (section === 'account') {
                return;
            }
            
            // Restricted sections are only visible when authenticated
            if (['training', 'listening', 'progress', 'settings', 'regional', 'murmur'].includes(section)) {
                if (isAuthenticated) {
                    item.classList.remove('hidden');
                } else {
                    item.classList.add('hidden');
                }
            }
        });
        
        // Show/hide Arduino connection status based on authentication
        const arduinoStatus = document.querySelector('.arduino-status');
        if (arduinoStatus) {
            if (isAuthenticated) {
                arduinoStatus.classList.remove('hidden');
            } else {
                arduinoStatus.classList.add('hidden');
            }
        }
    }
    
    /**
     * Show the authenticated UI
     * @param {Object} user - The authenticated user object
     */
    showAuthenticatedUI(user) {
        this.currentUser = user;
        
        // Update UI elements
        document.getElementById('userInfoPanel').classList.remove('hidden');
        document.getElementById('userDisplayName').textContent = user.name;
        
        // Update navigation visibility
        this.updateNavigationVisibility();
        
        // Navigate to training section
        this.navigateTo('training');
        
        // Initialize trainer with user's progress
        this.trainer.loadUserProgress(user.id);
        
        // Check if Murmur should be unlocked
        this.checkFeatureUnlocks();
    }
    
    /**
     * Show the login UI
     */
    showLoginUI() {
        this.currentUser = null;
        
        // Make sure main app container is visible
        document.getElementById('mainApp').classList.remove('hidden');
        
        // Update UI elements
        document.getElementById('userInfoPanel').classList.add('hidden');
        
        // Update navigation visibility to hide restricted sections
        this.updateNavigationVisibility();
        
        // Navigate to account section
        this.navigateTo('account');
        
        // Clear form fields
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('registerUsername').value = '';
        document.getElementById('registerEmail').value = '';
        document.getElementById('registerPassword').value = '';
        document.getElementById('registerConfirmPassword').value = '';
        document.getElementById('registerMaidenhead').value = '';
        
        // Clear form messages
        document.getElementById('loginMessage').textContent = '';
        document.getElementById('registerMessage').textContent = '';
    }
    
    /**
     * Check if features should be unlocked based on user progress
     */
    async checkFeatureUnlocks() {
        if (!this.currentUser) return;
        
        try {
            const progress = await window.electronAPI.getProgress(this.currentUser.id);
            
            // Calculate overall mastery percentage
            let masteryComplete = false;
            
            if (progress && progress.mastery) {
                const requiredSets = ['international', 'prosigns', 'special'];
                const totalRequired = Object.keys(progress.mastery)
                    .filter(key => requiredSets.includes(key))
                    .every(key => progress.mastery[key] === 100);
                
                masteryComplete = totalRequired;
                
                // Update progress indicator
                const totalProgress = requiredSets.reduce((sum, key) => {
                    return sum + (progress.mastery[key] || 0);
                }, 0) / requiredSets.length;
                
                document.getElementById('unlockProgress').style.width = `${totalProgress}%`;
                document.getElementById('unlockProgressText').textContent = `${Math.round(totalProgress)}% Complete`;
            }
            
            // Update both Murmur and Regional Settings unlock states
            if (masteryComplete) {
                this.unlockMurmur();
                this.unlockRegionalSettings();
            } else {
                this.lockRegionalSettings();
            }
        } catch (error) {
            console.error('Error checking feature unlocks:', error);
        }
    }
    
    /**
     * Unlock Regional Morse Code Settings
     */
    unlockRegionalSettings() {
        // Update UI elements to show the Regional Morse Code Settings are unlocked
        document.getElementById('regionalSettingsLocked').classList.add('hidden');
        document.getElementById('regionalSettingsUnlocked').classList.remove('hidden');
        
        // Update the dedicated Regional tab as well
        document.getElementById('regionalNavItem').classList.remove('locked');
        document.getElementById('regionalNavItem').querySelector('.lock-icon').classList.add('hidden');
        document.getElementById('regionalLocked').classList.add('hidden');
        document.getElementById('regionalUnlocked').classList.remove('disabled-content');
        document.getElementById('regionalUnlocked').querySelector('.requirements-overlay').classList.add('hidden');
        
        // Update progress indicators
        const totalProgress = document.getElementById('unlockProgress').style.width;
        const progressText = document.getElementById('unlockProgressText').textContent;
        document.getElementById('regionalUnlockProgress').style.width = totalProgress;
        document.getElementById('regionalUnlockProgressText').textContent = progressText;
        
        // Set up event listeners for regional training
        document.getElementById('startRegionalTrainingBtn')?.addEventListener('click', () => {
            const selectedSet = document.getElementById('regionalCharacterSetSelect').value;
            if (selectedSet === 'none') {
                this.showModal('No Character Set Selected', 
                    'Please select a regional character set before starting training.');
                return;
            }
            
            this.showModal('Regional Training', 
                `Starting training for ${selectedSet} character set. This will be implemented in a future update.`);
        });
        
        // Set up change listener for character set preview
        document.getElementById('regionalCharacterSetSelect')?.addEventListener('change', (e) => {
            this.updateRegionalCharactersPreview(e.target.value);
        });
        
        // Initialize character preview with default selection
        this.updateRegionalCharactersPreview(document.getElementById('regionalCharacterSetSelect').value);
    }
    
    /**
     * Update the preview of regional characters based on selected set
     * @param {string} setName - The name of the selected character set
     */
    updateRegionalCharactersPreview(setName) {
        const previewEl = document.getElementById('regionalCharactersPreview');
        if (!previewEl) return;
        
        previewEl.innerHTML = '';
        
        // Sample characters for each set (would be expanded in a real implementation)
        const characterSets = {
            'none': [],
            'nordic': ['Å', 'Ä', 'Ö'],
            'german': ['Ä', 'Ö', 'Ü', 'ß'],
            'french': ['É', 'È', 'Ç', 'À', 'Ù'],
            'cyrillic': ['Б', 'Г', 'Д', 'Ж', 'З'],
            'japanese': ['ア', 'イ', 'ウ', 'エ', 'オ']
        };
        
        const chars = characterSets[setName] || [];
        
        if (chars.length === 0) {
            previewEl.textContent = 'No additional characters';
            return;
        }
        
        // Add each character to the preview
        chars.forEach(char => {
            const span = document.createElement('span');
            span.textContent = char;
            previewEl.appendChild(span);
        });
    }
    
    /**
     * Lock Regional Morse Code Settings
     */
    lockRegionalSettings() {
        // Update UI elements to show the Regional Morse Code Settings are locked
        document.getElementById('regionalSettingsLocked').classList.remove('hidden');
        document.getElementById('regionalSettingsUnlocked').classList.add('hidden');
        
        // Update the dedicated Regional tab as well
        document.getElementById('regionalNavItem').classList.add('locked');
        document.getElementById('regionalNavItem').querySelector('.lock-icon').classList.remove('hidden');
        
        // Show both the lock message and the disabled content
        document.getElementById('regionalLocked').classList.remove('hidden');
        document.getElementById('regionalUnlocked').classList.remove('hidden'); // Keep content visible
        document.getElementById('regionalUnlocked').classList.add('disabled-content');
        const overlay = document.getElementById('regionalUnlocked').querySelector('.requirements-overlay');
        if (overlay) overlay.classList.remove('hidden');
    }
    
    /**
     * Unlock Murmur HF Communication
     */
    unlockMurmur() {
        // Update UI elements
        document.getElementById('murmurNavItem').classList.remove('locked');
        document.getElementById('murmurNavItem').querySelector('.lock-icon').classList.add('hidden');
        document.getElementById('murmurSettingsLocked').classList.add('hidden');
        document.getElementById('murmurSettingsUnlocked').classList.remove('hidden');
        
        // Hide lock message and enable content
        document.getElementById('murmurLocked').classList.add('hidden');
        document.getElementById('murmurUnlocked').classList.remove('disabled-content');
        document.getElementById('murmurUnlocked').querySelector('.requirements-overlay').classList.add('hidden');
        
        // Set up Murmur volume control
        document.getElementById('volumeControl')?.addEventListener('input', (e) => {
            const volumePercent = parseInt(e.target.value);
            // Convert percentage (0-100) to dB (-40 to 0)
            const volumeDb = -40 + (volumePercent / 100 * 40);
            this.morseAudio.setVolume(volumeDb);
        });
        
        // Initialize Murmur interface
        this.murmur.initialize();
        
        // Show congratulations message if this is the first unlock
        if (!localStorage.getItem('murmurUnlocked')) {
            localStorage.setItem('murmurUnlocked', 'true');
            this.showModal('Congratulations!', 
                `<p>You have mastered Morse code and unlocked the Murmur HF Communication feature!</p>
                <p>You can now communicate with other Morse code enthusiasts around the world using simulated HF propagation.</p>`
            );
        }
    }
    
    /**
     * Lock Murmur HF Communication
     */
    lockMurmur() {
        // Update UI elements
        document.getElementById('murmurNavItem').classList.add('locked');
        document.getElementById('murmurNavItem').querySelector('.lock-icon').classList.remove('hidden');
        document.getElementById('murmurSettingsLocked').classList.remove('hidden');
        document.getElementById('murmurSettingsUnlocked').classList.add('hidden');
        
        // Show both the lock message and the disabled content
        document.getElementById('murmurLocked').classList.remove('hidden');
        document.getElementById('murmurUnlocked').classList.remove('hidden'); // Keep content visible
        document.getElementById('murmurUnlocked').classList.add('disabled-content');
        const overlay = document.getElementById('murmurUnlocked').querySelector('.requirements-overlay');
        if (overlay) overlay.classList.remove('hidden');
    }
    
    /**
     * Show a modal dialog
     * @param {string} title - The modal title
     * @param {string} message - The modal message (can include HTML)
     * @param {Function} primaryAction - The primary button action
     * @param {Function} secondaryAction - The secondary button action
     * @param {string} primaryText - The primary button text
     * @param {string} secondaryText - The secondary button text
     */
    showModal(title, message, primaryAction = null, secondaryAction = null, primaryText = 'OK', secondaryText = 'Cancel') {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalMessage').innerHTML = message;
        document.getElementById('modalPrimaryBtn').textContent = primaryText;
        document.getElementById('modalSecondaryBtn').textContent = secondaryText;
        
        // Store actions
        this.modalPrimaryAction = primaryAction;
        this.modalSecondaryAction = secondaryAction;
        
        // Show/hide secondary button based on whether an action is provided
        if (secondaryAction) {
            document.getElementById('modalSecondaryBtn').classList.remove('hidden');
        } else {
            document.getElementById('modalSecondaryBtn').classList.add('hidden');
        }
        
        // Show modal
        document.getElementById('modalOverlay').classList.remove('hidden');
    }
    
    /**
     * Hide the modal dialog
     */
    hideModal() {
        document.getElementById('modalOverlay').classList.add('hidden');
        // Clear actions
        this.modalPrimaryAction = null;
        this.modalSecondaryAction = null;
    }
    
    /**
     * Synchronize the Listening training display with the main Training display
     * This copies the current character and morse pattern from the original 
     * training section to the listening training section
     */
    syncListeningDisplay() {
        // Sync the current character
        const displayCharacter = document.getElementById('displayCharacter');
        const displayCharacterListening = document.getElementById('displayCharacterListening');
        if (displayCharacter && displayCharacterListening) {
            displayCharacterListening.textContent = displayCharacter.textContent;
        }
        
        // Sync the morse pattern
        const morsePattern = document.getElementById('morsePattern');
        const morsePatternListening = document.getElementById('morsePatternListening');
        if (morsePattern && morsePatternListening) {
            morsePatternListening.textContent = morsePattern.textContent;
        }
        
        // Sync the progress indicator
        const progressIndicator = document.getElementById('progressIndicator');
        const progressIndicatorListening = document.getElementById('progressIndicatorListening');
        if (progressIndicator && progressIndicatorListening) {
            progressIndicatorListening.style.width = progressIndicator.style.width;
        }
        
        // Sync the progress text
        const progressText = document.getElementById('progressText');
        const progressTextListening = document.getElementById('progressTextListening');
        if (progressText && progressTextListening) {
            progressTextListening.textContent = progressText.textContent;
        }
        
        // Set specific message for Listening training tab, not syncing from training tab
        const challengeTextListening = document.getElementById('challengeTextListening');
        if (challengeTextListening) {
            // Set an appropriate message based on whether the lesson is active
            if (this.trainer && this.trainer.lessonActive) {
                challengeTextListening.textContent = 'Listen and type on keyboard what you hear - Keyboard input only';
            } else {
                challengeTextListening.textContent = 'Press Start to begin - Keyboard input only';
            }
        }
        
        // Sync the user input
        const userInput = document.getElementById('userInput');
        const userInputListening = document.getElementById('userInputListening');
        if (userInput && userInputListening) {
            userInputListening.innerHTML = userInput.innerHTML;
        }
        
        // Sync the time elapsed
        const timeElapsed = document.getElementById('timeElapsed');
        const timeElapsedListening = document.getElementById('timeElapsedListening');
        if (timeElapsed && timeElapsedListening) {
            timeElapsedListening.textContent = timeElapsed.textContent;
        }
        
        // Sync the accuracy rate
        const accuracyRate = document.getElementById('accuracyRate');
        const accuracyRateListening = document.getElementById('accuracyRateListening');
        if (accuracyRate && accuracyRateListening) {
            accuracyRateListening.textContent = accuracyRate.textContent;
        }
        
        // Sync the time remaining
        const timeRemaining = document.getElementById('timeRemaining');
        const timeRemainingListening = document.getElementById('timeRemainingListening');
        if (timeRemaining && timeRemainingListening) {
            timeRemainingListening.textContent = timeRemaining.textContent;
        }
    }
    
    /**
     * Show a modal for port selection
     * @param {Array} ports - The available ports
     */
    showPortSelectionModal(ports) {
        let portListHtml = '<ul class="port-list">';
        ports.forEach(port => {
            portListHtml += `<li data-port="${port.path}">${port.path} - ${port.manufacturer || 'Unknown'}</li>`;
        });
        portListHtml += '</ul>';
        
        this.showModal('Select Arduino Port', 
            `<p>Please select the port your Arduino is connected to:</p>${portListHtml}`, 
            null, null, 'Cancel', ''
        );
        
        // Add click event listeners to the port list items
        setTimeout(() => {
            document.querySelectorAll('.port-list li').forEach(item => {
                item.addEventListener('click', async () => {
                    const port = item.getAttribute('data-port');
                    try {
                        await this.arduino.connect(port);
                        this.hideModal();
                    } catch (error) {
                        console.error('Error connecting to port:', error);
                        this.showModal('Connection Error', `Failed to connect to ${port}. ${error.message}`);
                    }
                });
            });
        }, 100);
    }
}
// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SuperMorseApp();
    
    // Add event listener to log user out when app is closed
    window.addEventListener('beforeunload', () => {
        if (window.app && window.app.auth) {
            window.app.auth.logout();
        }
    });
});