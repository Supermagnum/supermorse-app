#!/bin/bash
# Build script for the Supermorse Mumble Server

# Exit on error
set -e

# Create build directory
mkdir -p build
cd build

# Configure with CMake
cmake ..

# Build
cmake --build . --config Release

# Print success message
echo "Build completed successfully!"
echo "The murmur executable can be found in build/bin/"