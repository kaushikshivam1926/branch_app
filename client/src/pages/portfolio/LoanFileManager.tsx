/**
 * Loan File Number Manager
 * 
 * Design: SBI Dashboard style — consistent with Branch Portfolio Dashboard
 * Manages loan file serial numbers per category (PER, PEN, GOLD, PMSG)
 * Data persisted in IndexedDB. One-time setup: PRODUCT_LIST + historical CSVs.
 * Recurring: Upload Loan Balance file to sync active/closed status and assign new serials.
 */

import { useState, useEffect, useRef } from "react";
import {
  Upload, Settings, Download, CheckCircle, AlertCircle,
  FileText, Plus, Trash2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  RefreshCw, Database, X, Search, RotateCcw, ShieldAlert, Printer
} from "lucide-react";
import { loadData, saveData } from "@/lib/db";
import { getAllRecords, getSetting, STORES } from "@/lib/portfolioDb";
import XpressCreditFrontPage from "./XpressCreditFrontPage";
import GoldLoanFrontPage from "./GoldLoanFrontPage";
import PensionLoanFrontPage from "./PensionLoanFrontPage";
import PMSuryaGharFrontPage from "./PMSuryaGharFrontPage";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductMapping {
  desc: string;
  category: CategoryCode;
}

type CategoryCode = "PERLOAN" | "PENLOAN" | "GOLDLON" | "PMSURYA";

interface LoanFileRecord {
  serialNo: string;
  accountNo: string;
  accountDesc: string;
  cifNo: string;
  customerName: string;
  limit: string;
  sanctionDate: string;
  status: "ACTIVE" | "CLOSED";
  lastSeen: string;
  category: CategoryCode;
}

// Option D types
interface ExcludedAccount {
  accountNo: string;
  accountDesc: string;
  customerName: string;
  cifNo: string;
  category: CategoryCode;
  excludedOn: string;
  reason: string;
}
interface ReviewCandidate {
  accountNo: string;
  accountDesc: string;
  customerName: string;
  cifNo: string;
  sanctionDate: string;
  limit: string;
  category: CategoryCode;
  writeOffFlag: string;
  writeOffAmount: number;
  writeOffDate: string;
  newirac: string;
  isWrittenOff: boolean;
  include: boolean; // user decision
  // raw row for record creation after confirmation
  _row: Record<string, string>;
}
interface SyncResult {
  newAccounts: number;
  closedAccounts: number;
  activeAccounts: number;
  snapshotDate: string;
  totalProcessed: number;
}

// ─── Category Config ───────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<CategoryCode, {
  label: string;
  prefix: string;
  padCount: number;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  badgeClass: string;
}> = {
  PERLOAN: { label: "Xpress Credit / Personal Loans", prefix: "PER", padCount: 4, color: "blue", bgClass: "bg-blue-50", textClass: "text-blue-800", borderClass: "border-blue-400", badgeClass: "bg-blue-100 text-blue-800" },
  PENLOAN: { label: "Pension Loans", prefix: "PEN", padCount: 4, color: "green", bgClass: "bg-green-50", textClass: "text-green-800", borderClass: "border-green-400", badgeClass: "bg-green-100 text-green-800" },
  GOLDLON: { label: "Gold Loans", prefix: "GOLD", padCount: 3, color: "amber", bgClass: "bg-amber-50", textClass: "text-amber-800", borderClass: "border-amber-400", badgeClass: "bg-amber-100 text-amber-800" },
  PMSURYA: { label: "PM Surya Ghar Loans", prefix: "PMSG", padCount: 4, color: "teal", bgClass: "bg-teal-50", textClass: "text-teal-800", borderClass: "border-teal-400", badgeClass: "bg-teal-100 text-teal-800" },
};

const CATEGORY_ORDER: CategoryCode[] = ["PERLOAN", "PENLOAN", "GOLDLON", "PMSURYA"];

// ─── Storage Keys ──────────────────────────────────────────────────────────────

const STORE_PRODUCT_LIST  = "lfn-product-list";
const STORE_ACCOUNTS      = "lfn-accounts";
const STORE_SYNC_LOG      = "lfn-sync-log";
const STORE_EXCLUSIONS    = "lfn-exclusions"; // Option D: persistent exclusion list

// ─── Utilities ─────────────────────────────────────────────────────────────────

function parseCSV(str: string): Record<string, string>[] {
  if (!str || typeof str !== "string") return [];
  if (str.charCodeAt(0) === 0xFEFF) str = str.slice(1);

  const result: string[][] = [];
  let row: string[] = [];
  let startIdx = 0;
  let inQuotes = false;

  for (let i = 0; i < str.length; i++) {
    const cc = str[i], nc = str[i + 1];
    if (cc === '"') { inQuotes = !inQuotes; }
    else if (cc === "," && !inQuotes) {
      row.push(str.substring(startIdx, i).replace(/^"|"$/g, "").replace(/""/g, '"').trim());
      startIdx = i + 1;
    } else if ((cc === "\n" || cc === "\r") && !inQuotes) {
      row.push(str.substring(startIdx, i).replace(/^"|"$/g, "").replace(/""/g, '"').trim());
      result.push(row); row = [];
      if (cc === "\r" && nc === "\n") i++;
      startIdx = i + 1;
    }
  }
  if (startIdx < str.length) {
    row.push(str.substring(startIdx).replace(/^"|"$/g, "").replace(/""/g, '"').trim());
  }
  if (row.length > 0) result.push(row);
  if (result.length === 0) return [];

  let hi = 0;
  while (hi < result.length && result[hi].length <= 1 && !result[hi][0]) hi++;
  if (hi >= result.length) return [];

  const headers = result[hi].map(h => h.trim());
  const data: Record<string, string>[] = [];
  for (let i = hi + 1; i < result.length; i++) {
    if (result[i].length === 1 && result[i][0].trim() === "") continue;
    const obj: Record<string, string> = {};
    headers.forEach((h, j) => { if (h) obj[h] = result[i][j]?.trim() ?? ""; });
    data.push(obj);
  }
  return data;
}

