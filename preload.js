const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electronAPI', {
    // Serial port operations
    listSerialPorts: () => ipcRenderer.invoke('list-serial-ports'),
    connectSerialPort: (portPath) => ipcRenderer.invoke('connect-serial-port', portPath),
    disconnectSerialPort: () => ipcRenderer.invoke('disconnect-serial-port'),
    sendSerialCommand: (command) => ipcRenderer.invoke('send-serial-command', command),
    setKeyType: (keyType) => ipcRenderer.invoke('set-key-type', keyType),
    
    // Event listeners
    onSerialData: (callback) => {
      ipcRenderer.on('serial-data', (event, data) => callback(data));
    },
    onSerialConnection: (callback) => {
      ipcRenderer.on('serial-connection', (event, status) => callback(status));
    },
    
    // Remove event listeners
    removeSerialDataListener: () => {
      ipcRenderer.removeAllListeners('serial-data');
    },
    removeSerialConnectionListener: () => {
      ipcRenderer.removeAllListeners('serial-connection');
    }
  }
);