/**
 * api.js
 * Handles communication with the backend API
 */

const API = (function() {
    // Base URL for API requests
    const API_BASE_URL = '/api';
    
    // Default headers for API requests
    const DEFAULT_HEADERS = {
        'Content-Type': 'application/json'
    };
    
    /**
     * Make an API request
     * @param {string} endpoint - API endpoint
     * @param {string} method - HTTP method
     * @param {Object} data - Request data
     * @returns {Promise} - Promise resolving to response data
     */
    async function makeRequest(endpoint, method = 'GET', data = null) {
        const url = `${API_BASE_URL}${endpoint}`;
        
        const options = {
            method,
            headers: DEFAULT_HEADERS,
            credentials: 'include' // Include cookies for authentication
        };
        
        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }
        
        try {
            const response = await fetch(url, options);
            const responseData = await response.json();
            
            if (!response.ok) {
                throw new Error(responseData.message || 'API request failed');
            }
            
            return responseData;
        } catch (error) {
            console.error('API request error:', error);
            throw error;
        }
    }
    
    // Authentication API
    const auth = {
        /**
         * Register a new user
         * @param {Object} userData - User registration data
         * @returns {Promise} - Promise resolving to user data
         */
        register: async function(userData) {
            return makeRequest('/auth/register', 'POST', userData);
        },
        
        /**
         * Login a user
         * @param {Object} credentials - Login credentials
         * @returns {Promise} - Promise resolving to user data
         */
        login: async function(credentials) {
            return makeRequest('/auth/login', 'POST', credentials);
        },
        
        /**
         * Logout the current user
         * @returns {Promise} - Promise resolving to logout result
         */
        logout: async function() {
            return makeRequest('/auth/logout', 'POST');
        },
        
        /**
         * Get the current user
         * @returns {Promise} - Promise resolving to user data
         */
        getCurrentUser: async function() {
            return makeRequest('/auth/user');
        },
        
        /**
         * Update user profile
         * @param {Object} profileData - Updated profile data
         * @returns {Promise} - Promise resolving to updated user data
         */
        updateProfile: async function(profileData) {
            return makeRequest('/auth/user', 'PUT', profileData);
        }
    };
    
    // Progress API
    const progress = {
        /**
         * Get user progress
         * @returns {Promise} - Promise resolving to progress data
         */
        getProgress: async function() {
            return makeRequest('/progress');
        },
        
        /**
         * Get progress for a specific character
         * @param {string} char - The character
         * @returns {Promise} - Promise resolving to character progress
         */
        getCharacterProgress: async function(char) {
            return makeRequest(`/progress/character/${char}`);
        },
        
        /**
         * Update progress
         * @param {Object} practiceData - Practice session data
         * @returns {Promise} - Promise resolving to updated progress
         */
        updateProgress: async function(practiceData) {
            return makeRequest('/progress/update', 'POST', practiceData);
        },
        
        /**
         * Get learning recommendations
         * @returns {Promise} - Promise resolving to recommendations
         */
        getRecommendations: async function() {
            return makeRequest('/progress/recommendations');
        },
        
        /**
         * Get session history
         * @returns {Promise} - Promise resolving to session history
         */
        getSessions: async function() {
            return makeRequest('/progress/sessions');
        },
        
        /**
         * Get mastery levels
         * @returns {Promise} - Promise resolving to mastery levels
         */
        getMasteryLevels: async function() {
            return makeRequest('/progress/mastery');
        }
    };
    
    // Mumble API
    const mumble = {
        /**
         * Get Mumble server status
         * @returns {Promise} - Promise resolving to server status
         */
        getStatus: async function() {
            return makeRequest('/mumble/status');
        },
        
        /**
         * Start Mumble server
         * @returns {Promise} - Promise resolving to start result
         */
        startServer: async function() {
            return makeRequest('/mumble/start', 'POST');
        },
        
        /**
         * Stop Mumble server
         * @returns {Promise} - Promise resolving to stop result
         */
        stopServer: async function() {
            return makeRequest('/mumble/stop', 'POST');
        },
        
        /**
         * Update Mumble metadata
         * @param {Object} metadata - Mumble metadata
         * @returns {Promise} - Promise resolving to update result
         */
        updateMetadata: async function(metadata) {
            return makeRequest('/mumble/metadata', 'PUT', metadata);
        },
        
        /**
         * Get HF band recommendation
         * @param {string} targetGrid - Target Maidenhead grid
         * @returns {Promise} - Promise resolving to recommendation
         */
        getHfRecommendation: async function(targetGrid) {
            return makeRequest(`/mumble/hf-recommendation?targetGrid=${targetGrid}`);
        },
        
        /**
         * Get available Mumble channels
         * @returns {Promise} - Promise resolving to channel list
         */
        getChannels: async function() {
            return makeRequest('/mumble/channels');
        },
        
        /**
         * Join a Mumble channel
         * @param {string} channelId - Channel ID
         * @returns {Promise} - Promise resolving to join result
         */
        joinChannel: async function(channelId) {
            return makeRequest('/mumble/join-channel', 'POST', { channelId });
        }
    };
    
    // Public API
    return {
        auth,
        progress,
        mumble
    };
})();