# Supermorse Windows Build Script
# This script automates the process of building or setting up the Supermorse application
# or the modified Mumble server on Windows.

# Ensure script stops on errors
$ErrorActionPreference = "Stop"

# Color codes for output
function Write-ColorMessage {
    param (
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host -ForegroundColor $Color $Message
}

function Write-SuccessMessage {
    param ([string]$Message)
    Write-ColorMessage -Color Green -Message "[SUCCESS] $Message"
}

function Write-InfoMessage {
    param ([string]$Message)
    Write-ColorMessage -Color Cyan -Message "[SUPERMORSE] $Message"
}

function Write-WarningMessage {
    param ([string]$Message)
    Write-ColorMessage -Color Yellow -Message "[WARNING] $Message"
}

function Write-ErrorMessage {
    param ([string]$Message)
    Write-ColorMessage -Color Red -Message "[ERROR] $Message"
}

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($isAdmin) {
    Write-ErrorMessage "Please do not run this script as Administrator."
    exit 1
}

# Configuration
$MumbleRepoUrl = "https://github.com/Supermagnum/supermorse-mumble.git"
$MongoDBPort = 27017
$MumblePort = 64738
$ScriptDir = $PSScriptRoot

# Step 1: Check for required tools
Write-InfoMessage "Checking for required tools..."

# Check for Node.js
try {
    $nodeVersion = (node -v).Substring(1)
    $nodeMajor = [int]($nodeVersion.Split('.')[0])
    if ($nodeMajor -lt 14) {
        Write-ErrorMessage "Node.js v14 or later is required. Found v$nodeVersion"
        exit 1
    }
    Write-Host "Node.js v$nodeVersion found."
} catch {
    Write-ErrorMessage "Node.js is required but not installed."
    Write-Host "Please install Node.js from https://nodejs.org/"
    exit 1
}

# Check for npm
try {
    $npmVersion = (npm -v)
    Write-Host "npm v$npmVersion found."
} catch {
    Write-ErrorMessage "npm is required but not installed."
    exit 1
}

# Check for Git
try {
    $gitVersion = (git --version).Replace('git version ', '')
    Write-Host "Git v$gitVersion found."
} catch {
    Write-ErrorMessage "Git is required but not installed."
    Write-Host "Please install Git from https://git-scm.com/"
    exit 1
}

# Check for Visual Studio (needed for building Mumble)
if (-not (Test-Path "C:\Program Files (x86)\Microsoft Visual Studio")) {
    Write-WarningMessage "Visual Studio might not be installed. It's required for building the Mumble server."
    Write-Host "Please install Visual Studio with C++ development tools from https://visualstudio.microsoft.com/"
    $continue = Read-Host "Do you want to continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 1
    }
}

# Step 2: Install dependencies
Write-InfoMessage "Installing dependencies..."

# Install Chocolatey if not already installed
if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-InfoMessage "Installing Chocolatey..."
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))
    # Refresh environment variables
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
}

# Install MongoDB
Write-InfoMessage "Installing MongoDB..."
choco install mongodb -y

# Install Qt (needed for Mumble)
Write-InfoMessage "Installing Qt..."
choco install qt5-default -y

# Install Python (needed for Mumble)
Write-InfoMessage "Installing Python..."
choco install python -y

# Install Python dependencies
Write-InfoMessage "Installing Python dependencies..."
pip install requests

# Step 3: Set up MongoDB
Write-InfoMessage "Setting up MongoDB..."

# Start MongoDB service
Start-Service MongoDB

# Check if MongoDB is running
if ((Get-Service MongoDB).Status -ne "Running") {
    Write-ErrorMessage "Failed to start MongoDB. Please check the MongoDB service."
    exit 1
}

Write-SuccessMessage "MongoDB is running on port $MongoDBPort"

# Step 4: Install Node.js dependencies or build the Electron application
Write-InfoMessage "Building Supermorse Electron application..."
Set-Location $ScriptDir
npm install
npm run dist -- --win

if (-not (Test-Path "dist")) {
    Write-ErrorMessage "Failed to build the Electron application."
    exit 1
}

Write-SuccessMessage "Electron application built successfully"

# Step 5: Build the modified Mumble server
Write-InfoMessage "Building modified Mumble server..."

# Create murmur-src directory if it doesn't exist
if (-not (Test-Path "murmur-src")) {
    New-Item -ItemType Directory -Path "murmur-src" | Out-Null
}

# Clone the modified Mumble repository
Set-Location "murmur-src"
if (-not (Test-Path ".git")) {
    Write-InfoMessage "Cloning Mumble repository..."
    git clone $MumbleRepoUrl .
} else {
    Write-InfoMessage "Updating Mumble repository..."
    git pull
}

# Configure or build
Write-InfoMessage "Building Mumble server..."
Write-WarningMessage "Building Mumble on Windows requires Visual Studio and can be complex."
Write-WarningMessage "Please follow the detailed instructions in the Mumble documentation."
Write-WarningMessage "This script will create a placeholder for the Mumble server executable."

