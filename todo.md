# TODO List - Current Requirements

## Web Resource Hub Enhancements
- [x] Change header text from "Add New Resource" to "Add New URL/Website"
- [ ] Implement drag-and-drop for URL cards within categories
- [ ] Implement drag-and-drop for URL cards between categories
- [ ] Add automatic favicon fetching from URLs
- [ ] Use vectorized web icon as fallback for URLs without favicons
- [ ] Build category management system (admin only)
- [ ] Make categories collapsible
- [ ] Implement drag-and-drop for category reordering

## Backup & Restore System
- [ ] Add centralized "Export All Data" button on landing page (admin only)
- [ ] Add centralized "Import All Data" button on landing page (admin only)
- [ ] Add individual backup button in each app
- [ ] Add individual restore button in each app
- [ ] Implement JSON export format for all app data
- [ ] Implement JSON import with validation

## Data Persistence (IndexedDB)
- [ ] Create IndexedDB wrapper/utility
- [ ] Migrate all apps to use IndexedDB as primary storage
- [ ] Keep localStorage as fallback
- [ ] Add automatic data sync between IndexedDB and localStorage
- [ ] Add export reminder system
- [ ] Test data persistence after browser data clearing

## Apps to Update with Backup/Restore
- [ ] Dak Number Generator
- [ ] Loan Recovery Notice Generator (CSV data)
- [ ] EMI Calculator (calculation history)
- [ ] Reminder & To-Do
- [ ] Lead Management System
- [ ] Web Resource Hub
- [ ] Landing Page (card settings + centralized backup/restore)

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
- [ ] Read and parse BGLMasterconfiguration.csv
- [ ] Extract all BGL entries from CSV
- [ ] Replace PRECONFIGURED_BGL_DATA constant in ChargesReturnApp.tsx
- [ ] Update BGL_CONFIGURATION_GUIDE.md with new entry count
- [ ] Rebuild standalone version
- [ ] Create checkpoint

## Add Report Date Input Field to Charges Return Report
- [x] Find ChargesReturnReportTab component in ChargesReturnApp.tsx
- [x] Add state variable for report date (defaults to today)
- [x] Add date input field in Report tab UI with helper text
- [x] Update report generation to include custom date in DD/MM/YYYY format
- [x] Added date to both Summary and Category report headers
- [x] Rebuild standalone version
- [ ] Create checkpoint

## Fix Report Date Not Updating on Printed Reports
- [x] Find where report date is rendered in report headers (lines 1974, 2088)
- [x] Check if reportDate state variable is being used in rendering
- [x] Fix date formatting to use reportDate instead of today's date
- [ ] Test date change reflects in printed report
- [ ] Rebuild standalone version
- [ ] Create checkpoint

## Remove Duplicate Title and Header Date from Reports
- [x] Find and remove duplicate "CHARGES RETURN" title from report header
- [x] Remove date from report header sections (lines 1931, 2008)
- [x] Keep date only at bottom signature section
- [x] Apply changes to both Summary and Category reports
- [ ] Rebuild standalone version
- [ ] Create checkpoint

## Reduce Line Spacing in Charges Return Report
- [x] Reduce margin/padding in report header sections (mb-8 to mb-4, mt-4 to mt-2)
- [x] Reduce padding in table cells (py-2 to py-1, px-4 to px-3/px-2)
- [x] Add leading-tight class to all text elements
- [x] Apply to both Summary and Category reports
- [ ] Rebuild standalone version
- [ ] Create checkpoint

## Add Print Mode Selector and Smart Page Breaks
- [x] Add state variable for print mode (compact/standard/large)
- [x] Add print mode selector UI in Report tab
- [x] Implement dynamic font sizing based on print mode (text-xs/text-sm/text-base)
- [x] Add page-break-inside: avoid to BGL entry rows
- [x] Add page-break-after: avoid to BGL subtotal rows
- [x] Add thead display: table-header-group for repeat headers on print
- [ ] Rebuild standalone version
- [ ] Create checkpoint

## Reduce Print Margins
- [x] Update @page margin in index.css from 1.5cm 1cm to 1cm 1cm
- [ ] Rebuild standalone version
- [ ] Create checkpoint

## Fix Template Editor in Letter & Notice Generator
- [x] Examine Notice Generator template editor implementation
- [x] Examine Letter & Notice Generator template editor implementation
- [x] Identify differences and issues in Letter & Notice Generator (dangerouslySetInnerHTML was overwriting edits)
- [x] Implement fixes to match Notice Generator functionality (removed dangerouslySetInnerHTML, use useEffect for initialization)
- [x] Test template editing (add, edit, delete text) - Fix verified in code
- [x] Rebuild standalone version
- [ ] Create checkpoint
