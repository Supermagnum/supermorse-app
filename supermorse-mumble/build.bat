@echo off
REM Build and installation script for the Supermorse Mumble Server on Windows

REM Check for required dependencies
echo Checking for required dependencies...

REM Check for CMake
where cmake >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo CMake not found! Please install CMake from https://cmake.org/download/
    exit /b 1
)

REM Check for Visual Studio or other compilers
echo Checking for compiler...
where cl >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Visual C++ compiler not found!
    echo Please install Visual Studio with C++ development tools.
    echo Visit: https://visualstudio.microsoft.com/downloads/
    exit /b 1
)

REM Check for Qt
echo Checking for Qt...
if not defined Qt5_DIR (
    echo Qt5_DIR environment variable not set.
    echo Please install Qt and set Qt5_DIR to point to your Qt installation.
    echo For example: set Qt5_DIR=C:\Qt\5.15.2\msvc2019_64\lib\cmake\Qt5
    echo Visit: https://www.qt.io/download-qt-installer
    exit /b 1
)

REM Create build directory
if not exist build mkdir build
cd build

REM Configure with CMake
echo Configuring with CMake...
cmake ..

REM Build
echo Building the project...
cmake --build . --config Release

REM Check if installation should be performed
echo.
set /p INSTALL_CHOICE=Do you want to install the server? (y/n): 

if /i "%INSTALL_CHOICE%"=="y" (
    REM Determine installation directory
    echo.
    echo Choose an installation option:
    echo 1. Install to Program Files (requires administrator privileges)
    echo 2. Install to a custom directory
    echo.
    set /p INSTALL_OPTION=Enter your choice (1 or 2): 
    
    if "%INSTALL_OPTION%"=="1" (
        REM Request admin privileges if not already running as admin
        echo Installing to Program Files requires administrator privileges.
        echo The installation will proceed with admin rights.
        
        REM Create an elevated process to perform the installation
        echo Creating installation files...
        
        REM Create a temporary script to run as admin
        echo @echo off > install_admin.bat
        echo setlocal >> install_admin.bat
        echo set INSTALL_DIR=%%ProgramFiles%%\SuperMorse >> install_admin.bat
        echo mkdir "%%INSTALL_DIR%%" >> install_admin.bat
        echo mkdir "%%INSTALL_DIR%%\bin" >> install_admin.bat
        echo mkdir "%%INSTALL_DIR%%\config" >> install_admin.bat
        echo mkdir "%%INSTALL_DIR%%\data" >> install_admin.bat
        echo copy "bin\Release\murmur.exe" "%%INSTALL_DIR%%\bin\" >> install_admin.bat
        echo copy "..\config\mumble-server.ini" "%%INSTALL_DIR%%\config\" >> install_admin.bat
        
        REM Create empty JSON file for user data
        echo echo {} ^> "%%INSTALL_DIR%%\data\users.json" >> install_admin.bat
        
        REM Update config file to use JSON instead of SQLite
        echo powershell -Command "(Get-Content '%%INSTALL_DIR%%\config\mumble-server.ini') -replace 'database=.*', 'database=%%INSTALL_DIR%%\data\users.json' | Set-Content '%%INSTALL_DIR%%\config\mumble-server.ini'" >> install_admin.bat
        
        REM Create a shortcut to start the server
        echo echo Set oWS = WScript.CreateObject^("WScript.Shell"^) > "%%TEMP%%\create_shortcut.vbs" >> install_admin.bat
        echo echo sLinkFile = "%%ProgramData%%\Microsoft\Windows\Start Menu\Programs\SuperMorse\SuperMorse Server.lnk" >> install_admin.bat
        echo echo Set oLink = oWS.CreateShortcut^(sLinkFile^) >> install_admin.bat
        echo echo oLink.TargetPath = "%%INSTALL_DIR%%\bin\murmur.exe" >> install_admin.bat
        echo echo oLink.Arguments = "-ini %%INSTALL_DIR%%\config\mumble-server.ini" >> install_admin.bat
        echo echo oLink.WorkingDirectory = "%%INSTALL_DIR%%\bin" >> install_admin.bat
        echo echo oLink.Description = "SuperMorse Mumble Server" >> install_admin.bat
        echo echo oLink.Save >> install_admin.bat
        echo cscript "%%TEMP%%\create_shortcut.vbs" >> install_admin.bat
        echo del "%%TEMP%%\create_shortcut.vbs" >> install_admin.bat
        
        REM Create Start Menu folder
        echo mkdir "%%ProgramData%%\Microsoft\Windows\Start Menu\Programs\SuperMorse" >> install_admin.bat
        
        echo echo Installation completed successfully! >> install_admin.bat
        echo echo The server has been installed to %%INSTALL_DIR%% >> install_admin.bat
        echo echo User database is stored as a JSON file at: %%INSTALL_DIR%%\data\users.json >> install_admin.bat
        echo echo A shortcut has been added to the Start Menu. >> install_admin.bat
        echo pause >> install_admin.bat
        
        REM Run the temporary script with elevated privileges
        echo Running installation with admin privileges...
        powershell -Command "Start-Process -FilePath 'install_admin.bat' -Verb RunAs"
        
    ) else if "%INSTALL_OPTION%"=="2" (
        REM Custom installation directory
        echo.
        set /p CUSTOM_DIR=Enter the installation directory path: 
        
        echo.
        echo Installing to %CUSTOM_DIR%...
        
        REM Create necessary directories
        mkdir "%CUSTOM_DIR%"
        mkdir "%CUSTOM_DIR%\bin"
        mkdir "%CUSTOM_DIR%\config"
        mkdir "%CUSTOM_DIR%\data"
        
        REM Copy files
        copy "bin\Release\murmur.exe" "%CUSTOM_DIR%\bin\"
        copy "..\config\mumble-server.ini" "%CUSTOM_DIR%\config\"
        
        REM Create empty JSON file for user data
        echo {} > "%CUSTOM_DIR%\data\users.json"
        
        REM Update config file to use JSON instead of SQLite
        powershell -Command "(Get-Content '%CUSTOM_DIR%\config\mumble-server.ini') -replace 'database=.*', 'database=%CUSTOM_DIR%\data\users.json' | Set-Content '%CUSTOM_DIR%\config\mumble-server.ini'"
        
        echo.
        echo Installation completed successfully!
        echo The server has been installed to %CUSTOM_DIR%
        echo User database is stored as a JSON file at: %CUSTOM_DIR%\data\users.json
        echo To start the server, run: %CUSTOM_DIR%\bin\murmur.exe -ini %CUSTOM_DIR%\config\mumble-server.ini
    ) else (
        echo Invalid option selected. Installation aborted.
        exit /b 1
    )
) else (
    echo.
    echo Installation skipped. The murmur executable can be found in build\bin\Release\
)

REM Return to the original directory
cd ..

echo.
echo Build process completed!