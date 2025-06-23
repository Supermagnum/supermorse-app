/**
 * test-user-creation.js
 * Test script to verify user creation functionality
 * 
 * To run this test:
 * 1. Make sure your database is running
 * 2. Run: node tests/test-user-creation.js
 */

const { User, Progress, initDatabase } = require('../src/models/User');
const UserController = require('../src/controllers/UserController');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

/**
 * Test user creation with the UserController
 */
async function testUserCreation() {
    try {
        console.log('Starting user creation test...');
        
        // Initialize database
        await initDatabase();
        console.log('Database initialized');
        
        // Sample user data (simulate form submission)
        const testUser = {
            username: 'testuser',
            name: 'Test User',
            email: 'test@example.com',
            password: 'password123'
        };
        
        console.log('Registering user with data:', testUser);
        
        // Register the user using the controller (same method called by IPC)
        const result = await UserController.registerUser(testUser);
        
        if (result.success) {
            console.log('✅ User registration successful!');
            console.log('User ID:', result.userId);
            
            // Verify user exists in the database
            const user = await User.findByPk(result.userId);
            
            if (user) {
                console.log('✅ User found in database:');
                console.log('- Username:', user.username);
                console.log('- Name:', user.name);
                console.log('- Email:', user.email);
                
                // Verify progress record was created
                const progress = await Progress.findOne({
                    where: { userId: result.userId }
                });
                
                if (progress) {
                    console.log('✅ Progress record created');
                    console.log('- Current character:', progress.currentCharacter);
                    console.log('- Learned characters:', progress.learnedCharacters);
                } else {
                    console.error('❌ Progress record not created');
                }
                
                // Clean up test data
                console.log('Cleaning up test data...');
                await user.destroy();
                console.log('✅ Test user removed from database');
            } else {
                console.error('❌ User not found in database');
            }
        } else {
            console.error('❌ User registration failed:', result.message);
        }
    } catch (error) {
        console.error('❌ Test error:', error);
    } finally {
        // Disconnect from database
        const { sequelize } = require('../src/models/User');
        await sequelize.close();
        console.log('Database connection closed');
    }
}

/**
 * Simulate HTML form submission
 * This function simulates what happens when the registration form is submitted
 */
function simulateFormSubmission() {
    console.log('Simulating HTML form submission...');
    
    // In a real application, these values would come from the form inputs
    const formData = {
        username: 'testuser',
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
    };
    
    console.log('Form data:', formData);
    console.log('Form submission would trigger:');
    console.log('1. auth.register(username, name, email, password)');
    console.log('2. electronAPI.registerUser({username, name, email, password})');
    console.log('3. UserController.registerUser({username, name, email, password})');
    console.log('4. User.create() and Progress.create()');
    
    // In a real application, we would call:
    // window.app.auth.register(formData.username, formData.name, formData.email, formData.password);
    
    console.log('Running actual database test...');
    testUserCreation();
}

// Start the test
simulateFormSubmission();