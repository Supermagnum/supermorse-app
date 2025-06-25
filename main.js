/**
 * main.js
 * Electron main process entry point
 */

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { SerialPort } = require('serialport');
const Store = require('electron-store');
const fs = require('fs');
const mumble = require('node-mumble');

// Initialize electron-store for persistent settings and user data
const store = new Store();

// Import user controller and data service
const UserController = require('./src/controllers/UserController');
const JsonDataService = require('./src/services/JsonDataService');

// Mumble client state
let mumbleClient = null;
let mumbleConnection = {
  status: 'disconnected',
  error: null,
  currentChannel: null,
  users: [],
  channels: []
};

// Make sure data directories exist for JSON storage
// Use app.getPath('userData') instead of __dirname to ensure we have write access
const DATA_DIR = path.join(app.getPath('userData'), 'data');
const USERS_DIR = path.join(DATA_DIR, 'users');
const PROGRESS_DIR = path.join(DATA_DIR, 'progress');
const STATS_DIR = path.join(DATA_DIR, 'stats');

// Create data directories if they don't exist
[DATA_DIR, USERS_DIR, PROGRESS_DIR, STATS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Configure JsonDataService to use the same paths
JsonDataService.setDataDirectories({
  dataDir: DATA_DIR,
  usersDir: USERS_DIR,
  progressDir: PROGRESS_DIR,
  statsDir: STATS_DIR
});

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;
let serialConnection = null;

// Create certificates directory and files if they don't exist
// Use app.getPath('userData') instead of __dirname to ensure we have write access
const CERT_DIR = path.join(app.getPath('userData'), 'cert');
if (!fs.existsSync(CERT_DIR)) {
  fs.mkdirSync(CERT_DIR, { recursive: true });
  console.log(`Created directory: ${CERT_DIR}`);
  
  // Generate self-signed certificates for development
  const { execSync } = require('child_process');
  try {
    execSync(`openssl req -x509 -newkey rsa:2048 -nodes -keyout "${path.join(CERT_DIR, 'key.pem')}" -out "${path.join(CERT_DIR, 'cert.pem')}" -days 365 -subj "/CN=localhost"`, {
      stdio: 'inherit'
    });
    console.log('Generated self-signed certificates for Mumble connection');
  } catch (error) {
    console.error('Failed to generate certificates:', error);
    // Create empty files to prevent errors
    fs.writeFileSync(path.join(CERT_DIR, 'key.pem'), '');
    fs.writeFileSync(path.join(CERT_DIR, 'cert.pem'), '');
  }
}

// Set up mumble connection options
let MUMBLE_OPTIONS = {
  rejectUnauthorized: false // For development - in production this should be true
};

// Try to read certificate files if they exist
try {
  const keyPath = path.join(CERT_DIR, 'key.pem');
  const certPath = path.join(CERT_DIR, 'cert.pem');
  
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    MUMBLE_OPTIONS.key = fs.readFileSync(keyPath);
    MUMBLE_OPTIONS.cert = fs.readFileSync(certPath);
    console.log('Successfully loaded SSL certificates for Mumble connection');
  } else {
    console.warn('SSL certificate files exist but could not be read, using insecure connection');
  }
} catch (error) {
  console.warn('Failed to read SSL certificates, using insecure connection:', error.message);
}

// Default settings
const DEFAULT_SETTINGS = {
  morseSpeed: 13, // Default WPM
  toneFrequency: 600, // Default Hz
  arduinoPort: '', // Will be populated when detected
  theme: 'light',
  maidenheadLocator: ''
};

/**
 * Create the main application window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the index.html file
  mainWindow.loadFile(path.join(__dirname, 'src/renderer/index.html'));

  // Open DevTools in development mode
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // Set up close event
  mainWindow.on('closed', () => {
    // Close serial connection if open
    if (serialConnection && serialConnection.isOpen) {
      serialConnection.close();
    }
    mainWindow = null;
  });
}

/**
 * Initialize the application when Electron is ready
 */
app.whenReady().then(() => {
  createWindow();

  // Create window if none exists when app is activated (macOS)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // Initialize serial port connection
  initializeSerialPort();
});

