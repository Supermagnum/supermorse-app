/**
 * test-create-user.js
 * Standalone test script to verify user creation functionality using JSON storage
 * 
 * This script directly tests the user creation functionality without requiring
 * a database server or Electron integration.
 * 
 * To run:
 * node test-create-user.js
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

console.log(`\n${colors.bright}${colors.blue}===== SuperMorse User Creation Test =====${colors.reset}\n`);
console.log(`${colors.cyan}This script directly tests if a user can be created in the JSON storage,${colors.reset}`);
console.log(`${colors.cyan}which is what happens when a user submits the registration form.${colors.reset}\n`);

// Test user data
const TEST_USER = {
  username: 'testuser',
  name: 'Test User',
  email: 'test@example.com',
  password: 'Password123!'
};

async function runTest() {
  try {
    // Step 1: Setup
    console.log(`${colors.yellow}1. Setting up test environment...${colors.reset}`);
    
    // Ensure data directories exist
    const dataDir = path.join(__dirname, 'data');
    const usersDir = path.join(dataDir, 'users');
    const progressDir = path.join(dataDir, 'progress');
    const statsDir = path.join(dataDir, 'stats');
    
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
    console.log(`   Name: ${TEST_USER.name}`);
    console.log(`   Email: ${TEST_USER.email}`);
    console.log(`   Password: ${'*'.repeat(TEST_USER.password.length)}`);
    
    // Create user
    const createResult = await jsonDataService.createUser(TEST_USER);
    
    if (!createResult.success) {
      throw new Error(`Failed to create user: ${createResult.message}`);
    }
    
    console.log(`${colors.green}   ✓ User created with ID: ${createResult.userId}${colors.reset}`);
    
    // Step 4: Verify user was created
    console.log(`\n${colors.yellow}4. Verifying user creation...${colors.reset}`);
    
    // Get user
    const userId = createResult.userId;
    const user = await jsonDataService.getUserById(userId);
    
    if (!user) {
      throw new Error('User not found after creation');
    }
    
    // Get progress
    const progress = await jsonDataService.getUserProgress(userId);
    
    if (!progress) {
      throw new Error('Progress not found after user creation');
    }
    
    console.log(`\n${colors.green}${colors.bright}✓ SUCCESS: User was successfully created!${colors.reset}`);
    console.log(`\n${colors.green}User record:${colors.reset}`);
    console.log(JSON.stringify({
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt
    }, null, 2));
    
    console.log(`\n${colors.green}Progress record:${colors.reset}`);
    console.log(JSON.stringify({
      currentCharacter: progress.currentCharacter,
      learnedCharacters: progress.learnedCharacters,
      mastery: progress.mastery
    }, null, 2));
    
    console.log(`\n${colors.blue}This confirms that the user creation functionality works correctly.${colors.reset}`);
    console.log(`${colors.blue}When a user submits the registration form in index.html, this same process${colors.reset}`);
    console.log(`${colors.blue}is triggered through the following flow:${colors.reset}\n`);
    
    console.log(`${colors.cyan}HTML Form → app.js → auth.js → preload.js → main.js → UserController.js → JsonDataService.js → JSON Files${colors.reset}\n`);
    
    // Step 5: Clean up test data
    console.log(`\n${colors.yellow}5. Cleaning up test data...${colors.reset}`);
    
    // Remove user file
    const userPath = path.join(usersDir, `${userId}.json`);
    if (fs.existsSync(userPath)) {
      fs.unlinkSync(userPath);
    }
    
    // Remove progress file
    const progressPath = path.join(progressDir, `${userId}.json`);
    if (fs.existsSync(progressPath)) {
      fs.unlinkSync(progressPath);
    }
    
    // Remove any character stats
    const statsFiles = fs.readdirSync(statsDir);
    statsFiles.forEach(file => {
      if (file.startsWith(`${userId}_`)) {
        fs.unlinkSync(path.join(statsDir, file));
      }
    });
    
    console.log(`${colors.green}   ✓ Test user removed from storage${colors.reset}\n`);
    
  } catch (error) {
    console.error(`\n${colors.red}${colors.bright}ERROR: ${error.message}${colors.reset}`);
    console.error(error);
  }
}

// Run the test
runTest().then(() => {
  console.log(`\n${colors.bright}${colors.blue}===== Test Complete =====\n${colors.reset}`);
});

console.log(`${colors.cyan}Running user creation test...\n${colors.reset}`);