@echo off
:: SuperMorse Installation Script for Windows
:: This script installs all dependencies and sets up the SuperMorse application

echo ====================================================
echo       SuperMorse Application - Windows Setup       
echo ====================================================
echo.

:: Create a log file
set LOGFILE=supermorse_install.log
echo SuperMorse Installation Log - %date% %time% > %LOGFILE%

:: Function to log messages
:log
echo %~1 >> %LOGFILE%
goto :eof

:: Check if running with administrative privileges
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [32m✓ Running with administrative privileges[0m
    call :log "Running with administrative privileges"
) else (
    echo [31mWarning: Not running with administrative privileges[0m
    echo Some installation steps might fail. Consider running as Administrator.
    call :log "Warning: Not running with administrative privileges"
)

:: Check if Node.js is installed
echo.
echo [33mChecking system dependencies...[0m

where node >nul 2>&1
if %errorLevel% == 0 (
    for /f "tokens=*" %%a in ('node -v') do set NODE_VERSION=%%a
    echo [32m✓ Node.js is installed (%NODE_VERSION%)[0m
    call :log "Node.js found: %NODE_VERSION%"
) else (
    echo [33mNode.js is not installed. Opening download page...[0m
    call :log "Node.js not found. Opening download page."
    
    echo Please download and install Node.js (LTS version recommended)
    echo After installation, close this window and run this script again.
    echo.
    pause
    start https://nodejs.org/en/download/
    exit
)

:: Check if npm is installed
where npm >nul 2>&1
if %errorLevel% == 0 (
    for /f "tokens=*" %%a in ('npm -v') do set NPM_VERSION=%%a
    echo [32m✓ npm is installed (%NPM_VERSION%)[0m
    call :log "npm found: %NPM_VERSION%"
) else (
    echo [31mnpm is not installed. Something is wrong with your Node.js installation.[0m
    call :log "npm not found"
    pause
    exit
)

:: Install npm dependencies
echo.
echo [33mInstalling npm dependencies...[0m
call npm install
if %errorLevel% == 0 (
    echo [32m✓ Dependencies installed successfully[0m
    call :log "npm dependencies installed"
) else (
    echo [31mFailed to install dependencies. See error above.[0m
    call :log "Failed to install npm dependencies"
    pause
    exit
)

:: Create data directory for JSON storage
echo.
echo [33mSetting up data directory for JSON storage...[0m

:: Create directories if they don't exist
if not exist data\users mkdir data\users
if not exist data\progress mkdir data\progress
if not exist data\stats mkdir data\stats

echo [32m✓ Data directories created[0m
call :log "Data directories created"

echo.
echo [32m====================================================[0m
echo [32m       SuperMorse Installation Complete!       [0m
echo [32m====================================================[0m
echo.
echo To start the application, run:
echo [36mnpm start[0m
echo.
echo To run tests, use:
echo [36mnode test-create-user.js[0m
echo.
echo For more information, see the README.md file.
echo.
echo Installation log saved to: %LOGFILE%
echo.
pause