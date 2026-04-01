/**
 * Portfolio Data Transformation Pipeline
 * Replicates Power Query M-code logic in JavaScript
 * Processes raw CSV files into normalized data for dashboard
 */

import {
  STORES,
  putRecords,
  clearStore,
  getAllRecords,
  setSetting,
} from "./portfolioDb";

// ============================================================
// CSV Parser
// ============================================================
export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return [];

  // Remove BOM if present
  let headerLine = lines[0];
  if (headerLine.charCodeAt(0) === 0xfeff) headerLine = headerLine.slice(1);

  const headers = headerLine.split(",").map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",");
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = (values[j] ?? "").trim();
    }
    rows.push(row);
  }
  return rows;
}

// ============================================================
// Helpers
// ============================================================
function trimLeadingZeros(s: string): string {
  if (!s) return "";
  const trimmed = s.replace(/^0+/, "");
  return trimmed || "0";
}

function parseNum(val: string | undefined | null): number {
  if (!val) return 0;
  const cleaned = val.replace(/,/g, "").replace(/\s/g, "").trim();
  const n = Number(cleaned);
  return isNaN(n) ? 0 : n;
}

function parseDate(val: string | undefined | null): string | null {
  if (!val || val === "00/00/0000" || val === "00000000" || val === "99/99/9999") return null;
  // Expect DD/MM/YYYY
  const parts = val.split("/");
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  if (!d || !m || !y || y.length !== 4) return null;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function monthsDiff(dateStr1: string | null, dateStr2: string | null): number | null {
  if (!dateStr1 || !dateStr2) return null;
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;
  return (d1.getFullYear() - d2.getFullYear()) * 12 + (d1.getMonth() - d2.getMonth());
}

function daysDiff(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  return Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Compute RBI IRAC-compliant SMA/NPA classification based on Days Past Due (DPD)
 * 
 * RBI IRAC Norms (Para 31, 42):
 * - SMA-0: 1-30 days overdue
 * - SMA-1: 31-60 days overdue
 * - SMA-2: 61-90 days overdue
 * - NPA: >90 days overdue
 *   - Substandard: NPA for ≤ 12 months (91-365 days)
 *   - Doubtful-1 (D1): NPA for > 12-24 months (366-730 days)
 *   - Doubtful-2 (D2): NPA for > 24-36 months (731-1095 days)
 *   - Doubtful-3 (D3): NPA for > 36 months (>1095 days)
 * 
 * @param dpd Days Past Due (for Term Loans) or Days since Out of Order (for CC/OD)
 * @param iracCode NEW_IRAC code from CBS (if available, used as override)
 * @returns { smaClass, npaSubCategory, isNPA }
 */
function computeRBIClassification(dpd: number, iracCode?: string): {
  smaClass: string;
  npaSubCategory: string;
  isNPA: boolean;
} {
  // Hard lock: If IRAC code indicates NPA (≥03), override DPD-based classification
  const iracNum = iracCode ? parseInt(iracCode, 10) : 0;
  if (iracNum >= 3) {
    // IRAC 03 = Substandard, 04 = Doubtful, 05 = D1, 06 = D2, 07 = D3, 08 = Loss
    if (iracNum === 3 || iracNum === 4) return { smaClass: "NPA", npaSubCategory: "Substandard", isNPA: true };
    if (iracNum === 5) return { smaClass: "NPA", npaSubCategory: "Doubtful-1 (D1)", isNPA: true };
    if (iracNum === 6) return { smaClass: "NPA", npaSubCategory: "Doubtful-2 (D2)", isNPA: true };
    if (iracNum === 7) return { smaClass: "NPA", npaSubCategory: "Doubtful-3 (D3)", isNPA: true };
    if (iracNum === 8) return { smaClass: "NPA", npaSubCategory: "Loss", isNPA: true };
  }

  // DPD-based classification
  if (dpd === 0) return { smaClass: "STD", npaSubCategory: "", isNPA: false };
  if (dpd >= 1 && dpd <= 30) return { smaClass: "SMA-0", npaSubCategory: "", isNPA: false };
  if (dpd >= 31 && dpd <= 60) return { smaClass: "SMA-1", npaSubCategory: "", isNPA: false };
  if (dpd >= 61 && dpd <= 90) return { smaClass: "SMA-2", npaSubCategory: "", isNPA: false };
  
  // NPA (>90 days)
  if (dpd > 90 && dpd <= 365) return { smaClass: "NPA", npaSubCategory: "Substandard", isNPA: true };
  if (dpd > 365 && dpd <= 730) return { smaClass: "NPA", npaSubCategory: "Doubtful-1 (D1)", isNPA: true };
  if (dpd > 730 && dpd <= 1095) return { smaClass: "NPA", npaSubCategory: "Doubtful-2 (D2)", isNPA: true };
  if (dpd > 1095) return { smaClass: "NPA", npaSubCategory: "Doubtful-3 (D3)", isNPA: true };

  return { smaClass: "STD", npaSubCategory: "", isNPA: false };
}

/**
 * Calculate Days Past Due (DPD) from overdue date
 * @param overdueDate Date when account became overdue (YYYY-MM-DD format)
 * @returns Number of days past due, or 0 if no overdue date
 */
function calculateDPD(overdueDate: string | null): number {
  if (!overdueDate) return 0;
  const od = new Date(overdueDate);
  if (isNaN(od.getTime())) return 0;
  const today = new Date();
  const diffMs = today.getTime() - od.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

// ============================================================
// Indian Currency Formatter
// ============================================================
export function formatINR(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return "₹0";
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";

  if (abs >= 10000000) {
    return sign + "₹" + (abs / 10000000).toFixed(2) + " Cr";
  }
  if (abs >= 100000) {
    return sign + "₹" + (abs / 100000).toFixed(2) + " L";
  }
  return sign + "₹" + abs.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export function formatINRFull(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return "₹0.00";
  return (amount < 0 ? "-" : "") + "₹" + Math.abs(amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ============================================================
// 1. Process Product Category Mapping
// ============================================================
export async function processProductMapping(csvText: string): Promise<number> {
  const rows = parseCSV(csvText);
  const records = rows
    .filter((r) => r.ProductCode && r.ProductCode.trim() !== "")
    .map((r) => ({
      ProductCode: r.ProductCode.trim(),
      PROD_TYPE: r.PROD_TYPE || "",
      CURRENCY: r.CURRENCY || "",
      PROD_DESC: r.PROD_DESC || "",
      Category: r.Category || "",
      SubCategory: r.SubCategory || "",
      SalaryFlag: r.SalaryFlag || "No",
      WealthFlag: r.WealthFlag || "No",
      SeniorCitizen: r.SeniorCitizen || "No",
      NRIFlag: r.NRIFlag || "No",
      StaffFlag: r.StaffFlag || "No",
    }));

  await clearStore(STORES.PRODUCT_MAPPING);
  await putRecords(STORES.PRODUCT_MAPPING, records);
  return records.length;
}

// ============================================================
// 1b. Process Loan Product Category Mapping
// ============================================================
export async function processLoanProductMapping(csvText: string): Promise<number> {
  const rows = parseCSV(csvText);
  const records = rows
    .filter((r) => r.ProductCode && r.ProductCode.trim() !== "")
    .map((r) => ({
      ProductCode: r.ProductCode.trim(),
      ProductName: r.ProductName || "",
      Category: r.Category || "",
      SubCategory: r.SubCategory || "",
      Segment: r.Segment || "",
      Priority: r.Priority || "No",
      Secured: r.Secured || "",
      Scheme: r.Scheme || "None",
      RiskWeight: r.RiskWeight || "100",
    }));

  await clearStore(STORES.LOAN_PRODUCT_MAPPING);
  await putRecords(STORES.LOAN_PRODUCT_MAPPING, records);
  return records.length;
}

// ============================================================
// 2. Process Deposit Shadow File
// ============================================================
export async function processDepositShadow(csvText: string): Promise<number> {
  const rows = parseCSV(csvText);
  
  // Get CC/OD accounts to identify duplicates (accounts in both files)
  const ccodRecords = await getAllRecords(STORES.CCOD_DATA);
  const ccodAccountSet = new Set(ccodRecords.map((c: any) => c.LoanKey));
  
  const productMapping = await getAllRecords(STORES.PRODUCT_MAPPING);
  const mappingLookup: Record<string, any> = {};
  for (const pm of productMapping) {
    mappingLookup[pm.ProductCode] = pm;
  }

  // First pass: build CIF aggregation for HNI
  const cifTotals: Record<string, number> = {};

  // Process ALL rows (including CC/OD accounts) for the shadow lookup
  // CC/OD accounts need their Acct_Type + Int_cat to be available for product code derivation
  // in processCCODBalance. DEPOSIT_SHADOW stores all rows; DEPOSIT_DATA stores only non-CC/OD.
  const allRows = rows.map((r) => {
    const acNo = trimLeadingZeros(r.AcNo || "");
    const cif = trimLeadingZeros(r.CIFNo || "");
    const currentBalance = parseNum(r.Curr_Bal);
    const availableBalance = parseNum(r.Availbl_Bal);
    const netAvBalYTD = parseNum(r.NET_Av_BAL_YTD);
    const unclearedAmount = parseNum(r.Unclrd_Amt);
    const frozenAmount = parseNum(r.FrozenAmt);
    const termValue = parseNum(r.Term_Value);
    const maturityValue = parseNum(r.Maturity_Val);
    const intRate = parseNum(r.IntRate);
    const actType = (r.ActType || "").trim();
    const intCat = (r.IntCat || "").trim();
    const productCode = actType && intCat ? `${actType}-${intCat}` : "";
    const openDt = parseDate(r.OpenDt);
    const maturityDt = parseDate(r.Maturity_Dt);
    const acCloseDt = parseDate(r.AcCloseDt);
    const status = (r.Status || "").trim();

    // Lookup product mapping
    const pm = mappingLookup[productCode] || {};
    const category = pm.Category || "Unknown";
    const subCategory = pm.SubCategory || "Unknown";
    const prodType = pm.PROD_TYPE || "";
    const prodDesc = pm.PROD_DESC || "";

    // Salary flag
    const salaryFlag = pm.SalaryFlag === "Yes" ? "Salary"
      : (prodType.toUpperCase() === "SAL-PROD" ? "Salary" : "Non-Salary");

    // Wealth flag
    const wealthFlag = pm.WealthFlag === "Yes" ? "Wealth"
      : ((prodDesc.toUpperCase().includes("WEALTH") || (r.Acct_Desc || "").toUpperCase().includes("WEALTH")) ? "Wealth" : "Non-Wealth");

    // NRI flag
    const nriFlag = pm.NRIFlag === "Yes" ? "NRI"
      : ((prodDesc.toUpperCase().includes("NRE") || prodDesc.toUpperCase().includes("NRO") || prodDesc.toUpperCase().includes("RFC") || prodDesc.toUpperCase().includes("FCNB")) ? "NRI" : "Resident");

    // Senior Citizen flag
    const seniorCitizenFlag = pm.SeniorCitizen === "Yes" ? "Senior Citizen"
      : ((prodDesc.toUpperCase().includes("SENIOR") || (r.Acct_Desc || "").toUpperCase().includes("SENIOR")) ? "Senior Citizen" : "Non-Senior");

    // Staff flag
    const staffFlag = pm.StaffFlag === "Yes" ? "Staff"
      : ((prodDesc.toUpperCase().includes("STAFF") || (r.Acct_Desc || "").toUpperCase().includes("STAFF")) ? "Staff" : "Non-Staff");

    // VIP flag
    const vipFlag = (r.VIP_Flag || "").toUpperCase() === "Y" ? "VIP" : "Non-VIP";

    // Value band (CASA only)
    let valueBand: string | null = null;
    const casaCategories = ["Regular Savings", "Wealth Savings", "Current", "Salary", "Wealth Account", "Savings Plus", "NRI Savings", "NRI Current"];
    if (casaCategories.includes(category)) {
      if (currentBalance >= 1000000) valueBand = "Very High";
      else if (currentBalance >= 250000) valueBand = "High";
      else if (currentBalance >= 50000) valueBand = "Medium";
      else valueBand = "Low";
    }

    // Maturity bucket (FD/RD only)
    let maturityBucket: string | null = null;
    const termCategories = ["Term Deposit", "Recurring Deposit", "Term Deposit (NRO)", "Term Deposit (NRE)", "Term Deposit (RFC/FCNB)", "Recurring Deposit (NRE)", "Recurring Deposit (NRO)", "MOD"];
    if (termCategories.includes(category) && maturityDt) {
      const days = daysDiff(maturityDt);
      if (days != null) {
        if (days <= 0) maturityBucket = "Matured";
        else if (days <= 30) maturityBucket = "0–30 Days";
        else if (days <= 90) maturityBucket = "31–90 Days";
        else if (days <= 180) maturityBucket = "91–180 Days";
        else if (days <= 365) maturityBucket = "181–365 Days";
        else maturityBucket = "365+ Days";
      }
    }

    // Dormancy flag
    let dormancyFlag = "Active";
    if (frozenAmount > 0) dormancyFlag = "Frozen";
    else if (availableBalance === 0 && currentBalance === 0) dormancyFlag = "Zero Balance";
    else if (acCloseDt) dormancyFlag = "Closed";
    else if (status === "03" || status === "19") dormancyFlag = "Dormant/Inoperative";

    // CIF total aggregation — only count non-CC/OD accounts as deposits
    if (cif && !ccodAccountSet.has(acNo)) {
      cifTotals[cif] = (cifTotals[cif] || 0) + currentBalance;
    }

    return {
      AcNo: acNo,
      CIF: cif,
      CustName: (r.Name1 || "").trim(),
      OpenDt: openDt,
      Maturity_Dt: maturityDt,
      AcCloseDt: acCloseDt,
      CurrentBalance: currentBalance,
      AvailableBalance: availableBalance,
      Net_Av_Bal_YTD: netAvBalYTD,
      UnclearedAmount: unclearedAmount,
      FrozenAmount: frozenAmount,
      TermValue: termValue,
      MaturityValue: maturityValue,
      INTRATE: intRate,
      ActType: actType,
      IntCat: intCat,
      ProductCode: productCode,
      Acct_Desc: (r.Acct_Desc || "").trim(),
      ProductText: (r.Product || "").trim(),
      MAINTBR: (r.BrNo || "").trim(),
      MobileNo: (r.MobileNo || "").trim(),
      Status: status,
      VIP_Flag: vipFlag,
      ModeOfOperation: (r.ModeOfOperation || "").trim(),
      ShortName: (r.ShortName || "").trim(),
      Add1: (r.Add1 || "").trim(),
      Add2: (r.Add2 || "").trim(),
      Add3: (r.Add3 || "").trim(),
      Add4: (r.Add4 || "").trim(),
      PostCode: (r.PostCode || "").trim(),
      PhoneNo_Res: (r.PhoneNo_Res || "").trim(),
      PhoneNo_Bus: (r.PhoneNo_Bus || "").trim(),
      AdhaarID: (r.AdhaarID || "").trim(),
      GrpID: (r.GrpID || "").trim(),
      GL_Wkly_CD: (r.GL_Wkly_CD || "").trim(),
      GL_Class_Code: (r.GL_Class_Code || "").trim(),
      OD_Limit: parseNum(r.OD_Limit),
      Period_Dep: (r.Period_Dep || "").trim(),
      Term_Pay_Frequency: (r.Term_Pay_Frequency || "").trim(),
      // Computed fields
      Category: category,
      SubCategory: subCategory,
      PROD_TYPE: prodType,
      PROD_DESC: prodDesc,
      Salary_Account_Flag: salaryFlag,
      Wealth_Client_Flag: wealthFlag,
      NRI_Client_Flag: nriFlag,
      SeniorCitizen_Flag: seniorCitizenFlag,
      Staff_Flag: staffFlag,
      Deposit_Value_Band: valueBand,
      Maturity_Bucket: maturityBucket,
      Dormancy_Flag: dormancyFlag,
      Exposure_Type: "Deposit",
      HNI_Category: "", // will be set in second pass
      CIF_Total_Deposit: 0, // will be set in second pass
    };
  });

  // Second pass: set HNI category based on CIF totals
  for (const rec of allRows) {
    const total = cifTotals[rec.CIF] || 0;
    rec.CIF_Total_Deposit = total;
    if (total >= 10000000) rec.HNI_Category = "Ultra HNI";
    else if (total >= 2500000) rec.HNI_Category = "HNI";
    else rec.HNI_Category = "Regular";
  }

  // DEPOSIT_SHADOW: store ALL rows (including CC/OD accounts) so that
  // processCCODBalance can look up Acct_Type + Int_cat for product code derivation.
  await clearStore(STORES.DEPOSIT_SHADOW);
  await putRecords(STORES.DEPOSIT_SHADOW, allRows);

  // DEPOSIT_DATA: store only non-CC/OD rows for deposit analytics
  // (CC/OD accounts are classified as loans, not deposits)
  // IMPORTANT: ccodAccountSet contains raw ACCTNO (may have leading zeros), but
  // rec.AcNo in DEPOSIT_SHADOW is stored after trimLeadingZeros. Check both forms.
  const depositOnlyRecords = allRows.filter((rec: any) => {
    const acNo = rec.AcNo || "";
    const acNoRaw = acNo.padStart(12, "0"); // re-pad to match CBS raw format
    return !ccodAccountSet.has(acNo) && !ccodAccountSet.has(acNoRaw);
  });
  await clearStore(STORES.DEPOSIT_DATA);
  await putRecords(STORES.DEPOSIT_DATA, depositOnlyRecords);

  await setSetting("deposit-shadow-date", todayISO());
  return depositOnlyRecords.length;
}

// ============================================================
// 3. Process Loan Shadow File
// ============================================================
export async function processLoanShadow(csvText: string): Promise<number> {
  const rows = parseCSV(csvText);

  const records = rows.map((r) => {
    const acNo = trimLeadingZeros(r.AcNo || "");
    const cif = trimLeadingZeros(r.CIFNo || "");

    return {
      AcNo: acNo,
      CIFNo: cif,
      Name1: (r.Name1 || "").trim(),
      AcOpenDt: parseDate(r.AcOpenDt),
      Sanction_Dt: parseDate(r["Sanction_Dt "] || r.Sanction_Dt),
      Maturity_Dt: parseDate(r.Maturity_Dt),
      Acc_Close_Dt: parseDate(r.Acc_Close_Dt),
      CurrentBalance: parseNum(r.CurrentBalance),
      AvailableBalance: parseNum(r.AvailableBalance),
      Loan_Arrears: parseNum(r.Loan_Arrears),
      App_Lmt: parseNum(r.App_Lmt),
      EMI_Due: parseNum(r.EMI_Due),
      EMI_Paid: parseNum(r.EMI_Paid),
      EMI_Overdue: parseNum(r.EMI_Overdue),
      Int_Rate: parseNum(r.Int_Rate),
      Period_Loan: parseNum(r.Period_Loan),
      New_IRAC: (r.New_IRAC || "").trim(),
      Old_IRAC: (r.Old_IRAC || "").trim(),
      Status: (r.Status || "").trim(),
      Acct_Type: (r.Acct_Type || "").trim(),
      Int_cat: (r.Int_cat || "").trim(),
      Acct_Code: (r.Acct_Code || "").trim(),
      Cat_Type_Name: (r.Cat_Type_Name || "").trim(),
      Segment_Cd: (r.Segment_Cd || "").trim(),
      MAINTBR: (r.BrNo || "").trim(),
      MobileNo: (r.MobileNo || "").trim(),
      ShortName: (r.ShortName || "").trim(),
      Add1: (r.Add1 || "").trim(),
      Add2: (r.Add2 || "").trim(),
      Add3: (r.Add3 || "").trim(),
      Add4: (r.Add4 || "").trim(),
      PostCode: (r.PostCode || "").trim(),
      Phone_No_Res: (r.Phone_No_Res || "").trim(),
      Phone_No_Bus: (r.Phone_No_Bus || "").trim(),
      Sec_Ind: (r.Sec_Ind || "").trim(),
      Posting_Restrict: (r.Posting_Restrict || "").trim(),
      Hold_Flag: (r.Hold_Flag || "").trim(),
      Stop_Flag: (r.Stop_Flag || "").trim(),
      VIP_Flag: (r.VIP_Flag || "").trim(),
      CPC_BrNo: (r.CPC_BrNo || "").trim(),
      Proc_Date: parseDate(r.Proc_Date),
      Next_Repay_Dt: parseDate(r.Next_Repay_Dt),
      Unclrd_Amt: parseNum(r.Unclrd_Amt),
      Extn_Cntr_ID: (r.Extn_Cntr_ID || "").trim(),
    };
  });

  await clearStore(STORES.LOAN_SHADOW);
  await putRecords(STORES.LOAN_SHADOW, records);
  await setSetting("loan-shadow-date", todayISO());
  return records.length;
}

// ============================================================
// 4. Process Loan Balance File (Daily)
// ============================================================
export async function processLoanBalance(csvText: string): Promise<number> {
  const rows = parseCSV(csvText);

  // Get loan shadow data for merging
  const shadowRecords = await getAllRecords(STORES.LOAN_SHADOW);
  const shadowLookup: Record<string, any> = {};
  for (const s of shadowRecords) {
    shadowLookup[s.AcNo] = s;
  }

  // Get loan product mapping for categorization
  const loanProductMapping = await getAllRecords(STORES.LOAN_PRODUCT_MAPPING);
  const productLookup: Record<string, any> = {};
  for (const p of loanProductMapping) {
    productLookup[p.ProductCode] = p;
  }

  const today = todayISO();

  const records = rows.map((r) => {
    const loanKey = (r.ACCTNO || "").trim();
    const cif = (r.CUSTNUMBER || "").trim();
    const outstand = parseNum(r.OUTSTAND);
    const limit = parseNum(r.LIMIT);
    const instalamt = parseNum(r.INSTALAMT);
    const intRate = parseNum(r.INTRATE);
    const theobal = parseNum(r.THEOBAL);
    const irregamt = parseNum(r.IRREGAMT);
    const unrealint = parseNum(r.UNREALINT);
    const accrint = parseNum(r.ACCRINT);
    const writeOffAmount = parseNum(r.WRITE_OFF_AMOUNT);
    const sanctDt = parseDate(r.SANCTDT);
    const irrgDt = parseDate(r.IRRGDT);
    const raDate = parseDate(r.RA_DATE);
    const writeOffDate = parseDate(r.WRITE_OFF_DATE);
    const smaDate = parseDate(r.SMA_DATE);
    const smaClass = (r.SMA_CLASS || "").trim();
    const newIrac = (r.NEWIRAC || "").trim();
    const oldIrac = (r.OLDIRAC || "").trim();

    // Merge with shadow
    const shadow = shadowLookup[loanKey] || {};
    const shadowCIF = shadow.CIFNo || "";
    const shadowCustName = shadow.Name1 || "";
    const shadowMaturityDt = shadow.Maturity_Dt || null;
    const shadowEMIDue = shadow.EMI_Due || 0;
    const shadowEMIPaid = shadow.EMI_Paid || 0;
    const shadowEMIOverdue = shadow.EMI_Overdue || 0;
    const shadowLoanArrears = shadow.Loan_Arrears || 0;
    const shadowNewIRAC = shadow.New_IRAC || "";
    const shadowSMAClass = shadow.SMA_CLASS || "";

    // CIF resolution: prefer shadow CIF
    const cifFinal = (shadowCIF && shadowCIF !== "0") ? shadowCIF : cif;

    // Computed metrics
    const monthsToMaturity = monthsDiff(shadowMaturityDt, today);
    const totalLoanTermMonths = monthsDiff(shadowMaturityDt, sanctDt);
    const loanAgeMonths = monthsDiff(today, sanctDt);

    // EMI split
    const monthlyInterest = outstand && intRate ? outstand * (intRate / 1200) : null;
    const monthlyPrincipal = instalamt && monthlyInterest != null ? instalamt - monthlyInterest : null;

    // ── RBI IRAC Classification (Computed from DPD or IRAC code) ──────────────
    // For Term Loans: Use IRRGDT (Irregular Date) as overdue date
    // For CC/OD: This will be handled separately in CCOD processing
    const dpd = calculateDPD(irrgDt);
    const rbiClassification = computeRBIClassification(dpd, newIrac || shadowNewIRAC);
    const computedSMAClass = rbiClassification.smaClass;
    const computedNPASubCategory = rbiClassification.npaSubCategory;
    const computedIsNPA = rbiClassification.isNPA;

    // Risk weight
    let riskWeight = 0.95;
    const effectiveSMA = computedSMAClass; // Use computed SMA instead of CSV value
    const effectiveIRAC = newIrac || shadowNewIRAC;
    if (effectiveSMA === "STD") riskWeight = 0.95;
    else if (effectiveSMA === "SMA-0") riskWeight = 0.85;
    else if (effectiveSMA === "SMA-1") riskWeight = 0.65;
    else if (effectiveSMA === "SMA-2") riskWeight = 0.35;
    else if (effectiveIRAC === "05") riskWeight = 0.10;
    else if (effectiveIRAC === "06" || effectiveIRAC === "08") riskWeight = 0.05;

    // Remaining tenure %
    const remainingTenurePct = totalLoanTermMonths && totalLoanTermMonths > 0 && monthsToMaturity != null
      ? Math.round((monthsToMaturity / totalLoanTermMonths) * 10000) / 10000
      : null;

    // Seasoning ratio
    const seasoningRatio = totalLoanTermMonths && totalLoanTermMonths > 0 && loanAgeMonths != null
      ? Math.round((loanAgeMonths / totalLoanTermMonths) * 10000) / 10000
      : null;

    // Forecast bucket
    let forecastBucket: string | null = null;
    if (monthsToMaturity != null) {
      if (monthsToMaturity <= 1) forecastBucket = "1 Month";
      else if (monthsToMaturity <= 3) forecastBucket = "3 Months";
      else if (monthsToMaturity <= 6) forecastBucket = "6 Months";
      else if (monthsToMaturity <= 12) forecastBucket = "12 Months";
      else forecastBucket = "12+ Months";
    }

    // Construct product code from shadow data
    const shadowAcctType = shadow.Acct_Type || "";
    const shadowIntCat = shadow.Int_cat || "";
    const shadowSegmentCd = shadow.Segment_Cd || "";
    const productCode = shadowAcctType && shadowIntCat ? `${shadowAcctType}-${shadowIntCat}` : "";

    // Get product mapping
    const productMapping = productCode ? productLookup[productCode] : null;

    // Staff override: Segment_Cd = 306 → Staff Loan
    let loanCategory = "Other";
    let loanSubCategory = "";
    let loanSegment = "General";
    let loanPriority = "Medium";
    let loanSecured = "";
    let loanScheme = "None";
    let loanRiskWeight = "100";
    let productName = (r.ACCTDESC || "").trim();

    if (shadowSegmentCd === "306") {
      // Staff loan override
      loanCategory = "Staff Loan";
      loanSegment = "Staff";
      loanPriority = "High";
    } else if (productMapping) {
      // Use product mapping
      loanCategory = productMapping.Category || "Other";
      loanSubCategory = productMapping.SubCategory || "";
      loanSegment = productMapping.Segment || "General";
      loanPriority = productMapping.Priority || "Medium";
      loanSecured = productMapping.Secured || "";
      loanScheme = productMapping.Scheme || "None";
      loanRiskWeight = productMapping.RiskWeight || "100";
      productName = productMapping.ProductName || productName;
    } else {
      // Fallback: category from description
      const desc = (r.ACCTDESC || "").toUpperCase();
      if (desc.includes("HOME") || desc.includes("SURAKSHA") || desc.includes("HL")) loanCategory = "Home Loan";
      else if (desc.includes("CAR") || desc.includes("VEHICLE") || desc.includes("AUTO")) loanCategory = "Vehicle Loan";
      else if (desc.includes("PERSONAL") || desc.includes("XPRESS") || desc.includes("PAXC") || desc.includes("PENSION")) loanCategory = "Personal Loan";
      else if (desc.includes("EDUCATION") || desc.includes("STU") || desc.includes("SCH LN")) loanCategory = "Education Loan";
      else if (desc.includes("GOLD")) loanCategory = "Gold Loan";
      else if (desc.includes("AGRI") || desc.includes("KCC") || desc.includes("CROP") || desc.includes("SGY")) loanCategory = "Agriculture";
      else if (desc.includes("MSME") || desc.includes("MUDRA") || desc.includes("SME") || desc.includes("BUSINESS")) loanCategory = "MSME/Business";
      else if (desc.includes("OD") || desc.includes("CC")) loanCategory = "CC/OD";
    }

    return {
      LoanKey: loanKey,
      CIF: cifFinal,
      CUSTNAME: (r.CUSTNAME || shadowCustName || "").trim(),
      ACCTDESC: (r.ACCTDESC || "").trim(),
      OUTSTAND: outstand,
      LIMIT: limit,
      INSTALAMT: instalamt,
      INTRATE: intRate,
      THEOBAL: theobal,
      IRREGAMT: irregamt,
      UNREALINT: unrealint,
      ACCRINT: accrint,
      SANCTDT: sanctDt,
      IRRGDT: irrgDt,
      NEWIRAC: newIrac,
      OLDIRAC: oldIrac,
      ARRCOND: (r.ARRCOND || "").trim(),
      SMA_CLASS: smaClass, // Original CSV value (kept for reference)
      SMA_DATE: smaDate,
      SMA_CODE: (r.SMA_CODE_INCIPIENT_STRESS || "").trim(),
      SMA_ARREAR_CONDITION: (r.SMA_ARREAR_CONDITION || "").trim(),
      // ── RBI IRAC Computed Fields ──
      // NPA Exemption Rule: Staff Loans (Segment_Cd=306 or Staff category) are exempt
      // from NPA classification per RBI IRAC norms — advances to bank's own staff.
      Computed_SMA_Class: (loanCategory === "Staff Loan" || loanSegment === "Staff" || shadowSegmentCd === "306")
        ? (computedSMAClass === "NPA" ? "STD" : computedSMAClass)
        : computedSMAClass,
      Computed_NPA_SubCategory: (loanCategory === "Staff Loan" || loanSegment === "Staff" || shadowSegmentCd === "306")
        ? ""
        : computedNPASubCategory,
      Computed_Is_NPA: (loanCategory === "Staff Loan" || loanSegment === "Staff" || shadowSegmentCd === "306")
        ? false
        : computedIsNPA,
      Computed_DPD: dpd,
      Computed_NPA_Exempt: (loanCategory === "Staff Loan" || loanSegment === "Staff" || shadowSegmentCd === "306"),
      Computed_NPA_Exempt_Reason: (loanCategory === "Staff Loan" || loanSegment === "Staff" || shadowSegmentCd === "306")
        ? "Staff Loan — Exempt from NPA classification"
        : "",
      STRESS: (r.STRESS || "").trim(),
      RA: (r.RA || "").trim(),
      RA_DATE: raDate,
      WRITE_OFF_FLAG: (r.WRITE_OFF_FLAG || "").trim(),
      WRITE_OFF_AMOUNT: writeOffAmount,
      WRITE_OFF_DATE: writeOffDate,
      CURRENCY: (r.CURRENCY || "INR").trim(),
      MAINTBR: (r.MAINTBR || "").trim(),
      EMISDue: parseNum(r.EMISDue),
      EMISPaid: parseNum(r.EMISPaid),
      EMISOvrdue: parseNum(r.EMISOvrdue),
      // Shadow merged fields
      Shadow_CIF: shadowCIF,
      Shadow_CustName: shadowCustName,
      Shadow_Maturity_Dt: shadowMaturityDt,
      Shadow_EMI_Due: shadowEMIDue,
      Shadow_EMI_Paid: shadowEMIPaid,
      Shadow_EMI_Overdue: shadowEMIOverdue,
      Shadow_Loan_Arrears: shadowLoanArrears,
      Shadow_New_IRAC: shadowNewIRAC,
      Shadow_SMA_CLASS: shadowSMAClass,
      // Shadow address fields for notices
      Shadow_Add1: shadow.Add1 || "",
      Shadow_Add2: shadow.Add2 || "",
      Shadow_Add3: shadow.Add3 || "",
      Shadow_Add4: shadow.Add4 || "",
      Shadow_PostCode: shadow.PostCode || "",
      Shadow_MobileNo: shadow.MobileNo || "",
      Shadow_Phone_No_Res: shadow.Phone_No_Res || "",
      Shadow_Cat_Type_Name: shadow.Cat_Type_Name || "",
      Shadow_App_Lmt: shadow.App_Lmt || 0,
      // Computed fields
      Months_To_Maturity: monthsToMaturity,
      Total_Loan_Term_Months: totalLoanTermMonths,
      Loan_Age_Months: loanAgeMonths,
      Monthly_Interest_Component: monthlyInterest,
      Monthly_Principal_Component: monthlyPrincipal,
      Risk_Weight: riskWeight,
      Remaining_Tenure_Percent: remainingTenurePct,
      Seasoning_Ratio: seasoningRatio,
      Forecast_Bucket: forecastBucket,
      Staff_Flag: (loanSegment === "Staff" || shadowSegmentCd === "306") ? "Staff" : "Non-Staff",
      Loan_Category: loanCategory,
      Loan_SubCategory: loanSubCategory,
      Loan_Segment: loanSegment,
      Loan_Priority: loanPriority,
      Loan_Secured: loanSecured,
      Loan_Scheme: loanScheme,
      Loan_RiskWeight: loanRiskWeight,
      ProductCode: productCode,
      ProductName: productName,
      Maturity_Dt: shadowMaturityDt,
      Exposure_Type: "Term Loan",
    };
  });

  await clearStore(STORES.LOAN_DATA);
  await putRecords(STORES.LOAN_DATA, records);
  await setSetting("loan-balance-date", todayISO());
  return records.length;
}

// ============================================================
// 5. Process CC/OD Balance File (Daily)
// ============================================================
export async function processCCODBalance(csvText: string): Promise<number> {
  const rows = parseCSV(csvText);

  // Load loan product mapping for CC/OD category lookup
  const loanProductMapping = await getAllRecords(STORES.LOAN_PRODUCT_MAPPING);
  // Build lookup by ProductCode (primary) AND by ProductName (fallback for ACCTDESC matching)
  const loanProductByCode: Record<string, any> = {};
  const loanProductByName: Record<string, any> = {};
  for (const p of loanProductMapping) {
    if (p.ProductCode) loanProductByCode[p.ProductCode.trim()] = p;
    if (p.ProductName) loanProductByName[p.ProductName.trim().toUpperCase()] = p;
  }

  // ── PRIMARY: Load Deposit Shadow to fetch Acct_Type + Int_cat for CC/OD accounts ──
  // CC/OD accounts exist in the Deposit Shadow file (they are OD/CC type accounts)
  // but their balances come from the CC/OD Balance file (which is more current).
  // We use Deposit Shadow only for product code derivation.
  const depositShadowRecords = await getAllRecords(STORES.DEPOSIT_SHADOW);
  const depositShadowByAcNo: Record<string, any> = {};
  for (const ds of depositShadowRecords) {
    if (ds.AcNo) depositShadowByAcNo[ds.AcNo.trim()] = ds;
  }

  const records = rows
    .filter((r) => (r.ACCTNO || "").trim() !== "")
    .map((r) => {
      const loanKey = (r.ACCTNO || "").trim();
      const cif = (r.CUSTNUMBER || "").trim();
      const currentBalance = parseNum(r.ACCTBAL);
      const limit = parseNum(r.LIMIT);
      const dp = parseNum(r.DP);
      const irregamt = parseNum(r.IRREGAMT);
      const intRate = parseNum(r.INTRATE);
      const unrealint = parseNum(r.UNREALINT);
      const accrint = parseNum(r.ACCRINT);
      const writeOffAmt = parseNum(r.WRITE_OFF_AMT);
      const smaClass = (r.SMA_CLASS || "").trim();
      const newIrac = (r.NEWIRAC || "").trim();
      const oldIrac = (r.OLDIRAC || "").trim();

      // Utilization
      const utilization = limit !== 0 ? currentBalance / limit : null;

      // DP Gap
      const dpGap = dp != null && currentBalance != null ? dp - currentBalance : null;

      // Irregular flag
      let irregularFlag = "Regular";
      if (irregamt > 0) irregularFlag = "Irregular";
      else if (currentBalance != null && dp != null && Math.abs(currentBalance) > dp && dp > 0) irregularFlag = "Overdrawn";

      // ── RBI IRAC Classification for CC/OD (Computed from Out of Order Date) ─────
      // For CC/OD: IRRGDT represents the "Out of Order" date (when account became irregular)
      const irrgDt = parseDate(r.IRRGDT);
      const dpd = calculateDPD(irrgDt);
      const rbiClassification = computeRBIClassification(dpd, newIrac);
      const computedSMAClass = rbiClassification.smaClass;
      const computedNPASubCategory = rbiClassification.npaSubCategory;
      const computedIsNPA = rbiClassification.isNPA;

      const acctDesc = (r.ACCTDESC || "").trim();
      const acctDescUpper = acctDesc.toUpperCase();
      let loanCategory = "CC/OD";
      let loanSubCategory = "";
      let loanSegment = "General";
      let loanPriority = "Medium";
      let loanSecured = "";
      let loanScheme = "None";
      let loanRiskWeight = "100";
      let productName = acctDesc;
      let productCode = "";
      let staffFlag = "Non-Staff";

      // ── STEP 1: Look up account in Deposit Shadow to get Acct_Type + Int_cat ──
      // The Deposit Shadow file contains the product type codes for CC/OD accounts.
      // These are the same codes used in the Loan Product Category Mapping.
      // IMPORTANT: CCOD ACCTNO may have leading zeros (raw from CBS), but DEPOSIT_SHADOW
      // AcNo is stored after trimLeadingZeros. Normalise before lookup.
      const loanKeyNorm = loanKey.replace(/^0+/, "") || loanKey;
      const shadowRecord = depositShadowByAcNo[loanKeyNorm] || depositShadowByAcNo[loanKey];
      if (shadowRecord) {
        const actType = (shadowRecord.ActType || "").trim();
        const intCat = (shadowRecord.IntCat || "").trim();
        if (actType && intCat) {
          productCode = `${actType}-${intCat}`;
        }
      }

      // ── STEP 2: Look up product code in Loan Product Category Mapping ──
      // Also check a built-in fallback table for common CC/OD product codes
      // that may not yet be in the user's uploaded mapping file.
      const BUILTIN_CCOD_PRODUCT_MAP: Record<string, { Category: string; SubCategory: string; Segment: string; Priority: string; Secured: string }> = {
        "1029-1431": { Category: "Gold Loan", SubCategory: "CSP Silver OD", Segment: "General", Priority: "High", Secured: "Yes" },
        "1094-1441": { Category: "Gold Loan", SubCategory: "Capital Plus Gold OD", Segment: "General", Priority: "High", Secured: "Yes" },
        "1096-1431": { Category: "Gold Loan", SubCategory: "SGS Plus Silver OD", Segment: "General", Priority: "High", Secured: "Yes" },
        "1096-1441": { Category: "Gold Loan", SubCategory: "SGS Plus Gold OD", Segment: "General", Priority: "High", Secured: "Yes" },
        "1097-1441": { Category: "Gold Loan", SubCategory: "PSP Gold OD", Segment: "General", Priority: "High", Secured: "Yes" },
        "1098-1441": { Category: "Gold Loan", SubCategory: "CGS Plus Gold OD", Segment: "General", Priority: "High", Secured: "Yes" },
        "5011-1301": { Category: "CC/OD", SubCategory: "Current Account OD", Segment: "General", Priority: "Medium", Secured: "No" },
        "6040-4011": { Category: "MSME", SubCategory: "Current Account OD", Segment: "General", Priority: "Medium", Secured: "No" },
        "6059-1001": { Category: "Personal Loan", SubCategory: "Overdraft - Staff", Segment: "Staff", Priority: "High", Secured: "No" },
        "6059-5001": { Category: "Personal Loan", SubCategory: "Overdraft - Staff", Segment: "Staff", Priority: "High", Secured: "No" },
        "6500-2020": { Category: "Home Loan", SubCategory: "Maxgain OD", Segment: "General", Priority: "High", Secured: "Yes" },
        "6551-2021": { Category: "Home Loan", SubCategory: "Maxgain OD", Segment: "General", Priority: "High", Secured: "Yes" },
        "6551-2078": { Category: "Gold Loan", SubCategory: "Liquid Gold Loan OD", Segment: "General", Priority: "High", Secured: "Yes" },
        "6551-2158": { Category: "Home Loan", SubCategory: "Maxgain OD", Segment: "General", Priority: "High", Secured: "Yes" },
        "6551-2258": { Category: "Personal Loan", SubCategory: "OD Against Mutual Funds", Segment: "General", Priority: "Medium", Secured: "Yes" },
      };
      const productMappingEntry = productCode
        ? (loanProductByCode[productCode] || (BUILTIN_CCOD_PRODUCT_MAP[productCode]
            ? { ...BUILTIN_CCOD_PRODUCT_MAP[productCode], ProductName: acctDesc, Scheme: "None", RiskWeight: "100", StaffFlag: BUILTIN_CCOD_PRODUCT_MAP[productCode].Segment === "Staff" ? "Yes" : "No" }
            : null))
        : null;

      if (productMappingEntry) {
        // Primary path: product code found in loan product mapping
        loanCategory = productMappingEntry.Category || "CC/OD";
        loanSubCategory = productMappingEntry.SubCategory || "";
        loanSegment = productMappingEntry.Segment || "General";
        loanPriority = productMappingEntry.Priority || "Medium";
        loanSecured = productMappingEntry.Secured || "";
        loanScheme = productMappingEntry.Scheme || "None";
        loanRiskWeight = productMappingEntry.RiskWeight || "100";
        productName = productMappingEntry.ProductName || acctDesc;
        // Staff flag from product mapping
        if (productMappingEntry.StaffFlag === "Yes" || loanSegment === "Staff") {
          staffFlag = "Staff";
        }
      } else {
        // ── STEP 3: Fallback — match ACCTDESC against ProductName in loan product mapping ──
        // Used when the account is not found in Deposit Shadow or product code has no mapping entry.
        const exactMatch = loanProductByName[acctDescUpper];
        if (exactMatch) {
          loanCategory = exactMatch.Category || "CC/OD";
          loanSubCategory = exactMatch.SubCategory || "";
          loanSegment = exactMatch.Segment || "General";
          loanPriority = exactMatch.Priority || "Medium";
          loanSecured = exactMatch.Secured || "";
          loanScheme = exactMatch.Scheme || "None";
          loanRiskWeight = exactMatch.RiskWeight || "100";
          productName = exactMatch.ProductName || acctDesc;
          productCode = exactMatch.ProductCode || productCode;
          if (exactMatch.StaffFlag === "Yes" || loanSegment === "Staff") staffFlag = "Staff";
        } else {
          // Partial ProductName match (ACCTDESC contains ProductName or vice versa)
          let bestMatch: any = null;
          let bestLen = 0;
          for (const [pname, pm] of Object.entries(loanProductByName)) {
            if (acctDescUpper.includes(pname) || pname.includes(acctDescUpper)) {
              if (pname.length > bestLen) {
                bestLen = pname.length;
                bestMatch = pm;
              }
            }
          }
          if (bestMatch) {
            loanCategory = bestMatch.Category || "CC/OD";
            loanSubCategory = bestMatch.SubCategory || "";
            loanSegment = bestMatch.Segment || "General";
            loanPriority = bestMatch.Priority || "Medium";
            loanSecured = bestMatch.Secured || "";
            loanScheme = bestMatch.Scheme || "None";
            loanRiskWeight = bestMatch.RiskWeight || "100";
            productName = bestMatch.ProductName || acctDesc;
            productCode = bestMatch.ProductCode || productCode;
            if (bestMatch.StaffFlag === "Yes" || loanSegment === "Staff") staffFlag = "Staff";
          } else {
            // Keyword fallback
            if (acctDescUpper.includes("MAXGAIN") || acctDescUpper.includes("HL MAXGAIN")) {
              loanCategory = "Home Loan"; loanSubCategory = "Maxgain OD";
            } else if (acctDescUpper.includes("HOME TOPUP") || acctDescUpper.includes("INSTA-HOME")) {
              loanCategory = "Home Loan"; loanSubCategory = "Home Top-up OD";
            } else if (acctDescUpper.includes("MSME") || acctDescUpper.includes("CC-SBF") || acctDescUpper.includes("MUDRA")) {
              loanCategory = "MSME"; loanSubCategory = acctDescUpper.includes("MUDRA") ? "MUDRA Cash Credit" : "Cash Credit";
            } else if (acctDescUpper.includes("OD BANK") || acctDescUpper.includes("OD-LOAN AG DEP") || acctDescUpper.includes("OD AGAINST DEP")) {
              loanCategory = "Personal Loan"; loanSubCategory = "OD Against Deposits";
            } else if (acctDescUpper.includes("OD-LON AGAINST FD") || acctDescUpper.includes("OD-LOAN AGAINST FD") || acctDescUpper.includes("OD AGAINST FD")) {
              loanCategory = "Personal Loan"; loanSubCategory = "OD Against Fixed Deposit";
            } else if (acctDescUpper.includes("FESTIVAL") || acctDescUpper.includes("OD FESTIVAL")) {
              loanCategory = "Personal Loan"; loanSubCategory = "Festival Overdraft";
            } else if (acctDescUpper.includes("OD PERSONAL") || acctDescUpper.includes("OD-PERSONAL")) {
              loanCategory = "Personal Loan"; loanSubCategory = "Overdraft";
            } else if (acctDescUpper.includes("STAFF")) {
              loanCategory = "Staff Loan"; loanSubCategory = "Overdraft - Staff"; staffFlag = "Staff";
            } else if (acctDescUpper.includes("GOLD") || acctDescUpper.includes("SB PSP") || acctDescUpper.includes("SB CSP") || acctDescUpper.includes("SB SGSP") || acctDescUpper.includes("SB CGSP")) {
              loanCategory = "Gold Loan"; loanSubCategory = "Gold Loan - OD";
            } else if (acctDescUpper.includes("MC-OD") || acctDescUpper.includes("E-COMMERCE") || acctDescUpper.includes("ECOMM")) {
              loanCategory = "Personal Loan"; loanSubCategory = "Overdraft";
            }
          }
        }
      }

      return {
        LoanKey: loanKey,
        CIF: cif,
        CUSTNAME: (r.CUSTNAME || "").trim(),
        ACCTDESC: acctDesc,
        INTRATE: intRate,
        LIMIT: limit,
        DP: dp,
        LMTEXPDT: parseDate(r.LMTEXPDT),
        CurrentBalance: currentBalance,
        UNCLRBAL: parseNum(r.UNCLRBAL),
        IRREGAMT: irregamt,
        NEWIRAC: newIrac,
        OLDIRAC: oldIrac,
        SANC_RENDT: parseDate(r.SANC_RENDT),
        ARRCOND: (r.ARRCOND || "").trim(),
        CURRENCY: (r.CURRENCY || "INR").trim(),
        MAINTBR: (r.MAINTBR || "").trim(),
        IRRGDT: parseDate(r.IRRGDT),
        UNREALINT: unrealint,
        ACCRINT: accrint,
        STRESS: (r.STRESS || "").trim(),
        SMA_CODE: (r.SMA_CODE || "").trim(),
        RA: (r.RA || "").trim(),
        RA_DATE: parseDate(r.RA_DATE),
        WRITE_OFF_FLAG: (r.WRITE_OFF_FLAG || "").trim(),
        WRITE_OFF_AMT: writeOffAmt,
        WRITE_OFF_DATE: parseDate(r.WRITE_OFF_DATE),
        SMA_CLASS: smaClass, // Original CSV value (kept for reference)
        SMA_DATE: parseDate(r.SMA_DATE),
        SMA_ARREAR_CONDITION: (r.SMA_ARREAR_CONDITION || "").trim(),
        // ── RBI IRAC Computed Fields ──
        // NPA Exemption Rules (RBI IRAC norms):
        //  1. OD against Bank's own Deposits — secured by bank's own deposits; not treated as NPA.
        //  2. OD to Bank Staff — advances to bank's own employees; not treated as NPA.
        // These are identified by Loan_SubCategory or Loan_Category / Staff_Flag.
        Computed_SMA_Class: (
          loanSubCategory === "OD Against Deposits" ||
          loanSubCategory === "OD Against Fixed Deposit" ||
          loanCategory === "Staff Loan" ||
          loanSubCategory === "Overdraft - Staff" ||
          staffFlag === "Staff"
        ) ? (computedSMAClass === "NPA" ? "STD" : computedSMAClass)
          : computedSMAClass,
        Computed_NPA_SubCategory: (
          loanSubCategory === "OD Against Deposits" ||
          loanSubCategory === "OD Against Fixed Deposit" ||
          loanCategory === "Staff Loan" ||
          loanSubCategory === "Overdraft - Staff" ||
          staffFlag === "Staff"
        ) ? "" : computedNPASubCategory,
        Computed_Is_NPA: (
          loanSubCategory === "OD Against Deposits" ||
          loanSubCategory === "OD Against Fixed Deposit" ||
          loanCategory === "Staff Loan" ||
          loanSubCategory === "Overdraft - Staff" ||
          staffFlag === "Staff"
        ) ? false : computedIsNPA,
        Computed_DPD: dpd,
        Computed_NPA_Exempt: (
          loanSubCategory === "OD Against Deposits" ||
          loanSubCategory === "OD Against Fixed Deposit" ||
          loanCategory === "Staff Loan" ||
          loanSubCategory === "Overdraft - Staff" ||
          staffFlag === "Staff"
        ),
        Computed_NPA_Exempt_Reason: (
          loanSubCategory === "OD Against Deposits" || loanSubCategory === "OD Against Fixed Deposit"
        ) ? "OD against Bank's Deposit — Exempt from NPA classification"
          : (loanCategory === "Staff Loan" || loanSubCategory === "Overdraft - Staff" || staffFlag === "Staff")
          ? "Staff Overdraft — Exempt from NPA classification"
          : "",
        // Computed
        Utilization: utilization,
        DP_Gap: dpGap,
        Irregular_Flag: irregularFlag,
        Exposure_Type: "CC/OD",
        // Category from Loan Product Category Mapping
        // (product code fetched from Deposit Shadow → Acct_Type-Int_cat → Loan Product Mapping)
        Loan_Category: loanCategory,
        Loan_SubCategory: loanSubCategory,
        Loan_Segment: loanSegment,
        Loan_Priority: loanPriority,
        Loan_Secured: loanSecured,
        Loan_Scheme: loanScheme,
        Loan_RiskWeight: loanRiskWeight,
        Product_Name: productName,
        Product_Code: productCode,
        Staff_Flag: staffFlag,
      };
    });

  await clearStore(STORES.CCOD_DATA);
  await putRecords(STORES.CCOD_DATA, records);
  await setSetting("ccod-balance-date", todayISO());
  return records.length;
}

// ============================================================
// 6. Process NPA Report (Daily)
// ============================================================
export async function processNPAReport(csvText: string): Promise<number> {
  const rows = parseCSV(csvText);

  const records = rows
    .filter((r) => (r.ACCOUNT_NO || "").trim() !== "")
    .map((r) => {
      const iracCode = (r.NEW_IRAC || "").trim();
      let iracDesc = "Standard";
      if (iracCode === "04" || iracCode === "4") iracDesc = "Sub-Standard";
      else if (iracCode === "05" || iracCode === "5") iracDesc = "Doubtful";
      else if (iracCode === "06" || iracCode === "6") iracDesc = "Doubtful (D2)";
      else if (iracCode === "07" || iracCode === "7") iracDesc = "Doubtful (D3)";
      else if (iracCode === "08" || iracCode === "8") iracDesc = "Loss";

      return {
        SR_NO: parseNum(r.SR_NO),
        ACCOUNT_NO: (r.ACCOUNT_NO || "").trim(),
        CUSTOMER_NAME: (r.CUSTOMER_NAME || "").trim(),
        URIP: parseNum(r.URIP),
        OLD_IRAC: (r.OLD_IRAC || "").trim(),
        NEW_IRAC: iracCode,
        IRAC_DESC: iracDesc,
        NPA_DATE: parseDate(r.NPA_DATE),
        OUTSTANDING: parseNum(r.OUTSTANDING),
        ARR_COND: (r.ARR_COND || "").trim(),
        SYS: (r.SYS || "").trim(),
        FATHER_NAME: (r.FATHER_NAME || "").trim(),
        SPOUSE_NAME: (r.SPOUSE_NAME || "").trim(),
        ADDRESS1: (r.ADDRESS1 || "").trim(),
        ADDRESS2: (r.ADDRESS2 || "").trim(),
        ADDRESS3: (r.ADDRESS3 || "").trim(),
        POSTCODE: (r.POSTCODE || "").trim(),
      };
    });

  await clearStore(STORES.NPA_DATA);
  await putRecords(STORES.NPA_DATA, records);
  await setSetting("npa-report-date", todayISO());
  return records.length;
}

// ============================================================
// 7. Build Customer Dimension (Customer 360)
// ============================================================
export async function buildCustomerDimension(): Promise<number> {
  const deposits = await getAllRecords(STORES.DEPOSIT_DATA);
  const loans = await getAllRecords(STORES.LOAN_DATA);
  const ccod = await getAllRecords(STORES.CCOD_DATA);
  const npa = await getAllRecords(STORES.NPA_DATA);

  // Step 1: Find duplicate account numbers between deposits and CC/OD
  const depositAccountNos = new Set(deposits.map(d => d.AcNo));
  const ccodAccountNos = new Set(ccod.map(c => c.LoanKey));
  const duplicateAccounts = new Set(
    Array.from(depositAccountNos).filter(acNo => ccodAccountNos.has(acNo))
  );

  // Step 2: Remove duplicate accounts from deposits (keep in CC/OD as loans)
  const filteredDeposits = deposits.filter(d => !duplicateAccounts.has(d.AcNo));

  const customerMap: Record<string, any> = {};

  // Process deposits (excluding duplicates)
  for (const dep of filteredDeposits) {
    if (!dep.CIF) continue;
    if (!customerMap[dep.CIF]) {
      customerMap[dep.CIF] = {
        CIF: dep.CIF,
        CustName: dep.CustName || "",
        MAINTBR: dep.MAINTBR || "",
        HNI_Category: dep.HNI_Category || "Regular",
        NRI_Client_Flag: "Resident",
        Wealth_Client_Flag: "Non-Wealth",
        Salary_Account_Flag: "Non-Salary",
        SeniorCitizen_Flag: "Non-Senior",
        Staff_Flag: "Non-Staff",
        TotalDeposits: 0,
        TotalLoans: 0,
        TotalCCOD: 0,
        TotalRelationshipValue: 0,
        NetExposure: 0,
        DepositCount: 0,
        LoanCount: 0,
        CCODCount: 0,
        NPACount: 0,
        HasNPA: false,
        MobileNo: dep.MobileNo || "",
        Add1: dep.Add1 || "",
        Add2: dep.Add2 || "",
        Add3: dep.Add3 || "",
        PostCode: dep.PostCode || "",
      };
    }
    const c = customerMap[dep.CIF];
    const depBalance = dep.CurrentBalance || 0;
    if (depBalance >= 0) {
      c.TotalDeposits += depBalance;
      c.DepositCount += 1;
    } else {
      c.TotalLoans += Math.abs(depBalance);
      c.LoanCount += 1;
    }
    if (dep.NRI_Client_Flag === "NRI") c.NRI_Client_Flag = "NRI";
    if (dep.Wealth_Client_Flag === "Wealth") c.Wealth_Client_Flag = "Wealth";
    if (dep.Salary_Account_Flag === "Salary") c.Salary_Account_Flag = "Salary";
    if (dep.SeniorCitizen_Flag === "Senior Citizen") c.SeniorCitizen_Flag = "Senior Citizen";
    if (dep.Staff_Flag === "Staff") c.Staff_Flag = "Staff";
    if (!c.CustName && dep.CustName) c.CustName = dep.CustName;
    if (!c.MobileNo && dep.MobileNo) c.MobileNo = dep.MobileNo;
  }

  // Process loans
  for (const loan of loans) {
    if (!loan.CIF) continue;
    if (!customerMap[loan.CIF]) {
      customerMap[loan.CIF] = {
        CIF: loan.CIF,
        CustName: loan.CUSTNAME || "",
        MAINTBR: loan.MAINTBR || "",
        HNI_Category: "Regular",
        NRI_Client_Flag: "Resident",
        Wealth_Client_Flag: "Non-Wealth",
        Salary_Account_Flag: "Non-Salary",
        SeniorCitizen_Flag: "Non-Senior",
        Staff_Flag: "Non-Staff",
        TotalDeposits: 0,
        TotalLoans: 0,
        TotalCCOD: 0,
        TotalRelationshipValue: 0,
        NetExposure: 0,
        DepositCount: 0,
        LoanCount: 0,
        CCODCount: 0,
        NPACount: 0,
        HasNPA: false,
        MobileNo: loan.Shadow_MobileNo || "",
        Add1: loan.Shadow_Add1 || "",
        Add2: loan.Shadow_Add2 || "",
        Add3: loan.Shadow_Add3 || "",
        PostCode: loan.Shadow_PostCode || "",
      };
    }
    const c = customerMap[loan.CIF];
    const loanBalance = loan.OUTSTAND || 0;
    if (loanBalance > 0) {
      c.TotalLoans += loanBalance;
      c.LoanCount += 1;
    } else if (loanBalance < 0) {
      c.TotalDeposits += Math.abs(loanBalance);
      c.DepositCount += 1;
    }
    if (!c.CustName && loan.CUSTNAME) c.CustName = loan.CUSTNAME;
    if (loan.Staff_Flag === "Staff") c.Staff_Flag = "Staff";
    // Check NPA
    if (loan.NEWIRAC && loan.NEWIRAC !== "00" && loan.NEWIRAC !== "01") {
      c.NPACount += 1;
      c.HasNPA = true;
    }
  }

  // Process CC/OD
  for (const cc of ccod) {
    if (!cc.CIF) continue;
    if (!customerMap[cc.CIF]) {
      customerMap[cc.CIF] = {
        CIF: cc.CIF,
        CustName: cc.CUSTNAME || "",
        MAINTBR: cc.MAINTBR || "",
        HNI_Category: "Regular",
        NRI_Client_Flag: "Resident",
        Wealth_Client_Flag: "Non-Wealth",
        Salary_Account_Flag: "Non-Salary",
        SeniorCitizen_Flag: "Non-Senior",
        Staff_Flag: "Non-Staff",
        TotalDeposits: 0,
        TotalLoans: 0,
        TotalCCOD: 0,
        TotalRelationshipValue: 0,
        NetExposure: 0,
        DepositCount: 0,
        LoanCount: 0,
        CCODCount: 0,
        NPACount: 0,
        HasNPA: false,
        MobileNo: "",
        Add1: "",
        Add2: "",
        Add3: "",
        PostCode: "",
      };
    }
    const c = customerMap[cc.CIF];
    const ccBalance = cc.CurrentBalance || 0;
    // Positive balance (credit) = deposits (CASA), Negative balance (debit) = loan exposure
    if (ccBalance > 0) {
      c.TotalDeposits += ccBalance; // Positive balance counted as deposits
      c.CCODCount += 1;
    } else if (ccBalance < 0) {
      c.TotalCCOD += Math.abs(ccBalance); // Negative balance counted as loan exposure
      c.CCODCount += 1;
    } else {
      c.CCODCount += 1; // Zero balance
    }
    if (!c.CustName && cc.CUSTNAME) c.CustName = cc.CUSTNAME;
    // Propagate Staff flag from CC/OD record (set during CC/OD processing via Loan Product Mapping)
    if (cc.Staff_Flag === "Staff") c.Staff_Flag = "Staff";
    // Check NPA
    if (cc.NEWIRAC && cc.NEWIRAC !== "00" && cc.NEWIRAC !== "01" && cc.NEWIRAC !== "0") {
      c.NPACount += 1;
      c.HasNPA = true;
    }
  }

  // NPA accounts
  const npaAccounts = new Set(npa.map((n: any) => n.ACCOUNT_NO));

  // Finalize customer records
  const customers = Object.values(customerMap).map((c: any) => {
    c.TotalRelationshipValue = Math.abs(c.TotalDeposits) + Math.abs(c.TotalLoans) + Math.abs(c.TotalCCOD);
    c.NetExposure = c.TotalDeposits - c.TotalLoans - c.TotalCCOD;

    // HNI from total relationship value
    if (c.TotalRelationshipValue >= 10000000) c.HNI_Category = "Ultra HNI";
    else if (c.TotalRelationshipValue >= 2500000) c.HNI_Category = "HNI";
    else c.HNI_Category = "Regular";

    // Multi-flag system: a customer can have multiple flags
    const flags: string[] = [];
    // Flag 1 & 2: HNI tiers based on total relationship value
    if (c.HNI_Category === "Ultra HNI") flags.push("Ultra HNI");
    else if (c.HNI_Category === "HNI") flags.push("HNI");
    // Flag 3: Wealth
    if (c.Wealth_Client_Flag === "Wealth") flags.push("Wealth");
    // Flag 4: Salary
    if (c.Salary_Account_Flag === "Salary") flags.push("Salary");
    // Flag 5: Senior Citizen
    if (c.SeniorCitizen_Flag === "Senior Citizen") flags.push("Senior Citizen");
    // Flag 6: NRI
    if (c.NRI_Client_Flag === "NRI") flags.push("NRI");
    // Flag 7: Staff
    if (c.Staff_Flag === "Staff") flags.push("Staff");
    // Flag 8: Regular (only if no other flag assigned)
    if (flags.length === 0) flags.push("Regular");

    c.CustomerFlags = flags;
    // Keep CustomerSegment for backward compatibility (primary/highest flag)
    c.CustomerSegment = flags[0];

    return c;
  });

  await clearStore(STORES.CUSTOMER_DIM);
  await putRecords(STORES.CUSTOMER_DIM, customers);
  await setSetting("customer-dim-date", todayISO());
  return customers.length;
}

// ============================================================
// File Type Detection
// ============================================================
export function detectFileType(fileName: string, headers: string[]): string | null {
  const fn = fileName.toLowerCase();
  const headerStr = headers.join(",").toLowerCase();

  // NPA must be checked BEFORE loan-balance because NPA filenames may contain "lond" prefix
  if (fn.includes("npa") || fn.includes("listof_npa") || fn.includes("lond2572")) return "npa-report";
  if (fn.includes("dep_shadow") || fn.includes("weeklyreports_dep")) return "deposit-shadow";
  if (fn.includes("lon_shadow") || fn.includes("miscreports_lon_shadow")) return "loan-shadow";
  if (fn.includes("loan_product") || fn.includes("loan_mapping")) return "loan-product-mapping";
  if (fn.includes("product_category") || fn.includes("deposit_product") || fn.includes("mapping")) return "product-mapping";
  if (fn.includes("cc_od") || fn.includes("depd")) return "ccod-balance";
  if (fn.includes("loansbalancefile") || fn.includes("lond")) return "loan-balance";

  // Fallback: detect by headers
  if (headerStr.includes("acctno") && headerStr.includes("outstand") && headerStr.includes("emisdue")) return "loan-balance";
  if (headerStr.includes("acctno") && headerStr.includes("acctbal") && headerStr.includes("dp")) return "ccod-balance";
  if (headerStr.includes("account_no") && headerStr.includes("npa_date")) return "npa-report";
  if (headerStr.includes("bankcd") && headerStr.includes("curr_bal") && headerStr.includes("acttype")) return "deposit-shadow";
  if (headerStr.includes("bnkno") && headerStr.includes("loan_arrears") && headerStr.includes("emi_due")) return "loan-shadow";
  if (headerStr.includes("productcode") && headerStr.includes("category") && headerStr.includes("secured")) return "loan-product-mapping";
  if (headerStr.includes("productcode") && headerStr.includes("category") && headerStr.includes("salaryflag")) return "product-mapping";

  return null;
}

export const FILE_TYPE_LABELS: Record<string, string> = {
  "deposit-shadow": "Deposit Shadow (Month-end)",
  "loan-shadow": "Loan Shadow (Month-end)",
  "loan-balance": "Loan Balance (Daily)",
  "ccod-balance": "CC/OD Balance (Daily)",
  "npa-report": "NPA Report (Daily)",
  "product-mapping": "Deposit Product Category Mapping",
  "loan-product-mapping": "Loan Product Category Mapping",
};

// ============================================================
// File Date & Branch Code Extraction
// ============================================================

/**
 * Extract YYYYMMDD date from standardized filename
 * Standard format: YYYYMMDD appears in filenames like:
 * - 20251016_MiscReports_Listof_NPA_Accounts_lond2572.csv
 * - 20251016_weeklyreports_dep_shadow_12345.csv
 * Returns null if no valid date found
 */
export function extractFileDateFromName(fileName: string): string | null {
  // Match YYYYMMDD pattern (8 consecutive digits)
  const match = fileName.match(/(\d{8})/);
  if (!match) return null;

  const dateStr = match[1];
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);

  // Validate date
  const date = new Date(`${year}-${month}-${day}`);
  if (isNaN(date.getTime())) return null;

  // Return ISO format (YYYY-MM-DD)
  return `${year}-${month}-${day}`;
}

/**
 * Extract 5-digit branch code from filename
 * Standard format: Branch code appears at the end like:
 * - 20251016_MiscReports_Listof_NPA_Accounts_lond2572.csv (branch code: 02572)
 * - 20251016_weeklyreports_dep_shadow_12345.csv (branch code: 12345)
 * Returns null if no valid 5-digit code found
 */
export function extractBranchCodeFromName(fileName: string): string | null {
  // Match 5-digit number (usually at end, before .csv)
  const match = fileName.match(/(\d{5})/);
  if (!match) return null;

  const branchCode = match[1];
  // Validate it's a reasonable branch code (not all zeros)
  if (branchCode === '00000') return null;

  return branchCode;
}

/**
 * File types that have dates in their standardized filenames (YYYYMMDD format)
 */
export const FILE_TYPES_WITH_DATE_IN_NAME = [
  "deposit-shadow",
  "loan-shadow",
  "loan-balance",
  "ccod-balance",
  "npa-report",
];

/**
 * File types that use upload timestamp as file date (no date in filename)
 */
export const FILE_TYPES_WITH_UPLOAD_DATE = [
  "product-mapping",
  "loan-product-mapping",
];
