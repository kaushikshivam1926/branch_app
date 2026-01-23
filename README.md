# Branch Application Catalogue

A comprehensive web-based platform for bank branch operations, providing a unified interface for multiple productivity applications including loan recovery notices, task management, lead tracking, and more.

## Overview

The Branch Application Catalogue serves as a centralized hub for bank branch staff, offering a suite of integrated applications designed to streamline daily operations. All applications share a common authentication system and branch configuration, ensuring consistency across the platform.

## Applications

### 1. Loan Recovery Notice Generator
Generate and print professional loan recovery notices from CSV files of non-performing accounts.

**Features:**
- CSV upload with drag-and-drop support
- Customizable letter templates (Word document upload or visual designer)
- Batch and individual notice printing
- Template management with field placeholders
- A4 paper format with custom branding

### 2. Dak Number Generator
Generate and manage Dak numbers for official correspondence.

**Features:**
- Auto-incrementing reference numbers
- Category-wise organization (Inward/Outward)
- Search and filter functionality
- Export to CSV
- Financial year-based numbering

### 3. EMI Calculator
Calculate EMI for various loan products with detailed amortization schedules.

**Features:**
- Support for multiple loan types (Home, Personal, Car, Education)
- Interest rate and tenure customization
- Amortization schedule generation
- Export calculations to PDF

### 4. Reminder & To-Do
Manage tasks and reminders for daily branch operations.

**Features:**
- Task frequency options (One-time, Daily, Weekly, Monthly, Quarterly, Annual)
- Category-wise display (Overdue, Due Today, Due Tomorrow)
- Color-coded priority indicators
- Completion history tracking
- Admin-only task management

### 5. Lead Management System
Track and manage customer leads with follow-up scheduling.

**Features:**
- Lead capture with contact details
- Follow-up date tracking
- Status management (Open, Pending, Converted, Closed)
- Overdue and today's follow-up alerts
- Dashboard statistics

### 6. Web Resource Hub
Quick access to frequently used websites and online resources.

**Features:**
- Category-wise URL organization
- Favicon display
- Drag-and-drop reordering
- Admin-controlled resource management
- Compact grid layout

## Branch Configuration

Administrators can configure branch-specific settings:

- **Branch Code**: 5-digit identifier used in reference numbers
- **Branch Name**: Displayed in headers across all applications
- **Admin Access**: Secure login for administrative functions

## Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Admin credentials for configuration and management

### Installation

1. Clone or download the repository
2. Open the application in a web browser
3. Log in as admin (default password: `sbi@13042`)
4. Configure branch details via "Branch Config" button
5. Start using the applications

### First-Time Setup

1. **Configure Branch Details**:
   - Click "Admin Login" in the header
   - Enter admin credentials
   - Click "Branch Config"
   - Enter your 5-digit Branch Code and Branch Name
   - Click "Save"

2. **Access Applications**:
   - Return to the landing page
   - Click on any application card to launch
   - Each app inherits the branch configuration

## Technical Details

### Technology Stack
- **Frontend**: React 19 + TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui
- **Routing**: Wouter
- **Storage**: IndexedDB for persistent data
- **Build Tool**: Vite

### Data Storage

All application data is stored locally in the browser using IndexedDB:
- `sbi-tasks`: Reminder & To-Do tasks
- `sbi-completion-history`: Task completion records
- `sbi-leads`: Lead Management data
- `sbi-web-resources`: Web Resource Hub URLs
- `sbi-dak-numbers`: Dak Number records
- `sbi-templates`: Loan Recovery Notice templates
- `branch-config`: Branch configuration settings

### File Structure

```
branch-app-catalogue/
├── client/
│   ├── public/              # Static assets
│   └── src/
│       ├── components/      # Reusable UI components
│       ├── contexts/        # React contexts (BranchContext)
│       ├── pages/           # Application pages
│       ├── lib/             # Utility functions
│       └── App.tsx          # Main application router
├── package.json
├── README.md
├── QUICKSTART.md
└── SETUP_INSTRUCTIONS.md
```

## Admin Functions

Administrators have access to additional features:

- **Branch Configuration**: Set branch code and name
- **Template Management**: Create and edit notice templates
- **Task Management**: Edit and delete reminders
- **Lead Management**: Full CRUD operations
- **Resource Management**: Add, edit, and organize web resources
- **Completion History**: View all completed tasks

## Browser Compatibility

- Chrome/Chromium 90+ (recommended)
- Firefox 88+
- Safari 14+
- Edge 90+

## Offline Functionality

The application works completely offline after initial load:
- No internet connection required for core functionality
- All data stored locally in browser
- No external API dependencies

## Security

- Admin authentication for sensitive operations
- Local-only data storage (no server transmission)
- Branch-specific configuration isolation
- Session-based admin access

## Troubleshooting

### Data Not Persisting
- Ensure browser allows IndexedDB storage
- Check browser storage settings
- Clear cache and reload if needed

### Admin Login Issues
- Default password: `sbi@13042`
- Password is case-sensitive
- Contact system administrator to reset

### Application Not Loading
- Check browser console for errors (F12)
- Ensure JavaScript is enabled
- Try clearing browser cache
- Use a supported browser version

## License

This application is provided for bank branch operations management.

## Support

For issues, feature requests, or technical support, please contact your system administrator or IT department.
