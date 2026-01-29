# Standalone Deployment Guide

## Overview
This application can be deployed as a **standalone offline application** that works by simply opening `index.html` in a web browser (Edge, Chrome, Firefox, etc.) without requiring any server, Python, Node.js, or other software installation.

## What You Need
1. `index.html` - Single HTML file with all JavaScript and CSS inlined (2.1MB)
2. `images/` folder - Contains all image assets (SBI logo, etc.)

## Deployment Steps

### Method 1: Download from Code Panel (Recommended)
1. In Manus Management UI, go to **Code** panel
2. Click **"Download all files"**
3. Extract the zip file
4. Look for `index.html` and `images/` folder in the root
5. Copy both to your desired location
6. Double-click `index.html` to open

### Method 2: Download from GitHub
1. Go to your GitHub repository
2. Click **Code** → **Download ZIP**
3. Extract the zip file
4. Look for `index.html` and `images/` folder in the root
5. Copy both to your desired location
6. Double-click `index.html` to open

## Important Notes

### File Structure
```
your-folder/
├── index.html          (Must be in same folder as images/)
└── images/
    ├── sbi-logo.png
    └── ... (other images)
```

**CRITICAL**: The `images/` folder MUST be in the same directory as `index.html`. Do not separate them.

### Browser Compatibility
- ✅ Microsoft Edge (Recommended)
- ✅ Google Chrome
- ✅ Mozilla Firefox
- ✅ Safari

### Data Storage
- All data (BGL Master, Charge Entries, Reports, etc.) is stored in **browser's IndexedDB**
- Data is specific to each browser and PC
- To backup data, use the app's export functionality (if available)
- Clearing browser data will delete all stored information

### Offline Capability
- ✅ Works 100% offline - no internet required
- ✅ No server needed
- ✅ No installation required
- ✅ Can be copied to USB drive and used on any PC

### Updating to New Version
1. Download the new version (index.html + images/)
2. **Backup your data first** (export from the app if possible)
3. Replace old files with new ones
4. Open in browser - your data should persist (stored in browser, not files)

### Troubleshooting

**Problem**: Old version still showing after update
**Solution**: 
1. Close all browser windows
2. Press `Ctrl + Shift + Delete` (Windows) or `Cmd + Shift + Delete` (Mac)
3. Clear "Cached images and files"
4. Reopen index.html

**Problem**: Images not showing
**Solution**: 
- Verify `images/` folder is in the same directory as `index.html`
- Check that folder name is exactly `images` (lowercase, no spaces)

**Problem**: Data disappeared
**Solution**:
- Data is stored per browser - make sure you're using the same browser
- Check if browser data was cleared
- Unfortunately, if IndexedDB was cleared, data cannot be recovered unless backed up

## Building Standalone Version (For Developers)

If you're modifying the source code and need to rebuild:

```bash
# Run the standalone build script
./build-standalone.sh

# Or manually:
pnpm run build
cp dist/public/index.html .
sed -i 's|/images/|images/|g' index.html
cp -r dist/public/images .
```

## Technical Details

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