function exportCSV(data: Record<string, string>[], filename: string) {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const rows = [
    headers.join(","),
    ...data.map(row => headers.map(k => `"${String(row[k] ?? "").replace(/"/g, '""')}"`).join(","))
  ];
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.style.visibility = "hidden";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function extractSnapshotDate(filename: string): string {
  const m = filename.match(/_(\d{8})_/);
  if (m) {
    const d = m[1];
    return `${d.substring(6, 8)}/${d.substring(4, 6)}/${d.substring(0, 4)}`;
  }
  const now = new Date();
  return `${String(now.getDate()).padStart(2,"0")}/${String(now.getMonth()+1).padStart(2,"0")}/${now.getFullYear()}`;
}

function formatExcelDate(value: string): string {
  if (!value) return "";
  const n = Number(value);
  if (!isNaN(n) && n > 10000) {
    const d = new Date(Math.round((n - 25569) * 86400 * 1000));
    return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
  }
  return value;
}

function formatINR(amount: string): string {
  const num = parseFloat(amount);
  if (isNaN(num)) return amount || "-";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
}

function generateSerial(prefix: string, padCount: number, maxExisting: number, index: number): string {
  const n = maxExisting + index + 1;
  return `${prefix}${String(n).padStart(padCount, "0")}`;
}

function getMaxSerial(records: LoanFileRecord[], prefix: string): number {
  let max = 0;
  records.forEach(r => {
    const numStr = r.serialNo.replace(prefix, "");
    const n = parseInt(numStr, 10);
    if (!isNaN(n) && n > max) max = n;
  });
  return max;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function LoanFileManager() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<"register" | "setup" | "sync">("register");
  const [productMappings, setProductMappings] = useState<ProductMapping[]>([]);
  const [accounts, setAccounts] = useState<LoanFileRecord[]>([]);
  const [syncLog, setSyncLog] = useState<{ date: string; message: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
   const [isMappingsCollapsed, setIsMappingsCollapsed] = useState(true);
  const [printRecord, setPrintRecord] = useState<LoanFileRecord | null>(null);
  const [showResetDialog, setShowResetDialog] = useState<"full" | CategoryCode | null>(null);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [setupStatus, setSetupStatus] = useState<{ type: "success" | "error" | ""; message: string }>({ type: "", message: "" });
  const [syncStatus, setSyncStatus] = useState<{ type: "success" | "error" | ""; message: string; result?: SyncResult }>({ type: "", message: "" });
  const [isSyncing, setIsSyncing] = useState(false);
  // Option D state
  const [exclusions, setExclusions] = useState<ExcludedAccount[]>([]);
  const [reviewCandidates, setReviewCandidates] = useState<ReviewCandidate[]>([]);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [pendingSyncData, setPendingSyncData] = useState<{
    updatedAccounts: LoanFileRecord[];
    snapshotDate: string;
    totalActive: number;
    totalClosed: number;
    logEntry: { date: string; message: string };
  } | null>(null);
  const [showExclusionList, setShowExclusionList] = useState(false);

  // Register view state
  const [selectedCategory, setSelectedCategory] = useState<CategoryCode>("PERLOAN");
  const [statusFilter, setStatusFilter] = useState<"All" | "ACTIVE" | "CLOSED">("All");
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const ROWS_PER_PAGE = 100;

  const productFileRef = useRef<HTMLInputElement>(null);
  const historyRefs = useRef<Record<CategoryCode, HTMLInputElement | null>>({ PERLOAN: null, PENLOAN: null, GOLDLON: null, PMSURYA: null });
  const [loanBalanceDate, setLoanBalanceDate] = useState<string>("");

  // Load loan-balance-date from portfolioDb settings
  useEffect(() => {
    getSetting("loan-balance-date").then(d => { if (d) setLoanBalanceDate(d); });
  }, []);

  // ── Load from IndexedDB ────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const [pm, ac, sl, ex] = await Promise.all([
        loadData(STORE_PRODUCT_LIST),
        loadData(STORE_ACCOUNTS),
        loadData(STORE_SYNC_LOG),
        loadData(STORE_EXCLUSIONS),
      ]);
      if (pm) setProductMappings(pm);
      if (ac) setAccounts(ac);
      if (sl) setSyncLog(sl);
      if (ex) setExclusions(ex);
      setIsLoading(false);
    };
    load();
  }, []);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const stats = CATEGORY_ORDER.reduce((acc, cat) => {
    const catAccounts = accounts.filter(a => a.category === cat);
    acc[cat] = {
      total: catAccounts.length,
      active: catAccounts.filter(a => a.status === "ACTIVE").length,
      closed: catAccounts.filter(a => a.status === "CLOSED").length,
    };
    return acc;
  }, {} as Record<CategoryCode, { total: number; active: number; closed: number }>);

  // ── Product Mapping Handlers ───────────────────────────────────────────────
  const handleProductListUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      const mappings: ProductMapping[] = rows
        .filter(r => r["Product_Desc"] && r["Category"])
        .map(r => ({ desc: r["Product_Desc"].trim(), category: r["Category"].trim() as CategoryCode }));
      if (mappings.length === 0) {
        setSetupStatus({ type: "error", message: "Could not find 'Product_Desc' and 'Category' columns in the uploaded CSV." });
        return;
      }
      setProductMappings(mappings);
      await saveData(STORE_PRODUCT_LIST, mappings);
      setIsMappingsCollapsed(true);
      setSetupStatus({ type: "success", message: `Product list loaded: ${mappings.length} mappings saved.` });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const addMapping = () => setProductMappings(prev => [...prev, { desc: "", category: "PERLOAN" }]);
  const removeMapping = (i: number) => setProductMappings(prev => prev.filter((_, idx) => idx !== i));
  const updateMapping = (i: number, field: keyof ProductMapping, value: string) => {
    setProductMappings(prev => { const n = [...prev]; n[i] = { ...n[i], [field]: value }; return n; });
  };
  const saveMappings = async () => {
    await saveData(STORE_PRODUCT_LIST, productMappings);
    setSetupStatus({ type: "success", message: `${productMappings.length} product mappings saved.` });
  };

  // ── Historical Data Upload ─────────────────────────────────────────────────
  const handleHistoricalUpload = (e: React.ChangeEvent<HTMLInputElement>, category: CategoryCode) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      const cfg = CATEGORY_CONFIG[category];

      const records: LoanFileRecord[] = rows
        .filter(r => r["Account No."] || r["ACCTNO"])
        .map(r => ({
          serialNo: r["Serial No."] || "",
          accountNo: r["Account No."] || r["ACCTNO"] || "",
          accountDesc: r["Account Description"] || r["ACCTDESC"] || "",
          cifNo: r["CIF Number"] || r["CUSTNUMBER"] || "",
          customerName: r["Customer Name"] || r["CUSTNAME"] || "",
          limit: r["Limit"] || r["LIMIT"] || "",
          sanctionDate: formatExcelDate(r["Sanction Date"] || r["SANCTDT"] || ""),
          status: (r["Status"] as "ACTIVE" | "CLOSED") || "ACTIVE",
          lastSeen: formatExcelDate(r["Last Seen"] || ""),
          category,
        }));

      // Merge: replace all records for this category with the historical data
      const otherCats = accounts.filter(a => a.category !== category);
      const merged = [...otherCats, ...records];
      setAccounts(merged);
      await saveData(STORE_ACCOUNTS, merged);

      setSetupStatus({
        type: "success",
        message: `${cfg.label}: ${records.length} historical records imported. Max serial: ${cfg.prefix}${String(getMaxSerial(records, cfg.prefix)).padStart(cfg.padCount, "0")}.`
      });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ── Reset / Clear Functions ─────────────────────────────────────────────
  const handleReset = async (scope: "full" | CategoryCode) => {
    if (resetConfirmText !== "RESET") return;
    try {
      if (scope === "full") {
        // Clear everything
        setAccounts([]);
        setProductMappings([]);
        setSyncLog([]);
        await saveData(STORE_ACCOUNTS, []);
        await saveData(STORE_PRODUCT_LIST, []);
        await saveData(STORE_SYNC_LOG, []);
        setSetupStatus({ type: "success", message: "All data cleared. The register has been fully reset. You can now re-upload the Product List and historical files." });
      } else {
        // Clear only the selected category
        const remaining = accounts.filter(a => a.category !== scope);
        setAccounts(remaining);
        await saveData(STORE_ACCOUNTS, remaining);
        setSetupStatus({ type: "success", message: `${CATEGORY_CONFIG[scope].label} (${CATEGORY_CONFIG[scope].prefix} series) cleared — ${accounts.filter(a => a.category === scope).length} records removed. Re-upload the historical CSV for this category.` });
      }
    } catch (err) {
      setSetupStatus({ type: "error", message: `Reset failed: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setShowResetDialog(null);
      setResetConfirmText("");
    }
  };

  // ── Loan Balance Sync from IndexedDB (Option D: Review dialog before serial assignment) ──
  const handleSyncFromDashboard = async () => {
    if (productMappings.length === 0) {
      setSyncStatus({ type: "error", message: "No product mappings loaded. Please upload PRODUCT_LIST.csv in Setup first." });
      return;
    }
    setIsSyncing(true);
    setSyncStatus({ type: "", message: "" });
    try {
      const [loanRows, ccodRows] = await Promise.all([
        getAllRecords(STORES.LOAN_DATA),
        getAllRecords(STORES.CCOD_DATA),
      ]);
      const allRows = [...loanRows, ...ccodRows];

      if (allRows.length === 0) {
        setSyncStatus({ type: "error", message: "No loan data found in the dashboard. Please upload the Loan Balance file in Data Upload first." });
        setIsSyncing(false);
        return;
      }

      const settingDate = await getSetting("loan-balance-date");
      const snapshotDate = settingDate || new Date().toISOString().slice(0, 10);
      setLoanBalanceDate(snapshotDate);

      const descToCategory = new Map<string, CategoryCode>();
      productMappings.forEach(m => descToCategory.set(m.desc.trim(), m.category));

      const liveByCategory = new Map<CategoryCode, Map<string, Record<string, string>>>();
      CATEGORY_ORDER.forEach(cat => liveByCategory.set(cat, new Map()));

      allRows.forEach((row: any) => {
        const desc = (row["ACCTDESC"] || "").trim();
        const acctNo = (row["LoanKey"] || row["ACCTNO"] || "").trim();
        if (!desc || !acctNo) return;
        const cat = descToCategory.get(desc);
        if (cat) liveByCategory.get(cat)!.set(acctNo, row);
      });

      // Build exclusion set from persisted list
      const exclusionSet = new Set(exclusions.map(e => e.accountNo));

      let totalClosed = 0, totalActive = 0;
      const updatedExistingAccounts: LoanFileRecord[] = [];
      const allCandidates: ReviewCandidate[] = [];

      for (const cat of CATEGORY_ORDER) {
        const liveMap = liveByCategory.get(cat)!;
        const existingForCat = accounts.filter(a => a.category === cat);
        const existingAccountNos = new Set(existingForCat.map(a => a.accountNo));

        // Update existing records (no review needed for these)
        const updatedExisting = existingForCat.map(rec => {
          if (liveMap.has(rec.accountNo)) {
            totalActive++;
            return { ...rec, status: "ACTIVE" as const, lastSeen: snapshotDate };
          } else {
            if (rec.status === "ACTIVE") totalClosed++;
            return { ...rec, status: "CLOSED" as const };
          }
        });
        updatedExistingAccounts.push(...updatedExisting);

        // Collect new accounts (not in existing, not in exclusion list)
        const newRows = Array.from(liveMap.entries())
          .filter(([acctNo]) => !existingAccountNos.has(acctNo) && !exclusionSet.has(acctNo))
          .map(([, row]) => row)
          .sort((a: any, b: any) => ((a["LoanKey"] || a["ACCTNO"]) > (b["LoanKey"] || b["ACCTNO"]) ? 1 : -1));

        for (const row of newRows as any[]) {
          const writeOffFlag = (row["WRITE_OFF_FLAG"] || "").trim();
          const writeOffAmount = parseFloat(row["WRITE_OFF_AMOUNT"] || "0") || 0;
          const writeOffDate = (row["WRITE_OFF_DATE"] || "").trim();
          const newirac = (row["NEWIRAC"] || "").trim();
          const isWrittenOff = writeOffFlag !== "" || writeOffAmount > 0 || writeOffDate !== "" || newirac === "08";
          allCandidates.push({
            accountNo: (row["LoanKey"] || row["ACCTNO"] || "").trim(),
            accountDesc: (row["ACCTDESC"] || "").trim(),
            customerName: (row["CUSTNAME"] || "").trim(),
            cifNo: (row["CIF"] || row["CUSTNUMBER"] || "").trim(),
            sanctionDate: (row["SANCTDT"] || "").trim(),
            limit: String(row["LIMIT"] || ""),
            category: cat,
            writeOffFlag,
            writeOffAmount,
            writeOffDate,
            newirac,
            isWrittenOff,
            include: !isWrittenOff, // pre-select: written-off = exclude, normal = include
            _row: row,
          });
        }
      }

      // Store the already-updated existing accounts and snapshot data for later
      setPendingSyncData({
        updatedAccounts: updatedExistingAccounts,
        snapshotDate,
        totalActive,
        totalClosed,
        logEntry: {
          date: snapshotDate,
          message: `Sync from Dashboard: ${totalActive} active, ${totalClosed} newly closed. (${allRows.length} loan records read)`
        },
      });

      if (allCandidates.length === 0) {
        // No new accounts — just apply the existing updates directly
        setAccounts(updatedExistingAccounts);
        await saveData(STORE_ACCOUNTS, updatedExistingAccounts);
        const logEntry = {
          date: snapshotDate,
          message: `Sync from Dashboard: 0 new, ${totalActive} active, ${totalClosed} newly closed. (${allRows.length} loan records read)`
        };
        const newLog = [logEntry, ...syncLog].slice(0, 50);
        setSyncLog(newLog);
        await saveData(STORE_SYNC_LOG, newLog);
        setSyncStatus({ type: "success", message: "Sync completed. No new accounts detected.", result: { newAccounts: 0, closedAccounts: totalClosed, activeAccounts: totalActive, snapshotDate, totalProcessed: allRows.length } });
        setTab("register");
      } else {
        // Show review dialog
        setReviewCandidates(allCandidates);
        setShowReviewDialog(true);
      }
    } catch (err: unknown) {
      setSyncStatus({ type: "error", message: `Sync error: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setIsSyncing(false);
    }
  };

  // ── Confirm Review Dialog: assign serials to included, save exclusions for excluded ──
  const handleConfirmReview = async () => {
    if (!pendingSyncData) return;
    const { updatedAccounts, snapshotDate, totalActive, totalClosed, logEntry } = pendingSyncData;

    const included = reviewCandidates.filter(c => c.include);
    const excluded = reviewCandidates.filter(c => !c.include);

    // Build serial numbers for included accounts (per category)
    const newRecords: LoanFileRecord[] = [];
    for (const cat of CATEGORY_ORDER) {
      const cfg = CATEGORY_CONFIG[cat];
      const catIncluded = included.filter(c => c.category === cat);
      const existingForCat = updatedAccounts.filter(a => a.category === cat);
      const maxSerial = getMaxSerial(existingForCat, cfg.prefix);
      catIncluded.forEach((c, idx) => {
        newRecords.push({
          serialNo: generateSerial(cfg.prefix, cfg.padCount, maxSerial, idx),
          accountNo: c.accountNo,
          accountDesc: c.accountDesc,
          cifNo: c.cifNo,
          customerName: c.customerName,
          limit: c.limit,
          sanctionDate: c.sanctionDate,
          status: "ACTIVE",
          lastSeen: snapshotDate,
          category: cat,
        });
      });
    }

    const finalAccounts = [...updatedAccounts, ...newRecords];
    setAccounts(finalAccounts);
    await saveData(STORE_ACCOUNTS, finalAccounts);

    // Save new exclusions
    const today = new Date().toISOString().slice(0, 10);
    const newExclusions: ExcludedAccount[] = excluded.map(c => ({
      accountNo: c.accountNo,
      accountDesc: c.accountDesc,
      customerName: c.customerName,
      cifNo: c.cifNo,
      category: c.category,
      excludedOn: today,
      reason: c.isWrittenOff ? "Written Off" : "Manual exclusion",
    }));
    const mergedExclusions = [...exclusions, ...newExclusions];
    setExclusions(mergedExclusions);
    await saveData(STORE_EXCLUSIONS, mergedExclusions);

    const finalLogEntry = {
      date: logEntry.date,
      message: `${logEntry.message} | New: ${newRecords.length} assigned, ${excluded.length} excluded.`
    };
    const newLog = [finalLogEntry, ...syncLog].slice(0, 50);
    setSyncLog(newLog);
    await saveData(STORE_SYNC_LOG, newLog);

    setSyncStatus({
      type: "success",
      message: "Sync completed successfully.",
      result: { newAccounts: newRecords.length, closedAccounts: totalClosed, activeAccounts: totalActive, snapshotDate, totalProcessed: 0 }
    });
    setShowReviewDialog(false);
    setReviewCandidates([]);
    setPendingSyncData(null);
    setTab("register");
  };

  // ── Remove an account from the exclusion list ──────────────────────────────
  const handleRemoveExclusion = async (accountNo: string) => {
    const updated = exclusions.filter(e => e.accountNo !== accountNo);
    setExclusions(updated);
    await saveData(STORE_EXCLUSIONS, updated);
  };

  // ── Toggle account status between ACTIVE and CLOSED ─────────────────────────
  const handleToggleStatus = async (accountNo: string) => {
    const updated = accounts.map(a =>
      a.accountNo === accountNo
        ? { ...a, status: (a.status === "ACTIVE" ? "CLOSED" : "ACTIVE") as "ACTIVE" | "CLOSED" }
        : a
    );
    setAccounts(updated);
    await saveData(STORE_ACCOUNTS, updated);
  };

  // ── Register View ──────────────────────────────────────────────────────────
  const filteredAccounts = accounts
    .filter(a => a.category === selectedCategory)
    .filter(a => statusFilter === "All" || a.status === statusFilter)
    .filter(a => {
      if (!searchText) return true;
      const q = searchText.toLowerCase();
      return a.accountNo.includes(q) || a.customerName.toLowerCase().includes(q) || a.serialNo.toLowerCase().includes(q) || a.cifNo.includes(q);
    });

  const totalRows = filteredAccounts.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / ROWS_PER_PAGE));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIdx = (safePage - 1) * ROWS_PER_PAGE;
  const visibleRows = filteredAccounts.slice(startIdx, startIdx + ROWS_PER_PAGE);

  const changeCategory = (cat: CategoryCode) => {
    setSelectedCategory(cat);
    setCurrentPage(1); setPageInput("1");
    setStatusFilter("All"); setSearchText("");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: "#4e1a74" }} />
          <p className="text-sm text-gray-500">Loading Loan File Register...</p>
        </div>
      </div>
    );
  }

  const isInitialized = accounts.length > 0 || productMappings.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold" style={{ color: "#1a1a2e" }}>Loan File Number Register</h2>
        <p className="text-sm text-gray-500 mt-1">
          Manage running serial numbers for loan files — Xpress Credit, Pension, Gold, and PM Surya Ghar
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { id: "register" as const, label: "File Register", icon: <FileText className="w-4 h-4" /> },
          { id: "sync" as const, label: "Sync Loan Balance", icon: <RefreshCw className="w-4 h-4" /> },
          { id: "setup" as const, label: "Setup", icon: <Settings className="w-4 h-4" /> },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all"
            style={tab === t.id
              ? { backgroundColor: "#4e1a74", color: "white" }
              : { color: "#6b7280" }}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── REGISTER TAB ─────────────────────────────────────────────────────── */}
      {tab === "register" && (
        <div className="flex flex-col gap-4 flex-1">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {CATEGORY_ORDER.map(cat => {
              const cfg = CATEGORY_CONFIG[cat];
              const s = stats[cat] || { total: 0, active: 0, closed: 0 };
              return (
                <button
                  key={cat}
                  onClick={() => changeCategory(cat)}
                  className={`rounded-xl p-4 border-l-4 text-left transition-all ${cfg.borderClass} ${selectedCategory === cat ? cfg.bgClass + " shadow-md" : "bg-white hover:bg-gray-50"}`}
                >
                  <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${selectedCategory === cat ? cfg.textClass : "text-gray-500"}`}>
                    {cfg.prefix} Series
                  </div>
                  <div className="text-2xl font-bold text-gray-800">{s.total}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    <span className="text-green-600 font-medium">{s.active} active</span>
                    {s.closed > 0 && <span className="text-red-500 font-medium ml-2">{s.closed} closed</span>}
                  </div>
                  <div className={`text-xs mt-2 font-medium ${selectedCategory === cat ? cfg.textClass : "text-gray-400"}`}>
                    {cfg.label}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Not initialized prompt */}
          {!isInitialized && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-sm">
                <Database className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No Data Yet</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Start by uploading the Product List and historical records in <strong>Setup</strong>, then sync a Loan Balance file.
                </p>
                <button
                  onClick={() => setTab("setup")}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                  style={{ backgroundColor: "#4e1a74" }}
                >
                  Go to Setup
                </button>
              </div>
            </div>
          )}

          {isInitialized && (
            <>
              {/* Controls Row */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex gap-2 items-center">
                  {/* Status Filter */}
                  <div className="flex gap-1 bg-white rounded-lg border border-gray-200 p-1">
                    {(["All", "ACTIVE", "CLOSED"] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => { setStatusFilter(s); setCurrentPage(1); setPageInput("1"); }}
                        className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                        style={statusFilter === s
                          ? { backgroundColor: s === "ACTIVE" ? "#dcfce7" : s === "CLOSED" ? "#fee2e2" : "#1e293b", color: s === "ACTIVE" ? "#166534" : s === "CLOSED" ? "#991b1b" : "white" }
                          : { color: "#6b7280" }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  {/* Search */}
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search name, account, CIF..."
                      value={searchText}
                      onChange={e => { setSearchText(e.target.value); setCurrentPage(1); setPageInput("1"); }}
                      className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white w-56 focus:outline-none focus:ring-2"
                      style={{ "--tw-ring-color": "#4e1a74" } as React.CSSProperties}
                    />
                  </div>
                </div>
                <button
                  onClick={() => exportCSV(
                    filteredAccounts.map(a => ({
                      "Serial No.": a.serialNo,
                      "Account No.": a.accountNo,
                      "Account Description": a.accountDesc,
                      "CIF Number": a.cifNo,
                      "Customer Name": a.customerName,
                      "Limit": a.limit,
                      "Sanction Date": a.sanctionDate,
                      "Status": a.status,
                      "Last Seen": a.lastSeen,
                    })),
                    `${selectedCategory}_FILE_REGISTER.csv`
                  )}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
                  style={{ backgroundColor: "#4e1a74" }}
                >
                  <Download className="w-4 h-4" /> Export CSV
                </button>
              </div>

              {/* Table */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col flex-1 min-h-0">
                <div className={`px-5 py-3 border-b border-gray-100 flex items-center justify-between ${CATEGORY_CONFIG[selectedCategory].bgClass}`}>
                  <h3 className={`font-semibold text-sm ${CATEGORY_CONFIG[selectedCategory].textClass}`}>
                    {CATEGORY_CONFIG[selectedCategory].label}
                  </h3>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${CATEGORY_CONFIG[selectedCategory].badgeClass}`}>
                    {totalRows} entries
                  </span>
                </div>
                <div className="overflow-auto flex-1">
                  {totalRows === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">No records found for the selected filters.</div>
                  ) : (
                    <table className="w-full text-sm text-left whitespace-nowrap">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Serial No.</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Account No.</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Last Seen</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Customer Name</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">CIF</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Limit</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Sanction Date</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Front Page</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {visibleRows.map((row, i) => (
                          <tr key={i} className={`hover:bg-gray-50 transition-colors ${row.status === "CLOSED" ? "opacity-60" : ""}`}>
                            <td className="px-4 py-3 font-mono font-semibold text-gray-800">{row.serialNo}</td>
                            <td className="px-4 py-3 text-gray-600">{row.accountNo}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${row.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                                {row.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{row.lastSeen}</td>
                            <td className="px-4 py-3 text-gray-700">{row.customerName}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{row.cifNo}</td>
                            <td className="px-4 py-3 text-gray-800 font-medium text-right">{formatINR(row.limit)}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{row.sanctionDate}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {selectedCategory === "PERLOAN" && (
                                  <button
                                    onClick={() => setPrintRecord(row)}
                                    title="Print Xpress Credit Front Page"
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                    Front Page
                                  </button>
                                )}
                                {selectedCategory === "GOLDLON" && (
                                  <button
                                    onClick={() => setPrintRecord(row)}
                                    title="Print Gold Loan Front Page"
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                    Front Page
                                  </button>
                                )}
                                {selectedCategory === "PENLOAN" && (
                                  <button
                                    onClick={() => setPrintRecord(row)}
                                    title="Print Pension Loan Front Page"
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                    Front Page
                                  </button>
                                )}
                                {selectedCategory === "PMSURYA" && (
                                  <button
                                    onClick={() => setPrintRecord(row)}
                                    title="Print PM Surya Ghar Front Page"
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-cyan-50 text-cyan-700 border border-cyan-200 hover:bg-cyan-100 transition-colors"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                    Front Page
                                  </button>
                                )}
                                <button
                                  onClick={() => handleToggleStatus(row.accountNo)}
                                  title={row.status === "ACTIVE" ? "Mark this account as Closed" : "Reopen this account (mark as Active)"}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                    row.status === "ACTIVE"
                                      ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                                      : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                                  }`}
                                >
                                  {row.status === "ACTIVE" ? (
                                    <><X className="w-3.5 h-3.5" /> Mark Closed</>
                                  ) : (
                                    <><CheckCircle className="w-3.5 h-3.5" /> Reopen</>
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                {/* Pagination */}
                {totalRows > ROWS_PER_PAGE && (
                  <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      Showing {startIdx + 1}–{Math.min(startIdx + ROWS_PER_PAGE, totalRows)} of {totalRows}
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <button disabled={safePage === 1} onClick={() => { setCurrentPage(p => p - 1); setPageInput(String(safePage - 1)); }} className="p-1 rounded hover:bg-gray-200 disabled:opacity-40 text-gray-600">
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs px-2">Page {safePage} of {totalPages}</span>
                        <button disabled={safePage === totalPages} onClick={() => { setCurrentPage(p => p + 1); setPageInput(String(safePage + 1)); }} className="p-1 rounded hover:bg-gray-200 disabled:opacity-40 text-gray-600">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                      <form onSubmit={e => { e.preventDefault(); const p = parseInt(pageInput, 10); if (!isNaN(p) && p >= 1 && p <= totalPages) setCurrentPage(p); else setPageInput(String(safePage)); }} className="flex items-center gap-1">
                        <span className="text-xs text-gray-500">Go:</span>
                        <input type="number" min={1} max={totalPages} value={pageInput} onChange={e => setPageInput(e.target.value)} className="w-14 px-2 py-1 text-xs border border-gray-300 rounded" />
                        <button type="submit" className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50">Go</button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── SYNC TAB ──────────────────────────────────────────────────────────── */}
      {tab === "sync" && (
        <div className="max-w-2xl">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-800 text-lg">Sync from Dashboard Loan Data</h3>
              <p className="text-sm text-gray-500 mt-1">
                Reads the loan data already uploaded in <strong>Data Upload</strong> (Loan Balance file) to update account statuses and assign serial numbers to new accounts.
                Existing accounts not found in the latest data will be marked as <strong>CLOSED</strong>.
              </p>
            </div>
            <div className="p-6 space-y-4">
              {productMappings.length === 0 && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <span>No product mappings loaded. Please upload PRODUCT_LIST.csv in <strong>Setup</strong> first.</span>
                </div>
              )}

              {/* Data source info */}
              <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <Database className="w-5 h-5 shrink-0" />
                <div>
                  <p className="font-semibold">Data Source: Branch Portfolio Dashboard</p>
                  {loanBalanceDate
                    ? <p className="text-xs mt-0.5">Latest Loan Balance data as of <strong>{loanBalanceDate}</strong> is available. Click Sync to process.</p>
                    : <p className="text-xs mt-0.5">No loan data found. Please upload the Loan Balance file in <strong>Data Upload</strong> first.</p>
                  }
                </div>
              </div>

              {/* Exclusion list info */}
              {exclusions.length > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm">
                  <span className="text-amber-700">
                    <strong>{exclusions.length}</strong> account{exclusions.length !== 1 ? "s" : ""} permanently excluded from serial assignment.
                  </span>
                  <button
                    onClick={() => setShowExclusionList(true)}
                    className="text-xs text-amber-700 underline hover:text-amber-900 font-medium"
                  >View / Manage</button>
                </div>
              )}
              {/* Sync button */}
              <button
                onClick={handleSyncFromDashboard}
                disabled={isSyncing || !loanBalanceDate}
                className="w-full flex items-center justify-center gap-3 p-5 rounded-xl border-2 transition-all font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: isSyncing ? "#7c3aed" : "#4e1a74", borderColor: "#4e1a74" }}
              >
                {isSyncing
                  ? <><RefreshCw className="w-5 h-5 animate-spin" /> Processing...</>
                  : <><RefreshCw className="w-5 h-5" /> Sync Now from Dashboard Data</>}
              </button>

              {syncStatus.type && (
                <div className={`flex items-start gap-3 p-4 rounded-lg border text-sm ${syncStatus.type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-700"}`}>
                  {syncStatus.type === "success" ? <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
                  <div>
                    <p className="font-semibold">{syncStatus.message}</p>
                    {syncStatus.result && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="bg-white rounded-lg p-3 border border-green-200 text-center">
                          <div className="text-2xl font-bold text-green-700">{syncStatus.result.newAccounts}</div>
                          <div className="text-xs text-gray-500">New accounts assigned</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-blue-200 text-center">
                          <div className="text-2xl font-bold text-blue-700">{syncStatus.result.activeAccounts}</div>
                          <div className="text-xs text-gray-500">Confirmed active</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-red-200 text-center">
                          <div className="text-2xl font-bold text-red-600">{syncStatus.result.closedAccounts}</div>
                          <div className="text-xs text-gray-500">Newly closed</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-gray-200 text-center">
                          <div className="text-sm font-bold text-gray-700">{syncStatus.result.snapshotDate}</div>
                          <div className="text-xs text-gray-500">Snapshot date</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sync Log */}
              {syncLog.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recent Sync History</h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {syncLog.slice(0, 10).map((entry, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-gray-600 py-1 border-b border-gray-50">
                        <span className="text-gray-400 shrink-0">{entry.date}</span>
                        <span>{entry.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── SETUP TAB ─────────────────────────────────────────────────────────── */}
      {tab === "setup" && (
        <div className="space-y-6 max-w-5xl">
          {setupStatus.type && (
            <div className={`flex items-start gap-3 p-4 rounded-lg border text-sm ${setupStatus.type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-700"}`}>
              {setupStatus.type === "success" ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
              <span>{setupStatus.message}</span>
              <button onClick={() => setSetupStatus({ type: "", message: "" })} className="ml-auto shrink-0"><X className="w-4 h-4" /></button>
            </div>
          )}

          {/* Section 1: Product Mappings */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div
              className="p-5 border-b border-gray-100 bg-gray-50 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => setIsMappingsCollapsed(!isMappingsCollapsed)}
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-800">1. Product Mappings</h3>
                  {isMappingsCollapsed ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">Map ACCTDESC values to loan categories (PERLOAN, PENLOAN, GOLDLON, PMSURYA)</p>
              </div>
              <label
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white cursor-pointer"
                style={{ backgroundColor: "#4e1a74" }}
                onClick={e => e.stopPropagation()}
              >
                <Upload className="w-4 h-4" /> Import PRODUCT_LIST.csv
                <input type="file" accept=".csv" className="hidden" onChange={handleProductListUpload} />
              </label>
            </div>

            {isMappingsCollapsed ? (
              <div className="p-4 flex flex-wrap gap-3 items-center">
                {CATEGORY_ORDER.map(cat => {
                  const count = productMappings.filter(m => m.category === cat).length;
                  return (
                    <div key={cat} className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${CATEGORY_CONFIG[cat].badgeClass} ${CATEGORY_CONFIG[cat].borderClass}`}>
                      {cat}: {count} products
                    </div>
                  );
                })}
                <button onClick={() => setIsMappingsCollapsed(false)} className="ml-auto text-xs text-blue-600 hover:text-blue-800 font-medium">Edit Mappings</button>
              </div>
            ) : (
              <>
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white border-b border-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Account Description (ACCTDESC)</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Category</th>
                        <th className="px-4 py-3 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {productMappings.map((m, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-2">
                            <input type="text" value={m.desc} onChange={e => updateMapping(i, "desc", e.target.value)}
                              className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1"
                              style={{ "--tw-ring-color": "#4e1a74" } as React.CSSProperties}
                              placeholder="e.g., MC-TL-PERSONAL LOAN" />
                          </td>
                          <td className="px-4 py-2">
                            <select value={m.category} onChange={e => updateMapping(i, "category", e.target.value)}
                              className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm bg-white focus:outline-none">
                              <option value="PERLOAN">PERLOAN (Xpress Credit)</option>
                              <option value="PENLOAN">PENLOAN (Pension Loan)</option>
                              <option value="GOLDLON">GOLDLON (Gold Loan)</option>
                              <option value="PMSURYA">PMSURYA (PM Surya Ghar)</option>
                            </select>
                          </td>
                          <td className="px-4 py-2 text-center">
                            <button onClick={() => removeMapping(i)} className="p-1.5 text-red-400 hover:bg-red-50 rounded">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                  <button onClick={addMapping} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium">
                    <Plus className="w-4 h-4" /> Add Row
                  </button>
                  <button onClick={saveMappings} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: "#4e1a74" }}>
                    Save Mappings
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Section 2: Historical Data */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-800">2. Historical Base Data</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Upload existing CSV files for each loan category. These serve as the base for assigning next serial numbers.
                This is a one-time operation — re-uploading will replace all records for that category.
              </p>
            </div>
            <div className="p-5 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {CATEGORY_ORDER.map(cat => {
                const cfg = CATEGORY_CONFIG[cat];
                const catAccounts = accounts.filter(a => a.category === cat);
                const maxSerial = catAccounts.length > 0
                  ? `${cfg.prefix}${String(getMaxSerial(catAccounts, cfg.prefix)).padStart(cfg.padCount, "0")}`
                  : "None";
                return (
                  <div key={cat} className={`rounded-xl border-t-4 p-5 flex flex-col items-center text-center ${cfg.borderClass} bg-gray-50`}>
                    <FileText className={`w-8 h-8 mb-3 ${cfg.textClass}`} />
                    <h4 className="font-semibold text-gray-800 text-sm mb-1">{cfg.label}</h4>
                    {catAccounts.length > 0 ? (
                      <div className="text-xs text-green-600 font-medium mb-1">
                        {catAccounts.length} records loaded<br />
                        <span className="text-gray-500">Max: {maxSerial}</span>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400 mb-1">No records loaded</div>
                    )}
                    <label className={`mt-3 w-full cursor-pointer py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${cfg.bgClass} ${cfg.textClass} ${cfg.borderClass} hover:opacity-80`}>
                      <Upload className="w-3.5 h-3.5 inline mr-1" />
                      Upload CSV
                      <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        ref={el => { historyRefs.current[cat] = el; }}
                        onChange={e => handleHistoricalUpload(e, cat)}
                      />
                    </label>
                    {catAccounts.length > 0 && (
                      <button
                        onClick={() => { setShowResetDialog(cat); setResetConfirmText(""); }}
                        className="mt-2 w-full py-1.5 px-3 rounded-lg text-xs font-medium border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors flex items-center justify-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Clear {cfg.prefix} Data
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Reset & Re-initialise */}
          <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-red-100 bg-red-50 flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
              <div>
                <h3 className="font-bold text-red-800">3. Reset &amp; Re-initialise</h3>
                <p className="text-xs text-red-600 mt-0.5">
                  Use this if the initial setup had errors or you need to start fresh. This action is irreversible.
                </p>
              </div>
            </div>
            <div className="p-5">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 rounded-lg border border-red-200 p-4 bg-red-50">
                  <h4 className="text-sm font-semibold text-red-800 mb-1">Full Reset</h4>
                  <p className="text-xs text-red-600 mb-3">Clears all accounts across all categories, product mappings, and sync history. You will need to re-upload everything from scratch.</p>
                  <button
                    onClick={() => { setShowResetDialog("full"); setResetConfirmText(""); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" /> Reset Everything
                  </button>
                </div>
                <div className="flex-1 rounded-lg border border-amber-200 p-4 bg-amber-50">
                  <h4 className="text-sm font-semibold text-amber-800 mb-1">Clear Individual Category</h4>
                  <p className="text-xs text-amber-700 mb-3">Use the <strong>"Clear [PREFIX] Data"</strong> button on each category card above to reset just that category while keeping others intact.</p>
                  <button
                    onClick={() => setIsMappingsCollapsed(false)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-amber-800 bg-amber-100 border border-amber-300 hover:bg-amber-200 transition-colors"
                  >
                    <ChevronUp className="w-4 h-4" /> View Category Cards Above
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── RESET CONFIRMATION DIALOG ─────────────────────────────────────────── */}
      {showResetDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-red-200 w-full max-w-md mx-4 overflow-hidden">
            <div className="p-5 bg-red-50 border-b border-red-200 flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 text-red-600 shrink-0" />
              <div>
                <h3 className="font-bold text-red-800">
                  {showResetDialog === "full"
                    ? "Full Reset — Clear All Data"
                    : `Clear ${CATEGORY_CONFIG[showResetDialog as CategoryCode].label}`}
                </h3>
                <p className="text-xs text-red-600 mt-0.5">This action cannot be undone.</p>
              </div>
              <button onClick={() => { setShowResetDialog(null); setResetConfirmText(""); }} className="ml-auto p-1 text-red-400 hover:text-red-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-700 mb-1">
                {showResetDialog === "full"
                  ? `This will permanently delete all ${accounts.length} account records, all product mappings, and the entire sync history.`
                  : `This will permanently delete ${accounts.filter(a => a.category === showResetDialog).length} records in the ${CATEGORY_CONFIG[showResetDialog as CategoryCode].prefix} series.`}
              </p>
              <p className="text-sm text-gray-500 mb-4">You will need to re-upload the data to restore it.</p>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Type <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-red-700">RESET</span> to confirm:</label>
              <input
                type="text"
                value={resetConfirmText}
                onChange={e => setResetConfirmText(e.target.value)}
                placeholder="Type RESET here"
                className="w-full px-3 py-2.5 border-2 rounded-lg text-sm font-mono focus:outline-none transition-colors"
                style={{ borderColor: resetConfirmText === "RESET" ? "#dc2626" : "#e5e7eb" }}
                autoFocus
              />
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => { setShowResetDialog(null); setResetConfirmText(""); }}
                  className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReset(showResetDialog as "full" | CategoryCode)}
                  disabled={resetConfirmText !== "RESET"}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  {showResetDialog === "full" ? "Reset Everything" : `Clear ${CATEGORY_CONFIG[showResetDialog as CategoryCode].prefix} Data`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Option D: Review New Accounts Dialog ── */}
      {showReviewDialog && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Review New Accounts Before Serial Assignment</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {reviewCandidates.length} new account{reviewCandidates.length !== 1 ? "s" : ""} detected.
                  {reviewCandidates.filter(c => c.isWrittenOff).length > 0 && (
                    <span className="ml-2 text-amber-600 font-medium">
                      ⚠ {reviewCandidates.filter(c => c.isWrittenOff).length} written-off account{reviewCandidates.filter(c => c.isWrittenOff).length !== 1 ? "s" : ""} pre-flagged for exclusion.
                    </span>
                  )}
                </p>
              </div>
              <button onClick={() => { setShowReviewDialog(false); setReviewCandidates([]); setPendingSyncData(null); }} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                ✕
              </button>
            </div>

            {/* Legend */}
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-500 inline-block"></span> Include — will receive serial number</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-400 inline-block"></span> Exclude — will be permanently skipped on future syncs</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-400 inline-block"></span> Written-off signal detected (pre-excluded)</span>
            </div>

            {/* Bulk actions */}
            <div className="px-5 py-2 border-b border-gray-100 flex gap-2">
              <button
                onClick={() => setReviewCandidates(prev => prev.map(c => ({ ...c, include: true })))}
                className="text-xs px-3 py-1 rounded-md bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 font-medium"
              >Include All</button>
              <button
                onClick={() => setReviewCandidates(prev => prev.map(c => ({ ...c, include: false })))}
                className="text-xs px-3 py-1 rounded-md bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 font-medium"
              >Exclude All</button>
              <button
                onClick={() => setReviewCandidates(prev => prev.map(c => ({ ...c, include: !c.isWrittenOff })))}
                className="text-xs px-3 py-1 rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 font-medium"
              >Reset to Auto-detect</button>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium w-16">Include</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Account No.</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Customer Name</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Product</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Category</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Signals</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewCandidates.map((c, idx) => (
                    <tr
                      key={c.accountNo}
                      className={`border-b border-gray-100 ${
                        c.isWrittenOff ? "bg-amber-50" : c.include ? "bg-green-50/30" : "bg-red-50/30"
                      }`}
                    >
                      <td className="py-2 px-3">
                        <input
                          type="checkbox"
                          checked={c.include}
                          onChange={e => {
                            const val = e.target.checked;
                            setReviewCandidates(prev => prev.map((x, i) => i === idx ? { ...x, include: val } : x));
                          }}
                          className="w-4 h-4 accent-green-600"
                        />
                      </td>
                      <td className="py-2 px-3 font-mono text-xs text-gray-700">{c.accountNo}</td>
                      <td className="py-2 px-3">
                        <div className="font-medium text-gray-800 text-xs">{c.customerName || "—"}</div>
                        <div className="text-gray-400 text-xs">CIF: {c.cifNo || "—"}</div>
                      </td>
                      <td className="py-2 px-3 text-xs text-gray-600">{c.accountDesc}</td>
                      <td className="py-2 px-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          CATEGORY_CONFIG[c.category]?.badgeClass || "bg-gray-100 text-gray-700"
                        }`}>{CATEGORY_CONFIG[c.category]?.prefix}</span>
                      </td>
                      <td className="py-2 px-3">
                        {c.isWrittenOff ? (
                          <div className="flex flex-wrap gap-1">
                            {c.writeOffFlag && <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded">Flag: {c.writeOffFlag}</span>}
                            {c.writeOffAmount > 0 && <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded">W/O Amt: ₹{c.writeOffAmount.toLocaleString("en-IN")}</span>}
                            {c.writeOffDate && <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded">W/O Date: {c.writeOffDate}</span>}
                            {c.newirac === "08" && <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded">IRAC: Loss</span>}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">None</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-gray-200 flex items-center justify-between bg-gray-50 rounded-b-2xl">
              <div className="text-sm text-gray-600">
                <span className="text-green-700 font-semibold">{reviewCandidates.filter(c => c.include).length} will be assigned serial numbers</span>
                <span className="mx-2 text-gray-300">|</span>
                <span className="text-red-600 font-semibold">{reviewCandidates.filter(c => !c.include).length} will be permanently excluded</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowReviewDialog(false); setReviewCandidates([]); setPendingSyncData(null); }}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-100"
                >Cancel Sync</button>
                <button
                  onClick={handleConfirmReview}
                  className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow"
                >Confirm & Assign Serials</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Option D: Exclusion List Panel ── */}
      {showExclusionList && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Permanently Excluded Accounts</h2>
                <p className="text-sm text-gray-500 mt-0.5">These accounts will never appear in the review dialog or receive serial numbers.</p>
              </div>
              <button onClick={() => setShowExclusionList(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {exclusions.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No excluded accounts yet.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-2 px-3 text-gray-500 font-medium">Account No.</th>
                      <th className="text-left py-2 px-3 text-gray-500 font-medium">Customer</th>
                      <th className="text-left py-2 px-3 text-gray-500 font-medium">Category</th>
                      <th className="text-left py-2 px-3 text-gray-500 font-medium">Reason</th>
                      <th className="text-left py-2 px-3 text-gray-500 font-medium">Excluded On</th>
                      <th className="text-left py-2 px-3 text-gray-500 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exclusions.map(e => (
                      <tr key={e.accountNo} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-3 font-mono text-xs text-gray-700">{e.accountNo}</td>
                        <td className="py-2 px-3">
                          <div className="text-xs font-medium text-gray-800">{e.customerName || "—"}</div>
                          <div className="text-xs text-gray-400">CIF: {e.cifNo || "—"}</div>
                        </td>
                        <td className="py-2 px-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            CATEGORY_CONFIG[e.category]?.badgeClass || "bg-gray-100 text-gray-700"
                          }`}>{CATEGORY_CONFIG[e.category]?.prefix}</span>
                        </td>
                        <td className="py-2 px-3">
                          <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">{e.reason}</span>
                        </td>
                        <td className="py-2 px-3 text-xs text-gray-500">{e.excludedOn}</td>
                        <td className="py-2 px-3">
                          <button
                            onClick={() => handleRemoveExclusion(e.accountNo)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                            title="Restore to register — account will appear in the Review dialog on the next sync and can be assigned a serial number"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Restore
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 text-xs text-gray-400 bg-gray-50 rounded-b-2xl">
              Clicking <strong>Restore</strong> removes the account from this exclusion list. It will appear in the Review dialog on the next sync, where you can choose to assign it a serial number.
            </div>
          </div>
        </div>
      )}

      {/* ── Front Page Print Modals (category-aware) ── */}
      {printRecord && selectedCategory === "PERLOAN" && (
        <XpressCreditFrontPage
          record={printRecord}
          onClose={() => setPrintRecord(null)}
        />
      )}
      {printRecord && selectedCategory === "GOLDLON" && (
        <GoldLoanFrontPage
          record={printRecord}
          onClose={() => setPrintRecord(null)}
        />
      )}
      {printRecord && selectedCategory === "PENLOAN" && (
        <PensionLoanFrontPage
          record={printRecord}
          onClose={() => setPrintRecord(null)}
        />
      )}
      {printRecord && selectedCategory === "PMSURYA" && (
        <PMSuryaGharFrontPage
          record={printRecord}
          onClose={() => setPrintRecord(null)}
        />
      )}
    </div>
  );
}
