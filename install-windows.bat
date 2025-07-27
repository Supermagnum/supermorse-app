@echo off
:: SuperMorse Installation Script for Windows
:: This script installs all dependencies, builds and sets up the SuperMorse application

echo ====================================================
echo       SuperMorse Application - Windows Setup       
echo ====================================================
echo.

:: Set installation directory
set INSTALL_DIR=C:\Program Files\SuperMorse

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

:: Rebuild native modules for Electron compatibility
echo.
echo [33mRebuilding native modules for Electron compatibility...[0m
call npx @electron/rebuild
if %errorLevel% == 0 (
    echo [32m✓ Native modules rebuilt successfully[0m
    call :log "Native modules rebuilt for Electron compatibility"
) else (
    echo [31mFailed to rebuild native modules. This may cause segmentation faults.[0m
    call :log "Failed to rebuild native modules for Electron compatibility"
    echo [33mAttempting to continue installation...[0m
)

:: Build the application
echo.
echo [33mBuilding the application...[0m
call npm run build
if %errorLevel% == 0 (
    echo [32m✓ Application built successfully[0m
    call :log "Application built successfully"
) else (
    echo [31mFailed to build the application. See error above.[0m
    call :log "Failed to build application"
    pause
    exit
)

:: Create installation directory if it doesn't exist
echo.
echo [33mCreating installation directory...[0m
if not exist "%INSTALL_DIR%" (
    mkdir "%INSTALL_DIR%"
)

if %errorLevel% == 0 (
    echo [32m✓ Installation directory created[0m
    call :log "Installation directory created"
) else (
    echo [31mFailed to create installation directory.[0m
    call :log "Failed to create installation directory"
    pause
    exit
)

:: Copy application files to installation directory
echo.
echo [33mInstalling application...[0m
if exist "dist\Windows\win-unpacked" (
    xcopy "dist\Windows\win-unpacked\*" "%INSTALL_DIR%" /E /I /H /Y
    echo [32m✓ Application installed successfully[0m
    call :log "Application installed from dist\Windows\win-unpacked"
) else (
    :: If no build was created, copy the source files directly
    xcopy "*" "%INSTALL_DIR%" /E /I /H /Y
    echo [33mNo build found, copied source files directly[0m
    call :log "Copied source files directly to installation directory"
)

:: Create data directory for JSON storage
echo.
echo [33mSetting up data directory for JSON storage...[0m

:: Create directories if they don't exist
if not exist "%INSTALL_DIR%\data\users" mkdir "%INSTALL_DIR%\data\users"
if not exist "%INSTALL_DIR%\data\progress" mkdir "%INSTALL_DIR%\data\progress"
if not exist "%INSTALL_DIR%\data\stats" mkdir "%INSTALL_DIR%\data\stats"

echo [32m✓ Data directories created[0m
call :log "Data directories created"

:: Create Windows service using nssm (Non-Sucking Service Manager)
echo.
echo [33mSetting up Windows service...[0m

:: Download NSSM if not already present
if not exist nssm.exe (
    echo Downloading NSSM (Non-Sucking Service Manager)...
    powershell -Command "Invoke-WebRequest -Uri 'https://nssm.cc/release/nssm-2.24.zip' -OutFile 'nssm.zip'"
    powershell -Command "Expand-Archive -Path 'nssm.zip' -DestinationPath '.'"
    copy "nssm-2.24\win64\nssm.exe" "."
    call :log "Downloaded NSSM"
)

:: Install the service
echo Installing SuperMorse service...
nssm.exe install SuperMorse "%INSTALL_DIR%\SuperMorse.exe"
nssm.exe set SuperMorse DisplayName "SuperMorse Application Service"
nssm.exe set SuperMorse Description "SuperMorse Morse Code Learning Application"
nssm.exe set SuperMorse AppDirectory "%INSTALL_DIR%"
nssm.exe set SuperMorse Start SERVICE_AUTO_START
nssm.exe set SuperMorse ObjectName LocalSystem
nssm.exe start SuperMorse

if %errorLevel% == 0 (
    echo [32m✓ SuperMorse service installed and started[0m
    call :log "SuperMorse service installed and started"
) else (
    echo [31mFailed to install or start SuperMorse service.[0m
    call :log "Failed to install or start SuperMorse service"
)

:: Create desktop shortcut
echo.
echo [33mCreating desktop shortcut...[0m
powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%USERPROFILE%\Desktop\SuperMorse.lnk'); $Shortcut.TargetPath = '%INSTALL_DIR%\SuperMorse.exe'; $Shortcut.Save()"

if %errorLevel% == 0 (
    echo [32m✓ Desktop shortcut created[0m
    call :log "Desktop shortcut created"
) else (
    echo [33mFailed to create desktop shortcut.[0m
    call :log "Failed to create desktop shortcut"
)

echo.
echo [32m====================================================[0m
echo [32m       SuperMorse Installation Complete!       [0m
echo [32m====================================================[0m
echo.
echo The SuperMorse application has been installed and service started!
echo.
echo To check service status, run:
echo [36mnssm.exe status SuperMorse[0m
echo.
echo To stop the service, run:
echo [36mnssm.exe stop SuperMorse[0m
echo.
echo For more information, see the README.md file.
echo.
echo Installation log saved to: %LOGFILE%
echo.
pause