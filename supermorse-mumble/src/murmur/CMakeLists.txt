# Copyright The Mumble Developers. All rights reserved.
# Use of this source code is governed by a BSD-style license
# that can be found in the LICENSE file at the root of the
# Mumble source tree or at <https://www.mumble.info/LICENSE>.

cmake_minimum_required(VERSION 3.15)

# Set the project name and version
project(supermorse-mumble VERSION 1.0.0)

# Find Qt packages
find_package(Qt5 COMPONENTS Core Network Sql REQUIRED)

# Set C++ standard
set(CMAKE_CXX_STANDARD 14)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Set compiler flags
if(MSVC)
    # Visual Studio
    add_compile_options(/W4 /MP)
else()
    # GCC/Clang
    add_compile_options(-Wall -Wextra -pedantic)
endif()

# Define the source files
set(SOURCES
    main.cpp
    Server.cpp
    HFBandSimulation.cpp
    ServerApplication.cpp
)

# Define the header files
set(HEADERS
    Server.h
    HFBandSimulation.h
    ServerApplication.h
)

# Create the executable
add_executable(murmur ${SOURCES} ${HEADERS})

# Link Qt libraries
target_link_libraries(murmur PRIVATE
    Qt5::Core
    Qt5::Network
    Qt5::Sql
)

# Include directories
target_include_directories(murmur PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_BINARY_DIR}
)

# Install the executable
install(TARGETS murmur DESTINATION bin)

# Install the configuration file
install(FILES ${CMAKE_SOURCE_DIR}/config/mumble-server.ini DESTINATION etc)