/**
 * main.js
 * Electron main process entry point
 */

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { SerialPort } = require('serialport');
const Store = require('electron-store');
const fs = require('fs');

// Initialize electron-store for persistent settings and user data
const store = new Store();

// Import user controller (now using JSON storage)
const UserController = require('./src/controllers/UserController');

// Make sure data directories exist for JSON storage
const DATA_DIR = path.join(__dirname, 'data');
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

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;
let serialConnection = null;

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
ipcMain.handle('verify-token', (event, token) => {
  try {
    // Verify JWT token
    const decoded = UserController.verifyToken(token);
    return decoded ? { valid: true, user: decoded } : { valid: false };
  } catch (error) {
    console.error('Error verifying token:', error);
    return { valid: false };
  }
});