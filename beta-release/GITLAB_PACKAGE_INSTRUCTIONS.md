# Publishing Supermorse Beta to GitLab Package Registry

This document provides instructions for uploading the Supermorse beta release files to GitLab Package Registry, which is better suited for large files than GitHub Releases.

## Step 1: Set Up a GitLab Project

If you don't already have a GitLab project for Supermorse:

1. Go to [GitLab.com](https://gitlab.com/) and sign in
2. Click "New project" → "Create blank project"
3. Name it "supermorse-app"
4. Set visibility to Public (or Private if preferred)
5. Click "Create project"

## Step 2: Configure Package Registry Access

1. Go to your GitLab project
2. Navigate to "Settings" → "General"
3. Expand "Visibility, project features, permissions"
4. Ensure "Packages" is enabled
5. Save changes

## Step 3: Generate a Personal Access Token

1. Click on your profile in the top-right corner
2. Select "Preferences"
3. Go to "Access Tokens" in the left sidebar
4. Create a new personal access token:
   - Name: `supermorse-package-upload`
   - Expiration: Set appropriate date (or leave blank for no expiration)
   - Scopes: Select `api`, `read_api`, `read_repository`, `write_repository`
   - Click "Create personal access token"
5. **Important**: Copy the token immediately as it won't be shown again

## Step 4: Upload Beta Files

You can upload the packages using the GitLab Package API with curl commands:

### For Linux AppImage:

```bash
curl --request POST \
  --form 'file=@dist/Linux/Supermorse-beta-1.0.0.AppImage' \
  --url "https://gitlab.com/api/v4/projects/YOUR_PROJECT_ID/packages/generic/supermorse-beta/1.0.0/Supermorse-beta-1.0.0.AppImage" \
  --header "PRIVATE-TOKEN: YOUR_PERSONAL_ACCESS_TOKEN"
```

### For Linux Snap:

```bash
curl --request POST \
  --form 'file=@dist/Linux/Supermorse-beta-1.0.0.snap' \
  --url "https://gitlab.com/api/v4/projects/YOUR_PROJECT_ID/packages/generic/supermorse-beta/1.0.0/Supermorse-beta-1.0.0.snap" \
  --header "PRIVATE-TOKEN: YOUR_PERSONAL_ACCESS_TOKEN"
```

### For Windows Executable:

```bash
curl --request POST \
  --form 'file=@dist/Windows/Supermorse-beta-1.0.0.exe' \
  --url "https://gitlab.com/api/v4/projects/YOUR_PROJECT_ID/packages/generic/supermorse-beta/1.0.0/Supermorse-beta-1.0.0.exe" \
  --header "PRIVATE-TOKEN: YOUR_PERSONAL_ACCESS_TOKEN"
```

### For Windows Uninstaller:

```bash
curl --request POST \
  --form 'file=@dist/Windows/__uninstaller-nsis-supermorse-app.exe' \
  --url "https://gitlab.com/api/v4/projects/YOUR_PROJECT_ID/packages/generic/supermorse-beta/1.0.0/supermorse-uninstaller-beta-1.0.0.exe" \
  --header "PRIVATE-TOKEN: YOUR_PERSONAL_ACCESS_TOKEN"
```

**Note**: Replace `YOUR_PROJECT_ID` with your GitLab project ID (found on your project's home page) and `YOUR_PERSONAL_ACCESS_TOKEN` with the token generated in Step 3.

## Step 5: Create a GitLab Release

1. Go to your GitLab project
2. Navigate to "Deploy" → "Releases"
3. Click "New release"
4. Fill in:
   - Tag name: `v1.0.0-beta`
   - Release title: `Supermorse Beta 1.0.0`
   - Release notes: Copy the description from below
5. Click "Create release"

### Release Description:

```markdown
# Supermorse Beta 1.0.0

This beta release includes:

## New Features
- Toggle for reduced character group size (4 characters instead of 5) in training
- Improved Morse code pattern display in training interface
- Enhanced input handling for physical Morse keys
- Fixed decoder for ESP32-C6 boards

## Download Links

### Linux
- [AppImage](https://gitlab.com/YOUR_USERNAME/supermorse-app/-/package_files/PACKAGE_ID/download?filename=Supermorse-beta-1.0.0.AppImage)
- [Snap](https://gitlab.com/YOUR_USERNAME/supermorse-app/-/package_files/PACKAGE_ID/download?filename=Supermorse-beta-1.0.0.snap)

### Windows
- [Installer](https://gitlab.com/YOUR_USERNAME/supermorse-app/-/package_files/PACKAGE_ID/download?filename=Supermorse-beta-1.0.0.exe)
- [Uninstaller](https://gitlab.com/YOUR_USERNAME/supermorse-app/-/package_files/PACKAGE_ID/download?filename=supermorse-uninstaller-beta-1.0.0.exe)

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

**Note**: After uploading packages, replace `YOUR_USERNAME` and `PACKAGE_ID` in the download links with your GitLab username and the package file IDs (these can be found by clicking on each package in the Packages section of your project).

## Step 6: Verify the Package Registry

1. Go to your GitLab project
2. Navigate to "Deploy" → "Package Registry"
3. You should see a "supermorse-beta" package with version 1.0.0
4. Click on it to view the uploaded files
5. Verify all files are correctly uploaded and accessible

## Additional Information

- GitLab Package Registry has higher file size limits than GitHub Releases (10GB per file on GitLab.com)
- For even larger files, consider using GitLab LFS (Large File Storage)
- Files uploaded to the Package Registry can be downloaded via direct links, without needing to clone the repository
- GitLab Package Registry supports various package formats, but we're using the "generic" type for maximum flexibility