# Loan Recovery Notice Generator

A standalone offline web application for generating and printing loan recovery notices from a CSV file of non-performing accounts.

## Features

- **CSV Upload**: Upload your loan account CSV file with drag-and-drop support
- **Account Display**: View all accounts in a sortable table with Name, Account Number, and Outstanding Amount
- **Individual Printing**: Print recovery notice for a single account
- **Batch Printing**: Print recovery notices for all accounts at once
- **A4 Paper Format**: All notices are formatted for standard A4 paper size
- **Custom Branding**: Add your bank's header and footer images
- **Offline Functionality**: Completely standalone - no internet or server required
- **Print Preview**: See exactly how the notice will look before printing

## Required CSV Columns

Your CSV file must contain the following columns:

| Column Name | Description |
|-------------|-------------|
| SR_NO | Serial number |
| ACCOUNT_NO | Loan account number |
| CUSTOMER_NAME | Name of the account holder |
| FATHER_NAME | Father's name (optional) |
| SPOUSE_NAME | Spouse's name (optional) |
| ADDRESS1 | Address line 1 |
| ADDRESS2 | Address line 2 |
| ADDRESS3 | Address line 3 |
| POSTCODE | PIN/ZIP code |
| OUTSTANDING | Outstanding amount (numeric) |
| MOBILE | Mobile number (optional) |

## Getting Started

1. **Open the Application**: Open `index.html` in your web browser
2. **Upload CSV**: Click on the upload area or drag-and-drop your CSV file
3. **View Accounts**: Once uploaded, you'll see all accounts in a table
4. **Print Notices**: 
   - Click "Print" next to any account for an individual notice
   - Click "Print All" to print all notices at once
5. **Customize Header/Footer**: See instructions below

## Customizing Header and Footer

The application includes placeholders for your bank's header and footer images. To add your custom images:

### Step 1: Prepare Your Images
- Create or obtain your bank's header image (recommended size: 800x100 pixels)
- Create or obtain your bank's footer image (recommended size: 800x60 pixels)
- Save them as PNG files for best quality

### Step 2: Add Images to Root Folder
Place the images in the same folder as `index.html`:
- `header-placeholder.png` - Your bank's header/logo
- `footer-placeholder.png` - Your bank's footer/contact information

### Step 3: Verify
The next time you generate a notice, your custom header and footer will automatically appear on all printed notices.

## Letter Format

Each recovery notice includes:

- **Header**: Your custom bank header image
- **Letter Reference Number**: Auto-generated unique reference
- **Letter Date**: Current date (editable in preview)
- **Recipient Details**:
  - Customer name
  - Father's/Spouse's name
  - Complete address (4 lines)
  - PIN code
  - Mobile number
- **Account Information**: Account number and outstanding amount
- **Letter Body**: Standard recovery notice template
- **Signature Area**: Space for authorized signatory
- **Footer**: Your custom bank footer image

## Printing Tips

1. **Print Preview**: Always review the print preview before printing
2. **Paper Size**: Ensure your printer is set to A4 paper size
3. **Margins**: The application uses standard margins (20mm)
4. **Quality**: Use "Best" or "High" quality setting for professional appearance
5. **Color**: Recommended to print in black and white for official documents

## File Structure

```
loan-recovery-notices/
├── index.html              # Main application file
├── header-placeholder.png  # (Add your bank header here)
├── footer-placeholder.png  # (Add your bank footer here)
└── sample-accounts.csv     # Sample CSV file for testing
```

## Browser Compatibility

This application works on all modern browsers:
- Chrome/Chromium (recommended)
- Firefox
- Safari
- Edge

## Offline Usage

The application is completely offline and does not require:
- Internet connection
- Server
- Database
- Any external services

All processing happens in your browser locally.

## Sample CSV Format

```csv
SR_NO,ACCOUNT_NO,CUSTOMER_NAME,FATHER_NAME,SPOUSE_NAME,ADDRESS1,ADDRESS2,ADDRESS3,POSTCODE,OUTSTANDING,MOBILE
1,20380465101,MR. MANOHAR SINGH THAKU,SUMMER SINGH THAKUR,,LIG- 18 MACT ROAD MATA MANDIR,BHOPAL,HARSHVARDHAN NAGAR,462003,-3756.99,9876543210
2,35618120137,MR. SUNIL JATAV,MR PREM LAL JATAV,,H NO 118 KUMARPURA,OLD VIDHAN SABHA,BHOPAL,462003,-272.27,9876543211
```

## Troubleshooting

### CSV Not Uploading
- Ensure the CSV file has all required columns
- Check that the file is not corrupted
- Try opening it in a text editor to verify format

### Print Preview Not Showing
- Check browser console for errors (F12 → Console tab)
- Ensure JavaScript is enabled in your browser
- Try a different browser

### Header/Footer Not Appearing
- Verify files are named exactly: `header-placeholder.png` and `footer-placeholder.png`
- Check that files are in the same folder as `index.html`
- Ensure images are in PNG format
- Try refreshing the browser cache (Ctrl+Shift+R)

### Printing Issues
- Ensure printer is connected and ready
- Check printer settings for A4 paper size
- Disable "Print backgrounds" in print dialog if needed
- Try printing to PDF first to verify formatting

## License

This application is provided as-is for loan recovery notice generation.

## Support

For issues or feature requests, please contact your system administrator.
