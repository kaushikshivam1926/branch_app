# Pre-Configured Tasks - Quick Start Guide

## What You Have

Three files for managing pre-configured tasks:

1. **PRECONFIGURED_TASKS_TEMPLATE.csv** - Your task data in spreadsheet format
2. **convert-tasks-csv-to-ts.mjs** - Script to convert CSV to TypeScript code
3. **PRECONFIGURED_TASKS_GUIDE.md** - Complete documentation

## Quick Workflow

### 1. Edit Tasks (2 minutes)

Open `PRECONFIGURED_TASKS_TEMPLATE.csv` in Excel, Google Sheets, or any text editor.

**Add a new task:**
```csv
task-daily-vault-opening,Daily Vault Opening & Closing,Daily,0,Open and close vault daily
```

**Edit existing task:**
- Change the task name, frequency, or due date
- Keep the Task ID the same

**Delete a task:**
- Delete the entire row

### 2. Convert to Code (1 minute)

Run this command in terminal:

```bash
node convert-tasks-csv-to-ts.mjs PRECONFIGURED_TASKS_TEMPLATE.csv
```

Output:
- Displays generated TypeScript code
- Saves to `PRECONFIGURED_TASKS.ts`

### 3. Update App Code (2 minutes)

1. Open `client/src/pages/RemindersApp.tsx`
2. Find: `const PRECONFIGURED_TASKS: Task[] = [`
3. Replace the entire constant with code from `PRECONFIGURED_TASKS.ts`
4. Save file

### 4. Rebuild (5 minutes)

```bash
pnpm run build:standalone
```

Creates new `dist/public/index.html` with your tasks.

### 5. Test (2 minutes)

1. Open the new HTML file in browser
2. Go to Reminder & To-Do app
3. Verify your tasks appear
4. Test task completion

## CSV Column Reference

| Column | Example | Notes |
|--------|---------|-------|
| Task ID | `task-daily-cash-reconciliation` | Must be unique, use kebab-case |
| Task Name | `Daily Cash Reconciliation` | Human-readable, shown in app |
| Frequency | `Daily`, `Weekly`, `Monthly`, `Quarterly`, `Annual` | Must match exactly |
| Days From Today | `0`, `7`, `30`, `90`, `365` | Initial due date offset |
| Description | `Reconcile cash balance...` | Optional, for reference |

## Common Tasks to Add

### Daily Operations
```csv
task-daily-vault-opening,Daily Vault Opening & Closing,Daily,0,Open and close vault daily
task-daily-atm-monitoring,Monitor ATM Transactions,Daily,0,Check ATM transaction logs
task-daily-customer-calls,Customer Service Calls,Daily,0,Follow up on customer inquiries
```

### Weekly Compliance
```csv
task-weekly-fraud-check,Weekly Fraud Detection Review,Weekly,7,Review suspicious transactions
task-weekly-customer-grievance,Customer Grievance Review,Weekly,7,Review and resolve customer complaints
```

### Monthly Reporting
```csv
task-monthly-balance-sheet,Monthly Balance Sheet Preparation,Monthly,30,Prepare monthly balance sheet
task-monthly-profit-loss,Monthly P&L Statement,Monthly,30,Generate profit and loss statement
```

## Troubleshooting

**Q: Script says "File not found"**
A: Run from project root: `node convert-tasks-csv-to-ts.mjs PRECONFIGURED_TASKS_TEMPLATE.csv`

**Q: Tasks don't appear in app**
A: 
1. Check code was updated in RemindersApp.tsx
2. Run `pnpm run build:standalone` again
3. Clear browser cache (Ctrl+Shift+Delete)

**Q: CSV won't open in Excel**
A: Right-click → Open With → Excel, or import as CSV in Google Sheets

**Q: How do I undo changes?**
A: Git has all versions. Run: `git checkout PRECONFIGURED_TASKS_TEMPLATE.csv`

## Need Help?

See `PRECONFIGURED_TASKS_GUIDE.md` for detailed documentation.
