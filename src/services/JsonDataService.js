/**
 * JsonDataService.js
 * A service for managing user data using JSON files instead of a database
 * Uses a worker thread for multi-core processing of CPU-intensive tasks like password hashing
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { Worker } = require('worker_threads');

// Default path constants - these will be overridden by the paths provided from main.js
let DATA_DIR;
let USERS_DIR;
let PROGRESS_DIR;
let STATS_DIR;

// Worker thread management
let worker = null;
let isWorkerReady = false;
let messageId = 0;
const pendingMessages = new Map();

// Try to initialize the worker
function initializeWorker() {
  try {
    // Create a worker thread
    const workerPath = path.join(__dirname, '../../workers/json-data-worker.js');
    console.log('Initializing JSON data worker at:', workerPath);
    
    worker = new Worker(workerPath);
    
    // Set up message handler
    worker.on('message', handleWorkerMessage);
    
    // Handle worker errors
    worker.on('error', (error) => {
      console.error('JSON data worker error:', error);
      isWorkerReady = false;
      worker = null;
    });
    
    // Handle worker exit
    worker.on('exit', (code) => {
      console.log(`JSON data worker exited with code ${code}`);
      isWorkerReady = false;
      worker = null;
      
      // Reject all pending messages
      for (const [id, { reject }] of pendingMessages) {
        reject(new Error('Worker thread terminated'));
      }
      pendingMessages.clear();
    });
    
    // Handle process exit to clean up worker
    process.on('exit', () => {
      if (worker) {
        worker.terminate();
      }
    });
    
    return true;
  } catch (error) {
    console.error('Failed to initialize JSON data worker:', error);
    worker = null;
    isWorkerReady = false;
    return false;
  }
}

// Handle messages from the worker thread
function handleWorkerMessage(message) {
  const { type, success, data, error, id } = message;
  
  // Check if it's a ready message
  if (type === 'ready') {
    console.log('JSON data worker is ready');
    isWorkerReady = true;
    
    // If directories are set, send them to the worker
    if (DATA_DIR) {
      sendToWorker('set_directories', { paths: { dataDir: DATA_DIR, usersDir: USERS_DIR, progressDir: PROGRESS_DIR, statsDir: STATS_DIR } });
    }
    return;
  }
  
  // Log message for debugging
  console.log(`Received worker message: ${type} (ID: ${id})`);
  
  // Find the pending promise using the ID directly from the message
  const pendingPromise = pendingMessages.get(id);
  if (!pendingPromise) {
    console.warn(`Received response for unknown message ID: ${id}`);
    console.warn('Current pending messages:', Array.from(pendingMessages.keys()));
    return;
  }
  
  // Resolve or reject the promise
  if (success) {
    pendingPromise.resolve(data);
  } else {
    pendingPromise.reject(new Error(error || 'Unknown error'));
  }
  
  // Remove the pending promise
  pendingMessages.delete(id);
}

// Send a message to the worker and return a promise
function sendToWorker(type, data) {
  return new Promise((resolve, reject) => {
    // Check if worker is available
    if (!worker || !isWorkerReady) {
      reject(new Error('Worker is not available'));
      return;
    }
    
    // Generate a unique message ID
    const id = messageId++;
    
    // Store the promise callbacks
    pendingMessages.set(id, { resolve, reject });
    
    // Send the message to the worker
    worker.postMessage({ type, data, id });
  });
}

// Ensure directories exist (fallback implementation if worker isn't available)
/**
 * Get the appropriate data directory based on the operating system
 * @returns {string} The platform-specific data directory path
 */
