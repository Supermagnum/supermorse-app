@echo off
REM Build script for the Supermorse Mumble Server on Windows

REM Create build directory
if not exist build mkdir build
cd build

REM Configure with CMake
cmake ..

REM Build
cmake --build . --config Release

REM Print success message
echo Build completed successfully!
echo The murmur executable can be found in build\bin\Release\