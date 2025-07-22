/**
 * create-simple-user.js
 * Simple script to create a test user with a basic password
 */

const fs = require('fs');
const path = require('path');
const jsonDataService = require('../src/services/JsonDataService');

console.log('Creating simple test user with basic password...');

// Set up data directories
const dataDir = path.join(__dirname, 'data');
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

// Simple user data with basic password
const SIMPLE_USER = {
  username: 'test',
  email: 'test@google.com',
  password: 'test',  // Simple password
  maidenheadLocator: 'IO91PM'
};

async function createSimpleUser() {
  try {
    // Check if user already exists
    const existingUser = await jsonDataService.getUserByUsername(SIMPLE_USER.username);
    
    if (existingUser) {
      console.log('Removing existing test user...');
      
      // Find and remove user files
      const userFiles = fs.readdirSync(usersDir);
      
      // Remove user file
      userFiles.forEach(file => {
        try {
          const filePath = path.join(usersDir, file);
          const userData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          
          if (userData.username === SIMPLE_USER.username) {
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
    console.log(`Username: ${SIMPLE_USER.username}`);
    console.log(`Email: ${SIMPLE_USER.email}`);
    console.log(`Password: ${SIMPLE_USER.password}`);
    
    const createResult = await jsonDataService.createUser(SIMPLE_USER);
    
    if (!createResult.success) {
      throw new Error(`Failed to create user: ${createResult.message}`);
    }
    
    const userId = createResult.userId;
    console.log(`User created with ID: ${userId}`);
    
    // Set up mastery
    const progressData = {
      userId: userId,
      learnedCharacters: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 
                          'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
                          '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
                          'AR', 'SK', 'BT', 'KN'],
      mastery: {
        'international': 100,
        'prosigns': 100,
        'special': 100,
        'masteryType': 'sending'
      },
      updatedAt: new Date().toISOString()
    };
    
    await jsonDataService.updateUserProgress(userId, progressData);
    console.log('Progress updated with full mastery');
    
    // Add some stats
    await jsonDataService.updateCharacterStats(userId, 'A', {
      timeSpent: 120,
      correctCount: 50,
      incorrectCount: 5
    });
    
    // Display user JSON data
    const userFilePath = path.join(usersDir, `${userId}.json`);
    if (fs.existsSync(userFilePath)) {
      console.log('===== USER FILE CONTENT =====');
      console.log(fs.readFileSync(userFilePath, 'utf8'));
      console.log('============================');
    }
    
    console.log('SUCCESS: Simple test user created!');
    console.log('Use these credentials to log in:');
    console.log(`Username: ${SIMPLE_USER.username}`);
    console.log(`Password: ${SIMPLE_USER.password}`);
    console.log(`User file location: ${userFilePath}`);
    
  } catch (error) {
    console.error('ERROR:', error.message);
  }
}

// Run the script
createSimpleUser();