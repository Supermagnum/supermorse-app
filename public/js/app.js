/**
 * app.js
 * Main application logic for SuperMorse
 */

document.addEventListener('DOMContentLoaded', function() {
    // Application state
    const appState = {
        isConnected: false,
        isInSession: false,
        currentCountry: 'international',
        currentSpeed: 15,
        useFarnsworth: true,
        keyType: 'straight',
        isAuthenticated: false,
        user: null,
        featuresUnlocked: {
            internationalMorse: false,
            prosigns: false,
            specialCharacters: false,
            voiceChat: false,
            hfSimulation: false
        }
    };
    
    // DOM Elements
    const elements = {
        // Connection status
        connectionStatus: document.getElementById('connection-status'),
        connectButton: document.getElementById('connect-button'),
        disconnectButton: document.getElementById('disconnect-button'),
        
        // Settings
        countrySelect: document.getElementById('country-select'),
        speedSelect: document.getElementById('speed-select'),
        farnsworthToggle: document.getElementById('farnsworth-toggle'),
        keyTypeSelect: document.getElementById('key-type-select'),
        
        // Current lesson
        currentCharacter: document.getElementById('current-character'),
        currentMorse: document.getElementById('current-morse'),
        knownCharacters: document.getElementById('known-characters'),
        startLessonButton: document.getElementById('start-lesson-button'),
        playCharacterButton: document.getElementById('play-character-button'),
        
        // Practice area
        practiceArea: document.getElementById('practice-area'),
        practiceInput: document.getElementById('practice-input'),
        
        // Progress
        progressBars: document.getElementById('progress-bars'),
        
        // Session info
        sessionTimer: document.getElementById('session-timer'),
        breakTimer: document.getElementById('break-timer'),
        sessionMessage: document.getElementById('session-message'),
        
        // Authentication
        authTabs: document.getElementById('auth-tabs'),
        loginTab: document.getElementById('login-tab'),
        registerTab: document.getElementById('register-tab'),
        loginForm: document.getElementById('login-form'),
        registerForm: document.getElementById('register-form'),
        logoutButton: document.getElementById('logout-button'),
        userDisplay: document.getElementById('user-display'),
        
        // Feature status
        featureStatus: document.getElementById('feature-status'),
        
        // Mumble integration
        mumbleSection: document.getElementById('mumble-section'),
        mumbleStatus: document.getElementById('mumble-status'),
        mumbleConnect: document.getElementById('mumble-connect'),
        mumbleDisconnect: document.getElementById('mumble-disconnect'),
        mumbleChannels: document.getElementById('mumble-channels'),
        mumbleSettings: document.getElementById('mumble-settings')
    };
    
    // Initialize modules
    function initializeModules() {
        // Initialize API module first (no dependencies)
        if (!API) {
            console.error('API module not loaded');
            return;
        }
        
        // Initialize authentication module
        if (AUTH) {
            AUTH.initialize({
                onLogin: handleLogin,
                onLogout: handleLogout,
                onFeatureUpdate: handleFeatureUpdate
            });
        } else {
            console.error('AUTH module not loaded');
        }
        
        // Initialize Morse audio module
        if (MORSE_AUDIO) {
            MORSE_AUDIO.initialize({
                wpm: appState.currentSpeed,
                farnsworthSpacing: appState.useFarnsworth
            });
        } else {
            console.error('MORSE_AUDIO module not loaded');
        }
        
        // Initialize serial reader module
        if (SERIAL_READER) {
            SERIAL_READER.initialize({
                onCharacterReceived: handleReceivedCharacter,
                onConnectionChanged: handleConnectionChanged
            });
        } else {
            console.error('SERIAL_READER module not loaded');
        }
        
        // Initialize input checker module
        if (INPUT_CHECKER) {
            INPUT_CHECKER.setInputUpdatedCallback(handleInputUpdated);
            INPUT_CHECKER.setSessionCompleteCallback(handleSessionComplete);
        } else {
            console.error('INPUT_CHECKER module not loaded');
        }
        
        // Initialize lesson manager module
        if (LESSON_MANAGER) {
            LESSON_MANAGER.initialize({
                country: appState.currentCountry,
                wpm: appState.currentSpeed,
                farnsworthSpacing: appState.useFarnsworth
            });
            
            LESSON_MANAGER.setStateUpdatedCallback(handleLearningStateUpdated);
            LESSON_MANAGER.setNewCharacterCallback(handleNewCharacter);
            LESSON_MANAGER.setSessionEndCallback(handleLessonSessionEnd);
        } else {
            console.error('LESSON_MANAGER module not loaded');
        }
        
        // Initialize Mumble client module (if available and feature is unlocked)
        if (MUMBLE_CLIENT) {
            // Will be initialized when voice chat is unlocked
        } else {
            console.warn('MUMBLE_CLIENT module not loaded');
        }
    }
    
    // Event handlers
    function handleLogin(user) {
        appState.isAuthenticated = true;
        appState.user = user;
        
        // Update UI
        elements.userDisplay.textContent = user.username;
        elements.userDisplay.parentElement.classList.remove('hidden');
        elements.logoutButton.classList.remove('hidden');
        
        // Hide auth forms
        document.getElementById('auth-forms').classList.add('hidden');
        
        // Update feature status
        updateFeatureStatus(user.featuresUnlocked);
        
        // Reinitialize lesson manager to fetch progress from backend
        LESSON_MANAGER.initialize({
            country: appState.currentCountry,
            wpm: appState.currentSpeed,
            farnsworthSpacing: appState.useFarnsworth
        });
        
        // Initialize Mumble client if voice chat is unlocked
        if (user.featuresUnlocked.voiceChat && MUMBLE_CLIENT) {
            MUMBLE_CLIENT.initialize({
                user: user,
                onStatusChange: handleMumbleStatusChange
            });
        }
    }
    
    function handleLogout() {
        appState.isAuthenticated = false;
        appState.user = null;
        
        // Update UI
        elements.userDisplay.parentElement.classList.add('hidden');
        elements.logoutButton.classList.add('hidden');
        
        // Show auth forms
        document.getElementById('auth-forms').classList.remove('hidden');
        
        // Reset feature status
        updateFeatureStatus({
            internationalMorse: false,
            prosigns: false,
            specialCharacters: false,
            voiceChat: false,
            hfSimulation: false
        });
        
        // Reinitialize lesson manager with default settings
        LESSON_MANAGER.initialize({
            country: appState.currentCountry,
            wpm: appState.currentSpeed,
            farnsworthSpacing: appState.useFarnsworth
        });
    }
    
    function handleFeatureUpdate(features) {
        updateFeatureStatus(features);
        
        // Initialize Mumble client if voice chat was just unlocked
        if (features.voiceChat && MUMBLE_CLIENT && !appState.featuresUnlocked.voiceChat) {
            MUMBLE_CLIENT.initialize({
                user: appState.user,
                onStatusChange: handleMumbleStatusChange
            });
        }
    }
    
    function updateFeatureStatus(features) {
        appState.featuresUnlocked = features;
        
        // Update feature status indicators
        const featureItems = elements.featureStatus.querySelectorAll('.feature-item');
        featureItems.forEach(item => {
            const featureName = item.dataset.feature;
            const statusDot = item.querySelector('.status-dot');
            
            if (features[featureName]) {
                statusDot.classList.remove('status-locked');
                statusDot.classList.add('status-unlocked');
                item.querySelector('.feature-name').textContent = 
                    item.querySelector('.feature-name').textContent.replace(' (Locked)', '');
            } else {
                statusDot.classList.remove('status-unlocked');
                statusDot.classList.add('status-locked');
                if (!item.querySelector('.feature-name').textContent.includes('(Locked)')) {
                    item.querySelector('.feature-name').textContent += ' (Locked)';
                }
            }
        });
        
        // Show/hide Mumble section based on voice chat feature
        if (features.voiceChat) {
            elements.mumbleSection.classList.remove('feature-locked');
            elements.mumbleSection.querySelector('.lock-overlay').classList.add('hidden');
        } else {
            elements.mumbleSection.classList.add('feature-locked');
            elements.mumbleSection.querySelector('.lock-overlay').classList.remove('hidden');
        }
    }
    
    function handleMumbleStatusChange(status) {
        // Update Mumble status indicator
        elements.mumbleStatus.textContent = status.isConnected ? 
            'Connected' : 'Disconnected';
        elements.mumbleStatus.className = status.isConnected ? 
            'status-connected' : 'status-disconnected';
        
        // Show/hide connect/disconnect buttons
        elements.mumbleConnect.classList.toggle('hidden', status.isConnected);
        elements.mumbleDisconnect.classList.toggle('hidden', !status.isConnected);
        
        // Update channel list
        if (status.channels && status.channels.length > 0) {
            elements.mumbleChannels.innerHTML = '';
            status.channels.forEach(channel => {
                const channelItem = document.createElement('div');
                channelItem.className = 'channel-item';
                if (channel.isRecommended) {
                    channelItem.classList.add('recommended');
                }
                if (channel.isCurrent) {
                    channelItem.classList.add('current');
                }
                
                channelItem.innerHTML = `
                    <span class="channel-name">${channel.name}</span>
                    <span class="channel-users">${channel.userCount} users</span>
                    <button class="join-button" data-channel="${channel.id}">Join</button>
                `;
                
                elements.mumbleChannels.appendChild(channelItem);
            });
            
            // Add event listeners to join buttons
            elements.mumbleChannels.querySelectorAll('.join-button').forEach(button => {
                button.addEventListener('click', () => {
                    const channelId = button.dataset.channel;
                    MUMBLE_CLIENT.joinChannel(channelId);
                });
            });
        }
    }
    
    function handleConnectionChanged(isConnected) {
        appState.isConnected = isConnected;
        
        // Update connection status
        elements.connectionStatus.textContent = isConnected ? 'Connected' : 'Disconnected';
        elements.connectionStatus.className = isConnected ? 'status-connected' : 'status-disconnected';
        
        // Show/hide connect/disconnect buttons
        elements.connectButton.classList.toggle('hidden', isConnected);
        elements.disconnectButton.classList.toggle('hidden', !isConnected);
    }
    
    function handleReceivedCharacter(char) {
        // Process the character in the input checker
        INPUT_CHECKER.processCharacter(char);
        
        // Add the character to the practice input display
        updatePracticeDisplay();
    }
    
    function handleInputUpdated(session) {
        updatePracticeDisplay();
    }
    
    function handleSessionComplete(stats) {
        // Display session results
        elements.sessionMessage.textContent = `Session complete! Accuracy: ${Math.round(stats.accuracy * 100)}%`;
        
        // Update progress in lesson manager
        LESSON_MANAGER.updateProgress(stats);
        
        // Clear practice display
        elements.practiceInput.innerHTML = '';
        
        // Generate a new practice sequence
        const newSequence = LESSON_MANAGER.generatePracticeSequence(5);
        INPUT_CHECKER.startSession(newSequence);
    }
    
    function updatePracticeDisplay() {
        const formattedInput = INPUT_CHECKER.getFormattedInput();
        elements.practiceInput.innerHTML = '';
        
        formattedInput.forEach(item => {
            const span = document.createElement('span');
            span.textContent = item.char;
            span.className = item.isCorrect ? 'correct' : 'incorrect';
            elements.practiceInput.appendChild(span);
        });
        
        const session = INPUT_CHECKER.getCurrentSession();
        if (session.expectedSequence) {
            // Show expected sequence
            const expected = document.createElement('div');
            expected.className = 'expected-sequence';
            expected.textContent = `Expected: ${session.expectedSequence}`;
            
            // Clear and re-add
            const existingExpected = elements.practiceArea.querySelector('.expected-sequence');
            if (existingExpected) {
                elements.practiceArea.removeChild(existingExpected);
            }
            elements.practiceArea.appendChild(expected);
        }
    }
    
    function handleLearningStateUpdated(state) {
        // Update current character display
        if (state.currentCharacter) {
            elements.currentCharacter.textContent = state.currentCharacter;
            elements.currentMorse.textContent = ALPHABETS.charToMorse(state.currentCharacter);
        }
        
        // Update known characters
        elements.knownCharacters.innerHTML = '';
        state.knownCharacters.forEach(char => {
            const span = document.createElement('span');
            span.className = 'character-badge';
            span.textContent = char;
            
            // Add progress as data attribute
            const progress = state.characterProgress[char] || 0;
            span.dataset.progress = Math.round(progress * 100);
            
            // Add color based on progress
            if (progress >= 0.9) {
                span.classList.add('mastered');
            } else if (progress >= 0.5) {
                span.classList.add('learning');
            } else {
                span.classList.add('new');
            }
            
            elements.knownCharacters.appendChild(span);
        });
        
        // Update progress bars
        updateProgressBars(state);
        
        // Update session timer
        updateSessionTimer();
    }
    
    function handleNewCharacter(char) {
        // Play a notification sound
        MORSE_AUDIO.playText('NEW');
        
        // Display a message
        elements.sessionMessage.textContent = `New character introduced: ${char}`;
        
        // Update the current character display
        elements.currentCharacter.textContent = char;
        elements.currentMorse.textContent = ALPHABETS.charToMorse(char);
    }
    
    function handleLessonSessionEnd(state) {
        // Display a message
        elements.sessionMessage.textContent = 'Session ended. Take a break!';
        
        // Update timers
        updateSessionTimer();
    }
    
    function updateProgressBars(state) {
        // Clear existing progress bars
        elements.progressBars.innerHTML = '';
        
        // Create progress bars for each stage
        const stages = [
            { id: LESSON_MANAGER.STAGES.CORE, name: 'International Morse' },
            { id: LESSON_MANAGER.STAGES.PROSIGNS, name: 'Prosigns' },
            { id: LESSON_MANAGER.STAGES.SPECIAL, name: 'Special Characters' }
        ];
        
        stages.forEach(stage => {
            // Get all characters for this stage
            const allChars = ALPHABETS.getLearningOrder(appState.currentCountry, stage.id);
            
            // Count known characters
            const knownCount = allChars.filter(char => 
                state.knownCharacters.includes(char)).length;
                
            // Calculate progress percentage
            const progressPct = allChars.length > 0 ? 
                (knownCount / allChars.length) * 100 : 0;
                
            // Create progress bar
            const progressBar = document.createElement('div');
            progressBar.className = 'progress-item';
            progressBar.innerHTML = `
                <div class="progress-label">${stage.name}</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progressPct}%"></div>
                </div>
                <div class="progress-value">${Math.round(progressPct)}%</div>
            `;
            
            elements.progressBars.appendChild(progressBar);
        });
    }
    
    function updateSessionTimer() {
        // Update session timer
        const sessionTimeRemaining = LESSON_MANAGER.getSessionTimeRemaining();
        if (sessionTimeRemaining > 0) {
            const minutes = Math.floor(sessionTimeRemaining / 60000);
            const seconds = Math.floor((sessionTimeRemaining % 60000) / 1000);
            elements.sessionTimer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            elements.sessionTimer.parentElement.classList.remove('hidden');
            elements.breakTimer.parentElement.classList.add('hidden');
        } else {
            elements.sessionTimer.parentElement.classList.add('hidden');
            
            // Update break timer
            const breakTimeRemaining = LESSON_MANAGER.getBreakTimeRemaining();
            if (breakTimeRemaining > 0) {
                const minutes = Math.floor(breakTimeRemaining / 60000);
                const seconds = Math.floor((breakTimeRemaining % 60000) / 1000);
                elements.breakTimer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                elements.breakTimer.parentElement.classList.remove('hidden');
            } else {
                elements.breakTimer.parentElement.classList.add('hidden');
            }
        }
        
        // Schedule next update
        setTimeout(updateSessionTimer, 1000);
    }
    
    // UI Event Listeners
    function setupEventListeners() {
        // Connect/disconnect buttons
        elements.connectButton.addEventListener('click', () => {
            SERIAL_READER.connect();
        });
        
        elements.disconnectButton.addEventListener('click', () => {
            SERIAL_READER.disconnect();
        });
        
        // Settings changes
        elements.countrySelect.addEventListener('change', () => {
            appState.currentCountry = elements.countrySelect.value;
            LESSON_MANAGER.updateSettings({ country: appState.currentCountry });
        });
        
        elements.speedSelect.addEventListener('change', () => {
            appState.currentSpeed = parseInt(elements.speedSelect.value);
            LESSON_MANAGER.updateSettings({ wpm: appState.currentSpeed });
        });
        
        elements.farnsworthToggle.addEventListener('change', () => {
            appState.useFarnsworth = elements.farnsworthToggle.checked;
            LESSON_MANAGER.updateSettings({ farnsworthSpacing: appState.useFarnsworth });
        });
        
        elements.keyTypeSelect.addEventListener('change', () => {
            appState.keyType = elements.keyTypeSelect.value;
            SERIAL_READER.setKeyType(appState.keyType);
        });
        
        // Lesson buttons
        elements.startLessonButton.addEventListener('click', () => {
            LESSON_MANAGER.startSession();
            
            // Generate a practice sequence
            const sequence = LESSON_MANAGER.generatePracticeSequence(5);
            INPUT_CHECKER.startSession(sequence);
            
            // Update practice display
            updatePracticeDisplay();
        });
        
        elements.playCharacterButton.addEventListener('click', () => {
            const currentChar = elements.currentCharacter.textContent;
            if (currentChar) {
                MORSE_AUDIO.playCharacter(currentChar);
            }
        });
        
        // Mumble buttons (if voice chat is unlocked)
        if (elements.mumbleConnect) {
            elements.mumbleConnect.addEventListener('click', () => {
                if (MUMBLE_CLIENT) {
                    MUMBLE_CLIENT.connect();
                }
            });
        }
        
        if (elements.mumbleDisconnect) {
            elements.mumbleDisconnect.addEventListener('click', () => {
                if (MUMBLE_CLIENT) {
                    MUMBLE_CLIENT.disconnect();
                }
            });
        }
        
        // Handle keyboard input for practice
        document.addEventListener('keydown', (event) => {
            // Only process if we're in a session
            if (!LESSON_MANAGER.getLearningState().isInSession) {
                return;
            }
            
            // Check if it's a valid character
            const char = event.key.toUpperCase();
            if (/^[A-Z0-9]$/.test(char)) {
                INPUT_CHECKER.processCharacter(char);
                updatePracticeDisplay();
            }
        });
        
        // Check for locked features
        document.querySelectorAll('.feature-locked').forEach(element => {
            element.addEventListener('click', (event) => {
                // Prevent interaction with locked features
                if (!event.target.closest('.lock-overlay')) {
                    return;
                }
                
                // Show message about how to unlock
                const featureName = element.dataset.feature;
                let unlockMessage = '';
                
                switch (featureName) {
                    case 'internationalMorse':
                        unlockMessage = 'Master all International Morse characters to unlock this feature.';
                        break;
                    case 'prosigns':
                        unlockMessage = 'Master International Morse first to unlock Prosigns.';
                        break;
                    case 'specialCharacters':
                        unlockMessage = 'Master Prosigns first to unlock Special Characters.';
                        break;
                    case 'voiceChat':
                        unlockMessage = 'Master International Morse, Prosigns, and Special Characters to unlock Voice Chat.';
                        break;
                    case 'hfSimulation':
                        unlockMessage = 'Complete a voice chat session to unlock HF Simulation.';
                        break;
                    default:
                        unlockMessage = 'Continue practicing to unlock this feature.';
                }
                
                alert(unlockMessage);
                event.preventDefault();
                event.stopPropagation();
            });
        });
    }
    
    // Initialize the application
    initializeModules();
    setupEventListeners();
    
    // Check if user is already logged in
    API.getCurrentUser()
        .then(user => {
            if (user) {
                handleLogin(user);
            }
        })
        .catch(error => {
            console.error('Error checking authentication status:', error);
        });
    
    // Start timer updates
    updateSessionTimer();
});