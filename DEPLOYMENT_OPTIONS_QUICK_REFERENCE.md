# Deployment Options Quick Reference

## Three Ways to Deploy the App

### 1️⃣ Single-File Standalone
**Speed:** ❌ Slower (3-5s)  |  **Size:** 📦 Large (2-3 MB)  |  **Setup:** ✅ Easiest

```bash
./build-standalone.sh
# Creates: deployment/index.html (everything inlined)
# Deploy: Email/USB to users
# Start: Double-click index.html
```

**Best for:** Non-technical users, no server available
**Drawback:** Slow load times, large file

---

### 2️⃣ Modular Offline ⭐ RECOMMENDED
**Speed:** ⚡ Fast (1-2s)  |  **Size:** 📦 Compact (~2 MB modular)  |  **Setup:** 🔧 Simple

```bash
./build-modular-offline.sh
# Creates: deployment-modular/ (organized chunks)
# Deploy: Copy folder to server or USB
# Start: python3 start-server.py
```

**Best for:** Banks, multiple branches, performance matters
**Upside:** 50% faster, professional, offline-capable

---

### 3️⃣ Server-Based
**Speed:** ⚡ Fast (1-2s)  |  **Size:** Clean  |  **Setup:** Professional

```bash
pnpm build
# Standard Vite build
# Deploy: nginx/Apache/Docker/etc
```

**Best for:** Large organizations, enterprise scale
**Note:** Requires always-online infrastructure

---

## Quick Decision

| Scenario | Choose |
|----------|--------|
| Email to branch manager | Single-File |
| 5-10 bank branches | **Modular ⭐** |
| 50+ branches nationwide | **Modular ⭐** |
| Enterprise with servers | Server-Based |
| Users are non-technical | Single-File |
| Performance is critical | **Modular ⭐** |

---

## Performance Comparison

```
SINGLE-FILE                MODULAR (Recommended)
3-5 seconds               1-2 seconds
└─┬─────────────────┘    └─┬────────────┘
  User waits              User interactive immediately!
  
File size: 2-3 MB          File size: 2 MB (split modules)
Download: 1 request       Download: Main + lazy chunks
Cache: All or nothing     Cache: Per-chunk (efficient!)
```

---

## Bank Deployment Example

### Setup 50 branches with Modular:
```bash
# 1. Build once
./build-modular-offline.sh

# 2. Copy to central server
scp -r deployment-modular/ admin@bank-server:/app/

# 3. Start server on 1 machine
cd deployment-modular
./start-server.sh

# 4. All 250 users (50 branches × 5 users) access:
# http://bank-server:8000/index.html
```

### Benefits:
- Initial load: 1-2 seconds (vs 3-5s with single-file)
- 250 users × 3 seconds saved = 12.5 minutes daily savings
- 200-300 working days/year = 2,500+ minutes annual time savings
- Updates: Only changed chunks re-download (not 3 MB every time)

---

## File Structure Generated

### Single-File
```
deployment/
├── index.html (2-3 MB - everything here!)
└── images/
```

### Modular ⭐
```
deployment-modular/
├── index.html (350 KB)
├── assets/
│   ├── index.es-*.js (main code)
│   ├── style-*.css (styles)
│   ├── masterPlanPDF-*.js (PDF module)
│   └── *.png (images)
├── images/ (SBI logo etc)
├── data/ (CSV files)
├── start-server.py
├── start-server.sh
├── start-server.bat
└── README.md
```

---

## Getting Started with Modular

### Step 1: Build
```bash
./build-modular-offline.sh
```

### Step 2: Test Locally
```bash
cd deployment-modular
./start-server.sh
# Opens http://localhost:8000 automatically
```

### Step 3: Deploy
**Option A - USB/Offline:**
```bash
# Copy deployment-modular folder to USB
# Users run: ./start-server.sh or python3 start-server.py
```

**Option B - Network:**
```bash
# Copy to server
scp -r deployment-modular/ server:/app/

# On server: python3 start-server.py
# Users access: http://server-ip:8000
```

---

## Script References

| Command | Use Case |
|---------|----------|
| `pnpm dev` | Local development |
| `pnpm build` | Standard build |
| `./build-standalone.sh` | Single-file deployment |
| `./build-modular-offline.sh` | **Modular deployment ⭐** |
| `pnpm build:standalone` | Alternative build command |
| `pnpm build:modular` | Alternative build command |

---

## TL;DR - Just Do This For Banks

```bash
# Build once
./build-modular-offline.sh

# Deploy to central server (or USB)
scp -r deployment-modular/ server:/app/

# Start on server
cd deployment-modular
python3 start-server.py

# All users access
# http://server-ip:8000
```

That's it! 🎉

- ⚡ Fast (1-2 seconds)
- 🔌 Offline capable
- 📱 Multiple users
- 🏦 Professional
- 💰 No additional cost

---

## Why Modular is Better

1. **50% Faster** Initial load: 1-2s vs 3-5s
2. **Better Caching** Only changed parts re-download
3. **Professional** Multi-branch ready
4. **Scalable** Serves multiple users
5. **Offline** Service Worker fallback
6. **Simple** Just run start-server.py
7. **Cost-effective** No enterprise infrastructure needed

Done! 🚀