/**
 * Quit when all windows are closed, except on macOS
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

/**
 * Initialize serial port for Arduino communication
 */
async function initializeSerialPort() {
  try {
    // List available ports
    const ports = await SerialPort.list();
    
    // Log available ports
    console.log('Available serial ports:');
    ports.forEach(port => {
      console.log(`${port.path} - ${port.manufacturer || 'Unknown'}`);
    });
    
    // Store available ports for renderer to access
    store.set('availablePorts', ports);
    
    // Auto-connect to stored port if available
    const savedPort = store.get('settings.arduinoPort');
    if (savedPort) {
      connectToSerialPort(savedPort);
    }
  } catch (error) {
    console.error('Error listing serial ports:', error);
  }
}

/**
 * Connect to a specific serial port
 * @param {string} portPath - The path to the serial port
 */
function connectToSerialPort(portPath) {
  // Close existing connection if open
  if (serialConnection && serialConnection.isOpen) {
    serialConnection.close();
  }
  
  // Create new connection
  serialConnection = new SerialPort({
    path: portPath,
    baudRate: 9600
  });
  
  // Set up event handlers
  serialConnection.on('open', () => {
    console.log(`Connected to ${portPath}`);
    if (mainWindow) {
      mainWindow.webContents.send('serial-status', { connected: true, port: portPath });
    }
    store.set('settings.arduinoPort', portPath);
  });
  
  serialConnection.on('data', (data) => {
    if (mainWindow) {
      mainWindow.webContents.send('serial-data', data.toString());
    }
  });
  
  serialConnection.on('error', (error) => {
    console.error('Serial port error:', error);
    if (mainWindow) {
      mainWindow.webContents.send('serial-status', { connected: false, error: error.message });
    }
  });
  
  serialConnection.on('close', () => {
    console.log('Serial port closed');
    if (mainWindow) {
      mainWindow.webContents.send('serial-status', { connected: false });
    }
  });
}

/**
 * Send data to the serial port
 * @param {string} data - The data to send
 */
function sendToSerialPort(data) {
  if (serialConnection && serialConnection.isOpen) {
    serialConnection.write(data, (err) => {
      if (err) {
        console.error('Error writing to serial port:', err);
      }
    });
  }
}

// IPC handlers for renderer process communication
ipcMain.handle('get-settings', () => {
  return store.get('settings') || DEFAULT_SETTINGS;
});

ipcMain.handle('save-settings', (event, settings) => {
  store.set('settings', settings);
  return true;
});

ipcMain.handle('get-serial-ports', async () => {
  try {
    const ports = await SerialPort.list();
    return ports;
  } catch (error) {
    console.error('Error listing serial ports:', error);
    return [];
  }
});

ipcMain.handle('connect-serial', (event, port) => {
  try {
    connectToSerialPort(port);
    return true;
  } catch (error) {
    console.error('Error connecting to serial port:', error);
    return false;
  }
});

ipcMain.handle('send-serial', (event, data) => {
  try {
    sendToSerialPort(data);
    return true;
  } catch (error) {
    console.error('Error sending data to serial port:', error);
    return false;
  }
});

// User management IPC handlers
ipcMain.handle('register-user', async (event, userData) => {
  try {
    const result = await UserController.registerUser(userData);
    return result;
  } catch (error) {
    console.error('Error registering user:', error);
    return { success: false, message: 'Registration failed: ' + error.message };
  }
});

ipcMain.handle('login-user', async (event, credentials) => {
  try {
    const result = await UserController.loginUser(credentials);
    return result;
  } catch (error) {
    console.error('Error logging in user:', error);
    return { success: false, message: 'Login failed: ' + error.message };
  }
});

// Morse learning progress IPC handlers
ipcMain.handle('save-progress', async (event, progressData) => {
  try {
    // Use the UserController to save progress to JSON files
    const result = await UserController.updateUserProgress(progressData.userId, progressData);
    return result;
  } catch (error) {
    console.error('Error saving progress:', error);
    return { success: false, message: 'Failed to save progress' };
  }
});

