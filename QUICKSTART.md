# Quick Start Guide - Loan Recovery Notice Generator

## What You Have

A complete, offline web application for generating professional loan recovery notices from CSV files. The application is ready to use immediately!

## How to Use

### Option 1: Direct HTML (Simplest)
1. Open the `index.html` file directly in your web browser (no server needed)
2. The application will load and be ready to use
3. Drag and drop your CSV file or click to browse

### Option 2: Using a Local Server (Optional)
If you prefer to run it through a local server:
```bash
cd /home/ubuntu/loan-recovery-notices
pnpm dev
```
Then open `http://localhost:3000` in your browser.

## Your CSV File Format

Your CSV must have these columns:
- **SR_NO** - Serial number
- **ACCOUNT_NO** - Loan account number
- **CUSTOMER_NAME** - Name of account holder
- **FATHER_NAME** - Father's name (optional)
- **SPOUSE_NAME** - Spouse's name (optional)
- **ADDRESS1** - Address line 1
- **ADDRESS2** - Address line 2
- **ADDRESS3** - Address line 3
- **POSTCODE** - PIN/ZIP code
- **OUTSTANDING** - Outstanding amount (numeric)
- **MOBILE** - Mobile number (optional)

## Step-by-Step Usage

1. **Upload CSV**: Click the upload area or drag-drop your CSV file
2. **View Accounts**: All accounts will display in a table with:
   - Serial number
   - Account number
   - Customer name
   - Outstanding amount
3. **Print Individual Notice**: Click "Print" button next to any account
4. **Print All Notices**: Click "Print All" button at the top
5. **Customize**: Add your bank's header and footer (see below)

## Customizing Header and Footer

### Step 1: Prepare Images
Create or obtain your bank's:
- **Header image**: 800x100 pixels (PNG format)
- **Footer image**: 800x60 pixels (PNG format)

### Step 2: Add to Root Folder
Place these files in the same folder as `index.html`:
- `header-placeholder.png` - Your bank header/logo
- `footer-placeholder.png` - Your bank footer/contact info

### Step 3: Verify
The next time you generate a notice, your custom images will appear on all printed notices.

## Letter Format Details

Each recovery notice includes:

```
┌─────────────────────────────┐
│   BANK HEADER (Your Image)  │
├─────────────────────────────┤
│                             │
│ Letter Reference No.: ...   │
│ Letter Date: ...            │
│                             │
│ [Customer Name]             │
│ S/O: [Father's Name]        │
│ [Address Line 1]            │
│ [Address Line 2]            │
│ [Address Line 3]            │
│ PIN: [Postcode]             │
│ Mobile: [Phone]             │
│                             │
│ Dear [Name],                │
│                             │
│ RE: NOTICE FOR RECOVERY OF  │
│ OUTSTANDING DUES            │
│                             │
│ Account Number: [Acct No]   │
│ Outstanding: ₹ [Amount]     │
│                             │
│ [Standard recovery letter   │
│  template text]             │
│                             │
│ Yours faithfully,           │
│                             │
│ _____________________       │
│ Authorized Signatory        │
│                             │
├─────────────────────────────┤
│   BANK FOOTER (Your Image)  │
└─────────────────────────────┘
```

## Printing Tips

1. **Paper Size**: Ensure printer is set to A4
2. **Orientation**: Portrait (default)
3. **Margins**: Standard (20mm all sides)
4. **Quality**: Use "Best" or "High" quality
5. **Color**: Black & white recommended for official documents
6. **Preview**: Always check print preview before printing

## File Structure

```
index.html                      ← Open this file directly
assets/
  ├── index-[hash].js          ← Application code
  └── index-[hash].css         ← Styling
header-placeholder.png          ← Add your bank header here
footer-placeholder.png          ← Add your bank footer here
sample-accounts.csv             ← Sample CSV for testing
README.md                       ← Full documentation
QUICKSTART.md                   ← This file
```

## Features

✅ **Offline**: No internet required, works completely locally  
✅ **CSV Upload**: Drag-and-drop or click to browse  
✅ **Account Display**: Clean table with all key information  
✅ **Individual Print**: Print single notice  
✅ **Batch Print**: Print all notices at once  
✅ **A4 Format**: Professional letter format  
✅ **Custom Branding**: Add your header and footer images  
✅ **Print Preview**: See exactly how it will print  
✅ **No Installation**: Just open the HTML file  

## Troubleshooting

### CSV Not Loading?
- Check column names match exactly (case-sensitive)
- Ensure no empty rows at the end of CSV
- Try opening CSV in text editor to verify format

### Print Not Working?
- Check browser console (F12 → Console tab)
- Ensure JavaScript is enabled
- Try a different browser
- Check printer is connected and ready

### Header/Footer Not Showing?
- File names must be exactly: `header-placeholder.png` and `footer-placeholder.png`
- Must be in same folder as `index.html`
- Must be PNG format
- Try refreshing browser cache (Ctrl+Shift+R)

## Sample CSV

A sample CSV file is included (`sample-accounts.csv`). You can use it to test the application before using your own data.

## Support

For issues or questions:
1. Check the README.md file for detailed documentation
2. Verify your CSV format matches requirements
3. Check browser console for error messages (F12)
4. Try with the sample CSV file first

## Next Steps

1. **Prepare your CSV file** with the required columns
2. **Create header and footer images** (optional but recommended)
3. **Place images in the root folder** with correct names
4. **Open index.html** in your browser
5. **Upload your CSV** and start generating notices!

---

**Ready to use!** Just open `index.html` in your web browser and start uploading CSV files.
