#!/usr/bin/env node

/**
 * CSV to TypeScript Converter for Pre-configured Tasks
 * 
 * Usage:
 *   node convert-tasks-csv-to-ts.mjs PRECONFIGURED_TASKS_TEMPLATE.csv
 * 
 * This script reads a CSV file with pre-configured tasks and generates
 * TypeScript code that can be embedded in RemindersApp.tsx
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Parse CSV file
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  
  if (lines.length < 2) {
    throw new Error('CSV file must have header row and at least one data row');
  }
  
  const headers = lines[0].split(',').map(h => h.trim());
  const tasks = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines
    
    const values = line.split(',').map(v => v.trim());
    const task = {};
    
    headers.forEach((header, index) => {
      task[header] = values[index] || '';
    });
    
    tasks.push(task);
  }
  
  return tasks;
}

// Generate TypeScript code
function generateTypeScriptCode(tasks) {
  const taskObjects = tasks.map(task => {
    const daysFromToday = parseInt(task['Days From Today']) || 0;
    const dueDate = daysFromToday === 0 
      ? `new Date().toISOString().split('T')[0]`
      : `new Date(Date.now() + ${daysFromToday} * 24 * 60 * 60 * 1000).toISOString().split('T')[0]`;
    
    return `  {
    id: "${task['Task ID']}",
    name: "${task['Task Name'].replace(/"/g, '\\"')}",
    frequency: "${task['Frequency']}" as const,
    dueDate: ${dueDate},
    completed: false,
    createdAt: new Date().toISOString(),
  }`;
  }).join(',\n');
  
  const code = `// Pre-configured common branch tasks for Indian banking operations
// Generated from PRECONFIGURED_TASKS_TEMPLATE.csv
const PRECONFIGURED_TASKS: Task[] = [
${taskObjects}
];`;

  return code;
}

// Main execution
function main() {
  const csvFile = process.argv[2];
  
  if (!csvFile) {
    console.error('❌ Error: Please provide CSV file path');
    console.error('Usage: node convert-tasks-csv-to-ts.mjs <csv-file>');
    process.exit(1);
  }
  
  if (!fs.existsSync(csvFile)) {
    console.error(`❌ Error: File not found: ${csvFile}`);
    process.exit(1);
  }
  
  try {
    console.log(`📖 Reading CSV file: ${csvFile}`);
    const tasks = parseCSV(csvFile);
    console.log(`✓ Parsed ${tasks.length} tasks`);
    
    const tsCode = generateTypeScriptCode(tasks);
    
    // Output to console
    console.log('\n' + '='.repeat(80));
    console.log('Generated TypeScript Code:');
    console.log('='.repeat(80) + '\n');
    console.log(tsCode);
    console.log('\n' + '='.repeat(80));
    
    // Save to file
    const outputFile = path.join(path.dirname(csvFile), 'PRECONFIGURED_TASKS.ts');
    fs.writeFileSync(outputFile, tsCode + '\n');
    console.log(`\n✅ Code saved to: ${outputFile}`);
    console.log('\n📋 Next steps:');
    console.log('1. Copy the generated code above');
    console.log('2. Replace the PRECONFIGURED_TASKS constant in client/src/pages/RemindersApp.tsx');
    console.log('3. Run: pnpm run build:standalone');
    console.log('4. Test the app to verify tasks load correctly');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