ipcMain.handle('get-progress', async (event, userId) => {
  try {
    // Use the UserController to get progress from JSON files
    const result = await UserController.getUserProgress(userId);
    return result;
  } catch (error) {
    console.error('Error getting progress:', error);
    return { success: false, message: 'Failed to get progress' };
  }
});

// User settings IPC handlers
ipcMain.handle('get-user-settings', (event, userId) => {
  // Get settings from electron-store
  return store.get(`userSettings.${userId}`) || DEFAULT_SETTINGS;
});

ipcMain.handle('save-user-settings', (event, userId, settings) => {
  try {
    // Save settings to electron-store
    store.set(`userSettings.${userId}`, settings);
    return { success: true };
  } catch (error) {
    console.error('Error saving user settings:', error);
    return false;
  }
});

// Token verification IPC handler
ipcMain.handle('verify-token', async (event, token) => {
  try {
    // Verify JWT token
    const result = await UserController.verifyToken(token);
    return result.success ? { valid: true, user: result.user } : { valid: false };
  } catch (error) {
    console.error('Error verifying token:', error);
    return { valid: false };
  }
});

// Mumble server connection IPC handlers
ipcMain.handle('connect-mumble', async (event, serverAddress, options = {}) => {
  try {
    // Close existing connection if open
    if (mumbleClient) {
      await disconnectMumble();
    }
    
    // Set connection status to connecting
    mumbleConnection.status = 'connecting';
    mumbleConnection.error = null;
    sendMumbleStatusUpdate();
    
    // Connect to the server
    return new Promise((resolve, reject) => {
      mumble.connect(serverAddress, MUMBLE_OPTIONS, (error, client) => {
        if (error) {
          console.error('Mumble connection error:', error);
          mumbleConnection.status = 'error';
          mumbleConnection.error = error.message;
          sendMumbleStatusUpdate();
          reject({ success: false, error: error.message });
          return;
        }
        
        // Store client reference
        mumbleClient = client;
        
        // Set up event handlers
        setupMumbleEventHandlers();
        
        // Set connection status to connected
        mumbleConnection.status = 'connected';
        sendMumbleStatusUpdate();
        
        // Get channels and users
        updateMumbleChannelsAndUsers();
        
        // Return success
        resolve({ success: true });
      });
    });
  } catch (error) {
    console.error('Error connecting to Mumble server:', error);
    mumbleConnection.status = 'error';
    mumbleConnection.error = error.message;
    sendMumbleStatusUpdate();
    return { success: false, error: error.message };
  }
});

