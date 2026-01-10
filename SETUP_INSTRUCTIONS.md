# Setup Instructions - Loan Recovery Notice Generator

## Overview

This is a **standalone, offline web application** that runs entirely in your browser. No server, no installation, no internet connection required.

## Files Included

- `index.html` - Main application file (open this!)
- `assets/` - JavaScript and CSS files
- `sample-accounts.csv` - Sample data for testing
- `README.md` - Full documentation
- `QUICKSTART.md` - Quick start guide
- `SETUP_INSTRUCTIONS.md` - This file

## Installation (None Required!)

The application is already built and ready to use. No installation or setup needed.

## How to Open

### Method 1: Direct File (Recommended)
1. Navigate to the folder where you extracted the files
2. Double-click on `index.html`
3. Your default browser will open the application
4. Done! The app is ready to use

### Method 2: Right-Click and Open
1. Right-click on `index.html`
2. Select "Open with" → Choose your browser
3. The application will load

### Method 3: Drag and Drop
1. Drag `index.html` into your browser window
2. The application will load

## First Time Setup

### 1. Test with Sample Data
- The application includes a sample CSV file: `sample-accounts.csv`
- Use this to test before using your own data
- Click upload and select this file to see how it works

### 2. Prepare Your CSV File
Your CSV file must have these columns (in any order):
```
SR_NO, ACCOUNT_NO, CUSTOMER_NAME, FATHER_NAME, SPOUSE_NAME, 
ADDRESS1, ADDRESS2, ADDRESS3, POSTCODE, OUTSTANDING, MOBILE
```

Example:
```csv
SR_NO,ACCOUNT_NO,CUSTOMER_NAME,FATHER_NAME,SPOUSE_NAME,ADDRESS1,ADDRESS2,ADDRESS3,POSTCODE,OUTSTANDING,MOBILE
1,20380465101,MR. MANOHAR SINGH,SUMMER SINGH,,LIG-18 ROAD,BHOPAL,NAGAR,462003,-3756.99,9876543210
```

### 3. Add Custom Header and Footer (Optional)
To add your bank's branding:

**Step 1:** Create two images:
- Header image (800x100 pixels, PNG format)
- Footer image (800x60 pixels, PNG format)

**Step 2:** Save them in the same folder as `index.html`:
- `header-placeholder.png`
- `footer-placeholder.png`

**Step 3:** Refresh the browser (F5)

The images will now appear on all printed notices.

## Using the Application

### Upload CSV
1. Click the upload area or drag-drop your CSV file
2. The application will parse and display all accounts

### View Accounts
- All accounts appear in a table
- Shows: S.No, Account Number, Customer Name, Outstanding Amount
- Total outstanding amount shown at bottom

### Print Individual Notice
1. Click "Print" button next to any account
2. Review the print preview
3. Click "Print" in the preview window
4. Choose your printer and print

### Print All Notices
1. Click "Print All" button at top
2. Review the print preview (shows all notices)
3. Click "Print" in the preview window
4. All notices will print

## Printing Tips

### Printer Setup
- Ensure printer is connected and ready
- Set paper size to A4
- Use portrait orientation

### Print Settings
- Quality: High or Best (for professional appearance)
- Color: Black & white or color (your choice)
- Margins: Default (20mm)

### Before Printing
- Always check print preview first
- Verify header and footer appear correctly
- Check all account details are correct

## Customizing the Letter

The letter template includes:
- Auto-generated Letter Reference Number
- Current date (editable in preview)
- Customer name and address
- Account number and outstanding amount
- Standard recovery notice text
- Signature area
- Your custom header and footer

To modify the letter text, you'll need to edit the source code (advanced).

## Troubleshooting

### Application Won't Open
- Try a different browser (Chrome, Firefox, Safari, Edge)
- Ensure JavaScript is enabled in browser
- Check that `index.html` is in the correct folder

### CSV Upload Fails
- Verify column names match exactly (case-sensitive)
- Check for empty rows at end of CSV
- Try opening CSV in text editor to verify format
- Ensure no special characters in file path

### Print Preview Blank
- Check browser console (F12 → Console)
- Ensure JavaScript is enabled
- Try refreshing the page (F5)
- Try a different browser

### Header/Footer Not Showing
- File names must be exactly: `header-placeholder.png` and `footer-placeholder.png`
- Files must be in same folder as `index.html`
- Must be PNG format
- Refresh browser cache (Ctrl+Shift+R)

### Print Quality Issues
- Check printer settings for quality
- Ensure paper is A4 size
- Try printing to PDF first to verify
- Check printer driver is up to date

## Browser Compatibility

Works on all modern browsers:
- Google Chrome (recommended)
- Mozilla Firefox
- Apple Safari
- Microsoft Edge

## System Requirements

- Any computer with a web browser
- No internet connection required
- No software installation needed
- Works on Windows, Mac, Linux

## File Locations

Place all files in the same folder:
```
your-folder/
├── index.html                  ← Open this file
├── assets/
│   ├── index-[hash].js
│   └── index-[hash].css
├── sample-accounts.csv         ← Sample data
├── header-placeholder.png      ← Add your header here
├── footer-placeholder.png      ← Add your footer here
├── README.md
├── QUICKSTART.md
└── SETUP_INSTRUCTIONS.md
```

## Advanced: Running with Local Server

If you prefer to run through a local server:

1. Install Node.js and pnpm
2. Navigate to the folder in terminal
3. Run: `pnpm dev`
4. Open: `http://localhost:3000`

## Frequently Asked Questions

**Q: Do I need internet?**
A: No, the application works completely offline.

**Q: Can I modify the letter text?**
A: The template is built into the application. To modify, you'd need to edit the source code.

**Q: Can I add more columns to CSV?**
A: Yes, extra columns are ignored. Only required columns are used.

**Q: Can I use Excel files instead of CSV?**
A: No, you must use CSV format. Export from Excel as CSV.

**Q: How many accounts can I process?**
A: Thousands. Limited only by your browser's memory.

**Q: Can I save the notices as PDF?**
A: Use your browser's "Print to PDF" feature in the print dialog.

**Q: Is my data secure?**
A: Yes, all data stays on your computer. Nothing is sent anywhere.

## Support

For detailed information, see:
- `README.md` - Full documentation
- `QUICKSTART.md` - Quick start guide

## Getting Started Now

1. Open `index.html` in your browser
2. Upload the `sample-accounts.csv` file
3. Click "Print All" to see how it works
4. Prepare your own CSV file
5. Add your header and footer images
6. Start generating notices!

---

**You're all set!** The application is ready to use. Just open `index.html` and start uploading CSV files.
