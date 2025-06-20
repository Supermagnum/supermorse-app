/**
 * auth.js
 * Handles authentication-related functionality
 */

const AUTH = (function() {
    // DOM Elements
    const elements = {
        // Auth section
        authSection: document.getElementById('auth-section'),
        authTabs: document.querySelectorAll('.auth-tab'),
        loginForm: document.getElementById('login-form'),
        registerForm: document.getElementById('register-form'),
        
        // Login form
        loginUsername: document.getElementById('login-username'),
        loginPassword: document.getElementById('login-password'),
        loginButton: document.getElementById('login-button'),
        loginMessage: document.getElementById('login-message'),
        
        // Register form
        registerUsername: document.getElementById('register-username'),
        registerEmail: document.getElementById('register-email'),
        registerPassword: document.getElementById('register-password'),
        registerConfirmPassword: document.getElementById('register-confirm-password'),
        registerButton: document.getElementById('register-button'),
        registerMessage: document.getElementById('register-message'),
        
        // App content
        appContent: document.getElementById('app-content'),
        usernameDisplay: document.getElementById('username-display'),
        logoutButton: document.getElementById('logout-button'),
        profileButton: document.getElementById('profile-button'),
        
        // Feature status indicators
        featureInternational: document.getElementById('feature-international'),
        featureProsigns: document.getElementById('feature-prosigns'),
        featureSpecial: document.getElementById('feature-special'),
        featureVoice: document.getElementById('feature-voice'),
        featureHf: document.getElementById('feature-hf'),
        
        // Profile modal
        profileModal: document.getElementById('profile-modal'),
        closeModal: document.querySelector('.close-modal'),
        profileEmail: document.getElementById('profile-email'),
        profileMaidenhead: document.getElementById('profile-maidenhead'),
        profileHfBand: document.getElementById('profile-hf-band'),
        currentPassword: document.getElementById('current-password'),
        newPassword: document.getElementById('new-password'),
        confirmNewPassword: document.getElementById('confirm-new-password'),
        updateProfileButton: document.getElementById('update-profile'),
        profileMessage: document.getElementById('profile-message'),
        
        // Mumble section
        mumbleSection: document.getElementById('mumble-section'),
        mumbleContent: document.getElementById('mumble-content')
    };
    
    // Current user data
    let currentUser = null;
    
    /**
     * Initialize authentication module
     */
    function initialize() {
        // Set up event listeners
        setupEventListeners();
        
        // Check if user is already logged in
        checkAuthStatus();
    }
    
    /**
     * Set up event listeners for auth-related elements
     */
    function setupEventListeners() {
        // Auth tabs
        elements.authTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.getAttribute('data-tab');
                switchAuthTab(tabName);
            });
        });
        
        // Login form
        elements.loginButton.addEventListener('click', handleLogin);
        
        // Register form
        elements.registerButton.addEventListener('click', handleRegister);
        
        // Logout button
        elements.logoutButton.addEventListener('click', handleLogout);
        
        // Profile button
        elements.profileButton.addEventListener('click', openProfileModal);
        
        // Close modal button
        elements.closeModal.addEventListener('click', closeProfileModal);
        
        // Update profile button
        elements.updateProfileButton.addEventListener('click', handleUpdateProfile);
        
        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            if (event.target === elements.profileModal) {
                closeProfileModal();
            }
        });
    }
    
    /**
     * Switch between auth tabs (login/register)
     * @param {string} tabName - Name of the tab to switch to
     */
    function switchAuthTab(tabName) {
        // Update tab buttons
        elements.authTabs.forEach(tab => {
            if (tab.getAttribute('data-tab') === tabName) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        // Update form visibility
        if (tabName === 'login') {
            elements.loginForm.classList.add('active');
            elements.registerForm.classList.remove('active');
        } else {
            elements.loginForm.classList.remove('active');
            elements.registerForm.classList.add('active');
        }
        
        // Clear messages
        elements.loginMessage.textContent = '';
        elements.registerMessage.textContent = '';
        elements.loginMessage.className = 'auth-message';
        elements.registerMessage.className = 'auth-message';
    }
    
    /**
     * Check if user is already authenticated
     */
    async function checkAuthStatus() {
        try {
            const response = await API.auth.getCurrentUser();
            
            if (response.success) {
                // User is authenticated
                currentUser = response.user;
                showAuthenticatedUI();
            } else {
                // User is not authenticated
                showLoginUI();
            }
        } catch (error) {
            // Error checking auth status, show login UI
            console.error('Error checking auth status:', error);
            showLoginUI();
        }
    }
    
    /**
     * Handle login form submission
     */
    async function handleLogin() {
        // Get form values
        const username = elements.loginUsername.value.trim();
        const password = elements.loginPassword.value;
        
        // Validate form
        if (!username || !password) {
            showAuthMessage(elements.loginMessage, 'Please enter both username and password', 'error');
            return;
        }
        
        try {
            // Disable login button
            elements.loginButton.disabled = true;
            
            // Send login request
            const response = await API.auth.login({ username, password });
            
            if (response.success) {
                // Login successful
                currentUser = response.user;
                showAuthenticatedUI();
                
                // Clear form
                elements.loginUsername.value = '';
                elements.loginPassword.value = '';
            } else {
                // Login failed
                showAuthMessage(elements.loginMessage, response.message || 'Login failed', 'error');
            }
        } catch (error) {
            // Error during login
            showAuthMessage(elements.loginMessage, error.message || 'Error during login', 'error');
        } finally {
            // Re-enable login button
            elements.loginButton.disabled = false;
        }
    }
    
    /**
     * Handle register form submission
     */
    async function handleRegister() {
        // Get form values
        const username = elements.registerUsername.value.trim();
        const email = elements.registerEmail.value.trim();
        const password = elements.registerPassword.value;
        const confirmPassword = elements.registerConfirmPassword.value;
        
        // Validate form
        if (!username || !email || !password || !confirmPassword) {
            showAuthMessage(elements.registerMessage, 'Please fill in all fields', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            showAuthMessage(elements.registerMessage, 'Passwords do not match', 'error');
            return;
        }
        
        try {
            // Disable register button
            elements.registerButton.disabled = true;
            
            // Send register request
            const response = await API.auth.register({ username, email, password });
            
            if (response.success) {
                // Registration successful
                currentUser = response.user;
                showAuthenticatedUI();
                
                // Clear form
                elements.registerUsername.value = '';
                elements.registerEmail.value = '';
                elements.registerPassword.value = '';
                elements.registerConfirmPassword.value = '';
            } else {
                // Registration failed
                showAuthMessage(elements.registerMessage, response.message || 'Registration failed', 'error');
            }
        } catch (error) {
            // Error during registration
            showAuthMessage(elements.registerMessage, error.message || 'Error during registration', 'error');
        } finally {
            // Re-enable register button
            elements.registerButton.disabled = false;
        }
    }
    
    /**
     * Handle logout button click
     */
    async function handleLogout() {
        try {
            // Send logout request
            const response = await API.auth.logout();
            
            if (response.success) {
                // Logout successful
                currentUser = null;
                showLoginUI();
            } else {
                // Logout failed
                console.error('Logout failed:', response.message);
                alert('Logout failed: ' + response.message);
            }
        } catch (error) {
            // Error during logout
            console.error('Error during logout:', error);
            alert('Error during logout: ' + error.message);
        }
    }
    
    /**
     * Open profile modal
     */
    function openProfileModal() {
        if (!currentUser) return;
        
        // Populate form with current user data
        elements.profileEmail.value = currentUser.email || '';
        elements.profileMaidenhead.value = currentUser.maidenheadGrid || '';
        elements.profileHfBand.value = currentUser.preferredHfBand || '';
        
        // Clear password fields
        elements.currentPassword.value = '';
        elements.newPassword.value = '';
        elements.confirmNewPassword.value = '';
        
        // Clear message
        elements.profileMessage.textContent = '';
        elements.profileMessage.className = 'auth-message';
        
        // Show modal
        elements.profileModal.classList.remove('hidden');
    }
    
    /**
     * Close profile modal
     */
    function closeProfileModal() {
        elements.profileModal.classList.add('hidden');
    }
    
    /**
     * Handle update profile form submission
     */
    async function handleUpdateProfile() {
        // Get form values
        const email = elements.profileEmail.value.trim();
        const maidenheadGrid = elements.profileMaidenhead.value.trim();
        const preferredHfBand = elements.profileHfBand.value;
        const currentPassword = elements.currentPassword.value;
        const newPassword = elements.newPassword.value;
        const confirmNewPassword = elements.confirmNewPassword.value;
        
        // Validate form
        if (!email) {
            showAuthMessage(elements.profileMessage, 'Email is required', 'error');
            return;
        }
        
        // Check if changing password
        if (newPassword || confirmNewPassword) {
            if (!currentPassword) {
                showAuthMessage(elements.profileMessage, 'Current password is required to change password', 'error');
                return;
            }
            
            if (newPassword !== confirmNewPassword) {
                showAuthMessage(elements.profileMessage, 'New passwords do not match', 'error');
                return;
            }
        }
        
        try {
            // Disable update button
            elements.updateProfileButton.disabled = true;
            
            // Prepare update data
            const updateData = {
                email,
                maidenheadGrid,
                preferredHfBand
            };
            
            // Add password data if changing password
            if (newPassword && currentPassword) {
                updateData.currentPassword = currentPassword;
                updateData.newPassword = newPassword;
            }
            
            // Send update request
            const response = await API.auth.updateProfile(updateData);
            
            if (response.success) {
                // Update successful
                currentUser = response.user;
                showAuthMessage(elements.profileMessage, 'Profile updated successfully', 'success');
                
                // Update UI with new user data
                updateUserDisplay();
                
                // Clear password fields
                elements.currentPassword.value = '';
                elements.newPassword.value = '';
                elements.confirmNewPassword.value = '';
                
                // Close modal after a delay
                setTimeout(closeProfileModal, 2000);
            } else {
                // Update failed
                showAuthMessage(elements.profileMessage, response.message || 'Profile update failed', 'error');
            }
        } catch (error) {
            // Error during update
            showAuthMessage(elements.profileMessage, error.message || 'Error updating profile', 'error');
        } finally {
            // Re-enable update button
            elements.updateProfileButton.disabled = false;
        }
    }
    
    /**
     * Show authenticated UI (hide login, show app)
     */
    function showAuthenticatedUI() {
        // Hide auth section
        elements.authSection.classList.add('hidden');
        
        // Show app content
        elements.appContent.classList.remove('hidden');
        
        // Update user display
        updateUserDisplay();
        
        // Update feature status
        updateFeatureStatus();
        
        // Check if Mumble should be unlocked
        checkMumbleAccess();
        
        // Fetch user progress
        fetchUserProgress();
    }
    
    /**
     * Show login UI (show login, hide app)
     */
    function showLoginUI() {
        // Show auth section
        elements.authSection.classList.remove('hidden');
        
        // Hide app content
        elements.appContent.classList.add('hidden');
        
        // Reset auth forms
        elements.loginUsername.value = '';
        elements.loginPassword.value = '';
        elements.registerUsername.value = '';
        elements.registerEmail.value = '';
        elements.registerPassword.value = '';
        elements.registerConfirmPassword.value = '';
        
        // Clear messages
        elements.loginMessage.textContent = '';
        elements.registerMessage.textContent = '';
        elements.loginMessage.className = 'auth-message';
        elements.registerMessage.className = 'auth-message';
    }
    
    /**
     * Update user display with current user data
     */
    function updateUserDisplay() {
        if (!currentUser) return;
        
        // Update username display
        elements.usernameDisplay.textContent = currentUser.username;
    }
    
    /**
     * Update feature status indicators
     */
    function updateFeatureStatus() {
        if (!currentUser || !currentUser.featuresUnlocked) return;
        
        // Update feature status indicators
        updateFeatureIndicator(elements.featureInternational, currentUser.featuresUnlocked.internationalMorse);
        updateFeatureIndicator(elements.featureProsigns, currentUser.featuresUnlocked.prosigns);
        updateFeatureIndicator(elements.featureSpecial, currentUser.featuresUnlocked.specialCharacters);
        updateFeatureIndicator(elements.featureVoice, currentUser.featuresUnlocked.voiceChat);
        updateFeatureIndicator(elements.featureHf, currentUser.featuresUnlocked.hfSimulation);
    }
    
    /**
     * Update a single feature indicator
     * @param {Element} element - The feature element
     * @param {boolean} isUnlocked - Whether the feature is unlocked
     */
    function updateFeatureIndicator(element, isUnlocked) {
        if (!element) return;
        
        const indicator = element.querySelector('.feature-status-indicator');
        if (indicator) {
            indicator.setAttribute('data-status', isUnlocked ? 'unlocked' : 'locked');
        }
    }
    
    /**
     * Check if Mumble section should be unlocked
     */
    function checkMumbleAccess() {
        if (!currentUser || !currentUser.featuresUnlocked) return;
        
        const voiceChatUnlocked = currentUser.featuresUnlocked.voiceChat;
        
        if (voiceChatUnlocked) {
            // Unlock Mumble section
            elements.mumbleSection.classList.remove('locked-feature');
            elements.mumbleSection.querySelector('.lock-indicator').textContent = '🔓';
            elements.mumbleSection.querySelector('.feature-locked-message').classList.add('hidden');
            elements.mumbleContent.classList.remove('hidden');
            
            // Initialize Mumble client
            if (typeof MUMBLE_CLIENT !== 'undefined') {
                MUMBLE_CLIENT.initialize();
            }
        } else {
            // Keep Mumble section locked
            elements.mumbleSection.classList.add('locked-feature');
            elements.mumbleSection.querySelector('.lock-indicator').textContent = '🔒';
            elements.mumbleSection.querySelector('.feature-locked-message').classList.remove('hidden');
            elements.mumbleContent.classList.add('hidden');
        }
    }
    
    /**
     * Fetch user progress from the server
     */
    async function fetchUserProgress() {
        try {
            // Get mastery levels
            const masteryResponse = await API.progress.getMasteryLevels();
            
            if (masteryResponse.success) {
                // Update lesson manager with mastery levels
                if (typeof LESSON_MANAGER !== 'undefined') {
                    LESSON_MANAGER.setMasteryLevels(masteryResponse.masteryLevels);
                }
                
                // Get progress data
                const progressResponse = await API.progress.getProgress();
                
                if (progressResponse.success) {
                    // Initialize lesson manager with progress data
                    if (typeof LESSON_MANAGER !== 'undefined') {
                        LESSON_MANAGER.initializeFromProgress(progressResponse.progress);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching user progress:', error);
        }
    }
    
    /**
     * Show an auth-related message
     * @param {Element} element - The message element
     * @param {string} message - The message text
     * @param {string} type - The message type ('error' or 'success')
     */
    function showAuthMessage(element, message, type) {
        element.textContent = message;
        element.className = 'auth-message';
        
        if (type === 'error') {
            element.classList.add('error-message');
        } else if (type === 'success') {
            element.classList.add('success-message');
        }
    }
    
    /**
     * Get the current user
     * @returns {Object|null} - Current user or null if not logged in
     */
    function getCurrentUser() {
        return currentUser;
    }
    
    // Public API
    return {
        initialize,
        getCurrentUser
    };
})();

// Initialize auth module when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    AUTH.initialize();
});