/**
 * mumbleClient.js
 * Handles Mumble/Murmur integration for voice chat
 */

const MUMBLE_CLIENT = (function() {
    // DOM Elements
    const elements = {
        mumbleSection: document.getElementById('mumble-section'),
        mumbleContent: document.getElementById('mumble-content'),
        serverStatus: document.getElementById('mumble-server-status'),
        connectButton: document.getElementById('mumble-connect-button'),
        maidenheadGrid: document.getElementById('maidenhead-grid'),
        saveMaidenhead: document.getElementById('save-maidenhead'),
        hfBandSelect: document.getElementById('hf-band-select'),
        saveHfBand: document.getElementById('save-hf-band'),
        propagationMap: document.getElementById('propagation-map'),
        channelList: document.getElementById('channel-list')
    };
    
    // Client state
    const state = {
        isServerRunning: false,
        isConnected: false,
        currentChannel: null,
        channels: [],
        maidenheadGrid: '',
        preferredHfBand: '',
        recommendedBand: null
    };
    
    // Socket.io connection for real-time updates
    let socket = null;
    
    /**
     * Initialize Mumble client
     */
    function initialize() {
        // Set up event listeners
        setupEventListeners();
        
        // Check server status
        checkServerStatus();
        
        // Initialize socket connection
        initializeSocket();
        
        // Load user settings
        loadUserSettings();
    }
    
    /**
     * Set up event listeners
     */
    function setupEventListeners() {
        // Connect button
        if (elements.connectButton) {
            elements.connectButton.addEventListener('click', handleConnectToggle);
        }
        
        // Save Maidenhead grid
        if (elements.saveMaidenhead) {
            elements.saveMaidenhead.addEventListener('click', handleSaveMaidenhead);
        }
        
        // Save HF band
        if (elements.saveHfBand) {
            elements.saveHfBand.addEventListener('click', handleSaveHfBand);
        }
    }
    
    /**
     * Initialize Socket.io connection
     */
    function initializeSocket() {
        // Check if Socket.io is available
        if (typeof io === 'undefined') {
            console.error('Socket.io not available');
            return;
        }
        
        // Connect to Socket.io server
        socket = io();
        
        // Set up socket event handlers
        socket.on('connect', () => {
            console.log('Socket connected');
        });
        
        socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });
        
        // Listen for Mumble server status updates
        socket.on('mumble-status', (data) => {
            updateServerStatus(data.running);
        });
        
        // Listen for channel updates
        socket.on('mumble-channels', (data) => {
            updateChannels(data.channels);
        });
        
        // Listen for user join/leave events
        socket.on('mumble-user-joined', (data) => {
            addUserToChannel(data.user, data.channel);
        });
        
        socket.on('mumble-user-left', (data) => {
            removeUserFromChannel(data.user, data.channel);
        });
    }
    
    /**
     * Load user settings from current user
     */
    function loadUserSettings() {
        // Check if AUTH module is available
        if (typeof AUTH === 'undefined' || !AUTH.getCurrentUser) {
            console.error('AUTH module not available');
            return;
        }
        
        const user = AUTH.getCurrentUser();
        if (!user) return;
        
        // Load Maidenhead grid
        if (user.maidenheadGrid && elements.maidenheadGrid) {
            elements.maidenheadGrid.value = user.maidenheadGrid;
            state.maidenheadGrid = user.maidenheadGrid;
        }
        
        // Load preferred HF band
        if (user.preferredHfBand && elements.hfBandSelect) {
            elements.hfBandSelect.value = user.preferredHfBand;
            state.preferredHfBand = user.preferredHfBand;
        }
        
        // Get HF band recommendation if grid is set
        if (user.maidenheadGrid) {
            getHfRecommendation();
        }
    }
    
    /**
     * Check Mumble server status
     */
    async function checkServerStatus() {
        try {
            const response = await API.mumble.getStatus();
            
            if (response.success) {
                updateServerStatus(response.status.running);
            }
        } catch (error) {
            console.error('Error checking Mumble server status:', error);
            updateServerStatus(false);
        }
    }
    
    /**
     * Update server status in UI
     * @param {boolean} isRunning - Whether the server is running
     */
    function updateServerStatus(isRunning) {
        state.isServerRunning = isRunning;
        
        if (elements.serverStatus) {
            elements.serverStatus.textContent = isRunning ? 'Online' : 'Offline';
            elements.serverStatus.style.backgroundColor = isRunning ? '#2ecc71' : '#95a5a6';
        }
        
        if (elements.connectButton) {
            elements.connectButton.disabled = !isRunning;
            elements.connectButton.textContent = state.isConnected ? 'Disconnect' : 'Connect to Voice';
        }
        
        // If server is running, get available channels
        if (isRunning) {
            getChannels();
        } else {
            // Clear channels if server is not running
            updateChannels([]);
        }
    }
    
    /**
     * Get available Mumble channels
     */
    async function getChannels() {
        try {
            const response = await API.mumble.getChannels();
            
            if (response.success) {
                updateChannels(response.channels);
            }
        } catch (error) {
            console.error('Error getting Mumble channels:', error);
            updateChannels([]);
        }
    }
    
    /**
     * Update channels in UI
     * @param {Array} channels - List of available channels
     */
    function updateChannels(channels) {
        state.channels = channels;
        
        if (!elements.channelList) return;
        
        // Clear channel list
        elements.channelList.innerHTML = '';
        
        if (channels.length === 0) {
            const noChannelsItem = document.createElement('li');
            noChannelsItem.textContent = 'No channels available';
            elements.channelList.appendChild(noChannelsItem);
            return;
        }
        
        // Add channels to list
        channels.forEach(channel => {
            const channelItem = document.createElement('li');
            
            const channelInfo = document.createElement('div');
            channelInfo.className = 'channel-info';
            
            const channelName = document.createElement('span');
            channelName.className = 'channel-name';
            channelName.textContent = channel.name;
            
            const channelDesc = document.createElement('span');
            channelDesc.className = 'channel-description';
            channelDesc.textContent = channel.description;
            
            channelInfo.appendChild(channelName);
            channelInfo.appendChild(channelDesc);
            
            const joinButton = document.createElement('button');
            joinButton.textContent = 'Join';
            joinButton.className = 'join-channel-button';
            joinButton.disabled = !state.isConnected;
            
            // Highlight recommended band
            if (state.recommendedBand && channel.id === state.recommendedBand) {
                channelItem.classList.add('recommended-channel');
                const recommendedBadge = document.createElement('span');
                recommendedBadge.className = 'recommended-badge';
                recommendedBadge.textContent = 'Recommended';
                channelInfo.appendChild(recommendedBadge);
            }
            
            // Add click handler for join button
            joinButton.addEventListener('click', () => {
                joinChannel(channel.id);
            });
            
            channelItem.appendChild(channelInfo);
            channelItem.appendChild(joinButton);
            
            elements.channelList.appendChild(channelItem);
        });
    }
    
    /**
     * Handle connect/disconnect button click
     */
    async function handleConnectToggle() {
        if (state.isConnected) {
            // Disconnect from Mumble
            state.isConnected = false;
            elements.connectButton.textContent = 'Connect to Voice';
            
            // Update channel join buttons
            updateChannelJoinButtons(false);
            
            // Show notification
            showNotification('Disconnected from voice chat');
        } else {
            // Connect to Mumble
            try {
                // In a real implementation, this would launch the Mumble client
                // For now, just simulate connection
                state.isConnected = true;
                elements.connectButton.textContent = 'Disconnect';
                
                // Update channel join buttons
                updateChannelJoinButtons(true);
                
                // Show notification
                showNotification('Connected to voice chat');
                
                // Join recommended channel if available
                if (state.recommendedBand) {
                    joinChannel(state.recommendedBand);
                }
            } catch (error) {
                console.error('Error connecting to Mumble:', error);
                showNotification('Error connecting to voice chat: ' + error.message, 'error');
            }
        }
    }
    
    /**
     * Update channel join buttons based on connection state
     * @param {boolean} enabled - Whether buttons should be enabled
     */
    function updateChannelJoinButtons(enabled) {
        const buttons = document.querySelectorAll('.join-channel-button');
        buttons.forEach(button => {
            button.disabled = !enabled;
        });
    }
    
    /**
     * Join a Mumble channel
     * @param {string} channelId - ID of the channel to join
     */
    async function joinChannel(channelId) {
        if (!state.isConnected) return;
        
        try {
            const response = await API.mumble.joinChannel(channelId);
            
            if (response.success) {
                state.currentChannel = response.channel;
                
                // Update UI to show current channel
                updateCurrentChannel();
                
                // Show notification
                showNotification(`Joined channel ${response.channel.name}`);
            }
        } catch (error) {
            console.error('Error joining channel:', error);
            showNotification('Error joining channel: ' + error.message, 'error');
        }
    }
    
    /**
     * Update UI to show current channel
     */
    function updateCurrentChannel() {
        const channelItems = elements.channelList.querySelectorAll('li');
        
        channelItems.forEach(item => {
            const channelName = item.querySelector('.channel-name').textContent;
            
            if (state.currentChannel && channelName === state.currentChannel.name) {
                item.classList.add('current-channel');
                item.querySelector('.join-channel-button').textContent = 'Current';
                item.querySelector('.join-channel-button').disabled = true;
            } else {
                item.classList.remove('current-channel');
                item.querySelector('.join-channel-button').textContent = 'Join';
                item.querySelector('.join-channel-button').disabled = !state.isConnected;
            }
        });
    }
    
    /**
     * Handle save Maidenhead grid button click
     */
    async function handleSaveMaidenhead() {
        const grid = elements.maidenheadGrid.value.trim();
        
        if (!grid) {
            showNotification('Please enter a valid Maidenhead grid', 'error');
            return;
        }
        
        try {
            const response = await API.mumble.updateMetadata({ maidenheadGrid: grid });
            
            if (response.success) {
                state.maidenheadGrid = grid;
                
                // Show notification
                showNotification('Maidenhead grid saved');
                
                // Get HF band recommendation
                getHfRecommendation();
            }
        } catch (error) {
            console.error('Error saving Maidenhead grid:', error);
            showNotification('Error saving Maidenhead grid: ' + error.message, 'error');
        }
    }
    
    /**
     * Handle save HF band button click
     */
    async function handleSaveHfBand() {
        const band = elements.hfBandSelect.value;
        
        try {
            const response = await API.mumble.updateMetadata({ preferredHfBand: band });
            
            if (response.success) {
                state.preferredHfBand = band;
                
                // Show notification
                showNotification('Preferred HF band saved');
            }
        } catch (error) {
            console.error('Error saving preferred HF band:', error);
            showNotification('Error saving preferred HF band: ' + error.message, 'error');
        }
    }
    
    /**
     * Get HF band recommendation based on Maidenhead grid
     */
    async function getHfRecommendation() {
        if (!state.maidenheadGrid) return;
        
        try {
            // For demonstration, use a fixed target grid
            // In a real implementation, this would be based on other users or a default location
            const targetGrid = 'JO59lx';
            
            const response = await API.mumble.getHfRecommendation(targetGrid);
            
            if (response.success) {
                state.recommendedBand = response.recommendation.recommendedBand;
                
                // Update propagation map
                updatePropagationMap(response.recommendation);
                
                // Update channel list to highlight recommended band
                if (state.channels.length > 0) {
                    updateChannels(state.channels);
                }
            }
        } catch (error) {
            console.error('Error getting HF band recommendation:', error);
        }
    }
    
    /**
     * Update propagation map with recommendation data
     * @param {Object} recommendation - HF propagation recommendation
     */
    function updatePropagationMap(recommendation) {
        if (!elements.propagationMap) return;
        
        // In a real implementation, this would display a map with propagation data
        // For now, just show text information
        elements.propagationMap.innerHTML = `
            <div class="propagation-info">
                <h4>HF Propagation</h4>
                <p>From: ${recommendation.sourceGrid}</p>
                <p>To: ${recommendation.targetGrid}</p>
                <p>Recommended Band: ${recommendation.recommendedBand}m</p>
                <p>This is a simplified propagation model. In a real implementation, this would show a map with propagation paths and signal strength.</p>
            </div>
        `;
    }
    
    /**
     * Add a user to a channel in the UI
     * @param {Object} user - User who joined
     * @param {Object} channel - Channel that was joined
     */
    function addUserToChannel(user, channel) {
        // In a real implementation, this would update the channel user list
        console.log(`User ${user.username} joined channel ${channel.name}`);
        
        // Show notification
        showNotification(`${user.username} joined channel ${channel.name}`);
    }
    
    /**
     * Remove a user from a channel in the UI
     * @param {Object} user - User who left
     * @param {Object} channel - Channel that was left
     */
    function removeUserFromChannel(user, channel) {
        // In a real implementation, this would update the channel user list
        console.log(`User ${user.username} left channel ${channel.name}`);
        
        // Show notification
        showNotification(`${user.username} left channel ${channel.name}`);
    }
    
    /**
     * Show a notification message
     * @param {string} message - Notification message
     * @param {string} type - Notification type ('success', 'error', etc.)
     */
    function showNotification(message, type = 'success') {
        // In a real implementation, this would show a toast notification
        console.log(`[${type}] ${message}`);
        
        // Create a temporary notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Add to document
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 500);
        }, 3000);
    }
    
    // Public API
    return {
        initialize
    };
})();