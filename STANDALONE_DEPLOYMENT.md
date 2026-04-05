# Standalone Deployment Guide

## Overview
This application can be deployed as a **standalone offline application** that works by simply opening `index.html` in a web browser (Edge, Chrome, Firefox, Safari, etc.) without requiring any server, Python, Node.js, or other software installation.

## What You Need
1. `index.html` - Single HTML file with all JavaScript, CSS, and critical assets inlined (~2-3MB)
2. `images/` folder - Contains image assets (SBI logo, etc.)
3. Nothing else - no server, no node_modules, no additional setup

## Deployment Steps

### For End Users: Accessing the App

**Setup (one-time):**
1. Receive `index.html` and `images/` folder (via email, USB drive, download, etc.)
2. **IMPORTANT**: Keep them in the same folder
3. Double-click `index.html` (or right-click → Open with → [your browser])
4. Bookmark it for quick access next time

**Using the App:**
- ✅ Works completely offline
- ✅ All data stored locally in browser (IndexedDB)
- ✅ No account needed
- ✅ No internet required

### For Developers: Building the Standalone Version

To create a deployment-ready standalone build:

```bash
# Run the standalone build script
./build-standalone.sh

# Or manually:
BUILD_MODE=deployment pnpm run build
cp dist/public/index.html deployment/
cp -r dist/public/images deployment/
```

This generates:
- **deployment/index.html** - Complete app in single file (~2-3MB)
- **deployment/images/** - All image assets

## File Structure for Deployment
```
your-deployment-folder/
├── index.html          (MUST be in same folder as images/)
└── images/
    ├── sbi-logo.png
    └── ... (other images)
```

**CRITICAL**: The `images/` folder MUST be in the same directory as `index.html`. Do not separate them.

## Browser Compatibility
- ✅ Microsoft Edge (Recommended - most reliable file:// access)
- ✅ Google Chrome (fully supported)
- ✅ Mozilla Firefox (fully supported)
- ✅ Safari (fully supported)

## Data Storage & User Privacy
- All data stored in **browser's IndexedDB** (not in files)
- Data is **specific to each browser and computer**
- Clearing browser cache/cookies will delete app data
- Users can export data for backup (feature in app if implemented)

## Offline Capability
- ✅ 100% offline - zero internet required
- ✅ No server needed
- ✅ No installation required
- ✅ Can be copied to USB drive/network share
- ✅ Works on any Windows/Mac/Linux computer with a browser

## Updating to New Version
1. Developers: Create new build with `./build-standalone.sh`
2. Users: Download new `index.html` and `images/` folder
3. Users: **Backup existing data first** (if possible)
4. Users: Replace old files with new ones
5. Users: Open in browser - **data persists** (stored in browser, not files)

### User Data Persistence
⚠️ Important: User data is stored in the browser's IndexedDB, NOT in the HTML/image files. So:
- ✅ Users can safely replace index.html without losing data (different file format)
- ✅ Data follows them across sessions (unless browser cache is cleared)
- ❌ Clearing browser data/cache will erase all stored information

## Troubleshooting

### Problem: Old version still showing after update
**Solution:**
1. Close all browser windows
2. Clear browser cache:
   - Windows: Press `Ctrl + Shift + Delete` → Clear "Cached images and files"
   - Mac: In app menu → Settings → Privacy → Clear browsing data → Check "Cached images and files"
3. Delete old `index.html` file
4. Copy new `index.html` to folder
5. Open new index.html in browser

### Problem: Images not showing
**Solution:**
- Verify `images/` folder is in same directory as `index.html`
- Check folder name is exactly `images` (lowercase, no spaces)
- Ensure all image files are intact in the images/ folder

### Problem: App won't load at all
**Solution:**
1. Try a different browser
2. Make sure you're opening `index.html` (double-click or right-click → Open with)
3. Try copying files to a different folder
4. Check that images/ folder hasn't been moved or renamed

### Problem: Data disappeared
**Solution:**
- Data is stored per browser - verify you're using the same browser
- Check if browser data was cleared
- Restore from backup if available
- Unfortunately, if IndexedDB was cleared without backup, data cannot be recovered

### Problem: Getting browser security warnings
**Solution:**
- This is normal when opening local files (file:// protocol)
- Click "Allow" or "Allow blocked content" when prompted
- Some browsers (especially Chrome) have stricter security - try Edge or Firefox instead

## Technical Details

### Build Configuration
The app uses Vite for building with two modes:

**Development Build** (default):
```bash
pnpm build
```
- Creates code-split bundles (separate JS/CSS files)
- Smaller index.html (~360KB)
- Better caching for developers
- Requires HTTP server (can't use file://)

**Deployment Build**:
```bash
BUILD_MODE=deployment pnpm build
```
- Uses `viteSingleFile` plugin to inline all code
- Creates single index.html (~2-3MB)
- Works offline via file:// protocol
- Users can double-click to run

### Service Worker (Offline Caching)
The app includes a service worker for offline functionality:
- Pre-caches critical assets on first load
- Automatically caches new assets when accessed
- Provides offline fallback pages
- Cache version: `sbi-branch-app-v3`

### Why Single File for File:// Access?
Browsers block loading external JS/CSS files from `file://` URLs for security reasons. The single-file approach inlines everything into the HTML document, bypassing this restriction. The service worker is still registered but primarily helps with offline caching and navigation.

## Performance Notes

**File Size:**
- Single-file deployment: ~2-3MB (includes all code, styles, and essential assets)
- This is normal for a full React application with UI library
- First load downloads entire file once, then cached by browser
- Subsequent opens are instant (loaded from cache)

**Browser Compatibility:**
- Works better in Edge/Chrome for file:// access
- Firefox and Safari may have additional prompts
- Modern browsers (2020+) recommended

## Support & Questions

If users encounter issues:
1. Try a different browser
2. Ensure the complete `index.html` and `images/` folder are present
3. Try clearing browser cache (Ctrl/Cmd + Shift + Delete)
4. Consult the "Troubleshooting" section above

- **Build Tool**: Vite with `vite-plugin-singlefile`
- **Framework**: React 19
- **Styling**: Tailwind CSS 4
- **Storage**: IndexedDB (via browser)
- **Size**: ~2.1MB (single HTML file)
- **Protocol**: Works with `file://` protocol (local file system)

## Security Notes

- This application runs entirely in the browser (client-side only)
- No data is sent to external servers
- All processing happens locally on your PC
- Safe to use on restricted/air-gapped systems