ipcMain.handle('disconnect-mumble', async () => {
  try {
    await disconnectMumble();
    return { success: true };
  } catch (error) {
    console.error('Error disconnecting from Mumble server:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('join-mumble-channel', async (event, channelName) => {
  try {
    if (!mumbleClient) {
      return { success: false, error: 'Not connected to a Mumble server' };
    }
    
    // Find the channel
    const channel = findChannelByName(channelName);
    if (!channel) {
      return { success: false, error: `Channel '${channelName}' not found` };
    }
    
    // Join the channel
    channel.join();
    
    // Update current channel
    mumbleConnection.currentChannel = channelName;
    sendMumbleStatusUpdate();
    
    return { success: true };
  } catch (error) {
    console.error('Error joining Mumble channel:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('send-mumble-message', async (event, message) => {
  try {
    if (!mumbleClient) {
      return { success: false, error: 'Not connected to a Mumble server' };
    }
    
    // Send message to current channel
    const channel = mumbleClient.channelByName(mumbleConnection.currentChannel || 'Root');
    if (channel) {
      channel.sendMessage(message);
      return { success: true };
    } else {
      return { success: false, error: 'Current channel not found' };
    }
  } catch (error) {
    console.error('Error sending Mumble message:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-mumble-channels', async () => {
  try {
    if (!mumbleClient) {
      return { success: false, error: 'Not connected to a Mumble server' };
    }
    
    return { 
      success: true, 
      channels: mumbleConnection.channels 
    };
  } catch (error) {
    console.error('Error getting Mumble channels:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-mumble-users', async () => {
  try {
    if (!mumbleClient) {
      return { success: false, error: 'Not connected to a Mumble server' };
    }
    
    return { 
      success: true, 
      users: mumbleConnection.users 
    };
  } catch (error) {
    console.error('Error getting Mumble users:', error);
    return { success: false, error: error.message };
  }
});

/**
 * Disconnect from the Mumble server
 */
async function disconnectMumble() {
  if (mumbleClient) {
    mumbleClient.disconnect();
    mumbleClient = null;
  }
  
  // Reset connection state
  mumbleConnection = {
    status: 'disconnected',
    error: null,
    currentChannel: null,
    users: [],
    channels: []
  };
  
  // Notify renderer
  sendMumbleStatusUpdate();
}

/**
 * Set up Mumble event handlers
 */
function setupMumbleEventHandlers() {
  if (!mumbleClient) return;
  
  // Handle voice data
  mumbleClient.on('voice', (voice) => {
    // Forwarding voice data to renderer is not implemented
    // in this version for security reasons
  });
  
  // Handle user changes
  mumbleClient.on('userChange', (user, states) => {
    // Update users list
    updateMumbleChannelsAndUsers();
  });
  
  // Handle channel changes
  mumbleClient.on('channelChange', (channel) => {
    // Update channels list
    updateMumbleChannelsAndUsers();
  });
  
  // Handle server messages
  mumbleClient.on('message', (message, user, scope) => {
    if (mainWindow) {
      mainWindow.webContents.send('mumble-message', {
        sender: user ? user.name : 'Server',
        content: message,
        time: new Date().toISOString(),
        scope: scope
      });
    }
  });
  
  // Handle disconnection
  mumbleClient.on('disconnect', () => {
    mumbleClient = null;
    mumbleConnection.status = 'disconnected';
    sendMumbleStatusUpdate();
  });
}

/**
 * Update Mumble channels and users lists
 */
function updateMumbleChannelsAndUsers() {
  if (!mumbleClient) return;
  
  // Get channels
  mumbleConnection.channels = [];
  const rootChannel = mumbleClient.channelById(0); // Root channel
  if (rootChannel) {
    addChannelRecursive(rootChannel, mumbleConnection.channels);
  }
  
  // Get users
  mumbleConnection.users = Object.values(mumbleClient.users).map(user => ({
    id: user.id,
    name: user.name,
    channel: user.channel ? user.channel.name : 'Unknown',
    mute: user.mute,
    deaf: user.deaf,
    selfMute: user.selfMute,
    selfDeaf: user.selfDeaf
  }));
  
  // Send updates to renderer
  if (mainWindow) {
    mainWindow.webContents.send('mumble-user-update', mumbleConnection.users);
  }
}

/**
 * Add channel and its subchannels recursively
 * @param {Object} channel - Mumble channel object
 * @param {Array} channelsList - List to add channels to
 * @param {number} level - Nesting level (for UI indentation)
 */
function addChannelRecursive(channel, channelsList, level = 0) {
  channelsList.push({
    id: channel.id,
    name: channel.name,
    description: channel.description,
    level: level,
    userCount: Object.keys(channel.users).length
  });
  
  // Add subchannels
  Object.values(channel.children).forEach(subChannel => {
    addChannelRecursive(subChannel, channelsList, level + 1);
  });
}

/**
 * Find a channel by name
 * @param {string} name - Channel name
 * @returns {Object} - Channel object or null
 */
function findChannelByName(name) {
  if (!mumbleClient) return null;
  
  try {
    return mumbleClient.channelByName(name);
  } catch (error) {
    console.error(`Error finding channel '${name}':`, error);
    return null;
  }
}

/**
 * Send Mumble connection status update to renderer
 */
function sendMumbleStatusUpdate() {
  if (mainWindow) {
    mainWindow.webContents.send('mumble-connection-status', {
      status: mumbleConnection.status,
      error: mumbleConnection.error,
      currentChannel: mumbleConnection.currentChannel
    });
  }
}