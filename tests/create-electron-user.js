/**
 * create-electron-user.js
 * Creates a test user directly in Electron's userData directory
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

console.log('Creating test user in Electron userData directory...');

// Find the Electron userData directory based on platform
function getUserDataPath() {
  let userDataPath;
  
  switch (process.platform) {
    case 'win32':
      userDataPath = path.join(process.env.APPDATA, 'supermorse-app');
      break;
    case 'darwin': // macOS
      userDataPath = path.join(process.env.HOME, 'Library', 'Application Support', 'supermorse-app');
      break;
    case 'linux':
      userDataPath = path.join(process.env.HOME, '.config', 'supermorse-app');
      break;
    default:
      userDataPath = path.join(process.env.HOME, '.supermorse-app');
  }
  
  console.log(`Detected Electron userData path: ${userDataPath}`);
  return userDataPath;
}

// Get the userData directory
const userDataDir = getUserDataPath();
const dataDir = path.join(userDataDir, 'data');
const usersDir = path.join(dataDir, 'users');
const progressDir = path.join(dataDir, 'progress');
const statsDir = path.join(dataDir, 'stats');

// Create directories if they don't exist
[dataDir, usersDir, progressDir, statsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Show data paths for debugging
console.log('===== DEBUG PATHS =====');
console.log(`Electron userData directory: ${userDataDir}`);
console.log(`Data directory: ${dataDir}`);
console.log(`Users directory: ${usersDir}`);
console.log(`Progress directory: ${progressDir}`);
console.log(`Stats directory: ${statsDir}`);
console.log('=======================');

// Simple user data with basic password
const TEST_USER = {
  username: 'test',
  name: 'test',
  email: 'test@google.com',
  password: 'test',
  maidenheadLocator: 'IO91PM'
};

async function createUser() {
  try {
    // Check if user already exists by checking all user files
    let existingUserId = null;
    
    if (fs.existsSync(usersDir)) {
      const userFiles = fs.readdirSync(usersDir);
      
      for (const file of userFiles) {
        try {
          const filePath = path.join(usersDir, file);
          const userData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          
          if (userData.username === TEST_USER.username) {
            console.log(`Found existing user with ID: ${userData.id}`);
            existingUserId = userData.id;
            
            // Remove user file
            fs.unlinkSync(filePath);
            console.log(`Removed user file: ${filePath}`);
            break;
          }
        } catch (error) {
          // Ignore file read errors
        }
      }
      
      // Remove progress file
      if (existingUserId) {
        const progressPath = path.join(progressDir, `${existingUserId}.json`);
        if (fs.existsSync(progressPath)) {
          fs.unlinkSync(progressPath);
          console.log(`Removed progress file: ${progressPath}`);
        }
        
        // Remove any character stats
        if (fs.existsSync(statsDir)) {
          const statsFiles = fs.readdirSync(statsDir);
          statsFiles.forEach(file => {
            if (file.startsWith(`${existingUserId}_`)) {
              fs.unlinkSync(path.join(statsDir, file));
              console.log(`Removed stats file: ${file}`);
            }
          });
        }
      }
    }
    
    // Create new user
    console.log('Creating new test user...');
    
    // Generate user ID
    const userId = crypto.randomUUID();
    
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(TEST_USER.password, saltRounds);
    
    // Create user object
    const user = {
      id: userId,
      username: TEST_USER.username,
      name: TEST_USER.name,
      email: TEST_USER.email,
      password: hashedPassword,
      maidenheadLocator: TEST_USER.maidenheadLocator,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Save user to file
    const userFilePath = path.join(usersDir, `${userId}.json`);
    fs.writeFileSync(userFilePath, JSON.stringify(user, null, 2));
    console.log(`User created with ID: ${userId}`);
    
    // Get all alphabet characters (A-Z, 0-9)
    const international = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');
    
    // Define prosigns
    const prosigns = ['AR', 'SK', 'BT', 'KN'];
    
    // Define special characters
    const special = ['/', '?', '.', ','];
    
    // Combine all characters for the learnedCharacters array
    const allLearnedChars = [...international, ...prosigns, ...special];
    
    // Create progress data with full mastery, following exact format expected by the Trainer class
    const progress = {
      userId: userId,
      // Set learned characters
      learnedCharacters: allLearnedChars,
      // Current character is null since all are mastered
      currentCharacter: null,
      // Mastery data - this format is required by the training.js findNextCharacterToLearn method
      mastery: {
        'international': 100,
        'prosigns': 100,
        'special': 100,
        'masteryType': 'physical_key',
        // Move these properties inside the mastery object for proper recognition
        'usingMorseKey': true,
        'keyType': 'straight'
      },
      // Timestamps
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Save progress to file
    const progressFilePath = path.join(progressDir, `${userId}.json`);
    fs.writeFileSync(progressFilePath, JSON.stringify(progress, null, 2));
    console.log('Progress created with full mastery');
    
    // Create stats for a few characters
    const commonChars = ['A', 'E', 'T', 'AR', 'SK'];
    for (const char of commonChars) {
      // Create stats object
      const stats = {
        userId: userId,
        character: char,
        timeSpent: Math.floor(Math.random() * 300) + 60,
        correctCount: Math.floor(Math.random() * 100) + 20,
        incorrectCount: Math.floor(Math.random() * 20),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Save stats to file
      const statsFilePath = path.join(statsDir, `${userId}_${char}.json`);
      fs.writeFileSync(statsFilePath, JSON.stringify(stats, null, 2));
    }
    console.log('Character statistics created');
    
    // Display user file content
    console.log('===== USER FILE CONTENT =====');
    console.log(fs.readFileSync(userFilePath, 'utf8'));
    console.log('============================');
    
    console.log('SUCCESS: Test user created in Electron userData directory!');
    console.log('Use these credentials to log in:');
    console.log(`Username: ${TEST_USER.username}`);
    console.log(`Password: ${TEST_USER.password}`);
    console.log(`User file location: ${userFilePath}`);
    
  } catch (error) {
    console.error('ERROR:', error);
  }
}

// Run the script
createUser();