function getPlatformDataDir() {
  const platform = process.platform;
  const homeDir = require('os').homedir();
  let appDataDir;

  if (platform === 'win32') {
    // Windows: %APPDATA%\supermorse-app\data\
    appDataDir = path.join(process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming'), 'supermorse-app', 'data');
  } else if (platform === 'darwin') {
    // macOS: ~/Library/Application Support/supermorse-app/data/
    appDataDir = path.join(homeDir, 'Library', 'Application Support', 'supermorse-app', 'data');
  } else {
    // Linux and others: ~/.config/supermorse-app/data/
    appDataDir = path.join(homeDir, '.config', 'supermorse-app', 'data');
  }

  return appDataDir;
}

function ensureDirectoriesExist() {
  if (!DATA_DIR) {
    console.warn('Data directories not set. Using platform-specific default paths.');
    // Fallback to platform-specific paths if not set
    DATA_DIR = getPlatformDataDir();
    USERS_DIR = path.join(DATA_DIR, 'users');
    PROGRESS_DIR = path.join(DATA_DIR, 'progress');
    STATS_DIR = path.join(DATA_DIR, 'stats');
  }
  
  [DATA_DIR, USERS_DIR, PROGRESS_DIR, STATS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  
  // Send directories to worker if available
  if (worker && isWorkerReady) {
    sendToWorker('set_directories', { paths: { dataDir: DATA_DIR, usersDir: USERS_DIR, progressDir: PROGRESS_DIR, statsDir: STATS_DIR } })
      .catch(error => {
        console.error('Error sending directories to worker:', error);
      });
  }
}

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

/**
 * User Management Functions
 */

/**
 * Create a new user
 * @param {Object} userData - User data including username, name, email, password
 * @returns {Promise<Object>} - Result with success flag and user ID or error message
 */
async function createUser(userData) {
  try {
    // Try to use the worker if available
    if (worker && isWorkerReady) {
      const result = await sendToWorker('create_user', { userData });
      return result;
    }
    
    // Fallback to direct implementation if worker is not available
    const { username, email, password, maidenheadLocator } = userData;
    const name = userData.name || username;
    
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
    
    // Hash password
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
    // Try to use the worker if available
    if (worker && isWorkerReady) {
      const result = await sendToWorker('get_user_by_id', { userId });
      return result.user;
    }
    
    // Fallback to direct implementation if worker is not available
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
    // Try to use the worker if available
    if (worker && isWorkerReady) {
      const result = await sendToWorker('get_user_by_username', { username });
      return result.user;
    }
    
    // Fallback to direct implementation if worker is not available
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
    // Try to use the worker if available
    if (worker && isWorkerReady) {
      const result = await sendToWorker('get_user_by_email', { email });
      return result.user;
    }
    
    // Fallback to direct implementation if worker is not available
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
    // Try to use the worker if available
    if (worker && isWorkerReady) {
      return await sendToWorker('verify_credentials', { username, password });
    }
    
    // Fallback to direct implementation if worker is not available
    // Get user by username
    const user = await getUserByUsername(username);
    
    if (!user) {
      return { success: false, message: 'Invalid username or password' };
    }
    
    // Verify password
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
 * Progress Management Functions
 */

/**
 * Create initial progress record for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Result with success flag
 */
async function createInitialProgress(userId) {
  try {
    // Try to use the worker if available
    if (worker && isWorkerReady) {
      return await sendToWorker('create_initial_progress', { userId });
    }
    
    // Fallback to direct implementation if worker is not available
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
    // Try to use the worker if available
    if (worker && isWorkerReady) {
      const result = await sendToWorker('get_user_progress', { userId });
      return result.progress;
    }
    
    // Fallback to direct implementation if worker is not available
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
    // Try to use the worker if available
    if (worker && isWorkerReady) {
      return await sendToWorker('update_user_progress', { userId, progressData });
    }
    
    // Fallback to direct implementation if worker is not available
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
 * Character Statistics Functions
 */

/**
 * Get user character statistics
 * @param {string} userId - User ID
 * @param {string} character - Character
 * @returns {Promise<Object|null>} - Statistics object or null if not found
 */
async function getCharacterStats(userId, character) {
  try {
    // Try to use the worker if available
    if (worker && isWorkerReady) {
      const result = await sendToWorker('get_character_stats', { userId, character });
      return result.stats;
    }
    
    // Fallback to direct implementation if worker is not available
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
    // Try to use the worker if available
    if (worker && isWorkerReady) {
      return await sendToWorker('update_character_stats', { userId, character, statsData });
    }
    
    // Fallback to direct implementation if worker is not available
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
    // Try to use the worker if available
    if (worker && isWorkerReady) {
      const result = await sendToWorker('get_all_character_stats', { userId });
      return result.stats;
    }
    
    // Fallback to direct implementation if worker is not available
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

// Initialize worker at module load time
initializeWorker();

module.exports = {
  // Configuration
  setDataDirectories,
  
  // User management
  createUser,
  getUserById,
  getUserByUsername,
  getUserByEmail,
  verifyCredentials,
  
  // Progress management
  getUserProgress,
  updateUserProgress,
  
  // Character statistics
  getCharacterStats,
  updateCharacterStats,
  getAllCharacterStats
};