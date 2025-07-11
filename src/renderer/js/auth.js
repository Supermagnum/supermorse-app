/**
 * auth.js
 * Handles user authentication, registration, and session management
 */

export class AuthManager {
    /**
     * Initialize authentication manager
     * @param {Object} app - Reference to the main application
     */
    constructor(app) {
        this.app = app;
        this.currentUser = null;
        this.token = null;
    }
    
    /**
     * Register a new user
     * @param {string} username - User's username
     * @param {string} name - User's full name
     * @param {string} email - User's email address
     * @param {string} password - User's password
     * @param {string} maidenheadLocator - User's Maidenhead grid locator
     * @returns {Promise} - Resolves when registration is complete
     */
    async register(username, name, email, password, maidenheadLocator) {
        try {
            // Show loading state
            this.setFormMessage('registerMessage', 'Registering...', false);
            
            // Validate Maidenhead locator
            if (!this.app.settings.validateMaidenhead(maidenheadLocator)) {
                this.setFormMessage('registerMessage', 
                    'Invalid Maidenhead locator format. Please enter a valid 4 or 6 character grid square (e.g., JO91, IO83, FN20).', 
                    false);
                return;
            }
            
            // Call the main process to register the user
            const result = await window.electronAPI.registerUser({
                username,
                name,
                email,
                password,
                maidenheadLocator
            });
            
            if (result.success) {
                // Show success message
                this.setFormMessage('registerMessage', 'Registration successful! You can now log in.', true);
                
                // Clear form and switch to login tab
                document.getElementById('registerForm').reset();
                document.querySelector('.auth-tabs .tab[data-tab="login"]').click();
            } else {
                // Show error message
                this.setFormMessage('registerMessage', result.message || 'Registration failed. Please try again.', false);
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.setFormMessage('registerMessage', 'An error occurred during registration. Please try again.', false);
        }
    }
    
    /**
     * Log in a user
     * @param {string} username - User's username
     * @param {string} password - User's password
     * @returns {Promise} - Resolves when login is complete
     */
    async login(username, password) {
        try {
            // Show loading state
            this.setFormMessage('loginMessage', 'Logging in...', false);
            
            // Call the main process to authenticate the user
            const result = await window.electronAPI.loginUser({
                username,
                password
            });
            
            if (result.success) {
                // Store the authentication token
                this.token = result.token;
                localStorage.setItem('authToken', result.token);
                
                // Verify the token with the server and get user details
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
                
                // Show the authenticated UI
                this.app.showAuthenticatedUI(user);
            } else {
                // Show error message
                this.setFormMessage('loginMessage', result.message || 'Login failed. Please check your credentials.', false);
            }
        } catch (error) {
            console.error('Login error:', error);
            this.setFormMessage('loginMessage', 'An error occurred during login. Please try again.', false);
        }
    }
    
    /**
     * Restore a user session from a saved token
     * @param {string} token - The authentication token
     * @returns {Promise} - Resolves when session is restored
     */
    async restoreSession(token) {
        try {
            // In a real app, this would verify the token with the server
            // For now, we'll just parse the token and use it
            const user = this.parseToken(token) || {
                id: 'user-' + Date.now(),
                email: 'restored@session.com',
                name: 'Restored User'
            };
            
            // Update the current user and token
            this.currentUser = user;
            this.token = token;
            
            // Show the authenticated UI
            this.app.showAuthenticatedUI(user);
            
            return true;
        } catch (error) {
            console.error('Session restoration error:', error);
            localStorage.removeItem('authToken');
            return false;
        }
    }
    
    /**
     * Log out the current user
     */
    logout() {
        // Clear the authentication token
        this.token = null;
        localStorage.removeItem('authToken');
        
        // Clear the current user
        this.currentUser = null;
        
        // Show the login UI
        this.app.showLoginUI();
    }
    
    /**
     * Get the current user
     * @returns {Object|null} - The current user or null if not authenticated
     */
    getCurrentUser() {
        return this.currentUser;
    }
    
    /**
     * Check if a user is authenticated
     * @returns {boolean} - True if a user is authenticated, false otherwise
     */
    isAuthenticated() {
        return !!this.currentUser;
    }
    
    /**
     * Set a message on a form
     * @param {string} elementId - The ID of the message element
     * @param {string} message - The message to display
     * @param {boolean} isSuccess - Whether the message is a success message
     */
    setFormMessage(elementId, message, isSuccess = false) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        element.textContent = message;
        
        if (isSuccess) {
            element.classList.add('success');
            element.classList.remove('error');
        } else {
            element.classList.add('error');
            element.classList.remove('success');
        }
    }
    
    /**
     * Parse a JWT token
     * @param {string} token - The JWT token to parse
     * @returns {Object|null} - The parsed token payload or null if invalid
     */
    parseToken(token) {
        try {
            // JWT tokens are made up of three parts: header.payload.signature
            const parts = token.split('.');
            if (parts.length !== 3) return null;
            
            // The payload is the second part, Base64URL encoded
            const payload = parts[1];
            const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
            
            return JSON.parse(decoded);
        } catch (error) {
            console.error('Error parsing token:', error);
            return null;
        }
    }
}