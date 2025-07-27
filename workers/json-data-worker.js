/**
 * json-data-worker.js
 * Worker thread for JSON data operations and password hashing
 * Handles CPU-intensive tasks like bcrypt hashing and file I/O
 */

const { parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Store data directories
let DATA_DIR;
let USERS_DIR;
let PROGRESS_DIR;
let STATS_DIR;

// Handle messages from the main thread
parentPort.on('message', async (message) => {
  const { type, data, id } = message;
  
  try {
    let result;
    
    switch (type) {
      case 'set_directories':
        setDataDirectories(data.paths);
        result = { success: true };
        break;
        
      case 'create_user':
        result = await createUser(data.userData);
        break;
        
      case 'get_user_by_id':
        result = { user: await getUserById(data.userId) };
        break;
        
      case 'get_user_by_username':
        result = { user: await getUserByUsername(data.username) };
        break;
        
      case 'get_user_by_email':
        result = { user: await getUserByEmail(data.email) };
        break;
        
      case 'verify_credentials':
        result = await verifyCredentials(data.username, data.password);
        break;
        
      case 'get_user_progress':
        result = { progress: await getUserProgress(data.userId) };
        break;
        
      case 'update_user_progress':
        result = await updateUserProgress(data.userId, data.progressData);
        break;
        
      case 'get_character_stats':
        result = { stats: await getCharacterStats(data.userId, data.character) };
        break;
        
      case 'update_character_stats':
        result = await updateCharacterStats(data.userId, data.character, data.statsData);
        break;
        
      case 'get_all_character_stats':
        result = { stats: await getAllCharacterStats(data.userId) };
        break;
        
      default:
        result = { success: false, message: `Unknown operation type: ${type}` };
    }
    
    // Send result back to main thread with message ID
    parentPort.postMessage({ 
      type: `${type}_result`, 
      success: true, 
      data: result,
      id // Include original message ID
    });
  } catch (error) {
    // Send error back to main thread with message ID
    parentPort.postMessage({ 
      type: `${type}_error`, 
      success: false, 
      error: error.message || 'Unknown error',
      id // Include original message ID
    });
  }
});

/**
 * Set the data directories to use for storage
 * @param {Object} paths - Object containing paths for data storage
 */
function setDataDirectories(paths) {
  DATA_DIR = paths.dataDir;
  USERS_DIR = paths.usersDir;
  PROGRESS_DIR = paths.progressDir;
  STATS_DIR = paths.statsDir;
  
  // Ensure directories exist
  ensureDirectoriesExist();
}

// Ensure directories exist
function ensureDirectoriesExist() {
  if (!DATA_DIR) {
    console.warn('Data directories not set. Using default paths.');
    // Fallback to default paths if not set (for backward compatibility)
    DATA_DIR = path.join(process.cwd(), 'data');
    USERS_DIR = path.join(DATA_DIR, 'users');
    PROGRESS_DIR = path.join(DATA_DIR, 'progress');
    STATS_DIR = path.join(DATA_DIR, 'stats');
  }
  
  [DATA_DIR, USERS_DIR, PROGRESS_DIR, STATS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

/**
 * Create a new user
 * @param {Object} userData - User data including username, name, email, password
 * @returns {Promise<Object>} - Result with success flag and user ID or error message
 */
async function createUser(userData) {
  try {
    const { username, email, password, maidenheadLocator } = userData;
    const name = userData.name || username; // Use username as name if not provided
    
    // Validate data
    if (!username || !email || !password || !maidenheadLocator) {
      return { success: false, message: 'Missing required fields (username, email, password, maidenheadLocator)' };
    }
    
    // Check if username or email already exists
    if (await getUserByUsername(username)) {
      return { success: false, message: 'Username already exists' };
    }
    
    if (await getUserByEmail(email)) {
      return { success: false, message: 'Email already exists' };
    }
    
    // Generate user ID
    const userId = crypto.randomUUID();
    
    // Hash password - CPU intensive operation that benefits from worker thread
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user object
    const user = {
      id: userId,
      username,
      name,
      email,
      password: hashedPassword,
      maidenheadLocator,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Save user to file
    const userFilePath = path.join(USERS_DIR, `${userId}.json`);
    fs.writeFileSync(userFilePath, JSON.stringify(user, null, 2));
    
    // Create initial progress record
    await createInitialProgress(userId);
    
    return { success: true, userId };
  } catch (error) {
    console.error('Error creating user:', error);
    return { success: false, message: 'Failed to create user' };
  }
}

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} - User object or null if not found
 */
async function getUserById(userId) {
  try {
    const userFilePath = path.join(USERS_DIR, `${userId}.json`);
    
    if (!fs.existsSync(userFilePath)) {
      return null;
    }
    
    const userData = fs.readFileSync(userFilePath, 'utf8');
    return JSON.parse(userData);
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
}

/**
 * Get user by username
 * @param {string} username - Username
 * @returns {Promise<Object|null>} - User object or null if not found
 */
async function getUserByUsername(username) {
  try {
    // List all user files
    const userFiles = fs.readdirSync(USERS_DIR);
    
    // Find user with matching username
    for (const file of userFiles) {
      const userFilePath = path.join(USERS_DIR, file);
      const userData = fs.readFileSync(userFilePath, 'utf8');
      const user = JSON.parse(userData);
      
      if (user.username === username) {
        return user;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user by username:', error);
    return null;
  }
}

/**
 * Get user by email
 * @param {string} email - Email
 * @returns {Promise<Object|null>} - User object or null if not found
 */
async function getUserByEmail(email) {
  try {
    // List all user files
    const userFiles = fs.readdirSync(USERS_DIR);
    
    // Find user with matching email
    for (const file of userFiles) {
      const userFilePath = path.join(USERS_DIR, file);
      const userData = fs.readFileSync(userFilePath, 'utf8');
      const user = JSON.parse(userData);
      
      if (user.email === email) {
        return user;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
}

/**
 * Verify user credentials
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Promise<Object>} - Result with success flag and user ID or error message
 */
async function verifyCredentials(username, password) {
  try {
    // Get user by username
    const user = await getUserByUsername(username);
    
    if (!user) {
      return { success: false, message: 'Invalid username or password' };
    }
    
    // Verify password - CPU intensive operation that benefits from worker thread
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      return { success: false, message: 'Invalid username or password' };
    }
    
    return { success: true, userId: user.id };
  } catch (error) {
    console.error('Error verifying credentials:', error);
    return { success: false, message: 'Failed to verify credentials' };
  }
}

/**
 * Create initial progress record for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Result with success flag
 */
async function createInitialProgress(userId) {
  try {
    // Create progress object
    const progress = {
      userId,
      currentCharacter: 'K',
      learnedCharacters: [],
      mastery: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Save progress to file
    const progressFilePath = path.join(PROGRESS_DIR, `${userId}.json`);
    fs.writeFileSync(progressFilePath, JSON.stringify(progress, null, 2));
    
    return { success: true };
  } catch (error) {
    console.error('Error creating initial progress:', error);
    return { success: false, message: 'Failed to create initial progress' };
  }
}

/**
 * Get user progress
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} - Progress object or null if not found
 */
async function getUserProgress(userId) {
  try {
    const progressFilePath = path.join(PROGRESS_DIR, `${userId}.json`);
    
    if (!fs.existsSync(progressFilePath)) {
      return null;
    }
    
    const progressData = fs.readFileSync(progressFilePath, 'utf8');
    return JSON.parse(progressData);
  } catch (error) {
    console.error('Error getting user progress:', error);
    return null;
  }
}

/**
 * Update user progress
 * @param {string} userId - User ID
 * @param {Object} progressData - Progress data to update
 * @returns {Promise<Object>} - Result with success flag
 */
async function updateUserProgress(userId, progressData) {
  try {
    const progressFilePath = path.join(PROGRESS_DIR, `${userId}.json`);
    
    if (!fs.existsSync(progressFilePath)) {
      return { success: false, message: 'Progress not found' };
    }
    
    // Get current progress
    const currentProgressData = fs.readFileSync(progressFilePath, 'utf8');
    const currentProgress = JSON.parse(currentProgressData);
    
    // Update progress
    const updatedProgress = {
      ...currentProgress,
      ...progressData,
      updatedAt: new Date().toISOString()
    };
    
    // Save updated progress
    fs.writeFileSync(progressFilePath, JSON.stringify(updatedProgress, null, 2));
    
    return { success: true };
  } catch (error) {
    console.error('Error updating user progress:', error);
    return { success: false, message: 'Failed to update progress' };
  }
}

/**
 * Get user character statistics
 * @param {string} userId - User ID
 * @param {string} character - Character
 * @returns {Promise<Object|null>} - Statistics object or null if not found
 */
async function getCharacterStats(userId, character) {
  try {
    const statsFilePath = path.join(STATS_DIR, `${userId}_${character}.json`);
    
    if (!fs.existsSync(statsFilePath)) {
      // Create default stats if not found
      const defaultStats = {
        userId,
        character,
        timeSpent: 0,
        correctCount: 0,
        incorrectCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      fs.writeFileSync(statsFilePath, JSON.stringify(defaultStats, null, 2));
      return defaultStats;
    }
    
    const statsData = fs.readFileSync(statsFilePath, 'utf8');
    return JSON.parse(statsData);
  } catch (error) {
    console.error('Error getting character stats:', error);
    return null;
  }
}

/**
 * Update character statistics
 * @param {string} userId - User ID
 * @param {string} character - Character
 * @param {Object} statsData - Statistics data to update
 * @returns {Promise<Object>} - Result with success flag
 */
async function updateCharacterStats(userId, character, statsData) {
  try {
    // Get current stats or create default
    const currentStats = await getCharacterStats(userId, character);
    
    if (!currentStats) {
      return { success: false, message: 'Failed to get or create character stats' };
    }
    
    // Update stats
    const updatedStats = {
      ...currentStats,
      ...statsData,
      updatedAt: new Date().toISOString()
    };
    
    // Save updated stats
    const statsFilePath = path.join(STATS_DIR, `${userId}_${character}.json`);
    fs.writeFileSync(statsFilePath, JSON.stringify(updatedStats, null, 2));
    
    return { success: true };
  } catch (error) {
    console.error('Error updating character stats:', error);
    return { success: false, message: 'Failed to update character stats' };
  }
}

/**
 * Get all character statistics for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object[]>} - Array of statistics objects
 */
async function getAllCharacterStats(userId) {
  try {
    // List all stats files
    const statsFiles = fs.readdirSync(STATS_DIR);
    
    // Filter stats for this user
    const userStatsFiles = statsFiles.filter(file => file.startsWith(`${userId}_`));
    
    // Load all stats
    const allStats = userStatsFiles.map(file => {
      const statsFilePath = path.join(STATS_DIR, file);
      const statsData = fs.readFileSync(statsFilePath, 'utf8');
      return JSON.parse(statsData);
    });
    
    return allStats;
  } catch (error) {
    console.error('Error getting all character stats:', error);
    return [];
  }
}

// Notify main thread that the worker is ready
// Use ID 0 for the ready message to ensure compatibility
parentPort.postMessage({ type: 'ready', success: true, id: 0 });