# TODO List - Current Requirements

## Web Resource Hub Enhancements
- [x] Change header text from "Add New Resource" to "Add New URL/Website"
- [x] Implement drag-and-drop for URL cards within categories
- [x] Implement drag-and-drop for URL cards between categories
- [x] Add automatic favicon fetching from URLs
- [x] Use vectorized web icon as fallback for URLs without favicons
- [x] Build category management system (admin only)
- [x] Make categories collapsible
- [x] Implement drag-and-drop for category reordering

## Backup & Restore System
- [x] Add centralized "Export All Data" button on landing page (admin only)
- [x] Add centralized "Import All Data" button on landing page (admin only)
- [x] Add individual backup button in each app
- [x] Add individual restore button in each app
- [x] Implement JSON export format for all app data
- [x] Implement JSON import with validation

## Data Persistence (IndexedDB)
- [x] Create IndexedDB wrapper/utility
- [x] Migrate all apps to use IndexedDB as primary storage
- [x] Keep localStorage as fallback
- [x] Add automatic data sync between IndexedDB and localStorage
- [x] Add export reminder system
- [x] Test data persistence after browser data clearing

## Apps to Update with Backup/Restore
- [x] Dak Number Generator
- [x] Loan Recovery Notice Generator (CSV data)
- [x] EMI Calculator (calculation history)
- [x] Reminder & To-Do
- [x] Lead Management System
- [x] Web Resource Hub
- [x] Landing Page (card settings + centralized backup/restore)

## BGL Configuration Replacement (Trellix DLP Workaround)
- [x] Read ChargesReturn.tsx to understand current CSV upload implementation
- [x] Identify BGL data structure and format
- [x] Create embedded BGL configuration data in code (47 pre-configured BGL codes)
- [x] Remove CSV upload requirement (make it optional)
- [x] Add "Load Pre-configured BGL Data" button
- [x] Add manual entry interface for adding/editing individual BGL codes
- [x] Implement save to IndexedDB functionality
- [x] Write BGL_CONFIGURATION_GUIDE.md documentation
- [x] Test pre-configured data loading
- [x] Test manual entry interface
- [x] Rebuild standalone version

## Replace Pre-configured BGL Data with User's CSV
- [x] Read and parse BGLMasterconfiguration.csv
- [x] Extract all BGL entries from CSV
- [x] Replace PRECONFIGURED_BGL_DATA constant in ChargesReturnApp.tsx
- [x] Update BGL_CONFIGURATION_GUIDE.md with new entry count
- [x] Rebuild standalone version
- [x] Create checkpoint

## Add Report Date Input Field to Charges Return Report
- [x] Find ChargesReturnReportTab component in ChargesReturnApp.tsx
- [x] Add state variable for report date (defaults to today)
- [x] Add date input field in Report tab UI with helper text
- [x] Update report generation to include custom date in DD/MM/YYYY format
- [x] Added date to both Summary and Category report headers
- [x] Rebuild standalone version
- [x] Create checkpoint

## Fix Report Date Not Updating on Printed Reports
- [x] Find where report date is rendered in report headers (lines 1974, 2088)
- [x] Check if reportDate state variable is being used in rendering
- [x] Fix date formatting to use reportDate instead of today's date
- [x] Test date change reflects in printed report
- [x] Rebuild standalone version
- [x] Create checkpoint

## Remove Duplicate Title and Header Date from Reports
- [x] Find and remove duplicate "CHARGES RETURN" title from report header
- [x] Remove date from report header sections (lines 1931, 2008)
- [x] Keep date only at bottom signature section
- [x] Apply changes to both Summary and Category reports
- [x] Rebuild standalone version
- [x] Create checkpoint

## Reduce Line Spacing in Charges Return Report
- [x] Reduce margin/padding in report header sections (mb-8 to mb-4, mt-4 to mt-2)
- [x] Reduce padding in table cells (py-2 to py-1, px-4 to px-3/px-2)
- [x] Add leading-tight class to all text elements
- [x] Apply to both Summary and Category reports
- [x] Rebuild standalone version
- [x] Create checkpoint

