/**
 * preload.js
 * Preload script for secure renderer process communication
 * Exposes specific APIs to the renderer via contextBridge
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose API to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Settings management
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  
  // Serial port communication
  getSerialPorts: () => ipcRenderer.invoke('get-serial-ports'),
  connectSerial: (port) => ipcRenderer.invoke('connect-serial', port),
  sendSerial: (data) => ipcRenderer.invoke('send-serial', data),
  
  // Serial port events
  onSerialData: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('serial-data', subscription);
    return () => {
      ipcRenderer.removeListener('serial-data', subscription);
    };
  },
  
  onSerialStatus: (callback) => {
    const subscription = (event, status) => callback(status);
    ipcRenderer.on('serial-status', subscription);
    return () => {
      ipcRenderer.removeListener('serial-status', subscription);
    };
  },
  
  // User management
  registerUser: (userData) => ipcRenderer.invoke('register-user', userData),
  loginUser: (credentials) => ipcRenderer.invoke('login-user', credentials),
  verifyToken: (token) => ipcRenderer.invoke('verify-token', token),
  
  // Progress tracking
  saveProgress: (progressData) => ipcRenderer.invoke('save-progress', progressData),
  getProgress: (userId) => ipcRenderer.invoke('get-progress', userId),
  
  // User-specific settings
  getUserSettings: (userId) => ipcRenderer.invoke('get-user-settings', userId),
  saveUserSettings: (userId, settings) => ipcRenderer.invoke('save-user-settings', userId, settings),
  
  // Mumble server communication
  connectMumble: (serverAddress, options) => ipcRenderer.invoke('connect-mumble', serverAddress, options),
  disconnectMumble: () => ipcRenderer.invoke('disconnect-mumble'),
  joinMumbleChannel: (channelName) => ipcRenderer.invoke('join-mumble-channel', channelName),
  sendMumbleMessage: (message) => ipcRenderer.invoke('send-mumble-message', message),
  getMumbleChannels: () => ipcRenderer.invoke('get-mumble-channels'),
  getMumbleUsers: () => ipcRenderer.invoke('get-mumble-users'),
  getMumbleUserInfo: () => ipcRenderer.invoke('get-mumble-user-info'),
  banMumbleUser: (userId) => ipcRenderer.invoke('ban-mumble-user', userId),
  
  // Mumble events
  onMumbleMessage: (callback) => {
    const subscription = (event, message) => callback(message);
    ipcRenderer.on('mumble-message', subscription);
    return () => {
      ipcRenderer.removeListener('mumble-message', subscription);
    };
  },
  
  onMumbleConnectionStatus: (callback) => {
    const subscription = (event, status) => callback(status);
    ipcRenderer.on('mumble-connection-status', subscription);
    return () => {
      ipcRenderer.removeListener('mumble-connection-status', subscription);
    };
  },
  
  onMumbleUserUpdate: (callback) => {
    const subscription = (event, users) => callback(users);
    ipcRenderer.on('mumble-user-update', subscription);
    return () => {
      ipcRenderer.removeListener('mumble-user-update', subscription);
    };
  }
});

// Expose MorseAPI to renderer
contextBridge.exposeInMainWorld('morseAPI', {
  // These functions will be implemented in the renderer
  // and are just placeholders for now
  playTone: (frequency, duration) => {
    console.log(`Preload: playTone called with ${frequency}Hz for ${duration}ms`);
    // The actual implementation will be in the renderer
  },
  stopTone: () => {
    console.log('Preload: stopTone called');
    // The actual implementation will be in the renderer
  }
});