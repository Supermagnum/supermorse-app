# Creating a GitHub Beta Release

This document provides step-by-step instructions for creating a GitHub beta release and uploading the built files.

## Step 1: Navigate to the GitHub Repository

Go to your GitHub repository: https://github.com/Supermagnum/supermorse-app

## Step 2: Create a New Release

1. Click on the "Releases" section in the right sidebar
2. Click the "Create a new release" button

## Step 3: Fill in Release Information

1. **Choose a tag**: Click "Choose a tag" and enter `v1.0.0-beta`
2. Select "Create new tag: v1.0.0-beta on publish"
3. **Target**: Select `temp-changes` branch (or merge to main first)
4. **Release title**: `Supermorse Beta 1.0.0`
5. **Check** the "This is a pre-release" checkbox
6. **Description**: Add the following description:

```markdown
# Supermorse Beta 1.0.0

This beta release includes:

## New Features
- Toggle for reduced character group size (4 characters instead of 5) in training
- Improved Morse code pattern display in training interface
- Enhanced input handling for physical Morse keys
- Fixed decoder for ESP32-C6 boards

## Installation Instructions

### Linux
- AppImage: Download, make executable (`chmod +x Supermorse-beta-1.0.0.AppImage`), and run
- Snap: Install with `sudo snap install --dangerous Supermorse-beta-1.0.0.snap`

### Windows
- Download and run the installer
- Uninstaller included separately if needed

## Beta Testing
Please report any issues you encounter with a focus on:
1. Morse code training with reduced group size
2. Morse code pattern display and recognition
3. Arduino integration with physical keys
```

## Step 4: Upload Beta Files

Upload the following files by dragging and dropping them into the "Attach binaries" section:

1. `dist/Linux/Supermorse-beta-1.0.0.AppImage`
2. `dist/Linux/Supermorse-beta-1.0.0.snap`
3. `dist/Windows/Supermorse-beta-1.0.0.exe`
4. `dist/Windows/__uninstaller-nsis-supermorse-app.exe`

## Step 5: Publish the Release

Click the "Publish release" button at the bottom of the page.

## Step 6: Verify the Release

After publishing, verify that:
1. The release appears on the "Releases" page
2. All files are properly attached and downloadable
3. The release is correctly marked as a pre-release

## Troubleshooting

If you encounter any issues during the release process:

- **File size limits**: GitHub has a file size limit of 2GB. If any files exceed this, consider using GitHub LFS or a separate file hosting service
- **Upload errors**: Try refreshing the page and uploading again, or upload files one at a time
- **Authentication issues**: Ensure you have the necessary repository permissions to create releases