#!/bin/bash

# fix-mariadb.sh - Script to set up and troubleshoot MariaDB for Supermorse app
# Enhanced for compatibility with existing MariaDB installations

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Functions for colored output
function print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

function print_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

function print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

function print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check MariaDB version
function check_mariadb_version() {
    if command -v mysql &> /dev/null; then
        local version=$(mysql --version | grep -oP 'Distrib \K[0-9]+\.[0-9]+\.[0-9]+' || echo "unknown")
        echo "$version"
    else
        echo "not_installed"
    fi
}

# Function to check if database exists
function database_exists() {
    local db_name="$1"
    if sudo mysql -e "SHOW DATABASES LIKE '$db_name';" | grep -q "$db_name"; then
        return 0 # Database exists
    else
        return 1 # Database does not exist
    fi
}

# Function to check if user exists
function user_exists() {
    local user_name="$1"
    if sudo mysql -e "SELECT User FROM mysql.user WHERE User='$user_name';" | grep -q "$user_name"; then
        return 0 # User exists
    else
        return 1 # User does not exist
    fi
}

# Function to backup database
function backup_database() {
    local db_name="$1"
    local backup_file="$db_name-backup-$(date +%Y%m%d%H%M%S).sql"
    
    print_info "Creating backup of database $db_name to $backup_file"
    if sudo mysqldump "$db_name" > "$backup_file" 2>/dev/null; then
        print_success "Database backup created successfully"
        return 0
    else
        print_error "Failed to create database backup"
        return 1
    fi
}

echo -e "${YELLOW}Supermorse MariaDB Setup and Troubleshooting${NC}"
echo "This script will help you set up and troubleshoot MariaDB for the Supermorse app."
echo "It is designed to work with existing MariaDB installations."
echo

# Check MariaDB version
MARIADB_VERSION=$(check_mariadb_version)
if [ "$MARIADB_VERSION" != "not_installed" ]; then
    print_info "MariaDB version $MARIADB_VERSION detected"
    
    # Check if version is compatible (MariaDB 10.2 or higher recommended for JSON support)
    MAJOR_VERSION=$(echo $MARIADB_VERSION | cut -d. -f1)
    MINOR_VERSION=$(echo $MARIADB_VERSION | cut -d. -f2)
    
    if [ "$MAJOR_VERSION" -lt 10 ] || ([ "$MAJOR_VERSION" -eq 10 ] && [ "$MINOR_VERSION" -lt 2 ]); then
        print_warning "Your MariaDB version ($MARIADB_VERSION) may not fully support JSON features"
        print_warning "MariaDB 10.2 or higher is recommended for optimal compatibility"
        echo "Do you want to continue anyway? (y/n)"
        read -r response
        if [[ "$response" != "y" ]]; then
            print_info "Exiting script. Please upgrade MariaDB to version 10.2 or higher"
            exit 1
        fi
    else
        print_success "Your MariaDB version is compatible with Supermorse"
    fi
else
    print_info "MariaDB is not installed. Will install it now."
fi

# Check if MariaDB is installed
if ! command -v mysql &> /dev/null; then
    print_error "MariaDB is not installed"
    print_info "Installing MariaDB..."
    
    # Detect Linux distribution
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        DISTRO=$ID
    else
        DISTRO="unknown"
    fi
    
    # Install MariaDB based on distribution
    if [[ "$DISTRO" == "ubuntu" || "$DISTRO" == "debian" || "$DISTRO" == "linuxmint" ]]; then
        sudo apt update
        sudo apt install -y mariadb-server
    elif [[ "$DISTRO" == "fedora" || "$DISTRO" == "rhel" || "$DISTRO" == "centos" ]]; then
        sudo dnf install -y mariadb-server
    else
        print_error "Unsupported distribution: $DISTRO"
        print_info "Please install MariaDB manually and run this script again"
        exit 1
    fi
    
    # Start MariaDB service
    sudo systemctl start mariadb
    sudo systemctl enable mariadb
    
    print_success "MariaDB installed successfully"
else
    print_success "MariaDB is already installed"
fi

