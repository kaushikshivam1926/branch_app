# IndexedDB Migration Plan

## Overview
Migrating all apps from localStorage to IndexedDB for better data persistence that survives browser cache/history clearing.

## Apps to Migrate

### 1. Reminder & To-Do App
- **Current storage**: `localStorage.getItem("sbi-tasks")`
- **New storage**: IndexedDB store "tasks"
- **Data structure**: Array of task objects with id, name, dueDate, frequency, etc.

### 2. Dak Number Generator
- **Current storage**: `localStorage.getItem("dakRecords")` and `localStorage.getItem("dakCounter")`
- **New storage**: IndexedDB store "dakRecords" and "dakSettings"
- **Data structure**: Records array + counter/settings object

### 3. Lead Management System
- **Current storage**: `localStorage.getItem("sbi-leads")`
- **New storage**: IndexedDB store "leads"
- **Data structure**: Array of lead objects

### 4. Web Resource Hub
- **Current storage**: `localStorage.getItem("sbi-resources")` and `localStorage.getItem("sbi-categories")`
- **New storage**: IndexedDB store "resources" and "categories"
- **Data structure**: Resources array + categories array

### 5. Landing Page (App Cards)
- **Current storage**: `localStorage.getItem("sbi-app-cards")`
- **New storage**: IndexedDB store "appCards"
- **Data structure**: Array of app card objects with order and visibility

## Migration Strategy

1. **Data Migration**: On first load, check if data exists in localStorage. If yes, migrate to IndexedDB and clear localStorage.
2. **Backward Compatibility**: Keep localStorage as fallback for older browsers.
3. **Atomic Operations**: Use transactions to ensure data integrity.
4. **Error Handling**: Graceful fallback to localStorage if IndexedDB fails.

## Implementation Steps

1. Update db.ts to include all store names
2. Create migration utility function
3. Update each app component to use IndexedDB
4. Test data persistence across browser restarts
5. Verify backup/restore works with IndexedDB
