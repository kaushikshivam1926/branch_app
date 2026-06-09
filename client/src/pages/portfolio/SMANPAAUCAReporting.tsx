/**
 * SMA / NPA / AUCA Reporting
 * ─────────────────────────────────────────────────────────────────────────────
 * Design: Clean government-document aesthetic — white print area, SBI navy
 * header, compact serif-style table rows, print-only CSS that hides all UI.
 *
 * Three sub-tabs:
 *  1. SMA Accounts  — Monthly Return of Irregular & SMA Advances (IRREG format)
 *  2. NPA Accounts  — Annexure-C Quarterly NPA Review (≤ ₹5 Cr)
 *  3. AUCA Accounts — Annexure-D Quarterly AUCA Review + per-account single-page
 */

import { useState, useEffect, useRef, useMemo } from "react";
import * as XLSX from "xlsx";
import { Printer, RefreshCw, AlertTriangle, FileText, TrendingDown, Archive, Save, FolderOpen, Download, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAllRecords, STORES } from "@/lib/portfolioDb";
import { loadData, saveData } from "@/lib/db";
import { useBranch } from "@/contexts/BranchContext";
import { formatINR } from "@/lib/portfolioTransform";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type SortConfig = { key: string; direction: "asc" | "desc" } | null;

interface SMARow {
  srNo: number;
  accountNo: string;
  customerName: string;
  acctDesc: string;
  securityDesc: string;
  sanctionDate: string;
  sanctionLimit: number;
  outstanding: number;
  irregularAmt: number;
  irregularDate: string;
  remarks: string;
}

interface NPARow {
  srNo: number;
  actNo: string;
  nameOfUnit: string;
  constitution: string;
  totalOutstanding: number;
  securityHeld: number;
  provision: number;
  migrationDate: string;
  npaDate: string;
  irac: string;
  ra: string;
  activityStatus: string;
  suitStatus: string;  // Col 13: Status of suit filed / RRC / DRT
  observation: string;
  strategyPlan: string;
}

interface AUCARow {
  srNo: number;
  actNo: string;
  nameOfUnit: string;
  constitution: string;
  totalOutstanding: number;
  securityHeld: number;
  migrationDate: string;
  npaDate: string;
  raDate: string;
  activityStatus: string;
  suitStatus: string;  // Col 13: Status of suit filed / RRC / DRT
  observation: string;
  strategyPlan: string;
  // For single-page review
  natureOfActivity: string;
  promoters: string;
  sanctionLimit: string;
  sanctionDate: string;
  dateTransferRA: string;
  amountTransferredAUCA: number;
  recoveryAfterAUCA: string;
  presentOutstanding: number;
  accruedInterest: number;
  totalInvolvedLoss: number;
  suitDetails: string;
  rrcDetails: string;
  drtDetails: string;
  securityParticulars: string;
  prospectOfRecovery: string;
  remark: string;
  recommendation: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined): string {
  if (!d) return "";
  // If already DD/MM/YYYY or DD-MM-YYYY, normalise to DD/MM/YYYY
  const s = String(d).trim();
  if (/^\d{2}[/-]\d{2}[/-]\d{4}$/.test(s)) return s.replace(/-/g, "/");
  // ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, m, dd] = s.slice(0, 10).split("-");
    return `${dd}/${m}/${y}`;
  }
  return s;
}

