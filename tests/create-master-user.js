/**
 * create-master-user.js
 * Script to create a test user with full mastery of all characters and prosigns
 * 
 * To run:
 * node create-master-user.js
 */

const fs = require('fs');
const path = require('path');
const jsonDataService = require('./src/services/JsonDataService');

// Set up console formatting
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

console.log(`\n${colors.bright}${colors.blue}===== Creating SuperMorse Test User with Full Mastery =====${colors.reset}\n`);

// Test user data with specified credentials
const TEST_USER = {
  username: 'test',
  email: 'test@google.com',
  password: 'Test123', // Correct password as specified
  maidenheadLocator: 'IO91PM'
};

// Get all characters from the learning orders
function getAllCharacters() {
  // Since we can't directly import the ALPHABETS module from a Node.js script,
  // we'll recreate the essential parts here
  const internationalChars = [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'
  ];
  
  const prosigns = ['AR', 'SK', 'BT', 'KN'];
  
  const specialChars = [
    '.', ',', '?', '!', '/', '(', ')', '&', ':', ';',
    '=', '+', '-', '_', '"', '$', '@', "'"
  ];
  
  return {
    international: internationalChars,
    prosigns: prosigns,
    special: specialChars
  };
}

async function createMasterUser() {
  try {
    // Step 1: Setup
    console.log(`${colors.yellow}1. Setting up test environment...${colors.reset}`);
    
    // Ensure data directories exist
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
    
    [dataDir, usersDir, progressDir, statsDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
    
    console.log(`${colors.green}   ✓ Test environment ready${colors.reset}`);
    
    // Step 2: Check if test user already exists
    console.log(`\n${colors.yellow}2. Checking if test user already exists...${colors.reset}`);
    
    const existingUser = await jsonDataService.getUserByUsername(TEST_USER.username);
    
    if (existingUser) {
      console.log(`${colors.yellow}   Found existing test user - removing...${colors.reset}`);
      
      // Find and remove user files
      const userFiles = fs.readdirSync(usersDir);
      const progressFiles = fs.readdirSync(progressDir);
      
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
      
      console.log(`${colors.green}   ✓ Existing test user removed${colors.reset}`);
    } else {
      console.log(`${colors.green}   ✓ No existing test user found${colors.reset}`);
    }
    
    // Step 3: Create test user
    console.log(`\n${colors.yellow}3. Creating test user...${colors.reset}`);
    console.log(`   Username: ${TEST_USER.username}`);
    console.log(`   Email: ${TEST_USER.email}`);
    console.log(`   Maidenhead: ${TEST_USER.maidenheadLocator}`);
    console.log(`   Password: ${'*'.repeat(TEST_USER.password.length)}`);
    
    // Create user
    const createResult = await jsonDataService.createUser(TEST_USER);
    
    if (!createResult.success) {
      throw new Error(`Failed to create user: ${createResult.message}`);
    }
    
    const userId = createResult.userId;
    console.log(`${colors.green}   ✓ User created with ID: ${userId}${colors.reset}`);
    
    // Step 4: Update user progress to show mastery of all characters
    console.log(`\n${colors.yellow}4. Setting up full mastery for all characters...${colors.reset}`);
    
    // Get all characters
    const allChars = getAllCharacters();
    
    // Create progress data with mastery
    const progressData = {
      userId: userId,
      learnedCharacters: [
        ...allChars.international,
        ...allChars.prosigns
      ],
      mastery: {
        'international': 100,
        'prosigns': 100,
        'special': 100,
        'masteryType': 'sending' // Indicate they can use a morse key
      },
      updatedAt: new Date().toISOString()
    };
    
    // Update progress
    const updateResult = await jsonDataService.updateUserProgress(userId, progressData);
    
    if (!updateResult.success) {
      throw new Error(`Failed to update user progress: ${updateResult.message}`);
    }
    
    console.log(`${colors.green}   ✓ Set mastery for all characters${colors.reset}`);
    
    // Step 5: Generate some character stats for realism
    console.log(`\n${colors.yellow}5. Creating character statistics...${colors.reset}`);
    
    // Add some character stats for commonly used characters
    const commonChars = ['A', 'E', 'T', 'N', 'S', 'O', 'R', 'I', 'AR', 'SK'];
    
    for (const char of commonChars) {
      // Create some realistic stats
      const stats = {
        timeSpent: Math.floor(Math.random() * 60 * 10) + 60, // 1-11 minutes in seconds
        correctCount: Math.floor(Math.random() * 100) + 50,   // 50-150 correct attempts
        incorrectCount: Math.floor(Math.random() * 20),       // 0-20 incorrect attempts
        updatedAt: new Date().toISOString()
      };
      
      await jsonDataService.updateCharacterStats(userId, char, stats);
    }
    
    console.log(`${colors.green}   ✓ Character statistics created${colors.reset}`);
    
    // Step 6: Verify everything
    console.log(`\n${colors.yellow}6. Verifying user setup...${colors.reset}`);
    
    // Get user
    const user = await jsonDataService.getUserById(userId);
    
    if (!user) {
      throw new Error('User not found after creation');
    }
    
    // Get progress
    const progress = await jsonDataService.getUserProgress(userId);
    
    if (!progress) {
      throw new Error('Progress not found after user creation');
    }
    
    console.log(`\n${colors.green}${colors.bright}✓ SUCCESS: Test user was successfully created with full mastery!${colors.reset}`);
    console.log(`\n${colors.green}User record:${colors.reset}`);
    console.log(JSON.stringify({
      id: user.id,
      username: user.username,
      email: user.email,
      maidenheadLocator: user.maidenheadLocator,
      createdAt: user.createdAt
    }, null, 2));
    
    console.log(`\n${colors.green}Progress record:${colors.reset}`);
    console.log(JSON.stringify({
      mastery: progress.mastery,
      learnedCharacters: progress.learnedCharacters.length + " characters mastered"
    }, null, 2));
    
    console.log(`\n${colors.cyan}This user has full mastery of:${colors.reset}`);
    console.log(`${colors.cyan}- All international characters (A-Z, 0-9)${colors.reset}`);
    console.log(`${colors.cyan}- All prosigns (AR, SK, BT, KN)${colors.reset}`);
    console.log(`${colors.cyan}- All special characters${colors.reset}`);
    console.log(`${colors.cyan}- With proper morse key mastery indicated${colors.reset}\n`);
    
  } catch (error) {
    console.error(`\n${colors.red}${colors.bright}ERROR: ${error.message}${colors.reset}`);
    console.error(error);
  }
}

// Run the script
createMasterUser().then(() => {
  console.log(`\n${colors.bright}${colors.blue}===== Test User Creation Complete =====\n${colors.reset}`);
});

console.log(`${colors.cyan}Creating master test user...\n${colors.reset}`);