# Create a placeholder batch file for the Mumble server
@"
@echo off
echo ERROR: This is a placeholder for the modified Mumble server executable.
echo You need to build the actual executable and place it here.
echo.
echo Please follow the instructions in the Mumble Server Deployment Guide:
echo ..\docs\mumble-server-setup.md
echo.
echo After building the server, replace this placeholder with the compiled executable.
exit /b 1
"@ | Out-File -FilePath "murmur.bat" -Encoding ASCII

Write-InfoMessage "Created placeholder for Mumble server executable."
Write-InfoMessage "To build the actual Mumble server, please follow the instructions in the documentation."

# Step 6: Set up Mumble server configuration
Write-InfoMessage "Setting up Mumble server configuration..."

# Create configuration directories
$MumbleConfigDir = "$env:APPDATA\Supermorse\Mumble"
if (-not (Test-Path $MumbleConfigDir)) {
    New-Item -ItemType Directory -Path $MumbleConfigDir -Force | Out-Null
}

# Copy configuration file
Copy-Item "$ScriptDir\config\mumble-server.ini" "$MumbleConfigDir\mumble-server.ini" -Force

# Generate SSL certificates
Write-InfoMessage "Generating SSL certificates..."
$opensslPath = "C:\Program Files\OpenSSL-Win64\bin\openssl.exe"
if (-not (Test-Path $opensslPath)) {
    Write-WarningMessage "OpenSSL not found. Installing OpenSSL..."
    choco install openssl -y
    $opensslPath = "C:\Program Files\OpenSSL-Win64\bin\openssl.exe"
}

& $opensslPath req -x509 -nodes -days 3650 -newkey rsa:2048 `
  -keyout "$MumbleConfigDir\key.pem" `
  -out "$MumbleConfigDir\cert.pem" `
  -subj "/CN=supermorse-mumble-server"

# Create authentication script directory
$MumbleScriptDir = "$env:APPDATA\Supermorse\Scripts"
if (-not (Test-Path $MumbleScriptDir)) {
    New-Item -ItemType Directory -Path $MumbleScriptDir -Force | Out-Null
}

# Create authentication script
@"
#!/usr/bin/env python3

import sys
import json
import requests

def authenticate(username, password):
    try:
        # Supermorse API endpoint for authentication
        response = requests.post('http://localhost:3030/api/auth/mumble-verify', 
                                json={'username': username, 'password': password})
        
        if response.status_code == 200:
            data = response.json()
            if data.get('authenticated'):
                # Return user_id, username, groups
                return (data.get('user_id', 1), 
                        username, 
                        data.get('groups', []))
        return (-1, None, None)
    except Exception as e:
        print(f"Authentication error: {e}", file=sys.stderr)
        return (-2, None, None)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: mumble-auth.py <username> <password>")
        sys.exit(1)
    
    username = sys.argv[1]
    password = sys.argv[2]
    
    user_id, name, groups = authenticate(username, password)
    
    if user_id > 0:
        print(f"{user_id}:{name}:{','.join(groups)}")
        sys.exit(0)
    else:
        sys.exit(user_id)
"@ | Out-File -FilePath "$MumbleScriptDir\mumble-auth.py" -Encoding UTF8

Write-SuccessMessage "Mumble server configuration completed"

# Step 7: Create Windows service for Mumble server
Write-InfoMessage "Creating Windows service for Mumble server..."
Write-WarningMessage "Creating Windows services requires administrative privileges."
Write-WarningMessage "Please run the following commands as Administrator to create the service:"
Write-Host ""
Write-Host "sc.exe create SupermorseMumble binPath= `"$ScriptDir\murmur-src\murmur.bat -ini $MumbleConfigDir\mumble-server.ini`" start= auto DisplayName= `"Supermorse Mumble Server`""
Write-Host ""
Write-Host "To start the service:"
Write-Host "sc.exe start SupermorseMumble"
Write-Host ""

# Step 8: Final instructions
Write-InfoMessage "Build or setup completed successfully!"
Write-Host ""
Write-Host "To run the Supermorse application:"
Write-Host "  1. Start the application from: $ScriptDir\dist\win-unpacked\Supermorse.exe"
Write-Host ""
Write-Host "To manage the Mumble server:"
Write-Host "  - Start: sc.exe start SupermorseMumble"
Write-Host "  - Stop: sc.exe stop SupermorseMumble"
Write-Host "  - Check status: sc.exe query SupermorseMumble"
Write-Host ""
Write-Host "The Mumble server is accessible at: localhost:$MumblePort"
Write-Host "MongoDB is running on: localhost:$MongoDBPort"
Write-Host ""
Write-Host "For more information, see the documentation in the docs\ directory."
Write-Host ""
Write-WarningMessage "Important: You need to build the actual Mumble server executable."
Write-WarningMessage "The script has created a placeholder. Please follow the instructions in the documentation."

# Return to the original directory
Set-Location $ScriptDir