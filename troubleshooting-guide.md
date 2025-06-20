# Supermorse App Troubleshooting Guide

This guide will help you resolve common issues with the Supermorse application.

## Issue 1: App Displays Nothing

If the app window opens but displays nothing, follow these steps in order:

### Step 1: Check for Port Conflicts

```bash
./fix-port-conflict.sh
```

This script will check if port 3030 is in use and help you free it if needed.

### Step 2: Fix MariaDB Connection

```bash
./fix-mariadb.sh
```

This script will check and fix MariaDB configuration issues.

### Step 3: Check MariaDB Status Manually

```bash
sudo systemctl status mariadb
```

Make sure MariaDB is running. If not, start it:

```bash
sudo systemctl start mariadb
```

### Step 4: Check MariaDB Logs for Errors

```bash
sudo journalctl -u mariadb --no-pager -n 50
```

Look for any error messages that might indicate configuration problems.

### Step 5: Test MariaDB Connection Manually

```bash
mysql -h localhost -u supermorse -psupermorse_password -e "SELECT 1" supermorse
```

This should return `1` if MariaDB is accessible.

### Step 6: Check Application Logs

Start the application with verbose logging:

```bash
DEBUG=* npm run electron-dev
```

This will show more detailed logs that might help identify the issue.

### Step 7: Try a Different Port

If you're still having issues with port 3030, you can modify the application to use a different port:

1. Edit `server.js` to use a different port (e.g., 3031):
   ```javascript
   const PORT = process.env.PORT || 3031;
   ```

2. Edit `main.js` to connect to the new port:
   ```javascript
   mainWindow.loadURL(url.format({
     pathname: 'localhost:3031',
     protocol: 'http:',
     slashes: true
   }));
   ```

### Step 8: Check for Network Issues

Make sure your firewall isn't blocking the required ports:

```bash
sudo ufw status
```

If needed, allow the ports:

```bash
sudo ufw allow 3306/tcp   # MariaDB
sudo ufw allow 3030/tcp   # Express server
```

## Issue 2: MariaDB Connection Errors

If you're seeing MariaDB connection errors:

### Step 1: Verify MariaDB Installation

```bash
mysql --version
```

If MariaDB is not installed or you're using an older version, run:

```bash
sudo apt update
sudo apt install mariadb-server
```

### Step 2: Check MariaDB Configuration

```bash
sudo cat /etc/mysql/mariadb.conf.d/50-server.cnf
```

Make sure it's configured to allow connections from localhost.

### Step 3: Check MariaDB Data Directory

```bash
ls -la /var/lib/mysql
```

Make sure the directory exists and has the correct permissions:

```bash
sudo chown -R mysql:mysql /var/lib/mysql
```

### Step 4: Check Environment Variables

Make sure your `.env` file has the correct MariaDB connection settings:

```
DB_HOST=localhost
DB_PORT=3306
DB_NAME=supermorse
DB_USER=supermorse
DB_PASSWORD=supermorse_password
```

### Step 5: Check MariaDB User and Database

```bash
sudo mysql -e "SELECT User, Host, plugin FROM mysql.user WHERE User='supermorse';"
sudo mysql -e "SHOW DATABASES;" | grep supermorse
```

If the user or database doesn't exist, run:

```bash
./fix-mariadb.sh
```

### Step 6: Reinstall MariaDB (Last Resort)

If all else fails, you can completely reinstall MariaDB:

```bash
sudo systemctl stop mariadb
sudo apt purge mariadb-server* mariadb-client*
sudo rm -r /var/lib/mysql
sudo apt install mariadb-server
./fix-mariadb.sh
```

## Issue 3: Application Crashes or Errors

If the application crashes or shows errors:

### Step 1: Check Node.js and npm Versions

```bash
node -v
npm -v
```

Make sure you're using Node.js v14 or later and npm v6 or later.

### Step 2: Reinstall Dependencies

```bash
rm -rf node_modules
npm install
```

### Step 3: Check for Missing Dependencies

```bash
npm ls --depth=0
```

Install any missing dependencies.

### Step 4: Run in Development Mode with DevTools

```bash
NODE_ENV=development npm run electron-dev
```

This will open the DevTools console, which might show more detailed error messages.

## Additional Troubleshooting Tips

- **Restart Your System**: Sometimes a simple restart can resolve port binding and service issues.
- **Check System Resources**: Make sure you have enough memory and disk space.
- **Update Your System**: Make sure your system packages are up to date.
- **Check Firewall and Security Settings**: Make sure your firewall isn't blocking the required ports.
- **Check for Other Services**: Make sure no other services are using the required ports.

If you continue to experience issues, please provide the output of the following commands:

```bash
node -v
npm -v
mysql --version
sudo systemctl status mariadb
sudo lsof -i:3030
sudo lsof -i:3306
```

This information will help diagnose the issue further.