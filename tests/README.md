# SuperMorse User Creation Testing

This directory contains test scripts to verify that the user registration form in the SuperMorse application correctly creates users in the database.

## ⚠️ IMPORTANT: Use the Test Runner Script

To avoid path-related errors, always use the test runner script:

```bash
# From the project root directory
./run-tests.sh
```

This script will correctly locate and run the test files regardless of your current directory.

## Test Files

### 1. verify-user-creation.js

A simple script that directly tests the user creation functionality by:
- Connecting to the database
- Creating a test user
- Verifying the user was added to the database
- Cleaning up the test data

### 2. end-to-end-registration-test.js

A comprehensive end-to-end test that:
- Launches the Electron application
- Navigates to the registration form
- Fills in the form with test data
- Submits the form
- Verifies the user was created in the database

### 3. test-registration.html

A standalone HTML test page that demonstrates the registration form and process. This simulates the form submission process without requiring the full application.

**To view:**
```bash
# macOS
open tests/test-registration.html

# Linux
xdg-open tests/test-registration.html

# Windows
start tests/test-registration.html
```

## How to Verify User Creation

To verify that the index.html form correctly creates users:

1. **Option 1: Use the Test Runner**
   ```bash
   ./run-tests.sh
   ```
   Then select the test you want to run from the menu.

2. **Option 2: Manual Testing**
   - Start the SuperMorse application with `npm start`
   - Navigate to the registration form
   - Create a new user with:
     - Username: testuser
     - Full Name: Test User
     - Email: test@example.com
     - Password: Password123!
   - Check the database to verify the user was created:
     ```sql
     SELECT * FROM Users WHERE username = 'testuser';
     ```

## What Happens When a User Registers

When a user submits the registration form in index.html, the following process occurs:

1. The form submit event is captured in `app.js`
2. Form data is validated (matching passwords, valid email, etc.)
3. The `auth.register()` method is called in `auth.js`
4. This triggers `window.electronAPI.registerUser()` via the preload.js bridge
5. The main process receives the IPC call and forwards it to UserController
6. `UserController.registerUser()` creates the user in the database
7. A success message is returned to the renderer process

This chain of events ensures that when a user submits the registration form in index.html, a new user is properly created in the database.