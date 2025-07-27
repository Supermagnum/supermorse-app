/**
 * create-test-user.js
 * Script to create a test user with specified characters learned
 * 
 * To run:
 * node tests/create-test-user.js
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const jsonDataService = require('../src/services/JsonDataService');

console.log('Creating test user with specified learned characters...');

/**
 * Get the appropriate data directory based on the operating system
 * @returns {string} The platform-specific data directory path
 */
function getPlatformDataDir() {
  const platform = os.platform();
  const homeDir = os.homedir();
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

// Define the learning order as specified in alphabets.js
// This follows the app's teaching order, excluding regional characters
const LEARNING_ORDER = {
  // International characters (A-Z, 0-9)
  international: [
    'K', 'M', 'R', 'S', 'U', 'A', 'T', 'O', 'E', 'I', 
    'N', 'D', 'W', 'G', 'H', 'J', 'P', 'B', 'F', 'L', 
    'V', 'X', 'C', 'Y', 'Z', 'Q', '5', '0', '9', '1', 
    '2', '3', '4', '6', '7', '8'
  ],
  // Prosigns
  prosigns: ['AR', 'SK', 'BT', 'KN'],
  // Special characters (excluded from this script as per requirement)
  special: []
};

// CONFIGURATION: Set the characters you want to mark as learned
// To customize, simply add or remove characters from this array
// Characters must be from the LEARNING_ORDER above (international or prosigns)
const CHARACTERS_LEARNED = [
  // Uncomment and edit the lines below to customize which characters are marked as learned
  'K', 'M', 'R', 'S', 'U',
  // 'A', 'T', 'O', 'E', 'I',
  // 'N', 'D', 'W', 'G', 'H',
  // 'J', 'P', 'B', 'F', 'L',
  // 'V', 'X', 'C', 'Y', 'Z', 'Q',
  // '5', '0', '9', '1', '2', '3', '4', '6', '7', '8',
  // 'AR', 'SK', 'BT', 'KN'
];

// Test user data
const TEST_USER = {
  username: 'testuser',
  email: 'testuser@google.com',
  password: 'testuser',
  maidenheadLocator: 'IO91PM'
};

// Verify all characters in CHARACTERS_LEARNED are valid
function validateLearnedCharacters() {
  const allValidCharacters = [
    ...LEARNING_ORDER.international,
    ...LEARNING_ORDER.prosigns
  ];
  
  const invalidCharacters = CHARACTERS_LEARNED.filter(
    char => !allValidCharacters.includes(char)
  );
  
  if (invalidCharacters.length > 0) {
    console.warn(`WARNING: The following characters are not in the valid learning order: ${invalidCharacters.join(', ')}`);
    console.warn('These characters will still be included but may cause unexpected behavior.');
  }
}

// Get platform-specific data directory
const dataDir = getPlatformDataDir();
const usersDir = path.join(dataDir, 'users');
const progressDir = path.join(dataDir, 'progress');
const statsDir = path.join(dataDir, 'stats');

// Configure the data service
jsonDataService.setDataDirectories({
  dataDir,
  usersDir,
  progressDir,
  statsDir
});

// Show data paths for debugging
console.log('===== DEBUG PATHS =====');
console.log(`Data directory: ${dataDir}`);
console.log(`Users directory: ${usersDir}`);
console.log(`Progress directory: ${progressDir}`);
console.log(`Stats directory: ${statsDir}`);
console.log('=======================');

async function createTestUser() {
  try {
    // Ensure data directories exist
    [dataDir, usersDir, progressDir, statsDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
    
    // Check if user already exists
    const existingUser = await jsonDataService.getUserByUsername(TEST_USER.username);
    
    if (existingUser) {
      console.log('Removing existing test user...');
      
      // Find and remove user files
      const userFiles = fs.readdirSync(usersDir);
      
      // Remove user file
      userFiles.forEach(file => {
        try {
          const filePath = path.join(usersDir, file);
          const userData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          
          if (userData.username === TEST_USER.username) {
            fs.unlinkSync(filePath);
          }
        } catch (error) {
          // Ignore file read errors
        }
      });
      
      // Remove progress file
      if (existingUser.id) {
        const progressPath = path.join(progressDir, `${existingUser.id}.json`);
        if (fs.existsSync(progressPath)) {
          fs.unlinkSync(progressPath);
        }
        
        // Remove any character stats
        const statsFiles = fs.readdirSync(statsDir);
        statsFiles.forEach(file => {
          if (file.startsWith(`${existingUser.id}_`)) {
            fs.unlinkSync(path.join(statsDir, file));
          }
        });
      }
      
      console.log('Existing test user removed');
    }
    
    // Create user
    console.log('Creating new test user...');
    console.log(`Username: ${TEST_USER.username}`);
    console.log(`Email: ${TEST_USER.email}`);
    console.log(`Password: ${TEST_USER.password}`);
    
    const createResult = await jsonDataService.createUser(TEST_USER);
    
    if (!createResult.success) {
      throw new Error(`Failed to create user: ${createResult.message}`);
    }
    
    const userId = createResult.userId;
    console.log(`User created with ID: ${userId}`);
    
    // Validate the learned characters
    validateLearnedCharacters();
    
    console.log(`Setting ${CHARACTERS_LEARNED.length} learned characters...`);
    console.log(`Learned characters: ${CHARACTERS_LEARNED.join(', ')}`);
    
    // Set up mastery and progress data
    const progressData = {
      userId: userId,
      learnedCharacters: CHARACTERS_LEARNED,
      // Calculate mastery percentages based on how many characters of each type are learned
      mastery: {
        'international': Math.min(100, Math.round((CHARACTERS_LEARNED.filter(c => LEARNING_ORDER.international.includes(c)).length / LEARNING_ORDER.international.length) * 100)),
        'prosigns': Math.min(100, Math.round((CHARACTERS_LEARNED.filter(c => LEARNING_ORDER.prosigns.includes(c)).length / LEARNING_ORDER.prosigns.length) * 100)),
        'special': 0,
        'masteryType': 'sending'
      },
      updatedAt: new Date().toISOString()
    };
    
    await jsonDataService.updateUserProgress(userId, progressData);
    console.log('Progress updated with specified learned characters');
    
    // Add some basic stats for the learned characters
    for (const char of CHARACTERS_LEARNED) {
      await jsonDataService.updateCharacterStats(userId, char, {
        timeSpent: 120,
        correctCount: 50,
        incorrectCount: 5
      });
    }
    
    // Display user JSON data
    const userFilePath = path.join(usersDir, `${userId}.json`);
    if (fs.existsSync(userFilePath)) {
      console.log('===== USER FILE CONTENT =====');
      console.log(fs.readFileSync(userFilePath, 'utf8'));
      console.log('============================');
    }
    
    // Display progress JSON data
    const progressFilePath = path.join(progressDir, `${userId}.json`);
    if (fs.existsSync(progressFilePath)) {
      console.log('===== PROGRESS FILE CONTENT =====');
      console.log(fs.readFileSync(progressFilePath, 'utf8'));
      console.log('================================');
    }
    
    console.log('SUCCESS: Test user created with specified learned characters!');
    console.log('Use these credentials to log in:');
    console.log(`Username: ${TEST_USER.username}`);
    console.log(`Password: ${TEST_USER.password}`);
    console.log(`User file location: ${userFilePath}`);
    
  } catch (error) {
    console.error('ERROR:', error.message);
  }
}

// Run the script
createTestUser();