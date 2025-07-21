/**
 * murmur.js
 * Handles Murmur server communication via Electron IPC
 */

export class MurmurInterface {
    /**
     * Initialize Murmur interface
     * @param {Object} app - Reference to the main application
     */
    constructor(app) {
        this.app = app;
        this.isInitialized = false;
        this.isConnected = false;
        this.currentBand = null;
        this.stations = [];
        this.serverAddress = '';
        this.isAdmin = false; // Flag to track admin status
        
        // Audio settings
        this.audioOutputEnabled = true; // Audio output is enabled so users can hear sounds
        // IMPORTANT: Audio decoding is not implemented and completely disabled for security purposes
        this.volume = 75; // 0-100 scale
        
        // Event handler cleanup functions
        this.eventCleanupFunctions = [];
    }
    
    /**
     * Initialize the Murmur interface
     * @returns {boolean} - True if initialization was successful
     */
    initialize() {
        if (this.isInitialized) return true;
        
        try {
            // Set up UI event listeners
            this.setupEventListeners();
            
            // Set up Mumble event listeners from main process
            this.setupMumbleEventListeners();
            
            // Mark as initialized
            this.isInitialized = true;
            
            // Populate server address if available
            const settings = this.app.settings.getSettings();
            if (settings.serverAddress) {
                this.serverAddress = settings.serverAddress;
                document.getElementById('murmurServerAddress').value = this.serverAddress;
            }
            
            return true;
        } catch (error) {
            console.error('Error initializing Murmur interface:', error);
            return false;
        }
    }
    /**
     * Set up Mumble event listeners from main process
     */
    setupMumbleEventListeners() {
        // Connection status updates
        const connectionStatusCleanup = window.electronAPI.onMumbleConnectionStatus((status) => {
            console.log('Mumble connection status:', status);
            
            // Update connected state
            this.isConnected = status.status === 'connected';
            
            // Update current band/channel
            if (status.currentChannel) {
                this.currentBand = status.currentChannel;
                document.getElementById('currentBand').textContent = status.currentChannel;
            } else if (!this.isConnected) {
                this.currentBand = null;
                document.getElementById('currentBand').textContent = 'Not connected';
            }
            
            // Update UI
            this.updateServerStatus(this.isConnected);
            
            // Update UI buttons
            if (this.isConnected) {
                document.getElementById('connectMurmurBtn').classList.add('hidden');
                document.getElementById('disconnectMurmurBtn').classList.remove('hidden');
                
                // Check admin status after connecting
                this.checkAdminStatus();
            } else {
                document.getElementById('disconnectMurmurBtn').classList.add('hidden');
                document.getElementById('connectMurmurBtn').classList.remove('hidden');
                this.isAdmin = false; // Reset admin status when disconnected
                this.updateAdminUI(); // Update admin UI elements
            }
            
            // Show error if any
            if (status.error) {
                // Check if server is at capacity
                if (status.error.includes('server is full') || status.error.includes('capacity') || status.error.includes('no slots') || status.error.includes('maximum users')) {
                    this.app.showModal('Server Full', 'No free user slots at the moment, please study for the radio amateur exam, go for a walk or try again later.');
                } else {
                    this.app.showModal('Connection Error', `Failed to connect to Mumble server: ${status.error}`);
                }
            }
            
            // Update stations list (will be empty if disconnected)
            this.updateStationsList();
        });
        this.eventCleanupFunctions.push(connectionStatusCleanup);
        
        // User updates
        const userUpdateCleanup = window.electronAPI.onMumbleUserUpdate((users) => {
            console.log('Mumble users updated:', users);
            
            // Convert users to stations format
            this.stations = users.map(user => ({
                callsign: user.name,
                id: user.id || 0,
                locator: user.channel || 'Unknown',
                muted: user.mute || user.selfMute,
                deafened: user.deaf || user.selfDeaf
            }));
            
            // Update UI
            this.updateStationsList();
        });
        this.eventCleanupFunctions.push(userUpdateCleanup);
        
        // Message updates
        const messageCleanup = window.electronAPI.onMumbleMessage((message) => {
            console.log('Mumble message received:', message);
            
            // Display the message
            this.displayMessage({
                sender: message.sender,
                content: message.content,
                time: new Date(message.time),
                isSelf: false
            });
        });
        this.eventCleanupFunctions.push(messageCleanup);
    }
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Connect/disconnect buttons for Murmur server
        const connectBtn = document.getElementById('connectMurmurBtn');
        const disconnectBtn = document.getElementById('disconnectMurmurBtn');
        const serverAddressInput = document.getElementById('murmurServerAddress');
        
