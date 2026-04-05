/**
 * Centralized Reference Number Generation Engine
 * 
 * Single source of truth for all reference number generation across the application.
 * All apps must use this engine instead of local generation logic.
 * 
 * Format: SBI/{branchCode}/{fy_YY-YY}/{monthAbbr}/{serial_3digits}
 * Example: SBI/13042/25-26/MAR/001
 * 
 * - Generates formatted reference numbers with month abbreviation
 * - Maintains serial counters per financial year (3-digit serials)
 * - Automatically saves records to IndexedDB
 * - Ensures format consistency across all applications
 */

import { DakRecord } from "../components/PrintPreview";
import { saveData, loadData } from "./db";

// Storage key for all reference number records (unified across apps)
const DAK_RECORDS_KEY = "dak-records";

// Month abbreviations for reference number format
const MONTH_ABBRS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

export interface GenerateRefOptions {
  branchCode: string;
  financialYear: string;           // Format: "YY-YY" (e.g., "25-26")
  monthNo: string;                 // Format: "MM" (e.g., "03" for March) - converted to abbr internally
  dateDisplay: string;             // Format: "dd-mm-yyyy"
  letterType: string;              // e.g., "Notice", "Letter", "Memo"
  letterDestination: string;       // e.g., "Customer", "LHO", "ZO"
  recipientDetails: string;        // Customer name or recipient details
  subject: string;                 // Letter/Notice subject
  remarks?: string;                // Optional remarks
}

/**
 * Result of reference number generation
 */
export interface GenerateRefResult {
  refNo: string;                   // Formatted reference number
  serialNo: string;                // Just the serial portion
  dakRecord: DakRecord;            // Complete record saved to database
}

/**
 * Convert numeric month (01-12) to 3-letter abbreviation (JAN-DEC)
 */
function getMonthAbbr(monthNo: string): string {
  const monthIndex = parseInt(monthNo, 10) - 1;
  return MONTH_ABBRS[monthIndex] || "JAN";
}

/**
 * Get the next sequential number for a given financial year
 * Searches all existing records for the same FY and returns next in sequence
 * Returns 3-digit serial with leading zeroes (001, 002, ..., 999)
 */
async function getNextSerial(fy: string): Promise<string> {
  const records = (await loadData(DAK_RECORDS_KEY)) || [];
  
  if (!Array.isArray(records) || records.length === 0) {
    return "001";
  }

  // Find all records for this financial year
  const sameFY = records.filter((r: DakRecord) => r.financialYear === fy);
  
  if (!sameFY.length) {
    return "001";
  }

  // Get the maximum serial and increment
  const maxSerial = Math.max(
    ...sameFY.map((r: DakRecord) => parseInt(r.serialNo, 10))
  );

  return String(maxSerial + 1).padStart(3, "0");
}

/**
 * Build the formatted reference number string
 * Format: SBI/{branchCode}/{fy_YY-YY}/{monthAbbr}/{serial_3digits}
 * Example: SBI/13042/25-26/MAR/001
 */
function buildRefNumber(
  branchCode: string,
  fy: string,
  monthAbbr: string,
  serial: string
): string {
  return `SBI/${branchCode}/${fy}/${monthAbbr}/${serial}`;
}

/**
 * Generate a single reference number
 * 
 * This is the main engine function that:
 * 1. Calculates the next serial for the given FY
 * 2. Builds the formatted reference number
 * 3. Creates a DakRecord object
 * 4. Saves it to the database
 * 5. Returns both the reference number and the record
 * 
 * Usage:
 * ```
 * const result = await generateReferenceNumber({
 *   branchCode: "10123",
 *   financialYear: "24-25",
 *   monthNo: "05",
 *   dateDisplay: "15-03-2025",
 *   letterType: "Notice",
 *   letterDestination: "Customer",
 *   recipientDetails: "Rama Kumar",
 *   subject: "NPA Notice dt. 15-03-2025 - A/c 12345"
 * });
 * ```
 */
export async function generateReferenceNumber(
  options: GenerateRefOptions
): Promise<GenerateRefResult> {
  try {
    // Get the next serial number
    const serialNo = await getNextSerial(options.financialYear);
    
    // Convert numeric month to abbreviation
    const monthAbbr = getMonthAbbr(options.monthNo);

    // Build the formatted reference number
    const refNo = buildRefNumber(
      options.branchCode,
      options.financialYear,
      monthAbbr,
      serialNo
    );

    // Create the DakRecord
    const dakRecord: DakRecord = {
      id: Date.now(),
      refNo,
      serialNo,
      financialYear: options.financialYear,
      monthNo: options.monthNo,
      dateDisplay: options.dateDisplay,
      letterType: options.letterType,
      letterDestination: options.letterDestination,
      recipientDetails: options.recipientDetails,
      subject: options.subject,
      remarks: options.remarks || "Auto-generated",
    };

    // Load existing records and save the new one
    const existingRecords = (await loadData(DAK_RECORDS_KEY)) || [];
    const updatedRecords = [...existingRecords, dakRecord];
    await saveData(DAK_RECORDS_KEY, updatedRecords);

    return {
      refNo,
      serialNo,
      dakRecord,
    };
  } catch (error) {
    console.error("Error generating reference number:", error);
    throw new Error(`Failed to generate reference number: ${error}`);
  }
}

