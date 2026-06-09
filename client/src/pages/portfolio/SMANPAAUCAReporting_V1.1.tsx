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
import { Printer, RefreshCw, AlertTriangle, FileText, TrendingDown, Archive, Save, FolderOpen, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAllRecords, STORES } from "@/lib/portfolioDb";
import { loadData, saveData } from "@/lib/db";
import { useBranch } from "@/contexts/BranchContext";
import { formatINR } from "@/lib/portfolioTransform";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  #sma-npa-print-area, #sma-npa-print-area * { visibility: visible !important; }
  #sma-npa-print-area {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    overflow: visible !important;
  }
  /* Hide UI-only elements when printing */
  .no-print { display: none !important; }
  /* Repeat table column headers on every page, but NOT the summary block */
  #sma-npa-print-area thead { display: table-header-group; }
  #sma-npa-print-area tfoot { display: table-footer-group; }
  /* Prevent page breaks inside a single data row */
  #sma-npa-print-area tbody tr { break-inside: avoid; page-break-inside: avoid; }
  /* Summary/header block above the table should NOT repeat — only appears once */
  .print-report-header { break-after: avoid; page-break-after: avoid; }
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

  // AUCA single-page review
  const [selectedAUCA, setSelectedAUCA] = useState<AUCARow | null>(null);

  // Editable remarks/strategy per row (keyed by actNo/accountNo)
  const [smaRemarks, setSmaRemarks] = useState<Record<string, string>>({}); // persisted to IndexedDB
  const [npaEdits, setNpaEdits] = useState<Record<string, { observation?: string; strategy?: string; suitStatus?: string }>>({}); // persisted to IndexedDB
  const [aucaEdits, setAucaEdits] = useState<Record<string, Record<string, string | number | undefined>>>({}); // persisted to IndexedDB
  // Snapshot state
  const [snapshots, setSnapshots] = useState<string[]>([]); // list of snapshot keys e.g. ["report-snapshot-2026-03"]
  const [showSnapshotMenu, setShowSnapshotMenu] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  // Load persisted SMA remarks, NPA edits, AUCA edits, and snapshot list on mount
  useEffect(() => {
    loadData("sma-remarks").then((saved: Record<string, string> | null) => {
      if (saved) setSmaRemarks(saved);
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
    loadReportData();
  }, []);

  // Persist SMA remarks whenever they change
  async function updateSmaRemark(accountNo: string, value: string) {
    const updated = { ...smaRemarks, [accountNo]: value };
    setSmaRemarks(updated);
    await saveData("sma-remarks", updated);
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
        r.srNo, r.accountNo, r.customerName, r.acctDesc, r.securityDesc,
        r.sanctionDate, r.sanctionLimit, r.outstanding, r.irregularAmt,
        r.irregularDate, smaRemarks[r.accountNo] ?? r.remarks,
      ]),
      ["", "", "", "", "", "", "TOTAL", smaTotals.outstanding, smaTotals.irregular, "", ""],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(smaData), "SMA Accounts");
    // NPA sheet
    const npaData = [
      ["SR NO", "Act No", "Name of Unit", "Constitution", "Total Outstanding", "Security Held", "Provision", "Migration Date", "NPA Date", "IRAC", "RA", "Activity Status", "Status of Suit Filed", "Observation", "Strategy / Action Plan"],
      ...npaRows.map(r => {
        const ed = npaEdits[r.actNo] || {};
        return [
          r.srNo, r.actNo, r.nameOfUnit, r.constitution,
          r.totalOutstanding, r.securityHeld, r.provision,
          r.migrationDate, r.npaDate, r.irac, r.ra,
          r.activityStatus, ed.suitStatus ?? r.suitStatus,
          ed.observation ?? r.observation, ed.strategy ?? r.strategyPlan,
        ];
      }),
      ["", "", "", "", npaTotals.outstanding, "", npaTotals.provision, "", "", "", "", "", "", "", ""],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(npaData), "NPA Accounts");
    // AUCA sheet
    const aucaData = [
      ["SR NO", "Act No", "Name of Unit", "Constitution", "Total Outstanding", "Security Held", "Migration Date", "NPA Date", "Activity Status", "Status of Suit Filed", "Observation", "Strategy / Action Plan"],
      ...aucaRows.map(r => {
        const ed = aucaEdits[r.actNo] || {};
        return [
          r.srNo, r.actNo, r.nameOfUnit,
          (ed.constitution as string) ?? r.constitution,
          r.totalOutstanding,
          (ed.securityHeld as number) ?? r.securityHeld,
          (ed.migrationDate as string) ?? r.migrationDate,
          r.npaDate,
          (ed.activityStatus as string) ?? r.activityStatus,
          (ed.suitStatus as string) ?? r.suitStatus,
          (ed.observation as string) ?? r.observation,
          (ed.strategyPlan as string) ?? r.strategyPlan,
        ];
      }),
      ["", "", "", "", aucaTotals.outstanding, "", "", "", "", "", "", ""],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aucaData), "AUCA Accounts");
    const period = `${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, "0")}`;
    XLSX.writeFile(wb, `SMA_NPA_AUCA_${branchCode}_${period}.xlsx`);
  }
  // ── Data Loading ────────────────────────────────────────────────────────────
  async function loadReportData() {
    setLoading(true);
    try {
      const [loans, ccod] = await Promise.all([
        getAllRecords(STORES.LOAN_DATA),
        getAllRecords(STORES.CCOD_DATA),
      ]);
      const lfnAccounts: any[] = (await loadData("lfn-accounts")) || [];
      const lfnExclusions: any[] = (await loadData("lfn-exclusions")) || [];

      const allLoans = [...loans, ...ccod];
      setHasData(allLoans.length > 0);

      // ── SMA Report ──────────────────────────────────────────────────────────
      // Classification strictly follows CBS NEWIRAC field from uploaded report.
      // Include: NEWIRAC 01/1 (SMA-0), 02/2 (SMA-1), 03/3 (SMA-2) — no computed fields.
      const smaAccounts = allLoans.filter(r => {
        const iracNum = parseInt((r.NEWIRAC || "").trim().replace(/^0+/, ""), 10);
        return iracNum >= 1 && iracNum <= 3;
      });
      // Sort by irregular amount descending
      smaAccounts.sort((a, b) => Number(b.IRREGAMT || 0) - Number(a.IRREGAMT || 0));
      const smaBuilt: SMARow[] = smaAccounts.map((r, i) => ({
        srNo: i + 1,
        accountNo: r.LoanKey || r.ACCOUNT_NO || "",
        customerName: r.CUSTNAME || r.CUSTOMER_NAME || "",
        acctDesc: r.ACCTDESC || "",
        securityDesc: r.ACCTDESC || "",
        sanctionDate: fmtDate(r.SANCTDT),
        sanctionLimit: Number(r.LIMIT || 0),
        outstanding: Number(r.OUTSTAND || r.OUTSTANDING || 0),
        irregularAmt: Number(r.IRREGAMT || 0),
        irregularDate: fmtDate(r.IRRGDT),
        remarks: "", // blank by default; user-entered remarks loaded from smaRemarks
      }));
      setSmaRows(smaBuilt);

      // ── NPA Report ──────────────────────────────────────────────────────────
      // Classification strictly follows CBS NEWIRAC field from uploaded loan report.
      // Include: NEWIRAC 04/4 (Substandard), 05/5 (D1), 06/6 (D2), 07/7 (D3)
      // Exclude: NEWIRAC 08/8 (Loss/Written-off), affirmative WRITE_OFF_FLAG, or in exclusion list with isWrittenOff=true
      const loanMap = new Map(allLoans.map(r => [r.LoanKey || r.ACCOUNT_NO, r]));
      // Affirmative WRITE_OFF_FLAG values (same set used in LoanFileManager)
      const WO_FLAGS = new Set(["Y","YES","1","TRUE","W","WO","WRITTEN OFF","WRITTENOFF"]);
      // Build a set of written-off account numbers from the exclusion list
      const writtenOffNos = new Set(
        lfnExclusions
          .filter((e: any) => e.isWrittenOff === true)
          .map((e: any) => e.accountNo as string)
      );
      const npaFiltered = allLoans.filter((r: any) => {
        const iracNum = parseInt((r.NEWIRAC || "").trim().replace(/^0+/, ""), 10);
        const acctNo  = r.LoanKey || r.ACCOUNT_NO || "";
        const writeOffFlag = (r.WRITE_OFF_FLAG || "").trim().toUpperCase();
        // Written-off: NEWIRAC 8, or WRITE_OFF_FLAG affirmative, or in exclusion list
        const isWrittenOff = iracNum === 8 || WO_FLAGS.has(writeOffFlag) || writtenOffNos.has(acctNo);
        return iracNum >= 4 && iracNum <= 7 && !isWrittenOff;
      });
      const npaBuilt: NPARow[] = npaFiltered.map((r: any, i: number) => {
        const iracNum = parseInt((r.NEWIRAC || "").trim().replace(/^0+/, ""), 10);
        return {
          srNo: i + 1,
          actNo: r.LoanKey || r.ACCOUNT_NO || "",
          nameOfUnit: r.CUSTNAME || r.CUSTOMER_NAME || "",
          constitution: guessConstitution(r.CUSTNAME || r.CUSTOMER_NAME || ""),
          totalOutstanding: Number(r.OUTSTAND || r.OUTSTANDING || 0),
          securityHeld: 0,
          provision: computeProvision(Number(r.OUTSTAND || r.OUTSTANDING || 0), iracNum),
          migrationDate: fmtDate(r.RA_DATE || r.IRRGDT),
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
      // Classification strictly follows CBS NEWIRAC field from uploaded loan report.
      // Include: NEWIRAC 08/8 (Loss/Written-off) OR affirmative WRITE_OFF_FLAG from CBS
      // Also include accounts in the exclusion list with isWrittenOff=true (manually marked)
      const aucaAccountNos = new Set<string>(
        lfnExclusions
          .filter((e: any) => e.isWrittenOff === true)
          .map((e: any) => e.accountNo as string)
      );
      // Include any CBS loan record with NEWIRAC 08/8 OR affirmative WRITE_OFF_FLAG
      allLoans.forEach(r => {
        const iracNum = parseInt((r.NEWIRAC || "").trim().replace(/^0+/, ""), 10);
        const wof  = (r.WRITE_OFF_FLAG || "").trim().toUpperCase();
        if (iracNum === 8 || WO_FLAGS.has(wof)) aucaAccountNos.add(r.LoanKey || r.ACCOUNT_NO || "");
      });

      const aucaBuilt: AUCARow[] = [];
      let aucaSr = 1;
      for (const acctNo of Array.from(aucaAccountNos)) {
        const loan = loanMap.get(acctNo) || {};
        const excl = lfnExclusions.find((e: any) => e.accountNo === acctNo) || {};
        const lfnRec = lfnAccounts.find((a: any) => a.accountNo === acctNo) || {};
        const outstanding = Number(loan.OUTSTAND || loan.OUTSTANDING || 0);
        const writeOffAmt = Number(loan.WRITE_OFF_AMOUNT || 0);
        const accruedInt = Number(loan.ACCRINT || loan.UNREALINT || 0);
        aucaBuilt.push({
          srNo: aucaSr++,
          actNo: acctNo,
          nameOfUnit: loan.CUSTNAME || excl.customerName || "",
          constitution: guessConstitution(loan.CUSTNAME || excl.customerName || ""),
          totalOutstanding: outstanding,
          securityHeld: 0,
          migrationDate: fmtDate(loan.RA_DATE || excl.excludedOn),
          npaDate: fmtDate(loan.IRRGDT),
          activityStatus: "RRC LODGED",
          suitStatus: excl.suitDetails || loan.SUIT_NO ? `Suit No: ${loan.SUIT_NO || excl.suitDetails}` : (loan.RRC_NO ? `RRC No: ${loan.RRC_NO}` : "RRC LODGED"),
          observation: AUCA_OBSERVATION,
          strategyPlan: AUCA_STRATEGY,
          // Single-page review fields
          natureOfActivity: excl.category ? categoryLabel(excl.category) : (loan.ACCTDESC || ""),
          promoters: "NA",
          sanctionLimit: loan.LIMIT ? String(loan.LIMIT) : (lfnRec.limit || ""),
          sanctionDate: fmtDate(loan.SANCTDT || lfnRec.sanctionDate),
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
<body>${clone.innerHTML}</body>
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
  }), [npaRows]);

  const aucaTotals = useMemo(() => ({
    outstanding: aucaRows.reduce((s, r) => s + r.totalOutstanding, 0),
  }), [aucaRows]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  const quarterLabel = getQuarterLabel(reportDate);
  const monthLabel = getMonthLabel(reportDate);
  const branchDisplay = `${branchName.toUpperCase()} (${branchCode})`;

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
            onClick={() => { setActiveTab(tab.id); setSelectedAUCA(null); }}
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
                      <th className="border border-gray-300 px-1 py-1 text-center w-6">SR NO</th>
                      <th className="border border-gray-300 px-1 py-1 text-left w-24">ACCOUNT NUMBER</th>
                      <th className="border border-gray-300 px-1 py-1 text-left w-32">NAME OF BORROWER</th>
                      <th className="border border-gray-300 px-1 py-1 text-left w-28">ACCOUNT DESCRIPTION</th>
                      <th className="border border-gray-300 px-1 py-1 text-left w-24">DESCRIPTION OF SECURITY</th>
                      <th className="border border-gray-300 px-1 py-1 text-center w-16">SANCTION DATE</th>
                      <th className="border border-gray-300 px-1 py-1 text-right w-16">SANCTION LIMIT</th>
                      <th className="border border-gray-300 px-1 py-1 text-right w-16">OUTSTANDING</th>
                      <th className="border border-gray-300 px-1 py-1 text-right w-16">IRREGULAR AMOUNT</th>
                      <th className="border border-gray-300 px-1 py-1 text-center w-16">DATE OF IRREGULAR</th>
                      <th className="border border-gray-300 px-1 py-1 text-left">REMARKS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {smaRows.map((row, idx) => (
                      <tr key={row.accountNo} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="border border-gray-200 px-1 py-0.5 text-center">{row.srNo}</td>
                        <td className="border border-gray-200 px-1 py-0.5 font-mono">{row.accountNo}</td>
                        <td className="border border-gray-200 px-1 py-0.5">{row.customerName}</td>
                        <td className="border border-gray-200 px-1 py-0.5">{row.acctDesc}</td>
                        <td className="border border-gray-200 px-1 py-0.5">{row.securityDesc}</td>
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
                  <div className="mt-4 border-t border-gray-400 pt-1 w-40">Chief / Branch Manager</div>
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
                      {["SR. NO.", "ACT NO", "Name of the Unit", "Constitution", "Total Outstanding", "Security Held", "Provision", "Date of Migration", "NPA Date", "IRAC", "RA", "Activity Status", "Status of Suit Filed / RRC / DRT", "Observation of last review meeting with branch response.", "New Strategy / Action Plan"].map(h => (
                        <th key={h} className="border border-gray-300 px-1 py-1 text-center whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                    <tr className="bg-[#003366] text-white text-center">
                      {["1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16"].map(n => (
                        <th key={n} className="border border-gray-300 px-1 py-0.5">{n}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {npaRows.map((row, idx) => {
                      const edits = npaEdits[row.actNo] || {};
                      return (
                        <tr key={row.actNo} className={idx % 2 === 0 ? "bg-white" : "bg-red-50/30"}>
                          <td className="border border-gray-200 px-1 py-0.5 text-center">{row.srNo}</td>
                          <td className="border border-gray-200 px-1 py-0.5 font-mono">{row.actNo}</td>
                          <td className="border border-gray-200 px-1 py-0.5">{row.nameOfUnit}</td>
                          <td className="border border-gray-200 px-1 py-0.5 text-center">{row.constitution}</td>
                          <td className="border border-gray-200 px-1 py-0.5 text-right">{fmtAmt(row.totalOutstanding)}</td>
                          <td className="border border-gray-200 px-1 py-0.5 text-right">{fmtAmt(row.securityHeld)}</td>
                          <td className="border border-gray-200 px-1 py-0.5 text-right">{fmtAmt(row.provision)}</td>
                          <td className="border border-gray-200 px-1 py-0.5 text-center">{row.migrationDate || "00/00/0000"}</td>
                          <td className="border border-gray-200 px-1 py-0.5 text-center">{row.npaDate}</td>
                          <td className="border border-gray-200 px-1 py-0.5 text-center">{row.irac}</td>
                          <td className="border border-gray-200 px-1 py-0.5 text-center">{row.ra || "—"}</td>
                          <td className="border border-gray-200 px-1 py-0.5 text-center">{row.activityStatus}</td>
                          <td className="border border-gray-200 px-1 py-0.5">
                            <textarea
                              className="w-full text-[inherit] bg-transparent resize-none border-0 p-0 focus:outline-none no-print min-w-[100px]"
                              rows={2}
                              value={edits.suitStatus ?? row.suitStatus}
                              onChange={e => updateNpaEdit(row.actNo, "suitStatus", e.target.value)}
                            />
                            <span className="hidden print:inline">{edits.suitStatus ?? row.suitStatus}</span>
                          </td>
                          <td className="border border-gray-200 px-1 py-0.5">
                            <textarea
                              className="w-full text-[inherit] bg-transparent resize-none border-0 p-0 focus:outline-none no-print"
                              rows={2}
                              value={edits.observation ?? row.observation}
                              onChange={e => updateNpaEdit(row.actNo, "observation", e.target.value)}
                            />
                            <span className="hidden print:inline">{edits.observation ?? row.observation}</span>
                          </td>
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
                        <td colSpan={4} className="border border-gray-300 px-1 py-1 text-right">TOTAL</td>
                        <td className="border border-gray-300 px-1 py-1 text-right">{fmtAmt(npaTotals.outstanding)}</td>
                        <td className="border border-gray-300 px-1 py-1 text-right">0.00</td>
                        <td className="border border-gray-300 px-1 py-1 text-right">{fmtAmt(npaTotals.provision)}</td>
                        <td colSpan={8} className="border border-gray-300 px-1 py-1"></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Signature */}
              <div className="flex justify-between items-end px-6 py-4 mt-2 border-t">
                <div className="text-xs text-gray-600">
                  <div className="font-semibold">Submitted by:</div>
                  <div className="mt-4 border-t border-gray-400 pt-1 w-40">Chief / Branch Manager</div>
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
                      {["SR. NO.", "ACT NO", "Name of the Unit", "Constitution", "Total Outstanding", "Security", "Date of Migration", "NPA Date", "Activity Status", "Status of Suit Filed / RRC / DRT", "Observation of last review meeting with branch response.", "New Strategy / Action Plan"].map(h => (
                        <th key={h} className="border border-gray-300 px-1 py-1 text-center whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                    <tr className="bg-[#003366] text-white text-center">
                      {["1","2","3","4","5","6","7","8","9","10","11","12"].map(n => (
                        <th key={n} className="border border-gray-300 px-1 py-0.5">{n}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {aucaRows.map((row, idx) => {
                      const edits = aucaEdits[row.actNo] || {};
                      return (
                        <tr
                          key={row.actNo}
                          className={idx % 2 === 0 ? "bg-white" : "bg-purple-50/20"}
                        >
                          <td className="border border-gray-200 px-1 py-0.5 text-center">{row.srNo}</td>
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
                          <td className="border border-gray-200 px-1 py-0.5 text-right">{fmtAmt(row.totalOutstanding)}</td>
                          {/* Col 6: Security Held — editable */}
                          <td className="border border-gray-200 px-1 py-0.5">
                            <textarea className="w-full text-[inherit] bg-transparent resize-none border-0 p-0 focus:outline-none no-print min-w-[80px]" rows={1}
                              value={(edits as any).securityHeld ?? (row.securityHeld > 0 ? String(row.securityHeld) : "")}
                              onChange={e => updateAucaEdit(row.actNo, "securityHeld", e.target.value)}
                            />
                            <span className="hidden print:inline">{(edits as any).securityHeld ?? (row.securityHeld > 0 ? fmtAmt(row.securityHeld) : "—")}</span>
                          </td>
                          {/* Col 7: Migration Date — editable */}
                          <td className="border border-gray-200 px-1 py-0.5">
                            <textarea className="w-full text-[inherit] bg-transparent resize-none border-0 p-0 focus:outline-none no-print min-w-[80px]" rows={1}
                              value={(edits as any).migrationDate ?? (row.migrationDate || "")}
                              onChange={e => updateAucaEdit(row.actNo, "migrationDate", e.target.value)}
                            />
                            <span className="hidden print:inline">{(edits as any).migrationDate ?? (row.migrationDate || "—")}</span>
                          </td>
                          <td className="border border-gray-200 px-1 py-0.5 text-center">{row.npaDate || "—"}</td>
                          {/* Col 9: Activity Status — editable */}
                          <td className="border border-gray-200 px-1 py-0.5">
                            <textarea className="w-full text-[inherit] bg-transparent resize-none border-0 p-0 focus:outline-none no-print min-w-[80px]" rows={1}
                              value={(edits as any).activityStatus ?? row.activityStatus}
                              onChange={e => updateAucaEdit(row.actNo, "activityStatus", e.target.value)}
                            />
                            <span className="hidden print:inline">{(edits as any).activityStatus ?? row.activityStatus}</span>
                          </td>
                          {/* Col 10: Suit Status — already editable */}
                          <td className="border border-gray-200 px-1 py-0.5">
                            <textarea className="w-full text-[inherit] bg-transparent resize-none border-0 p-0 focus:outline-none no-print min-w-[100px]" rows={2}
                              value={(edits as any).suitStatus ?? row.suitStatus}
                              onChange={e => updateAucaEdit(row.actNo, "suitStatus", e.target.value)}
                            />
                            <span className="hidden print:inline">{(edits as any).suitStatus ?? row.suitStatus}</span>
                          </td>
                          {/* Col 11: Observation — editable */}
                          <td className="border border-gray-200 px-1 py-0.5">
                            <textarea className="w-full text-[inherit] bg-transparent resize-none border-0 p-0 focus:outline-none no-print min-w-[100px]" rows={2}
                              value={(edits as any).observation ?? row.observation}
                              onChange={e => updateAucaEdit(row.actNo, "observation", e.target.value)}
                            />
                            <span className="hidden print:inline">{(edits as any).observation ?? row.observation}</span>
                          </td>
                          {/* Col 12: Strategy — editable */}
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
                      <tr><td colSpan={11} className="text-center py-4 text-gray-400">No AUCA accounts found. Written-off accounts from the Loan File Register will appear here.</td></tr>
                    )}
                    {aucaRows.length > 0 && (
                      <tr className="bg-[#003366] text-white font-bold">
                        <td colSpan={4} className="border border-gray-300 px-1 py-1 text-right">TOTAL</td>
                        <td className="border border-gray-300 px-1 py-1 text-right">{fmtAmt(aucaTotals.outstanding)}</td>
                        <td colSpan={6} className="border border-gray-300 px-1 py-1"></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Signature */}
              <div className="flex justify-between items-end px-6 py-4 mt-2 border-t">
                <div className="text-xs text-gray-600">
                  <div className="font-semibold">Submitted by:</div>
                  <div className="mt-4 border-t border-gray-400 pt-1 w-40">Chief / Branch Manager</div>
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
                <div className="text-xs text-gray-600">R-1, Bhopal</div>
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
                      <div>RBO Bhopal 1</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="mt-4">
                      <div className="border-t border-gray-400 pt-1 inline-block w-48">
                        Signature &amp; Designation of the officer (Branch)
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="border-t border-gray-400 pt-1 inline-block w-48">
                        (By.Manager NPA) / (CM Credit)
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
