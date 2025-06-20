#!/bin/bash

# Script to install and configure PostgreSQL for Supermorse

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'  # No Color

# Print colored message
print_message() {
    echo -e "${BLUE}[SUPERMORSE]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please do not run this script as root or with sudo."
    print_message "The script will use sudo when necessary."
    exit 1
fi

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# Step 1: Check if PostgreSQL is already installed
print_message "Checking if PostgreSQL is already installed..."
if dpkg -l | grep -q postgresql; then
    print_success "PostgreSQL is already installed"
    PG_INSTALLED=true
else
    print_message "PostgreSQL is not installed"
    PG_INSTALLED=false
fi

# Step 2: Install PostgreSQL if not already installed
if [ "$PG_INSTALLED" = false ]; then
    print_message "Installing PostgreSQL..."
    
    # Update package lists
    print_message "Updating package lists..."
    sudo apt-get update
    
    # Install PostgreSQL
    print_message "Installing PostgreSQL packages..."
    sudo apt-get install -y postgresql postgresql-contrib
    
    if [ $? -eq 0 ]; then
        print_success "PostgreSQL installed successfully"
    else
        print_error "Failed to install PostgreSQL"
        exit 1
    fi
else
    print_message "Skipping PostgreSQL installation as it's already installed"
fi

# Step 3: Check if PostgreSQL service is running
print_message "Checking if PostgreSQL service is running..."
if systemctl is-active --quiet postgresql; then
    print_success "PostgreSQL service is running"
else
    print_warning "PostgreSQL service is not running"
    print_message "Starting PostgreSQL service..."
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    
    if systemctl is-active --quiet postgresql; then
        print_success "PostgreSQL service started successfully"
    else
        print_error "Failed to start PostgreSQL service"
        print_message "Checking PostgreSQL logs for errors..."
        sudo journalctl -u postgresql --no-pager -n 50
        exit 1
    fi
fi

# Step 4: Create database and user for Supermorse
print_message "Creating database and user for Supermorse..."

# Database name and user credentials
DB_NAME="supermorse"
DB_USER="supermorse"
DB_PASSWORD="supermorse_password"  # In production, use a more secure password

# Check if database already exists
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    print_warning "Database '$DB_NAME' already exists"
else
    # Create database
    print_message "Creating database '$DB_NAME'..."
    sudo -u postgres createdb "$DB_NAME"
    
    if [ $? -eq 0 ]; then
        print_success "Database created successfully"
    else
        print_error "Failed to create database"
        exit 1
    fi
fi

# Check if user already exists
if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
    print_warning "User '$DB_USER' already exists"
else
    # Create user
    print_message "Creating user '$DB_USER'..."
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
    
    if [ $? -eq 0 ]; then
        print_success "User created successfully"
    else
        print_error "Failed to create user"
        exit 1
    fi
fi

# Grant privileges to user
print_message "Granting privileges to user '$DB_USER' on database '$DB_NAME'..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
sudo -u postgres psql -c "ALTER USER $DB_USER WITH SUPERUSER;"

if [ $? -eq 0 ]; then
    print_success "Privileges granted successfully"
else
    print_error "Failed to grant privileges"
    exit 1
fi

# Step 5: Configure PostgreSQL for local connections
print_message "Configuring PostgreSQL for local connections..."

# Get PostgreSQL version
PG_VERSION=$(sudo -u postgres psql -c "SHOW server_version;" -t | tr -d ' ')
PG_MAJOR_VERSION=$(echo "$PG_VERSION" | cut -d. -f1)

# Path to pg_hba.conf
PG_HBA_CONF="/etc/postgresql/$PG_MAJOR_VERSION/main/pg_hba.conf"

if [ -f "$PG_HBA_CONF" ]; then
    print_success "Found PostgreSQL configuration file at $PG_HBA_CONF"
    
    # Create a backup of the original configuration
    sudo cp "$PG_HBA_CONF" "${PG_HBA_CONF}.bak.$(date +%Y%m%d%H%M%S)"
    
    # Add local connection for supermorse user
    print_message "Adding local connection for supermorse user..."
    
    # Check if entry already exists
    if sudo grep -q "^host $DB_NAME $DB_USER" "$PG_HBA_CONF"; then
        print_warning "Connection entry for supermorse user already exists"
    else
        # Add entry for local connections
        echo "# Supermorse application" | sudo tee -a "$PG_HBA_CONF"
        echo "host    $DB_NAME    $DB_USER    127.0.0.1/32    md5" | sudo tee -a "$PG_HBA_CONF"
        echo "host    $DB_NAME    $DB_USER    ::1/128         md5" | sudo tee -a "$PG_HBA_CONF"
        
        print_success "Connection entry added successfully"
    fi
    
    # Restart PostgreSQL to apply changes
    print_message "Restarting PostgreSQL to apply changes..."
    sudo systemctl restart postgresql
    
    if [ $? -eq 0 ]; then
        print_success "PostgreSQL restarted successfully"
    else
        print_error "Failed to restart PostgreSQL"
        exit 1
    fi
else
    print_error "PostgreSQL configuration file not found at $PG_HBA_CONF"
    exit 1
fi

# Step 6: Test database connection
print_message "Testing database connection..."
if PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
    print_success "Database connection successful"
else
    print_error "Failed to connect to database"
    print_message "Please check your PostgreSQL configuration"
    exit 1
fi

# Step 7: Create a .env file with database connection details
print_message "Creating .env file with database connection details..."
ENV_FILE="$SCRIPT_DIR/.env"

if [ -f "$ENV_FILE" ]; then
    print_warning ".env file already exists"
    print_message "Backing up existing .env file..."
    cp "$ENV_FILE" "${ENV_FILE}.bak.$(date +%Y%m%d%H%M%S)"
fi

# Create or update .env file
cat > "$ENV_FILE" << EOF
# Database configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

# Server configuration
PORT=3030
SESSION_SECRET=supermorse-secret-key
EOF

print_success ".env file created successfully"

print_success "PostgreSQL installation and configuration completed"
print_message "You can now start the Supermorse application with PostgreSQL"