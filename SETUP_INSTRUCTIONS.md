# Setup Instructions - Branch Application Catalogue

## Overview

The Branch Application Catalogue is a comprehensive web-based platform for bank branch operations. It provides six integrated applications in a unified interface with local data storage and offline functionality.

## System Requirements

### Minimum Requirements
- Modern web browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- JavaScript enabled
- IndexedDB support (enabled by default in modern browsers)
- Minimum 100MB available browser storage

### Recommended
- Google Chrome or Microsoft Edge (latest version)
- 4GB RAM or higher
- 1920x1080 screen resolution or higher

## Installation

### Development Environment

**Prerequisites:**
- Node.js 18+ installed
- pnpm package manager

**Steps:**

1. **Navigate to project directory:**
```bash
cd /home/ubuntu/branch-app-catalogue
```

2. **Install dependencies:**
```bash
pnpm install
```

3. **Start development server:**
```bash
pnpm dev
```

4. **Open in browser:**
Navigate to `http://localhost:3000`

### Production Build

**Build for production:**
```bash
pnpm build
```

**Preview production build:**
```bash
pnpm preview
```

**Deploy:**
The built files in `dist/` folder can be deployed to any static hosting service.

## Initial Configuration

### Step 1: Access the Application

1. Open the application URL in your web browser
2. You will see the Branch Application Catalogue landing page
3. Six application cards will be displayed

### Step 2: Admin Login

1. Click "Admin Login" button in the top-right corner
2. Enter admin credentials:
   - **Username:** `Admin`
   - **Password:** `sbi@13042`
3. Click "Login"
4. You are now logged in as administrator

### Step 3: Configure Branch Details

1. After logging in, click "Branch Config" button (appears next to Logout)
2. Enter your branch information:
   - **Branch Code:** 5-digit number (e.g., `12345`)
   - **Branch Name:** Up to 30 characters (e.g., `Mumbai Central Branch`)
3. Click "Save"
4. The branch name will now appear in all application headers
5. The branch code will be used in reference numbers (Dak numbers, notice references)

### Step 4: Verify Configuration

1. Click on any application card (e.g., "Dak Number Generator")
2. Verify that the header shows your branch name
3. Generate a test record to verify branch code appears in reference numbers
4. Return to landing page

## Application-Specific Setup

### Loan Recovery Notice Generator

**Initial Setup:**
1. Click the "Loan Recovery Notice Generator" card
2. As admin, click "Manage Templates"
3. Create your first template:
   - Click "Create New Template"
   - Choose "Text Template" for easier setup
   - Type or paste your letter template
   - Click field names to insert placeholders (e.g., `{{CUSTOMER_NAME}}`)
   - Save with a descriptive name (e.g., "Standard Recovery Notice")

**CSV File Preparation:**
Your CSV file must contain these columns:
```
SR_NO, ACCOUNT_NO, CUSTOMER_NAME, FATHER_NAME, SPOUSE_NAME,
ADDRESS1, ADDRESS2, ADDRESS3, POSTCODE, OUTSTANDING, MOBILE
```

### Dak Number Generator

**Initial Setup:**
1. Click the "Dak Number Generator" card
2. The system will automatically initialize with the current financial year
3. No additional setup required
4. Start generating Dak numbers immediately

### EMI Calculator

**Initial Setup:**
No setup required. The calculator is ready to use immediately with preset loan types and interest rates.

### Reminder & To-Do

**Initial Setup:**
1. Click the "Reminder & To-Do" card
2. As admin, add initial tasks:
   - Click "Add Task"
   - Enter task name, select frequency, set due date
   - Click "Save"
3. Tasks will appear in category sections (Overdue, Due Today, etc.)

### Lead Management System

**Initial Setup:**
1. Click the "Lead Management System" card
2. Add your first lead:
   - Click "Add Lead"
   - Enter customer details and follow-up date
   - Click "Save Lead"
3. Dashboard statistics will update automatically

### Web Resource Hub

**Initial Setup:**
1. Click the "Web Resource Hub" card
2. As admin, add frequently used websites:
   - Click "Add Resource"
   - Enter URL, name, and select category
   - Click "Add"
3. Resources will appear in grid layout
4. Drag to reorder as needed

## Data Storage Configuration

### IndexedDB Databases

The application creates the following IndexedDB databases:

| Database Name | Purpose |
|---------------|---------|
| `sbi-tasks` | Reminder & To-Do tasks |
| `sbi-completion-history` | Task completion records |
| `sbi-leads` | Lead Management data |
| `sbi-web-resources` | Web Resource Hub URLs |
| `sbi-dak-numbers` | Dak Number records |
| `sbi-templates` | Loan Recovery Notice templates |
| `branch-config` | Branch configuration settings |

### Browser Storage Settings

**To verify IndexedDB is enabled:**
1. Open browser DevTools (F12)
2. Go to "Application" or "Storage" tab
3. Check "IndexedDB" section
4. You should see the databases listed above

