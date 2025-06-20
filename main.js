const { app, BrowserWindow, Menu, Tray, ipcMain, dialog } = require('electron');
const path = require('path');
const url = require('url');
const SerialPort = require('serialport').SerialPort;
const { ReadlineParser } = require('@serialport/parser-readline');
const { spawn } = require('child_process');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

// Keep references to prevent garbage collection
let mainWindow;
let tray;
let expressServer;
let serialPort;
let serialParser;

// Serial port configuration
const serialOptions = {
  baudRate: 9600,
  dataBits: 8,
  stopBits: 1,
  parity: 'none',
  autoOpen: false
};

// Start Express server
function startExpressServer() {
  // Import the Express app
  const expressApp = require('./server');
  
  // Create HTTP server
  const server = http.createServer(expressApp);
  
  // Set up Socket.io
  const io = socketIo(server);
  
  // Socket.io connection handling
  io.on('connection', (socket) => {
    console.log('New client connected to Socket.io');
    
    // Handle Morse code practice sessions
    socket.on('practice-start', (data) => {
      // Handle practice session start
    });
    
    socket.on('practice-result', async (data) => {
      // Save practice results to database
      if (socket.request.user) {
        try {
          const Progress = require('./models/Progress');
          await Progress.updateProgress(socket.request.user._id, data);
        } catch (err) {
          console.error('Error saving progress:', err);
        }
      }
    });
    
    // Handle Mumble/Murmur integration
    socket.on('mumble-connect', (data) => {
      // Connect to Mumble/Murmur server
    });
    
    socket.on('disconnect', () => {
      console.log('Client disconnected from Socket.io');
    });
  });
  
  // Start server on a different port to avoid conflicts with Electron
  const PORT = process.env.PORT || 3030;
  server.listen(PORT, () => {
    console.log(`Express server running on port ${PORT}`);
  });
  
  return server;
}

// Create the main browser window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'public', 'favicon.ico')
  });

  // Load the app
  mainWindow.loadURL(url.format({
    pathname: 'localhost:3030',
    protocol: 'http:',
    slashes: true
  }));

  // Open DevTools in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Create application menu
  createMenu();
  
  // Create system tray
  createTray();
}

// Create the application menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Settings',
          click: () => {
            // Open settings dialog
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Serial',
      submenu: [
        {
          label: 'Connect to Arduino',
          click: async () => {
            await selectAndConnectSerialPort();
          }
        },
        {
          label: 'Disconnect',
          click: () => {
            disconnectSerialPort();
          }
        },
        { type: 'separator' },
        {
          label: 'Auto-reconnect',
          type: 'checkbox',
          checked: false,
          click: (menuItem) => {
            // Toggle auto-reconnect
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Supermorse',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              title: 'About Supermorse',
              message: 'Supermorse v1.0.0',
              detail: 'A Morse code tutor and HF communication app',
              buttons: ['OK']
            });
          }
        },
        {
          label: 'Documentation',
          click: () => {
            // Open documentation
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Create system tray
function createTray() {
  tray = new Tray(path.join(__dirname, 'public', 'favicon.ico'));
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        mainWindow.show();
      }
    },
    {
      label: 'Connect to Arduino',
      click: async () => {
        await selectAndConnectSerialPort();
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('Supermorse');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
}

// List available serial ports
async function listSerialPorts() {
  try {
    const { SerialPort } = require('serialport');
    const ports = await SerialPort.list();
    return ports;
  } catch (err) {
    console.error('Error listing serial ports:', err);
    return [];
  }
}

// Select and connect to a serial port
async function selectAndConnectSerialPort() {
  try {
    const ports = await listSerialPorts();
    
    if (ports.length === 0) {
      dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'No Serial Ports',
        message: 'No serial ports found',
        detail: 'Please connect your Arduino and try again.',
        buttons: ['OK']
      });
      return;
    }
    
    // Create port selection menu
    const portOptions = ports.map(port => ({
      label: `${port.path} - ${port.manufacturer || 'Unknown'}`,
      click: () => {
        connectSerialPort(port.path);
      }
    }));
    
    const portMenu = Menu.buildFromTemplate(portOptions);
    portMenu.popup({ window: mainWindow });
  } catch (err) {
    console.error('Error selecting serial port:', err);
  }
}

