/**
 * end-to-end-registration-test.js
 * End-to-end test for verifying user registration through the HTML interface
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');
const { Sequelize } = require('sequelize');
require('dotenv').config();

// Mock user data for testing
const TEST_USER = {
  username: 'testuser',
  name: 'Test User',
  email: 'test@example.com',
  password: 'Password123!'
};

// Database connection
let sequelize;
try {
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      dialect: 'mysql',
      logging: false
    }
  );
} catch (error) {
  console.error('Database connection error:', error);
  process.exit(1);
}

// Start the test
async function runTest() {
  console.log('Starting end-to-end registration test...');
  
  try {
    // Wait for the app to be ready
    await app.whenReady();
    console.log('Electron app is ready');
    
    // Create the browser window
    const mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        preload: path.join(__dirname, '..', 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true
      }
    });
    
    // Load the index.html file
    await mainWindow.loadFile(path.join(__dirname, '..', 'src', 'renderer', 'index.html'));
    console.log('Loaded index.html');
    
    // Wait for the page to fully load
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Execute test in renderer process
    const testResult = await mainWindow.webContents.executeJavaScript(`
      (async function() {
        try {
          // First, make sure we're on the login/register screen
          if (!document.getElementById('auth-container').classList.contains('active')) {
            console.log('Not on login screen, aborting test');
            return { success: false, error: 'Not on login screen' };
          }
          
          // Click the "Register" tab
          document.getElementById('register-tab').click();
          console.log('Clicked register tab');
          
          // Wait for tab switch animation
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Fill the registration form
          document.getElementById('registerUsername').value = '${TEST_USER.username}';
          document.getElementById('registerName').value = '${TEST_USER.name}';
          document.getElementById('registerEmail').value = '${TEST_USER.email}';
          document.getElementById('registerPassword').value = '${TEST_USER.password}';
          document.getElementById('registerConfirmPassword').value = '${TEST_USER.password}';
          
          console.log('Filled registration form');
          
          // Create a promise to wait for the registration process
          const registrationPromise = new Promise((resolve) => {
            // Listen for registration success or failure
            window.addEventListener('registration-result', function handler(event) {
              window.removeEventListener('registration-result', handler);
              resolve(event.detail);
            });
            
            // Submit the form
            document.getElementById('registerForm').dispatchEvent(new Event('submit'));
            console.log('Submitted registration form');
          });
          
          // Wait for registration result with timeout
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Registration timed out')), 5000)
          );
          
          const result = await Promise.race([registrationPromise, timeoutPromise]);
          return { success: true, result };
        } catch (error) {
          console.error('Test execution error:', error);
          return { success: false, error: error.toString() };
        }
      })();
    `);
    
    console.log('Test execution result:', testResult);
    
    // Query the database to verify user creation
    const [results] = await sequelize.query(
      `SELECT * FROM Users WHERE username = '${TEST_USER.username}'`
    );
    
    if (results.length > 0) {
      console.log('✅ SUCCESS: User was successfully created in the database');
      console.log('User record:', JSON.stringify(results[0], null, 2));
    } else {
      console.log('❌ FAILURE: User was not created in the database');
    }
    
    // Clean up test data
    await sequelize.query(
      `DELETE FROM Users WHERE username = '${TEST_USER.username}'`
    );
    console.log('Test cleanup: Removed test user from database');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Close database connection and quit app
    await sequelize.close();
    app.quit();
  }
}

// Add custom event handler for registration result
app.on('web-contents-created', (_, webContents) => {
  webContents.on('ipc-message', (_, channel, ...args) => {
    if (channel === 'register-user-result') {
      webContents.executeJavaScript(`
        window.dispatchEvent(new CustomEvent('registration-result', { 
          detail: ${JSON.stringify(args[0])} 
        }));
      `);
    }
  });
});

// Run the test
runTest();

console.log(`
====================================
HOW TO USE THIS TEST
====================================

This test verifies if the registration form in index.html successfully creates a user.

To run this test:
1. Make sure your database is configured in .env
2. Make sure the app is built and ready
3. Run: node tests/end-to-end-registration-test.js

Expected output:
- The test will launch the Electron app
- Navigate to the registration form
- Fill it with test user data
- Submit the form
- Verify if a user was created in the database
- Clean up by removing the test user

If successful, you'll see:
"✅ SUCCESS: User was successfully created in the database"

If not, you'll see:
"❌ FAILURE: User was not created in the database"
`);