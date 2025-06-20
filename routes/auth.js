const express = require('express');
const passport = require('passport');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const router = express.Router();

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    
    // Check if username or email already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists'
      });
    }
    
    // Create new user
    const newUser = new User({
      username,
      password, // Will be hashed in the pre-save hook
      email
    });
    
    await newUser.save();
    
    // Log in the user after registration
    req.login(newUser, (err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Error logging in after registration',
          error: err.message
        });
      }
      
      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user: {
          id: newUser._id,
          username: newUser.username,
          email: newUser.email,
          featuresUnlocked: newUser.featuresUnlocked
        }
      });
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: err.message
    });
  }
});

// Login
router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Error during authentication',
        error: err.message
      });
    }
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: info.message || 'Authentication failed'
      });
    }
    
    req.login(user, async (err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Error logging in',
          error: err.message
        });
      }
      
      // Update last login time
      user.lastLogin = new Date();
      await user.save();
      
      return res.status(200).json({
        success: true,
        message: 'Login successful',
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          featuresUnlocked: user.featuresUnlocked,
          maidenheadGrid: user.maidenheadGrid,
          preferredHfBand: user.preferredHfBand
        }
      });
    });
  })(req, res, next);
});

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Error logging out',
        error: err.message
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  });
});

// Get current user
router.get('/user', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }
  
  return res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      featuresUnlocked: req.user.featuresUnlocked,
      maidenheadGrid: req.user.maidenheadGrid,
      preferredHfBand: req.user.preferredHfBand
    }
  });
});

// Update user profile
router.put('/user', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }
  
  try {
    const { email, maidenheadGrid, preferredHfBand, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    
    // Update email if provided
    if (email) {
      user.email = email;
    }
    
    // Update Maidenhead grid if provided
    if (maidenheadGrid !== undefined) {
      user.maidenheadGrid = maidenheadGrid;
    }
    
    // Update preferred HF band if provided
    if (preferredHfBand !== undefined) {
      user.preferredHfBand = preferredHfBand;
    }
    
    // Update password if provided
    if (currentPassword && newPassword) {
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }
      
      user.password = newPassword; // Will be hashed in the pre-save hook
    }
    
    await user.save();
    
    return res.status(200).json({
      success: true,
      message: 'User profile updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        featuresUnlocked: user.featuresUnlocked,
        maidenheadGrid: user.maidenheadGrid,
        preferredHfBand: user.preferredHfBand
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Error updating user profile',
      error: err.message
    });
  }
});

module.exports = router;