/**
 * Generate multiple reference numbers in a single transaction
 * 
 * More efficient than calling generateReferenceNumber multiple times
 * as it loads/saves the database only once.
 * 
 * Usage:
 * ```
 * const results = await generateMultipleReferenceNumbers([
 *   { branchCode: "10123", financialYear: "24-25", ... },
 *   { branchCode: "10123", financialYear: "24-25", ... },
 * ]);
 * ```
 */
export async function generateMultipleReferenceNumbers(
  optionsList: GenerateRefOptions[]
): Promise<GenerateRefResult[]> {
  try {
    if (!optionsList || optionsList.length === 0) {
      return [];
    }

    // Load existing records once
    const existingRecords = (await loadData(DAK_RECORDS_KEY)) || [];
    let allRecords = [...existingRecords];

    const results: GenerateRefResult[] = [];

    // Group by financial year to maintain proper serial order
    const recordsByFY = new Map<string, { records: GenerateRefOptions[]; maxSerial: number }>();

    for (const options of optionsList) {
      const fy = options.financialYear;

      if (!recordsByFY.has(fy)) {
        // Find max serial for this FY from existing records
        const existing = existingRecords.filter(
          (r: DakRecord) => r.financialYear === fy
        );
        const maxSerial = existing.length
          ? Math.max(...existing.map((r: DakRecord) => parseInt(r.serialNo, 10)))
          : 0;

        recordsByFY.set(fy, { records: [], maxSerial });
      }

      recordsByFY.get(fy)!.records.push(options);
    }

    // Generate reference numbers maintaining proper serial sequence
    for (const [fy, { records, maxSerial }] of recordsByFY) {
      let currentSerial = maxSerial;

      for (const options of records) {
        currentSerial++;
        const serialNo = String(currentSerial).padStart(3, "0");
        const monthAbbr = getMonthAbbr(options.monthNo);
        const refNo = buildRefNumber(
          options.branchCode,
          fy,
          monthAbbr,
          serialNo
        );

        const dakRecord: DakRecord = {
          id: Date.now() + results.length,
          refNo,
          serialNo,
          financialYear: fy,
          monthNo: options.monthNo,
          dateDisplay: options.dateDisplay,
          letterType: options.letterType,
          letterDestination: options.letterDestination,
          recipientDetails: options.recipientDetails,
          subject: options.subject,
          remarks: options.remarks || "Auto-generated",
        };

        allRecords.push(dakRecord);
        results.push({
          refNo,
          serialNo,
          dakRecord,
        });
      }
    }

    // Save all records at once
    await saveData(DAK_RECORDS_KEY, allRecords);

    return results;
  } catch (error) {
    console.error("Error generating multiple reference numbers:", error);
    throw new Error(`Failed to generate reference numbers: ${error}`);
  }
}

/**
 * Get all existing DAK records
 * Useful for viewing history or validating previous numbers
 */
export async function getAllDakRecords(): Promise<DakRecord[]> {
  try {
    const records = (await loadData(DAK_RECORDS_KEY)) || [];
    return Array.isArray(records) ? records : [];
  } catch (error) {
    console.error("Error loading DAK records:", error);
    return [];
  }
}

/**
 * Get records for a specific financial year
 */
export async function getDakRecordsByFY(fy: string): Promise<DakRecord[]> {
  try {
    const records = await getAllDakRecords();
    return records.filter((r) => r.financialYear === fy);
  } catch (error) {
    console.error("Error loading records by FY:", error);
    return [];
  }
}

/**
 * Preview the next reference number WITHOUT saving to database
 * 
 * Useful for UI preview, form displays, etc. where you want to show
 * what the next reference number WOULD be without actually committing it.
 * 
 * Returns ONLY the reference number string, not a full DakRecord.
 * This is read-only and does not modify the database.
 */
export async function getNextReferencePreview(
  branchCode: string,
  financialYear: string,
  monthNo: string
): Promise<string> {
  try {
    // Get the next serial for this FY
    const serialNo = await getNextSerial(financialYear);
    
    // Convert month to abbreviation
    const monthAbbr = getMonthAbbr(monthNo);
    
    // Build and return the reference number (without saving)
    return buildRefNumber(branchCode, financialYear, monthAbbr, serialNo);
  } catch (error) {
    console.error("Error previewing reference number:", error);
    throw error;
  }
}