function fmtAmt(n: number): string {
  if (!n && n !== 0) return "0.00";
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getQuarterLabel(date: Date): string {
  const m = date.getMonth() + 1;
  const y = date.getFullYear();
  if (m <= 3) return `DEC ${y - 1}`;
  if (m <= 6) return `MAR ${y}`;
  if (m <= 9) return `JUN ${y}`;
  return `SEP ${y}`;
}

function getMonthLabel(date: Date): string {
  return date.toLocaleString("en-IN", { month: "short", year: "numeric" }).toUpperCase();
}

const IRAC_LABELS: Record<string, string> = {
  "03": "3", "3": "3",
  "04": "4", "4": "4",
  "05": "5", "5": "5",
  "06": "6", "6": "6",
  "07": "7", "7": "7",
  "08": "8", "8": "8",
};

const DEFAULT_OBSERVATION = "Continuously following up with the borrower to deposit overdue amount through telephone / personal visits and notices.";
const DEFAULT_STRATEGY = "Legal Action / explore the possibility of settlement of dues under compromise.";
const AUCA_OBSERVATION = "Notices Issued, visited personally to the given address, lok adalat notices issued time to time and follow up is done by the branch as per bank's extant instructions.";
const AUCA_STRATEGY = "All possible efforts have been made for recovery, but chances of further recovery are very bleak.";

// ─── Print CSS ────────────────────────────────────────────────────────────────

// Base print CSS (page orientation injected dynamically by handlePrint)
const PRINT_STYLE_BASE = `
@media print {
  body * { visibility: hidden !important; }
  #sma-npa-print-area, #sma-npa-print-area * { 
    visibility: visible !important; 
    background: none !important; 
    color: black !important; 
    text-decoration: none !important; 
  }
  #sma-npa-print-area {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    overflow: visible !important;
  }
  #sma-npa-print-area table {
    table-layout: fixed;
    width: 100%;
    word-wrap: break-word;
    overflow-wrap: break-word;
    page-break-inside: auto;
    orphans: 2;
    widows: 2;
  }
  #sma-npa-print-area th, #sma-npa-print-area td {
    white-space: normal !important;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
  /* Fix Chrome bug where table-header-group breaks if an ancestor has overflow: auto */
  #sma-npa-print-area .overflow-x-auto,
  #sma-npa-print-area .overflow-auto {
    overflow: visible !important;
    overflow-x: visible !important;
    overflow-y: visible !important;
  }
  /* Hide UI-only elements when printing */
  .no-print { display: none !important; }
  /* Repeat table column headers on every page, but NOT the summary block */
  #sma-npa-print-area thead { display: table-header-group; }
  #sma-npa-print-area tbody { page-break-inside: auto; }
  #sma-npa-print-area tfoot { display: table-footer-group; }
  /* Prevent page breaks inside a single data row */
  #sma-npa-print-area tbody tr { break-inside: avoid; page-break-inside: avoid; page-break-after: auto; }
  /* Summary/header block above the table should NOT repeat — only appears once */
  .print-report-header { break-after: avoid; page-break-after: avoid; }
}

/* Force table borders to be black on both screen and print */
#sma-npa-print-area table,
#sma-npa-print-area th,
#sma-npa-print-area td {
  border: 1px solid #000000 !important;
  border-color: #000000 !important;
}
`;
const PRINT_STYLE_LANDSCAPE = `@media print { @page { size: A4 landscape; margin: 10mm; } }`;
const PRINT_STYLE_PORTRAIT  = `@media print { @page { size: A4 portrait;  margin: 8mm;  } }`;

// ─── Component ────────────────────────────────────────────────────────────────

export default function SMANPAAUCAReporting() {
  const { branchName, branchCode } = useBranch();
  const [activeTab, setActiveTab] = useState<"sma" | "npa" | "auca">("sma");
  const [loading, setLoading] = useState(false);
  const [reportDate, setReportDate] = useState(new Date());
  const [printMode, setPrintMode] = useState<"compact" | "standard" | "large">("standard");

  // Data
  const [smaRows, setSmaRows] = useState<SMARow[]>([]);
  const [npaRows, setNpaRows] = useState<NPARow[]>([]);
  const [aucaRows, setAucaRows] = useState<AUCARow[]>([]);
  const [hasData, setHasData] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current && current.key === key) {
        if (current.direction === "asc") return { key, direction: "desc" };
        return null;
      }
      return { key, direction: "asc" };
    });
  };

  const getSortedData = <T extends Record<string, any>>(data: T[]) => {
    if (!sortConfig) return data;
    return [...data].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  };

  // AUCA single-page review
  const [selectedAUCA, setSelectedAUCA] = useState<AUCARow | null>(null);

  // Editable remarks/strategy per row (keyed by actNo/accountNo)
  const [smaRemarks, setSmaRemarks] = useState<Record<string, string>>({}); // persisted to IndexedDB
  const [smaSecurities, setSmaSecurities] = useState<Record<string, string>>({}); // persisted to IndexedDB
  const [npaEdits, setNpaEdits] = useState<Record<string, { observation?: string; strategy?: string; suitStatus?: string }>>({}); // persisted to IndexedDB
  const [aucaEdits, setAucaEdits] = useState<Record<string, Record<string, string | number | undefined>>>({}); // persisted to IndexedDB
  // Snapshot state
  const [snapshots, setSnapshots] = useState<string[]>([]); // list of snapshot keys e.g. ["report-snapshot-2026-03"]
  const [showSnapshotMenu, setShowSnapshotMenu] = useState(false);

  // RBO Name and Address settings
  const [rboName, setRboName] = useState("");
  const [rboAddress, setRboAddress] = useState("");

  const printRef = useRef<HTMLDivElement>(null);

  // Load persisted SMA remarks, NPA edits, AUCA edits, and snapshot list on mount
  useEffect(() => {
    loadData("sma-remarks").then((saved: Record<string, string> | null) => {
      if (saved) setSmaRemarks(saved);
    });
    loadData("sma-securities").then((saved: Record<string, string> | null) => {
      if (saved) setSmaSecurities(saved);
    });
    loadData("npa-edits").then((saved: any) => {
      if (saved) setNpaEdits(saved);
    });
    loadData("auca-edits").then((saved: any) => {
      if (saved) setAucaEdits(saved);
    });
    // Load snapshot index
    loadData("report-snapshot-index").then((idx: string[] | null) => {
      if (idx) setSnapshots(idx);
    });
    // Load RBO settings
    loadData("auca-rbo-settings").then((saved: any) => {
      if (saved) {
        if (saved.rboName) setRboName(saved.rboName);
        if (saved.rboAddress) setRboAddress(saved.rboAddress);
      }
    });
    loadReportData();
  }, []);

  const handleRboNameChange = async (val: string) => {
    setRboName(val);
    await saveData("auca-rbo-settings", { rboName: val, rboAddress });
  };

  const handleRboAddressChange = async (val: string) => {
    setRboAddress(val);
    await saveData("auca-rbo-settings", { rboName, rboAddress: val });
  };

  // Persist SMA remarks whenever they change
  async function updateSmaRemark(accountNo: string, value: string) {
    const updated = { ...smaRemarks, [accountNo]: value };
    setSmaRemarks(updated);
    await saveData("sma-remarks", updated);
  }

  // Persist SMA securities whenever they change
  async function updateSmaSecurity(accountNo: string, value: string) {
    const updated = { ...smaSecurities, [accountNo]: value };
    setSmaSecurities(updated);
    await saveData("sma-securities", updated);
  }

   // Persist NPA edits
  async function updateNpaEdit(actNo: string, field: string, value: string) {
    const updated = { ...npaEdits, [actNo]: { ...(npaEdits[actNo] || {}), [field]: value } };
    setNpaEdits(updated);
    await saveData("npa-edits", updated);
  }
  // Persist AUCA edits
  async function updateAucaEdit(actNo: string, field: string, value: string) {
    const updated = { ...aucaEdits, [actNo]: { ...(aucaEdits[actNo] || {}), [field]: value } };
    setAucaEdits(updated);
    await saveData("auca-edits", updated);
  }
  // ── Snapshot: Save ──────────────────────────────────────────────────────────
  async function saveSnapshot() {
    const key = `report-snapshot-${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, "0")}`;
    const snapshot = {
      period: key,
      savedAt: new Date().toISOString(),
      reportDate: reportDate.toISOString(),
      smaRows, npaRows, aucaRows,
      smaRemarks, npaEdits, aucaEdits,
    };
    await saveData(key, snapshot);
    const newIndex = snapshots.includes(key) ? snapshots : [...snapshots, key].sort().reverse();
    setSnapshots(newIndex);
    await saveData("report-snapshot-index", newIndex);
    toast.success(`Snapshot saved for ${getMonthLabel(reportDate)}`);
  }
  // ── Snapshot: Load ──────────────────────────────────────────────────────────
  async function loadSnapshot(key: string) {
    const snap = await loadData(key);
    if (!snap) { toast.error("Snapshot not found"); return; }
    setSmaRows(snap.smaRows || []);
    setNpaRows(snap.npaRows || []);
    setAucaRows(snap.aucaRows || []);
    setSmaRemarks(snap.smaRemarks || {});
    setNpaEdits(snap.npaEdits || {});
    setAucaEdits(snap.aucaEdits || {});
    if (snap.reportDate) setReportDate(new Date(snap.reportDate));
    setShowSnapshotMenu(false);
    toast.success(`Loaded snapshot: ${snap.period}`);
  }
  // ── Export to Excel ─────────────────────────────────────────────────────────
  function exportToExcel() {
    const wb = XLSX.utils.book_new();
    // SMA sheet
    const smaData = [
      ["SR NO", "Account No", "Name of Borrower", "Account Description", "Security Description", "Sanction Date", "Sanction Limit", "Outstanding", "Irregular Amount", "Date of Irregular", "Remarks"],
      ...smaRows.map(r => [
        r.srNo, r.accountNo, r.customerName, r.acctDesc, smaSecurities[r.accountNo] ?? r.securityDesc,
        r.sanctionDate, r.sanctionLimit, r.outstanding, r.irregularAmt,
        r.irregularDate, smaRemarks[r.accountNo] ?? r.remarks,
      ]),
      ["", "", "", "", "", "", "TOTAL", smaTotals.outstanding, smaTotals.irregular, "", ""],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(smaData), "SMA Accounts");
    // NPA sheet
    const npaData = [
      [
        "SR NO",
        "Act No",
        "Name of Unit",
        "Constitution",
        "Activity Status",
        "Total Outstanding",
        "Security Held",
        "Provision",
        "Migration Date",
        "NPA Date",
        "IRAC",
        "RA",
        "Status of (i) Suit filed (ii) RRC Filing (iii) Examination of wilful defaulter. (iv) Sarfesi Action (v) NCLT (vi) Staff Accountabiltiy",
        "Controller observation/remarks and branch response",
        "Strategy / Action Plan"
      ],
      ...npaRows.map(r => {
        const ed = npaEdits[r.actNo] || {};
        return [
          r.srNo,
          r.actNo,
          r.nameOfUnit,
          ed.constitution ?? r.constitution,
          ed.activityStatus ?? r.activityStatus,
          r.totalOutstanding,
          ed.securityHeld !== undefined ? Number(ed.securityHeld) : r.securityHeld,
          r.provision,
          ed.migrationDate ?? r.migrationDate,
          r.npaDate,
          r.irac,
          r.ra,
          ed.suitStatus ?? r.suitStatus,
          ed.observation ?? r.observation,
          ed.strategy ?? r.strategyPlan,
        ];
      }),
      ["", "", "", "", "", npaTotals.outstanding, npaTotals.securityHeld || "", npaTotals.provision, "", "", "", "", "", "", ""],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(npaData), "NPA Accounts");
    // AUCA sheet
    const aucaData = [
      [
        "SR NO",
        "Act No",
        "Name of Unit",
        "Constitution",
        "Activity",
        "Total Outstanding",
        "Security Held",
        "NPA Date",
        "Date of RA",
        "Date of Write-off",
        "Status of (i) Suit filed (ii) RRC Filing (iii) Examination of wilful defaulter. (iv) Sarfesi Action (v) NCLT (vi) Staff Accountabiltiy",
        "Observation",
        "Strategy / Action Plan"
      ],
      ...aucaRows.map(r => {
        const ed = aucaEdits[r.actNo] || {};
        return [
          r.srNo,
          r.actNo,
          r.nameOfUnit,
          (ed.constitution as string) ?? r.constitution,
          (ed.activityStatus as string) ?? r.activityStatus,
          r.totalOutstanding,
          (ed.securityHeld as number) ?? r.securityHeld,
          r.npaDate,
          r.raDate,
          (ed.migrationDate as string) ?? r.migrationDate,
          (ed.suitStatus as string) ?? r.suitStatus,
          (ed.observation as string) ?? r.observation,
          (ed.strategy as string) ?? (ed.strategyPlan as string) ?? r.strategyPlan,
        ];
      }),
      ["", "", "", "", "", aucaTotals.outstanding, "", "", "", "", "", "", ""],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aucaData), "AUCA Accounts");
    const period = `${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, "0")}`;
    XLSX.writeFile(wb, `SMA_NPA_AUCA_${branchCode}_${period}.xlsx`);
  }
  // ── Data Loading ────────────────────────────────────────────────────────────
  async function loadReportData() {
    setLoading(true);
    try {
      const [loans, ccod, npaData] = await Promise.all([
        getAllRecords(STORES.LOAN_DATA),
        getAllRecords(STORES.CCOD_DATA),
        getAllRecords(STORES.NPA_DATA),
      ]);
      const lfnAccounts: any[] = (await loadData("lfn-accounts")) || [];
      const lfnExclusions: any[] = (await loadData("lfn-exclusions")) || [];

      const allLoans = [...loans, ...ccod];
      setHasData(allLoans.length > 0);

      // Helper to compute outstanding amount. CC/OD uses CurrentBalance (ACCTBAL), only negative balances are outstanding.
      const getOutstanding = (r: any): number => {
        if (!r) return 0;
        if (r.Exposure_Type === "CC/OD") {
          const bal = Number(r.CurrentBalance || 0);
          return bal < 0 ? Math.abs(bal) : 0;
        }
        const out = Number(r.OUTSTAND || r.OUTSTANDING || 0);
        return Math.abs(out);
      };

      // Helper to derive sanction date. CC/OD uses SANC_RENDT.
      const getSanctionDate = (r: any): string => {
        if (!r) return "";
        if (r.Exposure_Type === "CC/OD") {
          return fmtDate(r.SANC_RENDT);
        }
        return fmtDate(r.SANCTDT);
      };

      // ── SMA Report ──────────────────────────────────────────────────────────
      // Include: New IRAC up to 3 (SMA-0 / SMA-1 / SMA-2 / SMA-3 / Standard) or IRAC < 4 with irregular amount > 0
      const smaAccounts = allLoans.filter(r => {
        const irac = (r.NEWIRAC || "").trim().replace(/^0+/, ""); // strip leading zeros
        const iracNum = parseInt(irac, 10);
        const hasIrac = !isNaN(iracNum);
        const actualIrac = hasIrac ? iracNum : 0;
        const irregAmt = Number(r.IRREGAMT || 0);
        return (actualIrac >= 1 && actualIrac <= 3) || (actualIrac < 4 && irregAmt > 0);
      });
      // Sort by irregular amount descending
      smaAccounts.sort((a, b) => Number(b.IRREGAMT || 0) - Number(a.IRREGAMT || 0));
      const smaBuilt: SMARow[] = smaAccounts.map((r, i) => ({
        srNo: i + 1,
        accountNo: r.LoanKey || r.ACCOUNT_NO || "",
        customerName: r.CUSTNAME || r.CUSTOMER_NAME || "",
        acctDesc: r.ACCTDESC || "",
        securityDesc: "",
        sanctionDate: getSanctionDate(r),
        sanctionLimit: Number(r.LIMIT || 0),
        outstanding: getOutstanding(r),
        irregularAmt: Number(r.IRREGAMT || 0),
        irregularDate: fmtDate(r.IRRGDT),
        remarks: "", // blank by default; user-entered remarks loaded from smaRemarks
      }));
      setSmaRows(smaBuilt);

      // ── NPA Report ──────────────────────────────────────────────────────────
      // Include: accounts with IRAC 4-7 as well as WRITE_OFF_FLAG as 'N' (or empty)
      const loanMap = new Map(allLoans.map(r => [r.LoanKey || r.ACCOUNT_NO, r]));
      const npaFiltered = allLoans.filter((r: any) => {
        const iracNum = parseInt((r.NEWIRAC || "").trim().replace(/^0+/, ""), 10);
        const writeOffFlag = (r.WRITE_OFF_FLAG || "").trim().toUpperCase();
        return iracNum >= 4 && iracNum <= 7 && (writeOffFlag === "N" || writeOffFlag === "");
      });
      const npaBuilt: NPARow[] = npaFiltered.map((r: any, i: number) => {
        const iracNum = parseInt((r.NEWIRAC || "").trim().replace(/^0+/, ""), 10);
        const outstanding = getOutstanding(r);
        return {
          srNo: i + 1,
          actNo: r.LoanKey || r.ACCOUNT_NO || "",
          nameOfUnit: r.CUSTNAME || r.CUSTOMER_NAME || "",
          constitution: guessConstitution(r.CUSTNAME || r.CUSTOMER_NAME || ""),
          totalOutstanding: outstanding,
          securityHeld: 0,
          provision: computeProvision(outstanding, iracNum),
          migrationDate: "Not applicable",
          npaDate: fmtDate(r.IRRGDT),
          irac: String(iracNum || ""),
          ra: r.RA || "",
          activityStatus: "UNDER PROCESS",
          suitStatus: r.SUIT_NO ? `Suit No: ${r.SUIT_NO}` : (r.RRC_NO ? `RRC No: ${r.RRC_NO}` : "NIL"),
          observation: DEFAULT_OBSERVATION,
          strategyPlan: DEFAULT_STRATEGY,
        };
      });
      npaBuilt.sort((a, b) => b.totalOutstanding - a.totalOutstanding);
      npaBuilt.forEach((r, i) => { r.srNo = i + 1; });
      setNpaRows(npaBuilt);

      // ── AUCA Report ──────────────────────────────────────────────────────────
      // Include: any account with IRAC 8 or WRITE_OFF_FLAG as "F"
      const aucaAccountNos = new Set<string>();
      allLoans.forEach(r => {
        const iracNum = parseInt((r.NEWIRAC || "").trim().replace(/^0+/, ""), 10);
        const wof  = (r.WRITE_OFF_FLAG || "").trim().toUpperCase();
        if (iracNum === 8 || wof === "F") {
          aucaAccountNos.add(r.LoanKey || r.ACCOUNT_NO || "");
        }
      });

      const aucaBuilt: AUCARow[] = [];
      let aucaSr = 1;
      for (const acctNo of Array.from(aucaAccountNos)) {
        const loan = loanMap.get(acctNo) || {};
        const excl = lfnExclusions.find((e: any) => e.accountNo === acctNo) || {};
        const lfnRec = lfnAccounts.find((a: any) => a.accountNo === acctNo) || {};
        const outstanding = getOutstanding(loan);
        const writeOffAmt = Number(loan.WRITE_OFF_AMOUNT || 0);
        const accruedInt = Number(loan.ACCRINT || loan.UNREALINT || 0);
        aucaBuilt.push({
          srNo: aucaSr++,
          actNo: acctNo,
          nameOfUnit: loan.CUSTNAME || excl.customerName || "",
          constitution: guessConstitution(loan.CUSTNAME || excl.customerName || ""),
          totalOutstanding: outstanding,
          securityHeld: 0,
          migrationDate: fmtDate(loan.WRITE_OFF_DATE),
          npaDate: fmtDate(loan.IRRGDT),
          raDate: fmtDate(loan.RA_DATE),
          activityStatus: "RRC LODGED",
          suitStatus: excl.suitDetails || loan.SUIT_NO ? `Suit No: ${loan.SUIT_NO || excl.suitDetails}` : (loan.RRC_NO ? `RRC No: ${loan.RRC_NO}` : "RRC LODGED"),
          observation: AUCA_OBSERVATION,
          strategyPlan: AUCA_STRATEGY,
          // Single-page review fields
          natureOfActivity: excl.category ? categoryLabel(excl.category) : (loan.ACCTDESC || ""),
          promoters: "NA",
          sanctionLimit: loan.LIMIT ? String(loan.LIMIT) : (lfnRec.limit || ""),
          sanctionDate: getSanctionDate(loan) || fmtDate(lfnRec.sanctionDate),
          dateTransferRA: fmtDate(loan.RA_DATE || excl.excludedOn),
          amountTransferredAUCA: writeOffAmt || outstanding,
          recoveryAfterAUCA: "NIL",
          presentOutstanding: outstanding,
          accruedInterest: accruedInt,
          totalInvolvedLoss: outstanding + accruedInt,
          suitDetails: "NA",
          rrcDetails: "NA",
          drtDetails: "NA",
          securityParticulars: "NIL",
          prospectOfRecovery: "NIL",
          remark: "Borrower not traceable. All recovery efforts exhausted.",
          recommendation: "We recommend for removal of AUCA Account.",
        });
      }
      aucaBuilt.sort((a, b) => b.totalOutstanding - a.totalOutstanding);
      aucaBuilt.forEach((r, i) => { r.srNo = i + 1; });
      setAucaRows(aucaBuilt);
    } catch (err) {
      toast.error("Failed to load report data");
    } finally {
      setLoading(false);
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function buildSMARemarks(r: any): string {
    const desc = (r.ACCTDESC || "").toUpperCase();
    if (desc.includes("OD") || desc.includes("CC")) {
      return "Irregularity due to interest / charges applied in OD Account, contacted borrower to clear irregularity. Account will be regular soon.";
    }
    if (desc.includes("STAFF")) {
      return "Irregularity due to interest / charges applied in Staff Account, contacted borrower to clear irregularity. Account will be regular soon.";
    }
    return "Irregularity due to EMI not paid in time. Contacted borrower to clear irregularity soon. Account will be regular soon.";
  }

  function guessConstitution(name: string): string {
    const n = name.toUpperCase();
    if (n.startsWith("M/S") || n.includes("ENTERPRISES") || n.includes("AGENCY") || n.includes("TRADERS") || n.includes("SHOP")) return "Prop/Part";
    return "Individual";
  }

  function computeProvision(outstanding: number, irac: number): number {
    if (irac === 3 || irac === 4) return Math.round(outstanding * 0.15);
    if (irac === 5) return Math.round(outstanding * 0.25);
    if (irac === 6) return Math.round(outstanding * 0.40);
    if (irac === 7 || irac === 8) return Math.round(outstanding * 1.00);
    return Math.round(outstanding * 0.15);
  }

  function categoryLabel(cat: string): string {
    const map: Record<string, string> = {
      PERLOAN: "PERSONAL LOAN",
      PENLOAN: "PENSION LOAN",
      GOLDLON: "GOLD LOAN",
      PMSURYA: "SBI SURYA GHAR LOAN",
    };
    return map[cat] || cat;
  }

  // ── Print ────────────────────────────────────────────────────────────────────
  function handlePrint() {
    const isPortrait = activeTab === 'auca' && !!selectedAUCA;
    const orientStyle = isPortrait ? PRINT_STYLE_PORTRAIT : PRINT_STYLE_LANDSCAPE;
    const pageSize    = isPortrait ? 'A4 portrait' : 'A4 landscape';

    // Grab the report content
    const printArea = document.getElementById('sma-npa-print-area');
    if (!printArea) return;

    // Clone so we can strip no-print elements
    const clone = printArea.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.no-print').forEach(el => el.remove());
    // Make all hidden print-only spans visible in the clone
    clone.querySelectorAll('.hidden').forEach(el => {
      (el as HTMLElement).style.display = 'inline';
    });

    // Collect all stylesheets from the current document
    const styleLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .map(l => l.outerHTML).join('\n');
    const inlineStyles = Array.from(document.querySelectorAll('style'))
      .map(s => `<style>${s.textContent}</style>`).join('\n');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Report</title>
  ${styleLinks}
  ${inlineStyles}
  <style>
    @page { size: ${pageSize}; margin: ${isPortrait ? '8mm' : '10mm'}; }
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
    .no-print { display: none !important; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    tbody tr { break-inside: avoid; page-break-inside: avoid; }
  </style>
</head>
<body>${clone.outerHTML}</body>
</html>`;

    const win = window.open('', '_blank', `width=900,height=700,scrollbars=yes,resizable=yes`);
    if (!win) {
      // Fallback: direct print if popup blocked
      const el = document.getElementById('__print-orient-style');
      if (el) el.textContent = orientStyle;
      window.print();
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    // Wait for resources to load then open print dialog
    win.addEventListener('load', () => {
      win.focus();
      win.print();
    });
    // Fallback timeout in case load event doesn't fire
    setTimeout(() => {
      try { win.focus(); win.print(); } catch (_) {}
    }, 800);
  }

  // ── Font size for print mode ─────────────────────────────────────────────────
  const printFontClass = printMode === "compact" ? "text-[7px]" : printMode === "large" ? "text-[10px]" : "text-[8.5px]";

  // ── Totals ───────────────────────────────────────────────────────────────────
  const smaTotals = useMemo(() => ({
    outstanding: smaRows.reduce((s, r) => s + r.outstanding, 0),
    irregular: smaRows.reduce((s, r) => s + r.irregularAmt, 0),
  }), [smaRows]);

  const npaTotals = useMemo(() => ({
    outstanding: npaRows.reduce((s, r) => s + r.totalOutstanding, 0),
    provision: npaRows.reduce((s, r) => s + r.provision, 0),
    securityHeld: npaRows.reduce((s, r) => s + (Number(npaEdits[r.actNo]?.securityHeld ?? r.securityHeld) || 0), 0),
  }), [npaRows, npaEdits]);

  const aucaTotals = useMemo(() => ({
    outstanding: aucaRows.reduce((s, r) => s + r.totalOutstanding, 0),
  }), [aucaRows]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  const quarterLabel = getQuarterLabel(reportDate);
  const monthLabel = getMonthLabel(reportDate);
  const branchDisplay = `${branchName.toUpperCase()} (${branchCode})`;

  // Clean up branchName to get the city (take first word, capitalize it)
  const city = useMemo(() => {
    if (!branchName || branchName.toLowerCase().includes("enter branch")) {
      return "Bhopal";
    }
    const firstWord = branchName.trim().split(/[\s,]+/)[0];
    return firstWord ? firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase() : "Bhopal";
  }, [branchName]);

  const displayRboName = rboName || `RBO ${city} 1`;
  const displayRboAddress = rboAddress || `R-1, ${city}`;

  const SortHeader = ({ label, sortKey, className = "" }: { label: string, sortKey: string, className?: string }) => {
    const isLeft = className.includes("text-left");
    const isRight = className.includes("text-right");
    const justifyClass = isLeft ? "justify-start" : isRight ? "justify-end" : "justify-center";
    return (
      <th className={`border border-gray-300 px-1 py-1 cursor-pointer hover:bg-[#002244] transition-colors ${className}`} onClick={() => handleSort(sortKey)}>
        <div className={`flex items-center gap-1 ${justifyClass}`}>
          <span>{label}</span>
          {sortConfig?.key === sortKey ? (
            sortConfig.direction === "asc" ? <ArrowUp className="w-3 h-3 no-print flex-shrink-0" /> : <ArrowDown className="w-3 h-3 no-print flex-shrink-0" />
          ) : (
            <ArrowUpDown className="w-3 h-3 opacity-30 no-print flex-shrink-0" />
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <style>{PRINT_STYLE_BASE}</style>
      <style id="__print-orient-style">{PRINT_STYLE_LANDSCAPE}</style>

      {/* ── Header ── */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between flex-shrink-0 no-print">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 text-base">SMA / NPA / AUCA Reporting</h2>
            <p className="text-xs text-gray-500">
              SMA: Monthly &nbsp;|&nbsp; NPA & AUCA: Quarterly
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Report period date picker */}
          <div className="flex items-center gap-1 text-xs">
            <label className="text-gray-500 whitespace-nowrap">Report as on:</label>
            <input
              type="month"
              className="text-xs border rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
              value={`${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, "0")}`}
              onChange={e => {
                if (!e.target.value) return;
                const [y, m] = e.target.value.split("-").map(Number);
                // Set to last day of selected month
                const lastDay = new Date(y, m, 0);
                setReportDate(lastDay);
              }}
            />
          </div>
          <select
            value={printMode}
            onChange={e => setPrintMode(e.target.value as any)}
            className="text-xs border rounded px-2 py-1 bg-white"
          >
            <option value="compact">Compact Print</option>
            <option value="standard">Standard Print</option>
            <option value="large">Large Print</option>
          </select>
          <Button size="sm" variant="outline" onClick={loadReportData} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {/* Save Snapshot */}
          <Button size="sm" variant="outline" onClick={saveSnapshot} title="Save current report as a snapshot for this period">
            <Save className="w-3.5 h-3.5 mr-1" />
            Save Snapshot
          </Button>
          {/* Load Snapshot dropdown */}
          <div className="relative">
            <Button
              size="sm" variant="outline"
              onClick={() => setShowSnapshotMenu(v => !v)}
              disabled={snapshots.length === 0}
              title={snapshots.length === 0 ? "No snapshots saved yet" : "Load a saved snapshot"}
            >
              <FolderOpen className="w-3.5 h-3.5 mr-1" />
              Load Snapshot
            </Button>
            {showSnapshotMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border rounded shadow-lg z-50 min-w-[180px]">
                {snapshots.map(key => {
                  const [,, y, m] = key.split("-");
                  const label = new Date(Number(y), Number(m) - 1, 1).toLocaleString("en-IN", { month: "short", year: "numeric" }).toUpperCase();
                  return (
                    <button
                      key={key}
                      className="block w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 hover:text-indigo-700"
                      onClick={() => loadSnapshot(key)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {/* Export to Excel */}
          <Button size="sm" variant="outline" onClick={exportToExcel} title="Export all three reports to Excel (.xlsx)">
            <Download className="w-3.5 h-3.5 mr-1" />
            Export Excel
          </Button>
          <Button size="sm" onClick={handlePrint} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Printer className="w-3.5 h-3.5 mr-1" />
            Print Report
          </Button>
        </div>
      </div>

      {/* ── Sub-tabs ── */}
      <div className="bg-white border-b px-6 flex gap-1 no-print">
        {([
          { id: "sma", label: "SMA Accounts", icon: TrendingDown, count: smaRows.length, color: "amber" },
          { id: "npa", label: "NPA Accounts", icon: AlertTriangle, count: npaRows.length, color: "red" },
          { id: "auca", label: "AUCA Accounts", icon: Archive, count: aucaRows.length, color: "purple" },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSelectedAUCA(null); setSortConfig(null); }}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? `border-indigo-600 text-indigo-700`
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
              tab.id === "sma" ? "bg-amber-100 text-amber-700" :
              tab.id === "npa" ? "bg-red-100 text-red-700" :
              "bg-purple-100 text-purple-700"
            }`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* ── No Data Banner ── */}
      {!hasData && !loading && (
        <div className="flex-1 flex items-center justify-center no-print">
          <div className="text-center text-gray-400">
            <AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No loan data loaded. Please upload CBS Loan Balance data first.</p>
          </div>
        </div>
      )}

      {/* ── Print Area ── */}
      <div id="sma-npa-print-area" ref={printRef} className={`flex-1 overflow-auto ${printFontClass}`}>

        {/* ════════════════════════════════════════════════════════════════════
            SMA REPORT
            ════════════════════════════════════════════════════════════════════ */}
        {activeTab === "sma" && (
          <div className="p-4">
            {/* Report Header */}
            <div className="bg-white border rounded-lg overflow-hidden mb-2">
              <div className="print-report-header bg-[#003366] text-white text-center py-2 px-4">
                <div className="font-bold text-sm">STATE BANK OF INDIA, {branchDisplay}</div>
                <div className="text-xs mt-0.5">Monthly Return of Irregular and SMA Advances Accounts</div>
                <div className="text-xs mt-0.5 font-semibold">REPORT FOR THE MONTH OF {monthLabel}</div>
              </div>



              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[8.5px]" style={{ fontSize: printMode === "compact" ? "7px" : printMode === "large" ? "10px" : "8.5px" }}>
                  <thead>
                    <tr className="bg-[#003366] text-white">
                      <SortHeader className="w-6 text-center" sortKey="srNo" label="SR NO" />
                      <SortHeader className="w-24 text-left" sortKey="accountNo" label="ACCOUNT NUMBER" />
                      <SortHeader className="w-32 text-left" sortKey="customerName" label="NAME OF BORROWER" />
                      <SortHeader className="w-28 text-left" sortKey="acctDesc" label="ACCOUNT DESCRIPTION" />
                      <SortHeader className="w-24 text-left" sortKey="securityDesc" label="DESCRIPTION OF SECURITY" />
                      <SortHeader className="w-16 text-center" sortKey="sanctionDate" label="SANCTION DATE" />
                      <SortHeader className="w-16 text-right" sortKey="sanctionLimit" label="SANCTION LIMIT" />
                      <SortHeader className="w-16 text-right" sortKey="outstanding" label="OUTSTANDING" />
                      <SortHeader className="w-16 text-right" sortKey="irregularAmt" label="IRREGULAR AMOUNT" />
                      <SortHeader className="w-16 text-center" sortKey="irregularDate" label="DATE OF IRREGULAR" />
                      <th className="border border-gray-300 px-1 py-1 text-left">REMARKS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedData(smaRows).map((row, idx) => (
                      <tr key={row.accountNo} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="border border-gray-200 px-1 py-0.5 text-center">{idx + 1}</td>
                        <td className="border border-gray-200 px-1 py-0.5 font-mono">{row.accountNo}</td>
                        <td className="border border-gray-200 px-1 py-0.5">{row.customerName}</td>
                        <td className="border border-gray-200 px-1 py-0.5">{row.acctDesc}</td>
                        <td className="border border-gray-200 px-1 py-0.5">
                          <textarea
                            className="w-full text-[inherit] bg-transparent resize-none border-0 p-0 focus:outline-none no-print min-w-[120px]"
                            rows={2}
                            placeholder="Enter security description..."
                            value={smaSecurities[row.accountNo] ?? ""}
                            onChange={e => updateSmaSecurity(row.accountNo, e.target.value)}
                          />
                          <span className="hidden print:inline">{smaSecurities[row.accountNo] ?? ""}</span>
                        </td>
                        <td className="border border-gray-200 px-1 py-0.5 text-center">{row.sanctionDate}</td>
                        <td className="border border-gray-200 px-1 py-0.5 text-right">{fmtAmt(row.sanctionLimit)}</td>
                        <td className="border border-gray-200 px-1 py-0.5 text-right">{fmtAmt(row.outstanding)}</td>
                        <td className="border border-gray-200 px-1 py-0.5 text-right font-semibold text-red-700">{fmtAmt(row.irregularAmt)}</td>
                        <td className="border border-gray-200 px-1 py-0.5 text-center">{row.irregularDate}</td>
                        <td className="border border-gray-200 px-1 py-0.5">
                            <textarea
                              className="w-full text-[inherit] bg-transparent resize-none border-0 p-0 focus:outline-none no-print min-w-[120px]"
                              rows={2}
                              placeholder="Enter remarks..."
                              value={smaRemarks[row.accountNo] ?? ""}
                              onChange={e => updateSmaRemark(row.accountNo, e.target.value)}
                            />
                            <span className="hidden print:inline">{smaRemarks[row.accountNo] ?? ""}</span>
                          </td>
                      </tr>
                    ))}
                    {smaRows.length === 0 && (
                      <tr><td colSpan={11} className="text-center py-4 text-gray-400">No SMA / Irregular accounts found</td></tr>
                    )}
                    {/* Totals row */}
                    {smaRows.length > 0 && (
                      <tr className="bg-[#003366] text-white font-bold">
                        <td colSpan={6} className="border border-gray-300 px-1 py-1 text-right">TOTAL</td>
                        <td className="border border-gray-300 px-1 py-1 text-right">{fmtAmt(smaRows.reduce((s, r) => s + r.sanctionLimit, 0))}</td>
                        <td className="border border-gray-300 px-1 py-1 text-right">{fmtAmt(smaTotals.outstanding)}</td>
                        <td className="border border-gray-300 px-1 py-1 text-right">{fmtAmt(smaTotals.irregular)}</td>
                        <td colSpan={2} className="border border-gray-300 px-1 py-1"></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Signature block */}
              <div className="flex justify-between items-end px-6 py-4 mt-2 border-t">
                <div className="text-xs text-gray-600">
                  <div className="font-semibold">Submitted by:</div>
                  <div className="mt-24 border-t border-gray-400 pt-1 w-40">Chief / Branch Manager</div>
                  <div className="text-gray-500">{branchDisplay}</div>
                </div>
                <div className="text-xs text-gray-500 text-right">
                  <div>Total Accounts: <span className="font-bold text-gray-800">{smaRows.length}</span></div>
                  <div>Report Date: <span className="font-bold">{fmtDate(reportDate.toISOString())}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            NPA REPORT — Annexure C
            ════════════════════════════════════════════════════════════════════ */}
        {activeTab === "npa" && (
          <div className="p-4">
            <div className="bg-white border rounded-lg overflow-hidden mb-2">
              {/* Header */}
              <div className="print-report-header bg-[#003366] text-white text-center py-2 px-4">
                <div className="font-bold text-sm">Annexure - C</div>
                <div className="text-xs mt-0.5">Name of Branch: {branchDisplay} &nbsp;|&nbsp; Review for the Quarter Ended {quarterLabel}</div>
                <div className="text-xs mt-0.5 font-semibold">Review of NPAs of Outstanding up to INR 5 Crores</div>
              </div>



              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse" style={{ fontSize: printMode === "compact" ? "7px" : printMode === "large" ? "10px" : "8.5px" }}>
                  <thead>
                    <tr className="bg-[#003366] text-white">
                      {[
                        { label: "SR. NO.", key: "srNo", width: "w-[3%]" },
                        { label: "ACT NO", key: "actNo", width: "w-[7%]" },
                        { label: "Name of the Unit", key: "nameOfUnit", width: "w-[8%]" },
                        { label: "Constitution", key: "constitution", width: "w-[4%]" },
                        { label: "Activity Status", key: "activityStatus", width: "w-[5%]" },
                        { label: "Total Outstanding", key: "totalOutstanding", width: "w-[5%]" },
                        { label: "Security Held", key: "securityHeld", width: "w-[6%]" },
                        { label: "Provision", key: "provision", width: "w-[5%]" },
                        { label: "Date of Migration", key: "migrationDate", width: "w-[5%]" },
                        { label: "NPA Date", key: "npaDate", width: "w-[5%]" },
                        { label: "IRAC", key: "irac", width: "w-[4%]" },
                        { label: "RA", key: "ra", width: "w-[4%]" },
                        { label: "Status of (i) Suit filed (ii) RRC Filing (iii) Examination of wilful defaulter. (iv) Sarfesi Action (v) NCLT (vi) Staff Accountabiltiy", key: "suitStatus", width: "w-[6%]" },
                        { label: "Controller observation/remarks and branch response", key: "observation", width: "w-[17%]" },
                        { label: "New Strategy / Action Plan", key: "strategyPlan", width: "w-[16%]" }
                      ].map(h => (
                        <SortHeader key={h.key} className={`text-center ${h.width}`} sortKey={h.key} label={h.label} />
                      ))}
                    </tr>
                    <tr className="bg-[#003366] text-white text-center">
                      {["1","2","3","4","5","6","7","8","9","10","11","12","13","14","15"].map(n => (
                        <th key={n} className="border border-gray-300 px-1 py-0.5">{n}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedData(npaRows).map((row, idx) => {
                      const edits = npaEdits[row.actNo] || {};
                      return (
                        <tr key={row.actNo} className={idx % 2 === 0 ? "bg-white" : "bg-red-50/30"}>
                          <td className="border border-gray-200 px-1 py-0.5 text-center">{idx + 1}</td>
                          <td className="border border-gray-200 px-1 py-0.5 font-mono">{row.actNo}</td>
                          <td className="border border-gray-200 px-1 py-0.5">{row.nameOfUnit}</td>
                          
                          {/* Col 4: Constitution — editable */}
                          <td className="border border-gray-200 px-1 py-0.5 text-center">
                            <textarea
                              className="w-full text-[inherit] bg-transparent resize-none border-0 p-0 focus:outline-none no-print text-center min-w-[70px]"
                              rows={1}
                              value={edits.constitution ?? row.constitution}
                              onChange={e => updateNpaEdit(row.actNo, "constitution", e.target.value)}
                            />
                            <span className="hidden print:inline">{edits.constitution ?? row.constitution}</span>
                          </td>

                          {/* Col 5: Activity Status — editable (moved here) */}
                          <td className="border border-gray-200 px-1 py-0.5 text-center">
                            <textarea
                              className="w-full text-[inherit] bg-transparent resize-none border-0 p-0 focus:outline-none no-print text-center min-w-[85px]"
                              rows={1}
                              value={edits.activityStatus ?? row.activityStatus}
                              onChange={e => updateNpaEdit(row.actNo, "activityStatus", e.target.value)}
                            />
                            <span className="hidden print:inline">{edits.activityStatus ?? row.activityStatus}</span>
                          </td>

                          {/* Col 6: Total Outstanding */}
                          <td className="border border-gray-200 px-1 py-0.5 text-right">{fmtAmt(row.totalOutstanding)}</td>
                          
                          {/* Col 7: Security Held — editable */}
                          <td className="border border-gray-200 px-1 py-0.5 text-right">
                            <textarea
                              className="w-full text-[inherit] bg-transparent resize-none border-0 p-0 focus:outline-none no-print text-right min-w-[70px]"
                              rows={1}
                              value={edits.securityHeld ?? (row.securityHeld > 0 ? String(row.securityHeld) : "")}
                              onChange={e => updateNpaEdit(row.actNo, "securityHeld", e.target.value)}
                            />
                            <span className="hidden print:inline">
                              {edits.securityHeld ? fmtAmt(Number(edits.securityHeld)) : (row.securityHeld > 0 ? fmtAmt(row.securityHeld) : "—")}
                            </span>
                          </td>

                          {/* Col 8: Provision */}
                          <td className="border border-gray-200 px-1 py-0.5 text-right">{fmtAmt(row.provision)}</td>
                          
                          {/* Col 9: Date of Migration — editable */}
                          <td className="border border-gray-200 px-1 py-0.5 text-center">
                            <textarea
                              className="w-full text-[inherit] bg-transparent resize-none border-0 p-0 focus:outline-none no-print text-center min-w-[70px]"
                              rows={1}
                              value={edits.migrationDate ?? row.migrationDate}
                              onChange={e => updateNpaEdit(row.actNo, "migrationDate", e.target.value)}
                            />
                            <span className="hidden print:inline">{edits.migrationDate ?? row.migrationDate}</span>
                          </td>

                          <td className="border border-gray-200 px-1 py-0.5 text-center">{row.npaDate}</td>
                          <td className="border border-gray-200 px-1 py-0.5 text-center">{row.irac}</td>
                          <td className="border border-gray-200 px-1 py-0.5 text-center">{row.ra || "—"}</td>
                          
                          {/* Col 13: Status of Suit... */}
                          <td className="border border-gray-200 px-1 py-0.5">
                            <textarea
                              className="w-full text-[inherit] bg-transparent resize-none border-0 p-0 focus:outline-none no-print min-w-[100px]"
                              rows={2}
                              value={edits.suitStatus ?? row.suitStatus}
                              onChange={e => updateNpaEdit(row.actNo, "suitStatus", e.target.value)}
                            />
                            <span className="hidden print:inline">{edits.suitStatus ?? row.suitStatus}</span>
                          </td>

                          {/* Col 14: Observation (Controller remarks) */}
                          <td className="border border-gray-200 px-1 py-0.5">
                            <textarea
                              className="w-full text-[inherit] bg-transparent resize-none border-0 p-0 focus:outline-none no-print"
                              rows={2}
                              value={edits.observation ?? row.observation}
                              onChange={e => updateNpaEdit(row.actNo, "observation", e.target.value)}
                            />
                            <span className="hidden print:inline">{edits.observation ?? row.observation}</span>
                          </td>

                          {/* Col 15: Strategy Plan */}
                          <td className="border border-gray-200 px-1 py-0.5">
                            <textarea
                              className="w-full text-[inherit] bg-transparent resize-none border-0 p-0 focus:outline-none no-print"
                              rows={2}
                              value={edits.strategy ?? row.strategyPlan}
                              onChange={e => updateNpaEdit(row.actNo, "strategy", e.target.value)}
                            />
                            <span className="hidden print:inline">{edits.strategy ?? row.strategyPlan}</span>
                          </td>
                        </tr>
                      );
                    })}
                    {npaRows.length === 0 && (
                      <tr><td colSpan={15} className="text-center py-4 text-gray-400">No NPA accounts found</td></tr>
                    )}
                    {npaRows.length > 0 && (
                      <tr className="bg-[#003366] text-white font-bold">
                        <td colSpan={5} className="border border-gray-300 px-1 py-1 text-right">TOTAL</td>
                        <td className="border border-gray-300 px-1 py-1 text-right">{fmtAmt(npaTotals.outstanding)}</td>
                        <td className="border border-gray-300 px-1 py-1 text-right">{fmtAmt(npaTotals.securityHeld)}</td>
                        <td className="border border-gray-300 px-1 py-1 text-right">{fmtAmt(npaTotals.provision)}</td>
                        <td colSpan={7} className="border border-gray-300 px-1 py-1"></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Signature */}
              <div className="flex justify-between items-end px-6 py-4 mt-2 border-t">
                <div className="text-xs text-gray-600">
                  <div className="font-semibold">Submitted by:</div>
                  <div className="mt-24 border-t border-gray-400 pt-1 w-40">Chief / Branch Manager</div>
                  <div className="text-gray-500">{branchDisplay}</div>
                </div>
                <div className="text-xs text-gray-500 text-right">
                  <div>Quarter Ended: <span className="font-bold text-gray-800">{quarterLabel}</span></div>
                  <div>Total NPA Accounts: <span className="font-bold">{npaRows.length}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            AUCA REPORT — Annexure D
            ════════════════════════════════════════════════════════════════════ */}
        {activeTab === "auca" && !selectedAUCA && (
          <div className="p-4">
            <div className="bg-white border rounded-lg overflow-hidden mb-2">
              {/* Header */}
              <div className="print-report-header bg-[#003366] text-white text-center py-2 px-4">
                <div className="font-bold text-sm">Annexure - D</div>
                <div className="text-xs mt-0.5">Name of Branch: {branchDisplay} &nbsp;|&nbsp; Review for the Quarter Ended {quarterLabel}</div>
                <div className="text-xs mt-0.5 font-semibold">Review of AUCAs of Outstanding up to INR 5 Crores</div>
              </div>



              {/* Hint */}
              <div className="px-4 py-1.5 bg-purple-50 border-b text-xs text-purple-700 no-print">
                Click any row to open the single-page AUCA review for that account.
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse" style={{ fontSize: printMode === "compact" ? "7px" : printMode === "large" ? "10px" : "8.5px" }}>
                  <thead>
                    <tr className="bg-[#003366] text-white">
                      {[
                        { label: "SR. NO.", key: "srNo", width: "w-[3%]" },
                        { label: "ACT NO", key: "actNo", width: "w-[7%]" },
                        { label: "Name of the Unit", key: "nameOfUnit", width: "w-[10%]" },
                        { label: "Constitution", key: "constitution", width: "w-[5%]" },
                        { label: "Activity", key: "activityStatus", width: "w-[6%]" },
                        { label: "Total Outstanding", key: "totalOutstanding", width: "w-[7%]" },
                        { label: "Security", key: "securityHeld", width: "w-[5%]" },
                        { label: "NPA Date", key: "npaDate", width: "w-[6%]" },
                        { label: "Date of RA", key: "raDate", width: "w-[6%]" },
                        { label: "Date of Write-off", key: "migrationDate", width: "w-[7%]" },
                        { label: "Status of (i) Suit filed (ii) RRC Filing (iii) Examination of wilful defaulter. (iv) Sarfesi Action (v) NCLT (vi) Staff Accountabiltiy", key: "suitStatus", width: "w-[10%]" },
                        { label: "Observation", key: "observation", width: "w-[14%]" },
                        { label: "New Strategy / Action Plan", key: "strategyPlan", width: "w-[14%]" }
                      ].map(h => (
                        <SortHeader key={h.key} className={`text-center ${h.width}`} sortKey={h.key} label={h.label} />
                      ))}
                    </tr>
                    <tr className="bg-[#003366] text-white text-center">
                      {["1","2","3","4","5","6","7","8","9","10","11","12","13"].map(n => (
                        <th key={n} className="border border-gray-300 px-1 py-0.5">{n}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedData(aucaRows).map((row, idx) => {
                      const edits = aucaEdits[row.actNo] || {};
                      return (
                        <tr
                          key={row.actNo}
                          className={idx % 2 === 0 ? "bg-white" : "bg-purple-50/20"}
                        >
                          <td className="border border-gray-200 px-1 py-0.5 text-center">{idx + 1}</td>
                          
                          {/* Col 2: ACT NO — clickable to open individual AUCA review */}
                          <td
                            className="border border-gray-200 px-1 py-0.5 font-mono text-blue-700 underline cursor-pointer hover:text-blue-900"
                            onClick={() => setSelectedAUCA(row)}
                          >{row.actNo}</td>
                          
                          <td className="border border-gray-200 px-1 py-0.5">{row.nameOfUnit}</td>
                          
                          {/* Col 4: Constitution — editable */}
                          <td className="border border-gray-200 px-1 py-0.5">
                            <textarea className="w-full text-[inherit] bg-transparent resize-none border-0 p-0 focus:outline-none no-print min-w-[80px]" rows={1}
                              value={(edits as any).constitution ?? row.constitution}
                              onChange={e => updateAucaEdit(row.actNo, "constitution", e.target.value)}
                            />
                            <span className="hidden print:inline">{(edits as any).constitution ?? row.constitution}</span>
                          </td>
                          
                          {/* Col 5: Activity — editable */}
                          <td className="border border-gray-200 px-1 py-0.5">
                            <textarea className="w-full text-[inherit] bg-transparent resize-none border-0 p-0 focus:outline-none no-print min-w-[80px]" rows={1}
                              value={(edits as any).activityStatus ?? row.activityStatus}
                              onChange={e => updateAucaEdit(row.actNo, "activityStatus", e.target.value)}
                            />
                            <span className="hidden print:inline">{(edits as any).activityStatus ?? row.activityStatus}</span>
                          </td>
                          
                          {/* Col 6: Total Outstanding */}
                          <td className="border border-gray-200 px-1 py-0.5 text-right">{fmtAmt(row.totalOutstanding)}</td>
                          
                          {/* Col 7: Security — editable */}
                          <td className="border border-gray-200 px-1 py-0.5">
                            <textarea className="w-full text-[inherit] bg-transparent resize-none border-0 p-0 focus:outline-none no-print min-w-[80px]" rows={1}
                              value={(edits as any).securityHeld ?? (row.securityHeld > 0 ? String(row.securityHeld) : "")}
                              onChange={e => updateAucaEdit(row.actNo, "securityHeld", e.target.value)}
                            />
                            <span className="hidden print:inline">{(edits as any).securityHeld ?? (row.securityHeld > 0 ? fmtAmt(row.securityHeld) : "—")}</span>
                          </td>
                          
                          {/* Col 8: NPA Date */}
                          <td className="border border-gray-200 px-1 py-0.5 text-center">{row.npaDate || "—"}</td>
                          
                          {/* Col 9: Date of RA */}
                          <td className="border border-gray-200 px-1 py-0.5 text-center">{row.raDate || "—"}</td>
                          
                          {/* Col 10: Date of Write-off — editable */}
                          <td className="border border-gray-200 px-1 py-0.5">
                            <textarea className="w-full text-[inherit] bg-transparent resize-none border-0 p-0 focus:outline-none no-print min-w-[80px]" rows={1}
                              value={(edits as any).migrationDate ?? (row.migrationDate || "")}
                              onChange={e => updateAucaEdit(row.actNo, "migrationDate", e.target.value)}
                            />
                            <span className="hidden print:inline">{(edits as any).migrationDate ?? (row.migrationDate || "—")}</span>
                          </td>
                          
                          {/* Col 11: Status of Suit Filed... — already editable */}
                          <td className="border border-gray-200 px-1 py-0.5">
                            <textarea className="w-full text-[inherit] bg-transparent resize-none border-0 p-0 focus:outline-none no-print min-w-[100px]" rows={2}
                              value={(edits as any).suitStatus ?? row.suitStatus}
                              onChange={e => updateAucaEdit(row.actNo, "suitStatus", e.target.value)}
                            />
                            <span className="hidden print:inline">{(edits as any).suitStatus ?? row.suitStatus}</span>
                          </td>
                          
                          {/* Col 12: Observation — editable */}
                          <td className="border border-gray-200 px-1 py-0.5">
                            <textarea className="w-full text-[inherit] bg-transparent resize-none border-0 p-0 focus:outline-none no-print min-w-[100px]" rows={2}
                              value={(edits as any).observation ?? row.observation}
                              onChange={e => updateAucaEdit(row.actNo, "observation", e.target.value)}
                            />
                            <span className="hidden print:inline">{(edits as any).observation ?? row.observation}</span>
                          </td>
                          
                          {/* Col 13: Strategy — editable */}
                          <td className="border border-gray-200 px-1 py-0.5">
                            <textarea className="w-full text-[inherit] bg-transparent resize-none border-0 p-0 focus:outline-none no-print min-w-[100px]" rows={2}
                              value={(edits as any).strategy ?? row.strategyPlan}
                              onChange={e => updateAucaEdit(row.actNo, "strategy", e.target.value)}
                            />
                            <span className="hidden print:inline">{(edits as any).strategy ?? row.strategyPlan}</span>
                          </td>
                        </tr>
                      );
                    })}
                    {aucaRows.length === 0 && (
                      <tr><td colSpan={13} className="text-center py-4 text-gray-400">No AUCA accounts found. Written-off accounts from the Loan File Register will appear here.</td></tr>
                    )}
                    {aucaRows.length > 0 && (
                      <tr className="bg-[#003366] text-white font-bold">
                        <td colSpan={5} className="border border-gray-300 px-1 py-1 text-right">TOTAL</td>
                        <td className="border border-gray-300 px-1 py-1 text-right">{fmtAmt(aucaTotals.outstanding)}</td>
                        <td colSpan={7} className="border border-gray-300 px-1 py-1"></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Signature */}
              <div className="flex justify-between items-end px-6 py-4 mt-2 border-t">
                <div className="text-xs text-gray-600">
                  <div className="font-semibold">Submitted by:</div>
                  <div className="mt-24 border-t border-gray-400 pt-1 w-40">Chief / Branch Manager</div>
                  <div className="text-gray-500">{branchDisplay}</div>
                </div>
                <div className="text-xs text-gray-500 text-right">
                  <div>Quarter Ended: <span className="font-bold text-gray-800">{quarterLabel}</span></div>
                  <div>Total AUCA Accounts: <span className="font-bold">{aucaRows.length}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            AUCA SINGLE-PAGE REVIEW
            ════════════════════════════════════════════════════════════════════ */}
        {activeTab === "auca" && selectedAUCA && (
          <div className="p-4" style={{ printColorAdjust: 'exact' } as React.CSSProperties}>
            {/* Back button */}
            <button
              className="mb-3 text-xs text-indigo-600 hover:underline flex items-center gap-1 no-print"
              onClick={() => setSelectedAUCA(null)}
            >
              ← Back to AUCA List
            </button>

            <div className="bg-white border rounded-lg overflow-hidden max-w-3xl mx-auto">
              {/* Header */}
              <div className="px-5 pt-3 pb-1">
                <div className="text-sm font-bold">Regional Manager</div>
                <div className="text-xs text-gray-600 flex items-center gap-1">
                  <span className="no-print font-medium">Address:</span>
                  <input
                    type="text"
                    className="text-xs text-gray-600 border border-gray-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-transparent no-print w-full max-w-[200px]"
                    placeholder={`e.g. R-1, ${city}`}
                    value={rboAddress}
                    onChange={e => handleRboAddressChange(e.target.value)}
                  />
                  <span className="hidden print:inline">{displayRboAddress}</span>
                </div>
                <div className="mt-1 text-sm font-bold uppercase">Advances Under Collection Account (AUCA)</div>
                <div className="text-xs font-semibold">Review for the Quarter Ended: {quarterLabel}</div>
                <div className="text-xs font-bold">Branch: {branchDisplay}</div>
                <div className="flex justify-between mt-2 text-xs">
                  <div><span className="font-semibold">FILE NO.</span></div>
                  <div>
                    <span className="font-semibold">SEGMENT: </span>
                    {selectedAUCA.natureOfActivity.includes("PERSONAL") ? "PER" :
                     selectedAUCA.natureOfActivity.includes("PENSION") ? "PEN" :
                     selectedAUCA.natureOfActivity.includes("GOLD") ? "GOLD" : "PER"}
                    &nbsp;&nbsp;
                    <span className="font-semibold">ACCOUNT NO: </span>{selectedAUCA.actNo}
                  </div>
                </div>
              </div>

              {/* Review table */}
              <div className="px-3 pb-2">
                <table className="w-full border-collapse" style={{fontSize:'10px'}}>
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-400 px-1 py-0.5 text-left w-7">SNO</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-left w-52">Particulars</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-left">Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { sno: 1, label: "Name of the Unit", value: selectedAUCA.nameOfUnit },
                      { sno: 2, label: "Nature of activity", value: selectedAUCA.natureOfActivity },
                      { sno: 3, label: "Name of promoters/ directors", value: selectedAUCA.promoters },
                      { sno: 4, label: "Limits last sanctioned and date (CC/ TL/ATL etc.)", value: `LIMIT: ${selectedAUCA.sanctionLimit}/- SANCTIONED DATE- ${selectedAUCA.sanctionDate}` },
                      { sno: 5, label: "Date of transfer to RA", value: selectedAUCA.dateTransferRA },
                      { sno: 6, label: "Amount transferred to AUCA", value: fmtAmt(selectedAUCA.amountTransferredAUCA) },
                      { sno: 7, label: "Recovery, if any after transfer to AUCA", value: selectedAUCA.recoveryAfterAUCA },
                      { sno: 8, label: "Present outstanding in AUCA", value: fmtAmt(selectedAUCA.presentOutstanding) },
                      { sno: 9, label: "Accrued interest till date of transfer of outstanding in AUCA", value: fmtAmt(selectedAUCA.accruedInterest) },
                      { sno: 10, label: "Total involved loss (8+9)", value: fmtAmt(selectedAUCA.totalInvolvedLoss) },
                      { sno: 11, label: "Brief details of suit filled", value: selectedAUCA.suitDetails },
                      { sno: 12, label: "Brief details of RRC filed", value: selectedAUCA.rrcDetails },
                      { sno: 13, label: "Brief details of Decree/Recovery/ certificate (DRT) obtained", value: selectedAUCA.drtDetails },
                      { sno: 14, label: "Security particulars\nPrimary :\nCollateral:", value: selectedAUCA.securityParticulars },
                      { sno: 15, label: "Prospect of Recovery / Compromise", value: selectedAUCA.prospectOfRecovery },
                      { sno: 16, label: "Remark", value: selectedAUCA.remark },
                      { sno: 17, label: "Recommendation for retaining / Removal AUCA entry.", value: selectedAUCA.recommendation },
                    ].map(row => (
                      <tr key={row.sno}>
                        <td className="border border-gray-300 px-1 py-0.5 text-center align-top">{row.sno}</td>
                        <td className="border border-gray-300 px-1 py-0.5 align-top font-medium whitespace-pre-line">{row.label}</td>
                        <td className="border border-gray-300 px-1 py-0.5 align-top">
                          <textarea
                            className="w-full bg-transparent resize-none border-0 p-0 focus:outline-none text-xs no-print"
                            rows={row.sno === 16 || row.sno === 17 ? 2 : 1}
                            value={(aucaEdits[selectedAUCA.actNo] as any)?.[`field_${row.sno}`] ?? row.value}
                            onChange={e => updateAucaEdit(selectedAUCA.actNo, `field_${row.sno}`, e.target.value)}
                          />
                          <span className="hidden print:inline">{(aucaEdits[selectedAUCA.actNo] as any)?.[`field_${row.sno}`] ?? row.value}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Signature block */}
                <div className="mt-3 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="font-semibold">Kindly Approve</div>
                    <div>Dated : {fmtDate(reportDate.toISOString())}</div>
                    <div>Review and Screening Committee</div>
                    <div className="mt-1">(a) Date of review</div>
                    <div>(b) Observations</div>
                    <div className="mt-2">
                      <div>Signature Name Designation:</div>
                      <div className="flex items-center gap-1 no-print mt-0.5">
                        <input
                          type="text"
                          className="text-xs text-gray-700 border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-transparent w-full max-w-[150px]"
                          placeholder={`e.g. RBO ${city} 1`}
                          value={rboName}
                          onChange={e => handleRboNameChange(e.target.value)}
                        />
                      </div>
                      <div className="hidden print:block font-medium">{displayRboName}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="mt-4">
                      <div className="border-t border-gray-400 pt-1 inline-block w-48">
                        Signature &amp; Designation of the officer (Branch)
                        <div className="text-[10px] font-normal text-gray-500 mt-0.5">{branchDisplay}</div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="border-t border-gray-400 pt-1 inline-block w-48">
                        (By.Manager NPA) / (CM Credit)
                        <div className="text-[10px] font-normal text-gray-500 mt-0.5">{branchDisplay}</div>
                      </div>
                      <div className="text-gray-500">Submitted for Approval</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>{/* end print area */}
    </div>
  );
}
