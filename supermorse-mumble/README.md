# Supermorse Modified Mumble Server

This repository contains a modified version of the Mumble server (Murmur) specifically designed for the Supermorse application. The server includes special features for amateur radio simulation, including HF band channels and propagation simulation.

## Features

- **HF Band Channels**: Channels corresponding to amateur radio frequencies (160m, 80m, 60m, 40m, etc.)
- **Propagation Simulation**: Realistic simulation of HF propagation based on Maidenhead grid locators
- **Channel Links**: Simulation of propagation overlap between bands
- **Custom Metadata**: Support for grid locators and preferred bands

## Building the Server

### Prerequisites

- CMake 3.15 or higher
- Qt 5.12 or higher
- C++ compiler with C++14 support (GCC, Clang, MSVC)

### Building on Linux/macOS

```bash
# Clone the repository
git clone https://github.com/Supermagnum/supermorse-mumble.git
cd supermorse-mumble

# Build the server
./build.sh
```

### Building on Windows

```batch
# Clone the repository
git clone https://github.com/Supermagnum/supermorse-mumble.git
cd supermorse-mumble

# Build the server
build.bat
```

## Configuration

The server is configured using the `mumble-server.ini` file in the `config` directory. This file includes settings for:

- Server name and welcome message
- HF band channels
- Channel descriptions
- Channel links for propagation simulation
- Custom metadata fields

## Running the Server

After building, the server executable can be found in the `build/bin` directory. To run the server:

```bash
# Linux/macOS
./build/bin/murmur

# Windows
build\bin\Release\murmur.exe
```

## License

This project is licensed under the BSD License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- The Mumble project for the original server code
- The Supermorse project for the amateur radio simulation features

### HF Band Channels
- Channels corresponding to amateur radio frequencies (160m, 80m, 40m, etc.)
- Channel descriptions with frequency ranges

### Propagation Simulation
- Channel links to simulate propagation overlap between bands
- Support for Maidenhead grid locators
- Distance-based band recommendations

### Custom Metadata Fields
- Maidenhead grid locator field
- Preferred HF band selection

## Building the Server

For detailed instructions on building the modified Mumble server, please refer to the [Mumble Server Deployment Guide](../supermorse-app/docs/mumble-server-setup.md).

## Configuration

The server uses a custom configuration file (`mumble-server.ini`) that sets up the HF band channels and other Supermorse-specific settings. The configuration includes:

- HF band channels (160m, 80m, 60m, 40m, etc.)
- Channel descriptions with frequency ranges
- Channel links for propagation simulation
- Custom metadata fields

## Integration with Supermorse

This modified Mumble server is designed to work with the Supermorse application. The Supermorse application starts and stops this server programmatically and uses it for voice communication and HF simulation.

## License

This project is based on Mumble, which is licensed under the BSD license. See the LICENSE file for details.