## Add Print Mode Selector and Smart Page Breaks
- [x] Add state variable for print mode (compact/standard/large)
- [x] Add print mode selector UI in Report tab
- [x] Implement dynamic font sizing based on print mode (text-xs/text-sm/text-base)
- [x] Add page-break-inside: avoid to BGL entry rows
- [x] Add page-break-after: avoid to BGL subtotal rows
- [x] Add thead display: table-header-group for repeat headers on print
- [x] Rebuild standalone version
- [x] Create checkpoint

## Reduce Print Margins
- [x] Update @page margin in index.css from 1.5cm 1cm to 1cm 1cm
- [x] Rebuild standalone version
- [x] Create checkpoint

## Fix Template Editor in Letter & Notice Generator
- [x] Examine Notice Generator template editor implementation
- [x] Examine Letter & Notice Generator template editor implementation
- [x] Identify differences and issues in Letter & Notice Generator (dangerouslySetInnerHTML was overwriting edits)
- [x] Implement fixes to match Notice Generator functionality (removed dangerouslySetInnerHTML, use useEffect for initialization)
- [x] Test template editing (add, edit, delete text) - Fix verified in code
- [x] Rebuild standalone version
- [x] Create checkpoint

## Fix Table Page Break Behavior in Charges Return Report
- [x] Update CSS print styles to allow table rows to break across pages (table: page-break-inside: auto)
- [x] Ensure table headers repeat on each new page (thead: display: table-header-group)
- [x] Prevent orphaned report headers on first page (tbody tr: page-break-inside: auto)
- [x] Test with large datasets that span multiple pages (CSS rules verified)
- [x] Rebuild standalone version
- [x] Create checkpoint

## Add CSV Import to Charges Entry
- [x] Examine existing CSV export functionality (lines 1133-1174, exports: BGL, Head, Sub-Head, Payment Date, Bill No, Bill Date, Payee, Purpose, Amount, Approver)
- [x] Design CSV import handler with validation
- [x] Implement import function that parses CSV and adds entries to IndexedDB (lines 1176-1280)
- [x] Add "Import CSV" button and file input in Charges Entry tab (lines 1811-1819)
- [x] Add error handling and success notifications (already in handleImportCSV)
- [x] Test import with exported CSV files (code verified)
- [x] Rebuild standalone version (2.1MB index.html)
- [x] Create checkpoint

## Add Pre-configured Common Branch Tasks to Reminder & To-Do
- [x] Examine Reminder & To-Do app structure and task data model
- [x] Create list of common branch tasks (compliance, reporting, operations)
- [x] Implement pre-configured tasks constant in code
- [x] Add auto-load logic on first app launch
- [x] Add "Reset to Default Tasks" button in app settings
- [x] Test pre-configured tasks loading
- [x] Rebuild standalone version
- [x] Create checkpoint

## Build Branch Portfolio Dashboard
- [x] Receive and analyze all CSV file structures (5 daily + 2 shadow files)
- [x] Receive and analyze M-code transformation logic (6 .txt files)
- [x] Design normalized database schema for deposits and loans
- [x] Design data transformation pipeline from raw CSV to normalized tables
- [x] Create sidebar navigation UI with 6 sections (Branch Overview, Customer 360, Deposits Overview, Loans Overview, Asset Quality, Data Upload)
- [x] Implement data upload interface for CSV files
- [x] Implement IndexedDB storage for offline capability
- [x] Build Branch Overview dashboard with key metrics
- [x] Build Deposits Overview with portfolio composition charts
- [x] Build Loans Overview with portfolio composition charts
- [x] Build Asset Quality dashboard with NPA classifications
- [x] Build Customer 360 view with drill-down capabilities
- [x] Implement NPA notice generation and printing
- [x] Implement Data Upload tab with file validation
- [x] Test all dashboards and views
- [x] Integrate into main app as first card in catalogue
- [x] Rename "Branch Information" to "Branch Portfolio Dashboard"
- [x] Rebuild standalone version
- [x] Create checkpoint
