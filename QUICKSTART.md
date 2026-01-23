# Quick Start Guide - Branch Application Catalogue

## What You Have

A comprehensive web-based platform for bank branch operations, providing six integrated applications in a unified interface. The platform is ready to use immediately with local data storage and offline functionality.

## How to Access

### Development Server
```bash
cd /home/ubuntu/branch-app-catalogue
pnpm dev
```
Then open `http://localhost:3000` in your browser.

### Production Build
```bash
pnpm build
pnpm preview
```

## First-Time Setup

### Step 1: Admin Login
1. Open the application in your browser
2. Click "Admin Login" in the top-right corner
3. Enter credentials:
   - Username: `Admin`
   - Password: `sbi@13042`
4. Click "Login"

### Step 2: Configure Branch Details
1. After logging in, click "Branch Config" button
2. Enter your branch information:
   - **Branch Code**: 5-digit number (e.g., `12345`)
   - **Branch Name**: Up to 30 characters (e.g., `Mumbai Central Branch`)
3. Click "Save"

Your branch details will now appear in all application headers and reference numbers.

## Available Applications

### 1. Loan Recovery Notice Generator
Generate professional recovery notices from CSV files.

**Quick Start:**
- Click the "Loan Recovery Notice Generator" card
- Upload CSV file with loan account data
- Create or select a template
- Generate and print notices

**Required CSV Columns:**
`SR_NO`, `ACCOUNT_NO`, `CUSTOMER_NAME`, `FATHER_NAME`, `SPOUSE_NAME`, `ADDRESS1`, `ADDRESS2`, `ADDRESS3`, `POSTCODE`, `OUTSTANDING`, `MOBILE`

### 2. Dak Number Generator
Manage official correspondence reference numbers.

**Quick Start:**
- Click the "Dak Number Generator" card
- Select category (Inward/Outward)
- Enter subject and details
- Generate Dak number
- Export records as needed

### 3. EMI Calculator
Calculate loan EMI with amortization schedules.

**Quick Start:**
- Click the "EMI Calculator" card
- Select loan type
- Enter principal amount, interest rate, and tenure
- View EMI and amortization schedule
- Export to PDF if needed

### 4. Reminder & To-Do
Manage daily tasks and reminders.

**Quick Start:**
- Click the "Reminder & To-Do" card
- Add tasks with frequency (One-time, Daily, Weekly, etc.)
- View tasks by category (Overdue, Due Today, etc.)
- Mark tasks complete
- Admin: View completion history

### 5. Lead Management System
Track customer leads and follow-ups.

**Quick Start:**
- Click the "Lead Management System" card
- Add new leads with contact details
- Set follow-up dates
- Update lead status
- View dashboard statistics

### 6. Web Resource Hub
Quick access to frequently used websites.

**Quick Start:**
- Click the "Web Resource Hub" card
- Admin: Add URLs with categories
- Click any resource card to open
- Organize by dragging cards

## Admin Functions

As an admin, you have access to:

- **Branch Configuration**: Set branch code and name
- **Template Management**: Create custom notice templates
- **Task Management**: Edit and delete reminders
- **Lead Management**: Full CRUD operations
- **Resource Management**: Add, edit, and organize web resources
- **Completion History**: View all completed tasks

## Data Storage

All data is stored locally in your browser using IndexedDB:

- Tasks and reminders persist across sessions
- Leads and follow-ups are saved automatically
- Web resources are stored per user
- Templates are saved for reuse
- Branch configuration is persistent

**Note:** Data is browser-specific. Clearing browser data will remove all stored information.

## Common Tasks

### Adding a New Task
1. Go to Reminder & To-Do app
2. Click "Add Task" button
3. Enter task name and select frequency
4. Set due date
5. Click "Save"

### Creating a Notice Template
1. Go to Loan Recovery Notice Generator
2. Click "Manage Templates" (admin only)
3. Click "Create New Template"
4. Choose template type (Visual or Text)
5. For Text: Upload Word document or type directly
6. Insert field placeholders by clicking field names
7. Save template with a descriptive name

### Managing Leads
1. Go to Lead Management System
2. Click "Add Lead" button
3. Enter customer details and follow-up date
4. Click "Save Lead"
5. Update status as lead progresses

## Keyboard Shortcuts

- **Esc**: Close open dialogs
- **Ctrl/Cmd + P**: Print (in print preview)
- **F5**: Refresh application

## Browser Compatibility

Recommended browsers:
- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Offline Usage

The application works completely offline after initial load:
- No internet connection required
- All data stored locally
- No external API dependencies
- Full functionality available offline

## Troubleshooting

### Admin Login Not Working
- Verify password: `sbi@13042` (case-sensitive)
- Clear browser cache and retry
- Check browser console for errors (F12)

### Data Not Saving
- Ensure browser allows IndexedDB storage
- Check browser storage settings (not in incognito mode)
- Verify sufficient storage space available

### Application Not Loading
- Clear browser cache (Ctrl+Shift+R)
- Check browser console for errors (F12)
- Ensure JavaScript is enabled
- Try a different browser

### Branch Name Not Updating
- Refresh the page after saving branch config
- Verify admin login is active
- Check that branch code is exactly 5 digits

## Tips for Best Experience

1. **Use Chrome or Edge** for best performance and compatibility
2. **Log in as admin** to access all features
3. **Configure branch details first** before using applications
4. **Regularly export data** (Dak numbers, leads) for backup
5. **Create templates early** for consistent notice generation
6. **Organize web resources** by category for easy access

## Next Steps

1. **Complete initial setup** (admin login + branch config)
2. **Explore each application** to understand features
3. **Add sample data** to test functionality
4. **Create templates** for loan recovery notices
5. **Add frequently used web resources**
6. **Set up daily tasks** and reminders

## Support

For issues, feature requests, or technical support:
1. Check browser console for error messages (F12)
2. Verify browser compatibility
3. Contact your system administrator or IT department

---

**Ready to use!** Log in as admin, configure your branch details, and start exploring the applications.
