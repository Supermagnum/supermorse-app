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
        
        // Check for saved authentication
        const savedAuth = localStorage.getItem('authToken');
        if (savedAuth) {
            try {
                // Attempt to restore session
                await this.auth.restoreSession(savedAuth);
            } catch (error) {
                console.error('Failed to restore session:', error);
                // Continue to login screen
            }
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
            const name = document.getElementById('registerName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('registerConfirmPassword').value;
            
            if (password !== confirmPassword) {
                document.getElementById('registerMessage').textContent = 'Passwords do not match';
                document.getElementById('registerMessage').classList.add('error');
                return;
            }
            
            await this.auth.register(username, name, email, password);
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
            document.getElementById('stopLessonBtn').classList.remove('hidden');
            this.trainer.startLesson();
        });
        
        document.getElementById('stopLessonBtn').addEventListener('click', () => {
            document.getElementById('stopLessonBtn').classList.add('hidden');
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
        
        // Test tone button
        document.getElementById('playToneBtn').addEventListener('click', () => {
            const frequency = parseInt(document.getElementById('toneFrequency').value);
            this.morseAudio.playTone(frequency, 500);
        });
        
        // Settings form
        document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
            const toneFrequency = parseInt(document.getElementById('settingsToneFrequency').value);
            const morseSpeed = parseInt(document.getElementById('settingsMorseSpeed').value);
            const arduinoPort = document.getElementById('arduinoPortSelect').value;
            const keyMode = document.getElementById('keyModeSelect').value;
            const theme = document.getElementById('themeSelect').value;
            const maidenheadLocator = document.getElementById('maidenheadLocator').value;
            const preferredBand = document.getElementById('preferredBand').value;
            
            await this.settings.saveSettings({
                toneFrequency,
                morseSpeed,
                arduinoPort,
                keyMode,
                theme,
                maidenheadLocator,
                preferredBand
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
    }
    
    /**
     * Navigate to a specific section
     * @param {string} section - The section to navigate to
     */
    navigateTo(section) {
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
        }
    }
    
    /**
     * Show the authenticated UI
     * @param {Object} user - The authenticated user object
     */
    showAuthenticatedUI(user) {
        this.currentUser = user;
        
        // Update UI elements
        document.getElementById('authSection').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        document.getElementById('userInfoPanel').classList.remove('hidden');
        document.getElementById('userDisplayName').textContent = user.name;
        
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
        
        // Update UI elements
        document.getElementById('mainApp').classList.add('hidden');
        document.getElementById('userInfoPanel').classList.add('hidden');
        document.getElementById('authSection').classList.remove('hidden');
        
        // Clear form fields
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('registerUsername').value = '';
        document.getElementById('registerName').value = '';
        document.getElementById('registerEmail').value = '';
        document.getElementById('registerPassword').value = '';
        document.getElementById('registerConfirmPassword').value = '';
        
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
            
            // Unlock Murmur if mastery is complete
            if (masteryComplete) {
                this.unlockMurmur();
            }
        } catch (error) {
            console.error('Error checking feature unlocks:', error);
        }
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
        document.getElementById('murmurLocked').classList.add('hidden');
        document.getElementById('murmurUnlocked').classList.remove('hidden');
        
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
});