// Connect to a serial port
function connectSerialPort(portPath) {
  try {
    // Disconnect existing connection if any
    disconnectSerialPort();
    
    // Create new serial port connection
    serialPort = new SerialPort({
      path: portPath,
      ...serialOptions
    });
    
    // Create parser for reading lines
    serialParser = serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));
    
    // Handle data received from Arduino
    serialParser.on('data', (data) => {
      // Send data to renderer process
      if (mainWindow) {
        mainWindow.webContents.send('serial-data', data);
      }
    });
    
    // Open the port
    serialPort.open((err) => {
      if (err) {
        console.error('Error opening serial port:', err);
        dialog.showMessageBox(mainWindow, {
          type: 'error',
          title: 'Connection Error',
          message: 'Failed to connect to Arduino',
          detail: err.message,
          buttons: ['OK']
        });
        return;
      }
      
      console.log('Connected to serial port:', portPath);
      
      // Notify renderer process
      if (mainWindow) {
        mainWindow.webContents.send('serial-connection', { connected: true, port: portPath });
      }
    });
    
    // Handle errors
    serialPort.on('error', (err) => {
      console.error('Serial port error:', err);
      
      // Notify renderer process
      if (mainWindow) {
        mainWindow.webContents.send('serial-connection', { connected: false, error: err.message });
      }
    });
    
    // Handle close
    serialPort.on('close', () => {
      console.log('Serial port closed');
      
      // Notify renderer process
      if (mainWindow) {
        mainWindow.webContents.send('serial-connection', { connected: false });
      }
    });
  } catch (err) {
    console.error('Error connecting to serial port:', err);
  }
}

// Disconnect from serial port
function disconnectSerialPort() {
  if (serialPort && serialPort.isOpen) {
    serialPort.close();
    serialPort = null;
    serialParser = null;
    
    // Notify renderer process
    if (mainWindow) {
      mainWindow.webContents.send('serial-connection', { connected: false });
    }
    
    console.log('Disconnected from serial port');
  }
}

// Send command to Arduino
function sendSerialCommand(command) {
  if (serialPort && serialPort.isOpen) {
    serialPort.write(`${command}\n`, (err) => {
      if (err) {
        console.error('Error sending command to Arduino:', err);
      }
    });
  } else {
    console.warn('Cannot send command: not connected to Arduino');
  }
}

// IPC handlers
function setupIpcHandlers() {
  // Serial port operations
  ipcMain.handle('list-serial-ports', async () => {
    return await listSerialPorts();
  });
  
  ipcMain.handle('connect-serial-port', async (event, portPath) => {
    connectSerialPort(portPath);
    return true;
  });
  
  ipcMain.handle('disconnect-serial-port', () => {
    disconnectSerialPort();
    return true;
  });
  
  ipcMain.handle('send-serial-command', (event, command) => {
    sendSerialCommand(command);
    return true;
  });
  
  ipcMain.handle('set-key-type', (event, keyType) => {
    let command = '';
    
    switch (keyType) {
      case 'straight':
        command = 'S'; // Straight key mode
        break;
      case 'paddle-single':
        command = 'P'; // Single paddle mode
        break;
      case 'paddle-iambic-a':
        command = 'A'; // Iambic paddle mode A (Curtis A)
        break;
      case 'paddle-iambic-b':
        command = 'B'; // Iambic paddle mode B
        break;
      default:
        console.warn('Unknown key type:', keyType);
        return false;
    }
    
    sendSerialCommand(command);
    return true;
  });
}

// App event handlers
app.on('ready', () => {
  // Start Express server
  expressServer = startExpressServer();
  
  // Create the main window
  createWindow();
  
  // Set up IPC handlers
  setupIpcHandlers();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Clean up before quitting
app.on('before-quit', () => {
  // Disconnect serial port
  disconnectSerialPort();
  
  // Close Express server
  if (expressServer) {
    expressServer.close();
  }
});