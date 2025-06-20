const express = require('express');
const User = require('../models/User');
const router = express.Router();
const path = require('path');
const { spawn } = require('child_process');

// Path to Mumble/Murmur executable (to be configured)
const MUMBLE_SERVER_PATH = path.join(__dirname, '../murmur-src/murmur');
let mumbleServer = null;

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({
    success: false,
    message: 'Not authenticated'
  });
};

// Middleware to check if voice chat is unlocked
const isVoiceChatUnlocked = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (user && user.featuresUnlocked.voiceChat) {
      return next();
    }
    return res.status(403).json({
      success: false,
      message: 'Voice chat feature is locked. Complete International Morse, Prosigns, and Special Characters to unlock.'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Error checking feature access',
      error: err.message
    });
  }
};

// Get Mumble server status
router.get('/status', isAuthenticated, async (req, res) => {
  try {
    const isRunning = mumbleServer !== null && !mumbleServer.killed;
    
    return res.status(200).json({
      success: true,
      status: {
        running: isRunning,
        // Add more status information as needed
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Error getting Mumble server status',
      error: err.message
    });
  }
});

// Start Mumble server
router.post('/start', isAuthenticated, async (req, res) => {
  try {
    // Check if server is already running
    if (mumbleServer !== null && !mumbleServer.killed) {
      return res.status(400).json({
        success: false,
        message: 'Mumble server is already running'
      });
    }
    
    // Start Mumble server
    mumbleServer = spawn(MUMBLE_SERVER_PATH, ['-ini', path.join(__dirname, '../config/mumble-server.ini')]);
    
    mumbleServer.stdout.on('data', (data) => {
      console.log(`Mumble server output: ${data}`);
    });
    
    mumbleServer.stderr.on('data', (data) => {
      console.error(`Mumble server error: ${data}`);
    });
    
    mumbleServer.on('close', (code) => {
      console.log(`Mumble server exited with code ${code}`);
      mumbleServer = null;
    });
    
    return res.status(200).json({
      success: true,
      message: 'Mumble server started successfully'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Error starting Mumble server',
      error: err.message
    });
  }
});

// Stop Mumble server
router.post('/stop', isAuthenticated, async (req, res) => {
  try {
    // Check if server is running
    if (mumbleServer === null || mumbleServer.killed) {
      return res.status(400).json({
        success: false,
        message: 'Mumble server is not running'
      });
    }
    
    // Stop Mumble server
    mumbleServer.kill();
    mumbleServer = null;
    
    return res.status(200).json({
      success: true,
      message: 'Mumble server stopped successfully'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Error stopping Mumble server',
      error: err.message
    });
  }
});

// Update user Mumble metadata
router.put('/metadata', isAuthenticated, isVoiceChatUnlocked, async (req, res) => {
  try {
    const { maidenheadGrid, preferredHfBand } = req.body;
    const user = await User.findById(req.user._id);
    
    // Update Maidenhead grid if provided
    if (maidenheadGrid !== undefined) {
      user.maidenheadGrid = maidenheadGrid;
    }
    
    // Update preferred HF band if provided
    if (preferredHfBand !== undefined) {
      user.preferredHfBand = preferredHfBand;
    }
    
    await user.save();
    
    return res.status(200).json({
      success: true,
      message: 'Mumble metadata updated successfully',
      user: {
        id: user._id,
        username: user.username,
        maidenheadGrid: user.maidenheadGrid,
        preferredHfBand: user.preferredHfBand
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Error updating Mumble metadata',
      error: err.message
    });
  }
});

// Get recommended HF band based on propagation conditions
router.get('/hf-recommendation', isAuthenticated, isVoiceChatUnlocked, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Check if HF simulation is unlocked
    if (!user.featuresUnlocked.hfSimulation) {
      return res.status(403).json({
        success: false,
        message: 'HF simulation feature is locked'
      });
    }
    
    // Check if user has set Maidenhead grid
    if (!user.maidenheadGrid) {
      return res.status(400).json({
        success: false,
        message: 'Maidenhead grid is required for HF band recommendation'
      });
    }
    
    // Get target Maidenhead grid (from request or use a default)
    const { targetGrid } = req.query;
    if (!targetGrid) {
      return res.status(400).json({
        success: false,
        message: 'Target Maidenhead grid is required'
      });
    }
    
    // Calculate distance and get propagation data
    // This would typically call an external API or use a propagation model
    const recommendedBand = calculateRecommendedBand(user.maidenheadGrid, targetGrid);
    
    return res.status(200).json({
      success: true,
      recommendation: {
        sourceGrid: user.maidenheadGrid,
        targetGrid,
        recommendedBand,
        // Add more propagation details as needed
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Error getting HF band recommendation',
      error: err.message
    });
  }
});

// Get available Mumble channels (HF bands)
router.get('/channels', isAuthenticated, isVoiceChatUnlocked, async (req, res) => {
  try {
    // In a real implementation, this would query the Mumble server for available channels
    // For now, return the predefined HF band channels
    const channels = [
      { name: '160m', id: '160', description: '160 meter band (1.8-2.0 MHz)' },
      { name: '80m', id: '80', description: '80 meter band (3.5-4.0 MHz)' },
      { name: '60m', id: '60', description: '60 meter band (5.3-5.4 MHz)' },
      { name: '40m', id: '40', description: '40 meter band (7.0-7.3 MHz)' },
      { name: '30m', id: '30', description: '30 meter band (10.1-10.15 MHz)' },
      { name: '20m', id: '20', description: '20 meter band (14.0-14.35 MHz)' },
      { name: '17m', id: '17', description: '17 meter band (18.068-18.168 MHz)' },
      { name: '15m', id: '15', description: '15 meter band (21.0-21.45 MHz)' },
      { name: '10m', id: '10', description: '10 meter band (28.0-29.7 MHz)' },
      { name: '6m', id: '6', description: '6 meter band (50-54 MHz)' }
    ];
    
    return res.status(200).json({
      success: true,
      channels
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Error getting Mumble channels',
      error: err.message
    });
  }
});

// Join a Mumble channel
router.post('/join-channel', isAuthenticated, isVoiceChatUnlocked, async (req, res) => {
  try {
    const { channelId } = req.body;
    
    // Validate channel ID
    if (!channelId || !['160', '80', '60', '40', '30', '20', '17', '15', '10', '6'].includes(channelId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid channel ID'
      });
    }
    
    // In a real implementation, this would send a command to the Mumble client
    // For now, just return success
    return res.status(200).json({
      success: true,
      message: `Joined channel ${channelId}`,
      channel: {
        id: channelId,
        name: `${channelId}m`
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Error joining Mumble channel',
      error: err.message
    });
  }
});

// Helper function to calculate recommended HF band based on propagation conditions
function calculateRecommendedBand(sourceGrid, targetGrid) {
  // This is a placeholder for actual propagation calculations
  // In a real implementation, this would use VOACAP or similar propagation models
  
  // Extract grid square first 4 characters (enough for rough distance calculation)
  const sourceGridSquare = sourceGrid.substring(0, 4).toUpperCase();
  const targetGridSquare = targetGrid.substring(0, 4).toUpperCase();
  
  // Calculate distance between grid squares (very rough approximation)
  const distance = calculateGridDistance(sourceGridSquare, targetGridSquare);
  
  // Recommend band based on distance
  // This is a very simplified model and doesn't account for time of day, solar conditions, etc.
  if (distance < 500) {
    return '80'; // Short distance: 80m
  } else if (distance < 1500) {
    return '40'; // Medium distance: 40m
  } else if (distance < 3000) {
    return '20'; // Medium-long distance: 20m
  } else {
    return '15'; // Long distance: 15m
  }
}

// Helper function to calculate distance between Maidenhead grid squares
function calculateGridDistance(grid1, grid2) {
  // Convert grid squares to lat/lon
  const latLon1 = gridToLatLon(grid1);
  const latLon2 = gridToLatLon(grid2);
  
  // Calculate distance using Haversine formula
  const R = 6371; // Earth radius in km
  const dLat = (latLon2.lat - latLon1.lat) * Math.PI / 180;
  const dLon = (latLon2.lon - latLon1.lon) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(latLon1.lat * Math.PI / 180) * Math.cos(latLon2.lat * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return distance;
}

// Helper function to convert Maidenhead grid square to latitude/longitude
function gridToLatLon(grid) {
  // Ensure grid is at least 4 characters
  if (grid.length < 4) {
    throw new Error('Grid square must be at least 4 characters');
  }
  
  // Extract components
  const lon = (grid.charCodeAt(0) - 65) * 20 - 180 + (grid.charCodeAt(2) - 48) * 2;
  const lat = (grid.charCodeAt(1) - 65) * 10 - 90 + (grid.charCodeAt(3) - 48);
  
  return { lat, lon };
}

module.exports = router;