# Check if MariaDB service is running
if ! systemctl is-active --quiet mariadb; then
    print_error "MariaDB service is not running"
    print_info "Starting MariaDB service..."
    sudo systemctl start mariadb
    
    # Check again if service started successfully
    if ! systemctl is-active --quiet mariadb; then
        print_error "Failed to start MariaDB service"
        print_info "Checking MariaDB logs for errors:"
        sudo journalctl -u mariadb --no-pager -n 20
        exit 1
    fi
    
    print_success "MariaDB service started"
else
    print_success "MariaDB service is running"
fi

# Create database and user if they don't exist
print_info "Setting up database and user..."

# Database name, user, and password from environment variables or defaults
DB_NAME=${DB_NAME:-"supermorse"}
DB_USER=${DB_USER:-"supermorse"}
DB_PASSWORD=${DB_PASSWORD:-"supermorse_password"}

# Check if the database exists
if database_exists "$DB_NAME"; then
    print_info "Database $DB_NAME already exists"
    
    # Ask if user wants to backup the existing database
    echo "Do you want to backup the existing database before proceeding? (y/n)"
    read -r response
    if [[ "$response" == "y" ]]; then
        backup_database "$DB_NAME"
    fi
    
    # Ask if user wants to use the existing database
    echo "Do you want to use the existing database? (y/n)"
    read -r response
    if [[ "$response" != "y" ]]; then
        print_info "Creating a new database will drop the existing one"
        echo "Are you sure you want to proceed? (y/n)"
        read -r confirm
        if [[ "$confirm" == "y" ]]; then
            print_info "Dropping existing database $DB_NAME..."
            sudo mysql -e "DROP DATABASE $DB_NAME;"
            print_info "Creating database $DB_NAME..."
            sudo mysql -e "CREATE DATABASE $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
            print_success "Database $DB_NAME created successfully"
        else
            print_info "Keeping existing database $DB_NAME"
        fi
    else
        print_info "Using existing database $DB_NAME"
        # Set environment variable to enable safe mode
        echo "DB_SAFE_MODE=true" >> .env
        print_info "Enabled safe mode to protect existing database schema"
    fi
else
    print_info "Creating database $DB_NAME..."
    sudo mysql -e "CREATE DATABASE $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    print_success "Database $DB_NAME created successfully"
fi

# Check if the user exists
if user_exists "$DB_USER"; then
    print_info "User $DB_USER already exists"
    
    # Ask if user wants to use the existing user
    echo "Do you want to use the existing user? (y/n)"
    read -r response
    if [[ "$response" == "y" ]]; then
        print_info "Using existing user $DB_USER"
        # Update privileges for the existing user
        sudo mysql -e "GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';"
        sudo mysql -e "FLUSH PRIVILEGES;"
        print_success "Privileges for user $DB_USER updated"
    else
        # Ask for a new username
        echo "Enter a new username (default: supermorse_new):"
        read -r new_user
        DB_USER=${new_user:-"supermorse_new"}
        
        # Create the new user
        print_info "Creating user $DB_USER..."
        sudo mysql -e "CREATE USER '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';"
        sudo mysql -e "GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';"
        sudo mysql -e "FLUSH PRIVILEGES;"
        print_success "User $DB_USER created and granted privileges"
        
        # Update .env file with new user
        if [ -f .env ]; then
            sed -i "s/DB_USER=.*/DB_USER=$DB_USER/" .env
            print_info "Updated .env file with new user"
        else
            echo "DB_USER=$DB_USER" >> .env
            print_info "Added new user to .env file"
        fi
    fi
else
    print_info "Creating user $DB_USER..."
    sudo mysql -e "CREATE USER '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';"
    sudo mysql -e "GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';"
    sudo mysql -e "FLUSH PRIVILEGES;"
    print_success "User $DB_USER created and granted privileges"
fi

# Create or update .env file
if [ -f .env ]; then
    # Check if DB_HOST, DB_PORT, DB_NAME, DB_PASSWORD are in .env
    if ! grep -q "DB_HOST" .env; then
        echo "DB_HOST=localhost" >> .env
    fi
    if ! grep -q "DB_PORT" .env; then
        echo "DB_PORT=3306" >> .env
    fi
    if ! grep -q "DB_NAME" .env; then
        echo "DB_NAME=$DB_NAME" >> .env
    fi
    if ! grep -q "DB_USER" .env; then
        echo "DB_USER=$DB_USER" >> .env
    fi
    if ! grep -q "DB_PASSWORD" .env; then
        echo "DB_PASSWORD=$DB_PASSWORD" >> .env
    fi
    print_info "Updated .env file with database configuration"