**Storage Limits:**
- Chrome/Edge: ~60% of available disk space
- Firefox: ~50% of available disk space
- Safari: 1GB limit (can request more)

## Security Configuration

### Admin Password

**Default Password:** `sbi@13042`

**To change the password:**
1. Edit the file: `client/src/pages/Landing.tsx`
2. Find: `const ADMIN_PASSWORD = "sbi@13042";`
3. Change to your desired password
4. Rebuild the application: `pnpm build`

**Important:** The password is stored in the source code. For production use, consider implementing a more secure authentication system.

### Data Security

- All data is stored locally in the browser
- No data is transmitted to external servers
- Clearing browser data will delete all stored information
- Regular backups are recommended (export data from each application)

## Network Configuration

### Offline Mode

The application works completely offline after initial load:
- No internet connection required for core functionality
- All data stored locally
- No external API dependencies

### Online Features

If deployed to a web server:
- Accessible from any device on the network
- Multiple users can access simultaneously (each with separate local data)
- No server-side processing required

## Troubleshooting Setup Issues

### Application Won't Start

**Problem:** `pnpm dev` fails to start

**Solutions:**
1. Verify Node.js is installed: `node --version`
2. Verify pnpm is installed: `pnpm --version`
3. Delete `node_modules` and reinstall: `rm -rf node_modules && pnpm install`
4. Check for port conflicts (default: 3000)

### Admin Login Fails

**Problem:** Cannot log in with default password

**Solutions:**
1. Verify password is exactly: `sbi@13042` (case-sensitive)
2. Check browser console for errors (F12)
3. Clear browser cache and retry
4. Try a different browser

### Branch Config Not Saving

**Problem:** Branch details don't persist after saving

**Solutions:**
1. Check browser allows IndexedDB storage
2. Verify not in incognito/private mode
3. Check browser storage settings
4. Clear browser cache and retry

### Data Not Persisting

**Problem:** Data disappears after closing browser

**Solutions:**
1. Verify IndexedDB is enabled in browser
2. Check browser storage quota
3. Ensure not in incognito/private mode
4. Check browser settings for "Clear data on exit"

### Template Upload Fails

**Problem:** Word document upload fails in Loan Recovery Notice Generator

**Solutions:**
1. Verify file is a valid .docx file (not .doc)
2. Try typing directly in text editor instead
3. Check file size (should be under 5MB)
4. Check browser console for error details

## Advanced Configuration

### Custom Styling

To customize the application appearance:
1. Edit `client/src/index.css` for global styles
2. Modify Tailwind configuration in `tailwind.config.js`
3. Rebuild: `pnpm build`

### Adding New Applications

To add a new application to the catalogue:
1. Create new page component in `client/src/pages/`
2. Add route in `client/src/App.tsx`
3. Add card to landing page in `client/src/pages/Landing.tsx`
4. Rebuild and test

### Database Schema Changes

To modify data structures:
1. Update TypeScript interfaces in relevant page files
2. Update load/save functions to handle new fields
3. Consider data migration for existing users
4. Test thoroughly before deployment

## Backup and Restore

### Manual Backup

**Export data from each application:**
1. Dak Number Generator: Click "Export to CSV"
2. Lead Management: Export leads (feature to be added)
3. Web Resources: Export URLs (feature to be added)
4. Templates: Save templates individually

**Browser Data Export:**
1. Open DevTools (F12)
2. Go to "Application" → "IndexedDB"
3. Right-click each database → "Export"
4. Save JSON files

### Restore from Backup

1. Open DevTools (F12)
2. Go to "Application" → "IndexedDB"
3. Delete existing databases
4. Import saved JSON files
5. Refresh application

## Deployment

### Static Hosting

The application can be deployed to any static hosting service:

**Build for production:**
```bash
pnpm build
```

**Deploy the `dist/` folder to:**
- Netlify
- Vercel
- GitHub Pages
- AWS S3 + CloudFront
- Any web server (Apache, Nginx)

### Server Configuration

No server-side configuration required. The application is purely client-side.

**Web Server Requirements:**
- Serve static files
- Support HTML5 history mode (for routing)
- HTTPS recommended for production

## Getting Help

### Documentation

- `README.md` - Complete feature documentation
- `QUICKSTART.md` - Quick start guide
- `SETUP_INSTRUCTIONS.md` - This file

### Debugging

**Browser Console:**
1. Press F12 to open DevTools
2. Check "Console" tab for errors
3. Check "Network" tab for failed requests
4. Check "Application" tab for storage issues

### Support

For issues or questions:
1. Check browser console for error messages
2. Verify browser compatibility
3. Contact your system administrator or IT department

## Next Steps

After completing setup:

1. **Test each application** with sample data
2. **Create templates** for loan recovery notices
3. **Add frequently used web resources**
4. **Set up daily tasks** and reminders
5. **Train staff** on using the applications
6. **Establish backup procedures**

---

**Setup Complete!** Your Branch Application Catalogue is ready to use.
