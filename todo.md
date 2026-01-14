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
