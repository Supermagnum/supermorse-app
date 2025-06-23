/**
 * UserController.js
 * Handles user authentication and progress tracking using JSON file storage
 */

const jsonDataService = require('../services/JsonDataService');
const jwt = require('jsonwebtoken');

// Secret key for JWT tokens
const JWT_SECRET = process.env.JWT_SECRET || 'supermorse-secret-key';

/**
 * Register a new user
 * @param {Object} userData - User data including username, name, email, password
 * @returns {Promise<Object>} - Result with success flag and user ID or error message
 */
async function registerUser(userData) {
  try {
    // Create user using JSON data service
    const result = await jsonDataService.createUser(userData);
    return result;
  } catch (error) {
    console.error('Error registering user:', error);
    return { success: false, message: 'Failed to register user' };
  }
}

/**
 * Login a user
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Promise<Object>} - Result with success flag, token, and user data or error message
 */
async function loginUser(username, password) {
  try {
    // Verify credentials using JSON data service
    const result = await jsonDataService.verifyCredentials(username, password);
    
    if (!result.success) {
      return result;
    }
    
    // Get user data
    const user = await jsonDataService.getUserById(result.userId);
    
    if (!user) {
      return { success: false, message: 'User not found' };
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username 
      }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );
    
    // Get user progress
    const progress = await jsonDataService.getUserProgress(user.id);
    
    return {
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email
      },
      progress: progress || {}
    };
  } catch (error) {
    console.error('Error logging in user:', error);
    return { success: false, message: 'Failed to log in' };
  }
}

/**
 * Verify a JWT token
 * @param {string} token - JWT token
 * @returns {Promise<Object>} - Result with success flag and user data or error message
 */
async function verifyToken(token) {
  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user data
    const user = await jsonDataService.getUserById(decoded.id);
    
    if (!user) {
      return { success: false, message: 'User not found' };
    }
    
    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email
      }
    };
  } catch (error) {
    console.error('Error verifying token:', error);
    return { success: false, message: 'Invalid token' };
  }
}

/**
 * Get user progress
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Result with success flag and progress data or error message
 */
async function getUserProgress(userId) {
  try {
    // Get user progress using JSON data service
    const progress = await jsonDataService.getUserProgress(userId);
    
    if (!progress) {
      return { success: false, message: 'Progress not found' };
    }
    
    return {
      success: true,
      progress
    };
  } catch (error) {
    console.error('Error getting user progress:', error);
    return { success: false, message: 'Failed to get progress' };
  }
}

/**
 * Update user progress
 * @param {string} userId - User ID
 * @param {Object} progressData - Progress data to update
 * @returns {Promise<Object>} - Result with success flag and updated progress data or error message
 */
async function updateUserProgress(userId, progressData) {
  try {
    // Update user progress using JSON data service
    const result = await jsonDataService.updateUserProgress(userId, progressData);
    
    if (!result.success) {
      return result;
    }
    
    // Get updated progress
    const updatedProgress = await jsonDataService.getUserProgress(userId);
    
    return {
      success: true,
      progress: updatedProgress
    };
  } catch (error) {
    console.error('Error updating user progress:', error);
    return { success: false, message: 'Failed to update progress' };
  }
}

/**
 * Get character statistics
 * @param {string} userId - User ID
 * @param {string} character - Character
 * @returns {Promise<Object>} - Result with success flag and statistics data or error message
 */
async function getCharacterStats(userId, character) {
  try {
    // Get character statistics using JSON data service
    const stats = await jsonDataService.getCharacterStats(userId, character);
    
    if (!stats) {
      return { success: false, message: 'Statistics not found' };
    }
    
    return {
      success: true,
      stats
    };
  } catch (error) {
    console.error('Error getting character statistics:', error);
    return { success: false, message: 'Failed to get statistics' };
  }
}

/**
 * Update character statistics
 * @param {string} userId - User ID
 * @param {string} character - Character
 * @param {Object} statsData - Statistics data to update
 * @returns {Promise<Object>} - Result with success flag and updated statistics data or error message
 */
async function updateCharacterStats(userId, character, statsData) {
  try {
    // Update character statistics using JSON data service
    const result = await jsonDataService.updateCharacterStats(userId, character, statsData);
    
    if (!result.success) {
      return result;
    }
    
    // Get updated statistics
    const updatedStats = await jsonDataService.getCharacterStats(userId, character);
    
    return {
      success: true,
      stats: updatedStats
    };
  } catch (error) {
    console.error('Error updating character statistics:', error);
    return { success: false, message: 'Failed to update statistics' };
  }
}

/**
 * Get all character statistics for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Result with success flag and statistics data or error message
 */
async function getAllCharacterStats(userId) {
  try {
    // Get all character statistics using JSON data service
    const stats = await jsonDataService.getAllCharacterStats(userId);
    
    return {
      success: true,
      stats
    };
  } catch (error) {
    console.error('Error getting all character statistics:', error);
    return { success: false, message: 'Failed to get statistics' };
  }
}

module.exports = {
  registerUser,
  loginUser,
  verifyToken,
  getUserProgress,
  updateUserProgress,
  getCharacterStats,
  updateCharacterStats,
  getAllCharacterStats
};