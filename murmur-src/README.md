# Modified Mumble Server for Supermorse

This directory should contain the modified Mumble server (Murmur) code for the Supermorse application. The server has been customized with special features for amateur radio simulation, including HF band channels and propagation simulation.

## Required Files

The Supermorse application expects to find the following in this directory:

- `murmur` - The compiled Mumble server executable
- Source code for the modified Mumble server (optional, but recommended for building)

## Building the Server

For detailed instructions on building the modified Mumble server, please refer to the [Mumble Server Deployment Guide](../docs/mumble-server-setup.md).

The guide includes:
- Dependencies installation
- Cloning the source code
- Building the server
- Configuration with HF band channels
- Integration with Supermorse

## Features

The modified Mumble server includes:

1. **HF Band Channels**
   - Channels corresponding to amateur radio frequencies (160m, 80m, 40m, etc.)
   - Channel descriptions with frequency ranges

2. **Propagation Simulation**
   - Channel links to simulate propagation overlap between bands
   - Support for Maidenhead grid locators
   - Distance-based band recommendations

3. **Custom Metadata Fields**
   - Maidenhead grid locator field
   - Preferred HF band selection

## Integration with Supermorse

The Supermorse application starts and stops this server programmatically using the path defined in `routes/mumble.js`:

```javascript
const MUMBLE_SERVER_PATH = path.join(__dirname, '../murmur-src/murmur');
```

Make sure the compiled executable is named `murmur` and is placed in this directory.

## Source Repository

The source code for the modified Mumble server should be maintained in a separate repository. After building, place the compiled executable in this directory for the Supermorse application to use.

## Note for Developers

If you're developing or modifying the Supermorse application, you'll need to:

1. Clone the modified Mumble server repository
2. Build the server following the instructions in the deployment guide
3. Copy the compiled executable to this directory
4. Update the configuration in `config/mumble-server.ini` if necessary

This ensures that the Supermorse application can properly start and manage the Mumble server for voice communication and HF simulation.