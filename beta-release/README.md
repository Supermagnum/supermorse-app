# Supermorse Beta Release

This directory contains information about the latest beta release of Supermorse.

## Beta Release Files

The following files are available for download in the beta release:

### Linux
- `Supermorse-beta-1.0.0.AppImage` - AppImage package for Linux
- `Supermorse-beta-1.0.0.snap` - Snap package for Linux

### Windows
- `Supermorse-beta-1.0.0.exe` - Windows installer
- `__uninstaller-nsis-supermorse-app.exe` - Windows uninstaller

## Installation Instructions

### Linux

#### AppImage
1. Download the `Supermorse-beta-1.0.0.AppImage` file
2. Make it executable: `chmod +x Supermorse-beta-1.0.0.AppImage`
3. Run it: `./Supermorse-beta-1.0.0.AppImage`

#### Snap
1. Download the `Supermorse-beta-1.0.0.snap` file
2. Install it: `sudo snap install --dangerous Supermorse-beta-1.0.0.snap`
3. Run it: `supermorse-app`

### Windows
1. Download the `Supermorse-beta-1.0.0.exe` file
2. Run the installer and follow the prompts
3. Launch Supermorse from the Start menu or desktop shortcut

## Beta Testing

Please report any issues you encounter with this beta release. Pay special attention to the following areas:

1. Morse code training with reduced group size (4 characters)
2. Morse code pattern display and recognition
3. Arduino integration and paddle functionality

## Beta Version Changes

This beta release includes the following improvements:

1. Added toggle for reduced character group size (4 instead of 5) in training
2. Fixed display of Morse code patterns in training
3. Improved input handling for physical Morse keys