else
    # Create new .env file
    cat > .env << EOL
DB_HOST=localhost
DB_PORT=3306
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
SESSION_SECRET=$(openssl rand -hex 32)
EOL
    print_info "Created .env file with database configuration"
fi

# Test connection
print_info "Testing connection to MariaDB..."
if mysql -u$DB_USER -p$DB_PASSWORD -e "SELECT 1" $DB_NAME &> /dev/null; then
    print_success "Connection to MariaDB successful"
else
    print_error "Connection to MariaDB failed"
    print_info "Troubleshooting..."
    
    # Check if MariaDB is listening on the correct port
    if command -v netstat &> /dev/null; then
        if ! sudo netstat -tlnp | grep -q ":3306"; then
            print_error "MariaDB is not listening on port 3306"
            print_info "Checking MariaDB configuration..."
            
            # Check configuration files based on distribution
            if [ -d /etc/mysql/mariadb.conf.d/ ]; then
                sudo grep -r "port" /etc/mysql/mariadb.conf.d/
            elif [ -f /etc/my.cnf ]; then
                sudo grep "port" /etc/my.cnf
            fi
            
            print_info "Restarting MariaDB service..."
            sudo systemctl restart mariadb
        fi
    fi
    
    # Check if firewall is blocking the port
    if command -v ufw &> /dev/null && sudo ufw status | grep -q "active"; then
        print_info "Checking firewall rules..."
        if ! sudo ufw status | grep -q "3306/tcp"; then
            print_info "Adding firewall rule for MariaDB..."
            sudo ufw allow 3306/tcp
        fi
    elif command -v firewall-cmd &> /dev/null; then
        print_info "Checking firewall rules..."
        if ! sudo firewall-cmd --list-ports | grep -q "3306/tcp"; then
            print_info "Adding firewall rule for MariaDB..."
            sudo firewall-cmd --permanent --add-port=3306/tcp
            sudo firewall-cmd --reload
        fi
    fi
    
    # Check if the user can connect from localhost
    print_info "Checking user connection permissions..."
    sudo mysql -e "SELECT User, Host FROM mysql.user WHERE User='$DB_USER';"
    
    # Check if password authentication is correct
    print_info "Checking password authentication method..."
    sudo mysql -e "SELECT User, plugin FROM mysql.user WHERE User='$DB_USER';"
    
    # If using auth_socket, update to mysql_native_password
    if sudo mysql -e "SELECT User, plugin FROM mysql.user WHERE User='$DB_USER';" | grep -q "auth_socket"; then
        print_info "User is using auth_socket authentication, updating to mysql_native_password..."
        sudo mysql -e "ALTER USER '$DB_USER'@'localhost' IDENTIFIED WITH mysql_native_password BY '$DB_PASSWORD';"
        sudo mysql -e "FLUSH PRIVILEGES;"
    fi
    
    print_info "Please check the MariaDB error log for more information:"
    echo "sudo journalctl -u mariadb --no-pager -n 50"
    
    # Try connection again
    print_info "Trying connection again..."
    if mysql -u$DB_USER -p$DB_PASSWORD -e "SELECT 1" $DB_NAME &> /dev/null; then
        print_success "Connection to MariaDB successful after troubleshooting"
    else
        print_error "Connection to MariaDB still failing"
        print_info "Please check your MariaDB configuration manually"
    fi
fi

# Check for cqrlog compatibility
if command -v cqrlog &> /dev/null; then
    print_info "cqrlog detected on the system"
    print_info "Checking for cqrlog database..."
    
    if database_exists "cqrlog"; then
        print_info "cqrlog database found"
        print_warning "Both cqrlog and Supermorse use MariaDB"
        print_info "They can coexist without issues as they use separate databases"
    fi
fi

echo
print_success "MariaDB setup and troubleshooting completed"
print_info "If you're still experiencing issues, please refer to the troubleshooting guide"