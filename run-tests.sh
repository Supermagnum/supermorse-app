#!/bin/bash
# run-tests.sh
# A helper script to run the SuperMorse test files with the correct paths

# Set colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}======== SuperMorse Test Runner ========${NC}\n"

# Get the project root directory
PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$PROJECT_ROOT"

# Function to run a test file
run_test() {
    local test_file="$1"
    local test_name="$2"
    
    if [ -f "$test_file" ]; then
        echo -e "${YELLOW}Running $test_name...${NC}"
        node "$test_file"
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ $test_name completed successfully${NC}\n"
        else
            echo -e "${RED}✗ $test_name failed${NC}\n"
        fi
    else
        echo -e "${RED}Error: Test file not found: $test_file${NC}\n"
    fi
}

# Display menu
echo -e "Available tests:\n"
echo -e "1. ${YELLOW}Simple User Creation Test${NC} - Direct standalone test of user creation"
echo -e "2. ${YELLOW}Verify User Creation${NC} - Full verification of user creation functionality"
echo -e "3. ${YELLOW}End-to-End Registration Test${NC} - Complete test of registration form"
echo -e "4. ${YELLOW}Run All Tests${NC}"
echo -e "q. ${YELLOW}Quit${NC}"

echo -e "\nEnter your choice:"
read -r choice

case "$choice" in
    1)
        run_test "$PROJECT_ROOT/test-create-user.js" "Simple User Creation Test"
        ;;
    2)
        run_test "$PROJECT_ROOT/tests/verify-user-creation.js" "User Creation Verification"
        ;;
    3)
        run_test "$PROJECT_ROOT/tests/end-to-end-registration-test.js" "End-to-End Registration Test"
        ;;
    4)
        echo -e "${BLUE}Running all tests...${NC}\n"
        run_test "$PROJECT_ROOT/test-create-user.js" "Simple User Creation Test"
        run_test "$PROJECT_ROOT/tests/verify-user-creation.js" "User Creation Verification"
        run_test "$PROJECT_ROOT/tests/end-to-end-registration-test.js" "End-to-End Registration Test"
        ;;
    q|Q)
        echo -e "${BLUE}Exiting test runner.${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid choice.${NC}"
        exit 1
        ;;
esac

echo -e "${BLUE}======== Testing Complete ========${NC}"