        if (connectBtn) {
            connectBtn.addEventListener('click', () => {
                // Get the server address from the input field
                const address = serverAddressInput.value.trim();
                if (address) {
                    this.serverAddress = address;
                    this.connect();
                } else {
                    this.app.showModal('Server Address Required', 
                        'Please enter a valid server address (IP or domain name) to connect.');
                }
            });
        }
        
        if (disconnectBtn) {
            disconnectBtn.addEventListener('click', () => {
                this.disconnect();
            });
        }
        
        // Volume control
        const volumeControl = document.getElementById('volumeControl');
        if (volumeControl) {
            volumeControl.addEventListener('input', (e) => {
                this.setVolume(parseInt(e.target.value));
            });
        }
        
        // Morse input field
        const morseInput = document.getElementById('morseInput');
        const sendMorseBtn = document.getElementById('sendMorseBtn');
        
        // Update volume control
        if (document.getElementById('volumeControl')) {
            document.getElementById('volumeControl').value = this.volume;
        }
        
        if (morseInput && sendMorseBtn) {
            sendMorseBtn.addEventListener('click', () => {
                const message = morseInput.value.trim();
                if (message) {
                    this.sendMorseMessage(message);
                    morseInput.value = '';
                }
            });
            
            // Also handle Enter key
            morseInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const message = morseInput.value.trim();
                    if (message) {
                        this.sendMorseMessage(message);
                        morseInput.value = '';
                    }
                }
            });
        }
    }
    
    /**
     * Set the audio volume
     * @param {number} level - Volume level (0-100)
     */
    setVolume(level) {
        this.volume = level;
        
        // Adjust volume for audio playback only
        // Note: Audio decoding is not implemented and not possible in this application
        console.log('Set volume to', level);
    }
    
    /**
     * Check if the current user has admin privileges
     * This queries the server for user metadata to determine admin status
     */
    async checkAdminStatus() {
        if (!this.isConnected) return;
        
        try {
            // Query server for user metadata through IPC
            const userInfo = await window.electronAPI.getMumbleUserInfo();
            
            if (userInfo.success && userInfo.metadata) {
                // Check if isAdmin flag is set to true
                this.isAdmin = userInfo.metadata.isAdmin === 'true' || userInfo.metadata.isAdmin === true;
                console.log('Admin status:', this.isAdmin);
                
                // Update UI based on admin status
                this.updateAdminUI();
                
                // Update stations list to show admin actions
                this.updateStationsList();
            }
        } catch (error) {
            console.error('Error checking admin status:', error);
            this.isAdmin = false;
        }
    }
    
    /**
     * Update UI elements based on admin status
     */
    updateAdminUI() {
        // Show/hide admin controls based on admin status
        const adminControls = document.getElementById('adminControls');
        if (adminControls) {
            if (this.isAdmin) {
                adminControls.classList.remove('hidden');
            } else {
                adminControls.classList.add('hidden');
            }
        } else if (this.isAdmin) {
            // Create admin controls if they don't exist and user is admin
            this.createAdminUI();
        }
    }
    
    /**
     * Create admin UI elements if they don't exist
     */
    createAdminUI() {
        // Get the container for admin controls
        const container = document.querySelector('.murmur-controls');
        if (!container) return;
        
        // Check if admin controls already exist
        if (document.getElementById('adminControls')) return;
        
        // Create admin controls container
        const adminControls = document.createElement('div');
        adminControls.id = 'adminControls';
        adminControls.className = 'admin-controls';
        
        // Create header
        const header = document.createElement('h3');
        header.textContent = 'Admin Controls';
        adminControls.appendChild(header);
        
        // Add note that these controls are only visible to admins
        const note = document.createElement('p');
        note.className = 'admin-note';
        note.textContent = 'These controls are only visible to server administrators.';
        adminControls.appendChild(note);
        
        // Add info about banning users
        const banInfo = document.createElement('p');
        banInfo.textContent = 'To ban a user, select them from the stations list and click the "Ban" button.';
        adminControls.appendChild(banInfo);
        
        // Add container to the page
        container.appendChild(adminControls);
    }
    
    /**
     * Ban a user from the server
     * @param {Object} user - The user to ban
     */
    async banUser(user) {
        if (!this.isConnected || !this.isAdmin) {
            this.app.showModal('Permission Denied', 'You must be an admin to ban users.');
            return;
        }
        
        try {
            // Confirm ban action
            const confirmBan = confirm(`Are you sure you want to ban ${user.callsign}?`);
            if (!confirmBan) return;
            
            // Send ban request via IPC
            const result = await window.electronAPI.banMumbleUser(user.id);
            
            if (result.success) {
                // Show success message
                this.app.showModal('User Banned', `Successfully banned ${user.callsign} from the server.`);
                
                // Display system message
                this.displayMessage({
                    sender: 'System',
                    content: `User ${user.callsign} has been banned from the server.`,
                    time: new Date(),
                    isSelf: false
                });
                
                // Update stations list
                this.updateStationsList();
            } else {
                // Show error
                this.app.showModal('Ban Error', `Failed to ban user: ${result.error}`);
            }
        } catch (error) {
            console.error('Error banning user:', error);
            this.app.showModal('Ban Error', `Failed to ban user: ${error.message}`);
        }
    }
    
    /**
     * Initialize the Murmur UI
     */
    initMurmurUI() {
        // Get settings
        const settings = this.app.settings.getSettings();
        
        // Update UI with current settings
        document.getElementById('currentBand').textContent = this.currentBand || 'Not connected';
        
        // Update propagation indicator (placeholder, would be based on actual data)
        this.updatePropagationIndicator(3); // Level 3 of 5
        
        // Update server status
        this.updateServerStatus(this.isConnected);
        
        // Note: Audio decoding is intentionally not implemented for security purposes
        
        // Populate stations list (placeholder)
        this.updateStationsList();
        
        // Populate channels dropdown
        this.updateChannelsDropdown();
        
        // Update admin UI if the user is an admin
        this.updateAdminUI();
    }
    
    /**
     * Update the channels dropdown with available server rooms/channels
     */
    async updateChannelsDropdown() {
        const roomSelector = document.getElementById('roomSelector');
        
        if (roomSelector) {
            // Clear existing options except the default one
            while (roomSelector.options.length > 1) {
                roomSelector.remove(1);
            }
            
            if (!this.isConnected) {
                return;
            }
            
            try {
                // Get channels from the server
                const response = await window.electronAPI.getMumbleChannels();
                
                if (response.success && response.channels) {
                    // Add each channel to the dropdown
                    response.channels.forEach(channel => {
                        const option = document.createElement('option');
                        option.value = channel.name;
                        
                        // Add indentation based on level for nested channels
                        const indent = '—'.repeat(channel.level);
                        const prefix = channel.level > 0 ? indent + ' ' : '';
                        
                        option.textContent = `${prefix}${channel.name} (${channel.userCount})`;
                        roomSelector.appendChild(option);
                    });
                } else {
                    // Fallback to default HF bands if no channels are returned
                    const hfBands = ['160m', '80m', '60m', '40m', '30m', '20m', '17m', '15m', '12m', '10m', '6m'];
                    
                    // Add each HF band as a channel
                    hfBands.forEach(band => {
                        const option = document.createElement('option');
                        option.value = band;
                        option.textContent = `${band} Band`;
                        roomSelector.appendChild(option);
                    });
                    
                    // Add special channels
                    const specialChannels = [
                        { value: 'dx', name: 'DX Cluster' },
                        { value: 'emergency', name: 'Emergency Net' },
                        { value: 'digital', name: 'Digital Modes' },
                        { value: 'contest', name: 'Contest' }
                    ];
                    
                    specialChannels.forEach(channel => {
                        const option = document.createElement('option');
                        option.value = channel.value;
                        option.textContent = channel.name;
                        roomSelector.appendChild(option);
                    });
                }
                
                // Set the current band as selected if it exists
                if (this.currentBand) {
                    for (let i = 0; i < roomSelector.options.length; i++) {
                        if (roomSelector.options[i].value === this.currentBand) {
                            roomSelector.selectedIndex = i;
                            break;
                        }
                    }
                }
                
                // Add change event listener
                roomSelector.addEventListener('change', (e) => {
                    this.switchChannel(e.target.value);
                });
                
            } catch (error) {
                console.error('Error getting Mumble channels:', error);
            }
        }
    }
    
    /**
     * Switch to a different channel
     * @param {string} channelId - The channel ID to switch to
     */
    async switchChannel(channelId) {
        if (!this.isConnected) return;
        
        console.log('Switching to channel:', channelId);
        
        try {
            // Join the channel via IPC
            const result = await window.electronAPI.joinMumbleChannel(channelId);
            
            if (result.success) {
                // Update current band
                this.currentBand = channelId;
                document.getElementById('currentBand').textContent = channelId;
                
                // Update propagation indicator based on the channel name
                // We'll keep this for backward compatibility with the HF band simulation
                const hfBandRegex = /^\d+m$/;
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
                
                // Display a message about the channel switch
                this.displayMessage({
                    sender: 'System',
                    content: `You have switched to the ${channelId} channel.`,
                    time: new Date(),
                    isSelf: false
                });
            } else {
                // Show error
                this.app.showModal('Channel Switch Error', 
                    `Failed to switch to channel ${channelId}: ${result.error}`);
            }
        } catch (error) {
            console.error('Error switching channel:', error);
            this.app.showModal('Channel Switch Error', 
                `Failed to switch to channel ${channelId}: ${error.message}`);
        }
    }
    
    /**
     * Connect to the Murmur server
     * Note: Audio can be heard but is NEVER decoded
     * @returns {Promise} - Resolves when connected
     */
    async connect() {
        if (this.isConnected) return true;
        
        try {
            // Check if user has mastered all required character sets
            const progress = await window.electronAPI.getProgress(this.app.auth.getCurrentUser()?.id);
            if (!progress || !progress.mastery || 
                !progress.mastery.international || progress.mastery.international < 100 ||
                !progress.mastery.prosigns || progress.mastery.prosigns < 100 ||
                !progress.mastery.special || progress.mastery.special < 100) {
                
                this.app.showModal('Feature Locked', 
                    'You need to achieve 100% mastery of the International Morse alphabet, numbers, and prosigns before connecting to a Murmur server.',
                    () => {
                        this.app.navigateTo('training');
                    }
                );
                return false;
            }
            
            // Get the server address from settings
            const settings = this.app.settings.getSettings();
            this.serverAddress = settings.serverAddress || this.serverAddress;
            
            if (!this.serverAddress) {
                this.app.showModal('Server Address Required', 
                    'Please enter a valid server address (IP or domain name) to connect.');
                return false;
            }
            
            // Get the user's Maidenhead locator from settings
            const locator = settings.maidenheadLocator;
            
            if (!locator || !this.app.settings.validateMaidenhead(locator)) {
                // Show error if locator is missing or invalid
                this.app.showModal('Invalid Locator', 
                    'Please set a valid Maidenhead grid locator in Settings before connecting.',
                    () => {
                        this.app.navigateTo('settings');
                    }
                );
                return false;
            }
            
            // Save the server address to settings
            await this.app.settings.saveSettings({
                serverAddress: this.serverAddress
            });
            
            // Connect to the server via IPC
            const options = {
                username: this.app.auth.getCurrentUser()?.name || 'SuperMorse User',
                password: '', // No password for now
                tokens: [], // No access tokens
                channelName: settings.preferredBand || 'Root' // Initial channel
            };
            
            const result = await window.electronAPI.connectMumble(this.serverAddress, options);
            
            if (result.success) {
                // Update channels dropdown with available rooms
                await this.updateChannelsDropdown();
                
                // Set propagation indicator based on preferred band
                if (settings.preferredBand && /^\d+m$/.test(settings.preferredBand)) {
                    // Get propagation data from server if connected
                    this.simulatePropagation(settings.preferredBand).then(propagationLevel => {
                        this.updatePropagationIndicator(propagationLevel);
                    }).catch(error => {
                        console.error('Error getting propagation data:', error);
                        // Default fallback
                        this.updatePropagationIndicator(3);
                    });
                } else {
                    this.updatePropagationIndicator(4); // Default level
                }
                
                return true;
            }
        } catch (error) {
            console.error('Error connecting to Murmur server:', error);
            this.updateServerStatus(false);
            return false;
        }
    }
    
    /**
     * Disconnect from the Murmur server
     * @returns {Promise} - Resolves when disconnected
     */
    async disconnect() {
        if (!this.isConnected) return true;
        
        try {
            // Disconnect from the server via IPC
            await window.electronAPI.disconnectMumble();
            
            return true;
        } catch (error) {
            console.error('Error disconnecting from Murmur server:', error);
            return false;
        }
    }
    
    /**
     * Update the server status indicator
     * @param {boolean} connected - Whether the server is connected
     */
    updateServerStatus(connected) {
        const statusElement = document.getElementById('serverStatus');
        
        if (statusElement) {
            if (connected) {
                statusElement.classList.remove('disconnected');
                statusElement.classList.add('connected');
                statusElement.innerHTML = '<i class="fas fa-server"></i> <span>Connected</span>';
            } else {
                statusElement.classList.remove('connected');
                statusElement.classList.add('disconnected');
                statusElement.innerHTML = '<i class="fas fa-server"></i> <span>Disconnected</span>';
            }
        }
    }
    
    /**
     * Update the propagation quality indicator
     * @param {number} level - Propagation level (1-5)
     */
    updatePropagationIndicator(level) {
        const indicator = document.getElementById('propagationQuality');
        
        if (indicator) {
            // Remove all existing level classes
            for (let i = 1; i <= 5; i++) {
                indicator.classList.remove(`level-${i}`);
            }
            
            // Add the current level class
            indicator.classList.add(`level-${level}`);
        }
    }
    
    /**
     * Update the stations list
     */
    updateStationsList() {
        const stationsList = document.getElementById('stationsList');
        
        if (stationsList) {
            stationsList.innerHTML = '';
            
            if (!this.isConnected) {
                stationsList.innerHTML = '<div class="empty-message">Not connected</div>';
                return;
            }
            
            if (this.stations.length === 0) {
                stationsList.innerHTML = '<div class="empty-message">No stations on this band</div>';
                return;
            }
            
            // Add each station
            this.stations.forEach(station => {
                const stationItem = document.createElement('div');
                stationItem.className = 'station-item';
                
                const callsign = document.createElement('span');
                callsign.className = 'callsign';
                callsign.textContent = station.callsign;
                
                const locator = document.createElement('span');
                locator.className = 'locator';
                locator.textContent = station.locator;
                
                const actionContainer = document.createElement('div');
                actionContainer.className = 'station-actions';
                
                // Add ban button for admins
                if (this.isAdmin) {
                    const banButton = document.createElement('button');
                    banButton.className = 'ban-button';
                    banButton.innerHTML = '<i class="fas fa-ban"></i>';
                    banButton.title = 'Ban User';
                    banButton.addEventListener('click', (e) => {
                        e.stopPropagation(); // Prevent station selection
                        this.banUser(station);
                    });
                    actionContainer.appendChild(banButton);
                }
                
                stationItem.appendChild(callsign);
                stationItem.appendChild(locator);
                stationItem.appendChild(actionContainer);
                
                // Add click handler to select station
                stationItem.addEventListener('click', () => {
                    this.selectStation(station);
                });
                
                stationsList.appendChild(stationItem);
            });
        }
    }
    
    /**
     * Select a station to communicate with
     * @param {Object} station - The station to select
     */
    selectStation(station) {
        // Remove active class from all stations
        document.querySelectorAll('.station-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Find the DOM element for this station and add active class
        const stationElements = document.querySelectorAll('.station-item');
        for (let i = 0; i < stationElements.length; i++) {
            const callsign = stationElements[i].querySelector('.callsign').textContent;
            if (callsign === station.callsign) {
                stationElements[i].classList.add('active');
                break;
            }
        }
        
        // Log selection (actual user messaging is handled through channels in Mumble)
        console.log('Selected station:', station);
        
        // Switch to the user's channel if possible
        if (station.locator && station.locator !== 'Unknown') {
            this.switchChannel(station.locator);
        }
    }
    
    
    /**
     * Check if user can send messages in current channel based on mastery type
     * @returns {Promise<Object>} - Object with canSend and reason properties
     */
    async checkSendingPermission() {
        if (!this.isConnected) {
            return { canSend: false, reason: 'Not connected to server' };
        }
        
        // Get the user's progress to check mastery type
        const userId = this.app.auth.getCurrentUser()?.id;
        if (!userId) {
            return { canSend: false, reason: 'User not authenticated' };
        }
        
        try {
            const progress = await window.electronAPI.getProgress(userId);
            
            // HF band channels where sending is restricted for listening-only users
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
                
                // Restrict sending in all other channels
                return {
                    canSend: false,
                    reason: 'You can only send messages in text_chat channel with keyboard-only mastery.'
                };
            }
            
            // User has full sending mastery
            return { canSend: true };
        } catch (error) {
            console.error('Error checking mastery type:', error);
            // Default to allowing if we can't check
            return { canSend: true };
        }
    }
    
    /**
     * Send a Morse code message
     * @param {string} message - The message to send
     */
    async sendMorseMessage(message) {
        if (!this.isConnected) {
            this.app.showModal('Not Connected', 
                'You must be connected to the server to send messages.'
            );
            return;
        }
        
        try {
            // Check if the user has permission to send in this channel
            const permissionCheck = await this.checkSendingPermission();
            
            if (!permissionCheck.canSend) {
                // Show error with reason
                this.app.showModal('Sending Restricted', permissionCheck.reason);
                return;
            }
            
            // Send the message via IPC
            const result = await window.electronAPI.sendMumbleMessage(message);
            
            if (result.success) {
                // Display the message in the chat area
                this.displayMessage({
                    sender: this.app.auth.getCurrentUser()?.name || 'You',
                    content: message,
                    time: new Date(),
                    isSelf: true
                });
                
                // Sync restriction to server database if needed
                await this.syncMasteryTypeToServer();
            } else {
                // Show error
                this.app.showModal('Message Error', 
                    `Failed to send message: ${result.error}`);
            }
        } catch (error) {
            console.error('Error sending Morse message:', error);
            this.app.showModal('Message Error', 
                `Failed to send message: ${error.message}`);
        }
    }
    
    /**
     * Sync mastery type to server database
     * This ensures the server knows which users can only listen
     * @returns {Promise<boolean>} - True if sync was successful
     */
    async syncMasteryTypeToServer() {
        // Only sync if connected
        if (!this.isConnected) return false;
        
        try {
            // Get the user's progress to check mastery type
            const userId = this.app.auth.getCurrentUser()?.id;
            if (!userId) return false;
            
            const progress = await window.electronAPI.getProgress(userId);
            
            // Only need to sync if mastery type is 'listening'
            if (progress?.mastery?.masteryType === 'listening') {
                console.log('Syncing listening-only status to server database');
                
                // Send metadata update to server
                const result = await window.electronAPI.updateMumbleMetadata({
                    listeningOnly: 'true'
                });
                
                return result.success;
            }
            
            return true;
        } catch (error) {
            console.error('Error syncing mastery type to server:', error);
            return false;
        }
    }
    
    /**
     * Display a message in the chat area
     * @param {Object} message - The message to display
     */
    displayMessage(message) {
        const messagesContainer = document.getElementById('morseMessages');
        
        if (messagesContainer) {
            const messageElement = document.createElement('div');
            messageElement.className = 'message';
            
            const header = document.createElement('div');
            header.className = 'header';
            
            const sender = document.createElement('span');
            sender.className = 'sender';
            sender.textContent = message.sender;
            
            const time = document.createElement('span');
            time.className = 'time';
            time.textContent = message.time.toLocaleTimeString();
            
            const content = document.createElement('div');
            content.className = 'content';
            content.textContent = message.content;
            
            header.appendChild(sender);
            header.appendChild(time);
            
            messageElement.appendChild(header);
            messageElement.appendChild(content);
            
            messagesContainer.appendChild(messageElement);
            
            // Scroll to bottom
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }
    
    /**
     * Calculate the best HF band based on time and location
     * @param {string} locator - Maidenhead grid locator
     * @returns {string} - The best band
     */
    calculateBestBand(locator) {
        // In a real implementation, this would use VOACAP data
        // For now, use a simple time-based algorithm
        
        const hour = new Date().getHours();
        
        // Simple day/night band selection
        if (hour >= 6 && hour < 18) {
            // Daytime: higher frequencies work better
            return ['20m', '17m', '15m', '10m'][Math.floor(Math.random() * 4)];
        } else {
            // Nighttime: lower frequencies work better
            return ['160m', '80m', '60m', '40m'][Math.floor(Math.random() * 4)];
        }
    }
    
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
        console.log(`Using client-side fallback for ${band} propagation`);
        const hour = new Date().getHours();
        
        // Different bands perform differently at different times
        let baseLevel;
        
        switch (band) {
            case '160m':
            case '80m':
                // Better at night
                baseLevel = hour >= 18 || hour < 6 ? 4 : 2;
                break;
            case '60m':
            case '40m':
                // Good at night, decent during day
                baseLevel = hour >= 18 || hour < 6 ? 4 : 3;
                break;
            case '30m':
            case '20m':
                // Good all around
                baseLevel = 4;
                break;
            case '17m':
            case '15m':
                // Better during day
                baseLevel = hour >= 6 && hour < 18 ? 4 : 2;
                break;
            case '10m':
            case '6m':
                // Much better during day
                baseLevel = hour >= 6 && hour < 18 ? 3 : 1;
                break;
            default:
                baseLevel = 3;
        }
        
        // Add some randomness
        const variation = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
        
        // Ensure level is between 1 and 5
        return Math.max(1, Math.min(5, baseLevel + variation));
    }
    
    
    /**
     * Calculate distance between two Maidenhead locators
     * @param {string} locator1 - First Maidenhead grid locator
     * @param {string} locator2 - Second Maidenhead grid locator
     * @returns {number} - Distance in kilometers
     */
    calculateDistance(locator1, locator2) {
        // Parse Maidenhead locators to get approximate latitude and longitude
        const [lat1, lon1] = this.locatorToLatLon(locator1);
        const [lat2, lon2] = this.locatorToLatLon(locator2);
        
        // Calculate great circle distance using Haversine formula
        const R = 6371; // Earth's radius in km
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
            
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        
        return distance;
    }
    
    /**
     * Convert Maidenhead grid locator to latitude and longitude
     * @param {string} locator - Maidenhead grid locator
     * @returns {Array} - [latitude, longitude]
     */
    locatorToLatLon(locator) {
        locator = locator.toUpperCase();
        
        if (locator.length < 4) {
            throw new Error('Locator must be at least 4 characters');
        }
        
        // Extract fields
        const fieldLon = locator.charCodeAt(0) - 65; // A-R
        const fieldLat = locator.charCodeAt(1) - 65; // A-R
        
        // Extract squares
        const squareLon = parseInt(locator.charAt(2)); // 0-9
        const squareLat = parseInt(locator.charAt(3)); // 0-9
        
        // Calculate longitude: 20 degrees per field, 2 degrees per square
        let lon = -180 + (fieldLon * 20) + (squareLon * 2);
        
        // Calculate latitude: 10 degrees per field, 1 degree per square
        let lat = -90 + (fieldLat * 10) + (squareLat * 1);
        
        // If we have subsquares (6 character locator), refine further
        if (locator.length >= 6) {
            const subsquareLon = locator.charCodeAt(4) - 97; // a-x
            const subsquareLat = locator.charCodeAt(5) - 97; // a-x
            
            // Add subsquare precision: 5 arcminutes per subsquare
            lon += (subsquareLon * 5) / 60;
            lat += (subsquareLat * 2.5) / 60;
        }
        
        // Return center of the grid square
        return [lat + 0.5, lon + 1];
    }
    
    /**
     * Convert degrees to radians
     * @param {number} deg - Degrees
     * @returns {number} - Radians
     */
    deg2rad(deg) {
        return deg * (Math.PI / 180);
    }
}