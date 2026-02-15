# Pre-Configured Tasks Management Guide

This guide explains how to manage pre-configured tasks for the Reminder & To-Do app using a CSV format.

## Overview

Pre-configured tasks are common branch management tasks that are automatically loaded when the app is first used. Users can still edit, delete, or add new tasks at runtime. The pre-configured tasks serve as a starting template for branch operations.

## CSV Format

The `PRECONFIGURED_TASKS_TEMPLATE.csv` file contains all pre-configured tasks with the following columns:

| Column | Description | Example | Required |
|--------|-------------|---------|----------|
| **Task ID** | Unique identifier for the task (use kebab-case) | `task-daily-cash-reconciliation` | Yes |
| **Task Name** | Human-readable task name | `Daily Cash Reconciliation` | Yes |
| **Frequency** | How often the task repeats | `Daily`, `Weekly`, `Monthly`, `Quarterly`, `Annual`, `One-time` | Yes |
| **Days From Today** | Number of days from today for the due date | `0` (today), `7` (next week), `30` (next month), `90` (next quarter), `365` (next year) | Yes |
| **Description** | Optional task description/notes | `Reconcile cash balance with ledger entries` | No |

## Frequency Options

- **Daily**: Task repeats every day
- **Weekly**: Task repeats every 7 days
- **Monthly**: Task repeats every month
- **Quarterly**: Task repeats every 3 months
- **Annual**: Task repeats every year
- **One-time**: Task occurs once and is removed after completion

## Days From Today

This field determines the initial due date for the task:

- `0` = Today
- `7` = One week from today
- `14` = Two weeks from today
- `30` = One month from today (approximately)
- `90` = Three months from today (quarterly)
- `365` = One year from today (annual)

## How to Update Pre-Configured Tasks

### Step 1: Edit the CSV File

Open `PRECONFIGURED_TASKS_TEMPLATE.csv` in Excel, Google Sheets, or any text editor and modify:

- **Add new tasks**: Add new rows with unique Task IDs
- **Edit existing tasks**: Modify task names, frequencies, or due dates
- **Delete tasks**: Remove entire rows (but keep the header row)

**Important**: Keep the header row intact and ensure proper CSV formatting.

### Step 2: Run the Conversion Script

Convert the CSV to TypeScript code:

```bash
node convert-tasks-csv-to-ts.mjs PRECONFIGURED_TASKS_TEMPLATE.csv
```

This will:
1. Parse the CSV file
2. Generate TypeScript code
3. Display the code in the terminal
4. Save the code to `PRECONFIGURED_TASKS.ts`

### Step 3: Update the Code

Copy the generated TypeScript code and replace the `PRECONFIGURED_TASKS` constant in `client/src/pages/RemindersApp.tsx`:

1. Open `client/src/pages/RemindersApp.tsx`
2. Find the line starting with `const PRECONFIGURED_TASKS: Task[] = [`
3. Replace the entire constant with the generated code
4. Save the file

### Step 4: Rebuild the Application

Rebuild the standalone HTML file:

```bash
pnpm run build:standalone
```

This creates an updated `dist/public/index.html` with your new pre-configured tasks.

### Step 5: Test

1. Open the new `index.html` in a browser
2. Navigate to the Reminder & To-Do app
3. Verify that your new pre-configured tasks appear
4. Test task completion and recurrence logic

## CSV Editing Tips

### Using Excel/Google Sheets

1. Open `PRECONFIGURED_TASKS_TEMPLATE.csv` in Excel or Google Sheets
2. Edit cells directly
3. Save as CSV format (File → Download as → CSV)

### Using Text Editor

If editing in a text editor (VS Code, Notepad++, etc.):

```csv
Task ID,Task Name,Frequency,Days From Today,Description
task-id-1,Task Name 1,Daily,0,Description here
task-id-2,Task Name 2,Weekly,7,Description here
```

**Important**: 
- Keep commas as delimiters
- If a field contains a comma, wrap it in quotes: `"Task, with comma",Daily,0,Description`
- Don't add spaces after commas in the header row

### Common Mistakes to Avoid

❌ **Wrong**: Missing header row
```csv
task-id-1,Task Name,Daily,0,Description
```

✅ **Correct**: Include header row
```csv
Task ID,Task Name,Frequency,Days From Today,Description
task-id-1,Task Name,Daily,0,Description
```

❌ **Wrong**: Inconsistent frequency values
```csv
task-id-1,Task Name,daily,0,Description
```

✅ **Correct**: Use exact frequency values
```csv
task-id-1,Task Name,Daily,0,Description
```

❌ **Wrong**: Duplicate Task IDs
```csv
task-id-1,Task Name 1,Daily,0,Description
task-id-1,Task Name 2,Weekly,7,Description
```

✅ **Correct**: Unique Task IDs
```csv
task-id-1,Task Name 1,Daily,0,Description
task-id-2,Task Name 2,Weekly,7,Description
```

## Example: Adding a New Task

### CSV Entry
```csv
task-daily-ledger-posting,Daily Ledger Posting Verification,Daily,0,Verify all ledger postings are correct
```

### After Conversion
```typescript
{
  id: "task-daily-ledger-posting",
  name: "Daily Ledger Posting Verification",
  frequency: "Daily" as const,
  dueDate: new Date().toISOString().split('T')[0],
  completed: false,
  createdAt: new Date().toISOString(),
}
```

## Runtime Task Management

Even after pre-configured tasks are loaded, users can:

- ✅ **Edit tasks**: Change task name, frequency, or due date
- ✅ **Delete tasks**: Remove tasks they don't need
- ✅ **Add new tasks**: Create additional tasks beyond pre-configured ones
- ✅ **Complete tasks**: Mark tasks as done (auto-reschedule for recurring tasks)
- ✅ **Reset to defaults**: Admins can click "Reset to Defaults" button to reload pre-configured tasks

## Troubleshooting

### Script Error: "CSV file must have header row"

**Problem**: The CSV file is missing the header row.

**Solution**: Ensure the first line contains: `Task ID,Task Name,Frequency,Days From Today,Description`

### Script Error: "File not found"

**Problem**: The CSV file path is incorrect.

**Solution**: Run the script from the project root directory and use the correct file path:
```bash
node convert-tasks-csv-to-ts.mjs PRECONFIGURED_TASKS_TEMPLATE.csv
```

### Tasks don't appear in the app

**Problem**: Changes weren't rebuilt into the standalone HTML.

**Solution**: 
1. Verify the code was updated in `client/src/pages/RemindersApp.tsx`
2. Run `pnpm run build:standalone`
3. Clear browser cache (Ctrl+Shift+Delete) and reload

### Old tasks still appear

**Problem**: Browser is using cached version.

**Solution**: 
1. Clear browser cache
2. Close and reopen the HTML file
3. Try in an incognito/private window

## Support

For issues or questions about the pre-configured tasks system, refer to the comments in:
- `convert-tasks-csv-to-ts.mjs` - Conversion script documentation
- `client/src/pages/RemindersApp.tsx` - App implementation details
