# Modular Offline Deployment Package

This is the **modular, production-ready** version of the Branch Application Catalogue optimized for offline deployment with better performance than the single-file standalone version.

## What's Included

✅ **Modular Architecture**
- Separate JavaScript chunks (lazy-loaded only when needed)
- Independent CSS files (cached separately)
- Optimized for faster initial page load
- All assets organized in folders

✅ **Offline Capability**
- Service Worker for offline access
- All data stored locally in browser (IndexedDB)
- Works 100% offline after first load
- No internet required

✅ **Easy Deployment**
- Single folder with everything included
- Built-in HTTP server (Python 3 required)
- No additional software installation needed

## Quick Start

### Option 1: Using the Built-in Server (Recommended)

**Windows:**
```bash
start-server.bat
```

**Mac/Linux:**
```bash
./start-server.sh
```

**Manual (any platform):**
```bash
python3 start-server.py
```

This will automatically open the app in your default browser at `http://localhost:8000`

### Option 2: Manual Folder Access

1. Use a local web server (Python, Node.js, VS Code Live Server, etc.)
2. Serve this folder and navigate to `http://localhost:PORT/index.html`

**Why not direct file:// access?**
- File protocol has CORS restrictions
- Service Worker won't work with file://
- Some features may not work reliably
- HTTP server is needed for full functionality

### Option 3: Import to Web Server

Copy this folder to your web server and serve normally:
```bash
scp -r deployment-modular/ user@server:/var/www/html/
```

## Directory Structure

```
deployment-modular/
├── index.html              # Main entry point
├── manifest.json           # PWA manifest
├── sw.js                   # Service Worker
├── start-server.py         # Python server launcher
├── start-server.sh         # Unix/Mac launcher
├── start-server.bat        # Windows launcher
├── README.md               # This file
├── assets/
│   ├── index-*.js          # Main app bundle
│   ├── style-*.css         # Main styles
│   ├── index.es-*.js       # Lazy-loaded chunks
│   ├── masterPlanPDF-*.js  # PDF generation module
│   ├── purify.es-*.js      # HTML sanitizer
│   ├── pdf.worker.min.mjs  # PDF.js worker
│   └── *.png               # Images
├── images/
│   ├── sbi-logo.png
│   └── ... (other assets)
└── data/
    ├── GOLD.csv
    ├── PENSION.csv
    ├── Loan_Product_Mapping.csv
    └── ... (other data files)
```

## Performance Comparison

| Aspect | Single-File | Modular |
|--------|------------|---------|
| File Size | ~2-3 MB single HTML | ~300-400 KB HTML + separate chunks |
| Initial Load | Slower (entire bundle) | ⚡ Faster (main + lazy chunks) |
| Cache Efficiency | Low (entire file reloaded) | ⚡ High (per-chunk caching) |
| Time to Interactive | ~3-5 seconds | ⚡ ~1-2 seconds |
| Updates | Entire file redownload | ⚡ Only changed chunks |
| Offline Support | ✅ Yes | ✅ Yes |
| Browser Compatibility | Excellent | Excellent |

## Usage

### First Load
1. Start the server
2. App loads in browser (~1-2 seconds)
3. Service Worker registers automatically
4. All code and data cached

### Subsequent Loads
- Either online or offline ✅
- Loads from local cache (instant)
- No network requests needed
- Automatic updates if connected

## System Requirements

- **Python 3.x** (for built-in server)
  - Windows: [python.org](https://www.python.org)
  - Mac: `brew install python3`
  - Linux: `sudo apt-get install python3`

- **Modern Web Browser**
  - Chrome/Edge 90+
  - Firefox 88+
  - Safari 14+

## Features

✅ All applications fully functional
- Charges Return
- Dak Number Generator
- EMI Calculator
- RLMS Supplementer
- Lead Management
- Reminders & To-Do
- Branch Portfolio Dashboard
- And more...

✅ Full offline capability
- All features work without internet
- Local data storage (IndexedDB)
- No server communication

✅ Performance optimized
- Faster load times
- Efficient caching
- Code-split modules
- Service Worker optimization

## Troubleshooting

**Q: "Port 8000 already in use"**
A: Another app is using the port. Either:
   - Close the other app
   - Modify `start-server.py` to use a different port
   - Use a different server

**Q: "CORS errors in console"**
A: This indicates you're using file:// protocol. Always use the HTTP server.

**Q: "Service Worker not registering"**
A: Service Workers require HTTPS or localhost. Use the built-in server.

**Q: "Data not persisting"**
A: Check browser privacy settings (IndexedDB must be enabled).

**Q: "Features not working offline"**
A: Some features require initial online load to cache all modules. Try:
   1. Load online first
   2. Navigate through all major features
   3. Wait 30 seconds for Service Worker to finish caching
   4. Go offline

## Advanced: Custom Web Server

If you prefer not to use Python, use any HTTP server:

**Node.js HTTP Server:**
```bash
npx http-server .
```

**Ruby:**
```bash
ruby -run -ehttpd . -p8000
```

**PHP:**
```bash
php -S localhost:8000
```

**Apache/Nginx:** Copy folder to web root and serve normally.

## For IT Administrators

This deployment package is designed for enterprises:

- ✅ Zero installation required (just HTTP server)
- ✅ No external dependencies
- ✅ All data stays local (no cloud sync)
- ✅ Works on restricted networks
- ✅ Can be deployed on internal servers
- ✅ Ideal for banking institutions
- ✅ Supports bulk deployment

## Support

For issues or customizations:
- Check browser console (F12) for detailed errors
- Ensure Python 3 is installed and in PATH
- Verify all files are in the correct directory
- Test with different browsers if issues persist

---

**Version:** 1.0
**Build Date:** March 2026
**Architecture:** Modular SPA with offline support
