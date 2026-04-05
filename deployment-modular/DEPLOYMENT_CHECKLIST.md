# Modular Offline Deployment Checklist

## Pre-Deployment Verification

- [ ] All files present in deployment-modular folder
- [ ] assets/ folder contains all JS, CSS, and images
- [ ] images/ folder contains required logos and assets
- [ ] data/ folder contains CSV files (if needed)
- [ ] Python 3 is installed (`python3 --version`)
- [ ] All start-server scripts are executable

## Deployment Steps

### For Local Testing
- [ ] Run `./start-server.sh` (or .bat on Windows)
- [ ] App opens in browser automatically
- [ ] Verify all 6+ application tiles visible
- [ ] Test at least one complete workflow
- [ ] Open DevTools (F12) and check console for errors
- [ ] Clear cache and reload - app still works

### For Network Deployment
- [ ] Copy deployment-modular folder to server
- [ ] Run HTTP server in that folder
- [ ] Access via `http://server-ip:port`
- [ ] Test from multiple client machines
- [ ] Verify offline functionality on one machine

### For USB/Offline Distribution
- [ ] Copy deployment-modular folder to USB drive
- [ ] Test on target machines
- [ ] Ensure Python 3 available (or pre-install)
- [ ] Create user guide for this specific deployment

## File Size Verification

Expected sizes (may vary):
- index.html: 350-400 KB
- style-*.css: 150-200 KB
- index.es-*.js: 200-300 KB
- masterPlanPDF-*.js: 350-400 KB
- Total (all assets): 1.5-2.5 MB

🎯 Goal: Significantly smaller than 3 MB single-file version

## Performance Benchmarks

After deployment, verify:
- Initial page load: < 3 seconds
- Time to interactive: < 2 seconds
- JavaScript available: within 5 seconds
- Service Worker registration: successful
- Offline mode: fully functional

## Security Verification

- [ ] HTTPS used for external deployments (if applicable)
- [ ] CORS headers properly configured
- [ ] No console errors or warnings
- [ ] Admin functions require password
- [ ] Data stays local (no external calls)

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Port in use | Kill process or change port in start-server.py |
| Python not found | Install Python 3, add to PATH |
| CORS errors | Use HTTP server, not file:// |
| Service Worker errors | Check browser console, clear cache |
| Slow load time | Verify no large files missing |

---

**Deployment Date:** _______________
**Deployed By:** ___________________
**Environment:** __________________
**Notes:** _________________________
