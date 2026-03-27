/**
 * NPA Tracking — Advanced NPA Warning System
 *
 * Design: Clean data-table dashboard with risk-colour coding.
 * Reads directly from LOAN_DATA and CCOD_DATA stores (already populated
 * by Branch Portfolio Dashboard Data Upload) — no separate file upload needed.
 *
 * DPD Calculation (RBI IRAC Norms):
 *  Term Loans  → oldest unpaid EMI due date, derived from Sanction Date anniversary
 *  CC/OD       → irregularity date (IRRGDT) or balance-vs-DP heuristic
 *  Hard lock   → NEWIRAC ≥ 03 → dpd = max(dpd, 90)
 */

import { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle, AlertCircle, Clock, Filter, Download,
  Activity, ShieldAlert, ArrowUpDown, RefreshCw, Info
} from "lucide-react";
import { getAllRecords, STORES } from "@/lib/portfolioDb";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawLoanRecord {
  LoanKey: string;
  CIF?: string;
  CUSTNAME?: string;
  ACCTDESC?: string;
  OUTSTAND?: number;
  LIMIT?: number;
  IRREGAMT?: number;
  EMISOvrdue?: number;
  Shadow_EMI_Overdue?: number;
  IRRGDT?: string | null;
  SANCTDT?: string | null;
  NEWIRAC?: string;
  SMA_CLASS?: string;
  // RBI IRAC Computed Fields (from portfolioTransform)
  Computed_SMA_Class?: string;
  Computed_NPA_SubCategory?: string;
  Computed_Is_NPA?: boolean;
  Computed_DPD?: number;
  Computed_NPA_Exempt?: boolean;
  Computed_NPA_Exempt_Reason?: string;
  Exposure_Type?: string;
  Loan_Category?: string;
  Loan_SubCategory?: string;
}

interface RawCCODRecord {
  LoanKey: string;
  CIF?: string;
  CUSTNAME?: string;
  ACCTDESC?: string;
  CurrentBalance?: number;
  LIMIT?: number;
  DP?: number;
  IRREGAMT?: number;
  IRRGDT?: string | null;
  NEWIRAC?: string;
  SMA_CLASS?: string;
  // RBI IRAC Computed Fields (from portfolioTransform)
  Computed_SMA_Class?: string;
  Computed_NPA_SubCategory?: string;
  Computed_Is_NPA?: boolean;
  Computed_DPD?: number;
  Computed_NPA_Exempt?: boolean;
  Computed_NPA_Exempt_Reason?: string;
  Exposure_Type?: string;
  Loan_Category?: string;
  Loan_SubCategory?: string;
}

type RiskCategory = "NPA" | "7_DAYS" | "15_DAYS" | "30_DAYS" | "SAFE";
type SortField = "dpd" | "account" | "limit";

interface TrackedAccount {
  id: string;
  cif: string;
  name: string;
  acctDesc: string;
  facType: "LOAN" | "CCOD";
  balance: number;
  limit: number;
  irregAmt: number;
  emiOverdue: number;
  irregDate: string | null;
  sancDate: string | null;
  irac: string;
  smaClass: string;       // Computed RBI SMA class (SMA-0, SMA-1, SMA-2, NPA, STD)
  npaSubCategory: string; // Substandard / Doubtful-1 (D1) / D2 / D3 / Loss
  npaExempt: boolean;     // True if exempt from NPA classification
  exemptReason: string;   // Reason for exemption
  category: string;
  subCategory: string;
  // Computed
  dpd: number;
  daysToNPA: number;
  riskCategory: RiskCategory;
  reason: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Parse a date string in DD/MM/YYYY or YYYY-MM-DD format.
 * Returns null for invalid or sentinel dates.
 */
function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr || dateStr === "00/00/0000" || dateStr === "99/99/9999") return null;
  // DD/MM/YYYY
  const ddmm = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmm) {
    const d = new Date(parseInt(ddmm[3]), parseInt(ddmm[2]) - 1, parseInt(ddmm[1]));
    return isNaN(d.getTime()) ? null : d;
  }
  // YYYY-MM-DD (ISO)
  const iso = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const d = new Date(parseInt(iso[1]), parseInt(iso[2]) - 1, parseInt(iso[3]));
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86_400_000));
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);

// ─── DPD Calculator ──────────────────────────────────────────────────────────

function calculateDPD(
  facType: "LOAN" | "CCOD",
  emiOverdue: number,
  irregDate: string | null,
  sancDate: string | null,
  irac: string,
  smaClass: string,
  balance: number,
  limit: number,
  today: Date
): { dpd: number; reason: string } {
  let dpd = 0;
  let reason = "Standard";

  const parsedIrregDate = parseDate(irregDate);
  const parsedSancDate = parseDate(sancDate);

  // ── Term Loan DPD ────────────────────────────────────────────────────────
  if (facType === "LOAN" && emiOverdue > 0) {
    if (parsedSancDate) {
      // EMI due day = anniversary of sanction date each month
      const dueDay = parsedSancDate.getDate();

      // Find the most recent EMI due date on or before today
      let lastDueYear = today.getFullYear();
      let lastDueMonth = today.getMonth(); // 0-indexed

      // If today is before the due day this month, last due date was last month
      if (today.getDate() < dueDay) {
        lastDueMonth -= 1;
      }

      // Oldest unpaid EMI = go back (emiOverdue - 1) more months
      // Note: JS Date handles negative months correctly (year wraps automatically)
      const oldestDueMonth = lastDueMonth - (emiOverdue - 1);

      // Handle short months (e.g. sanctioned on 31st, Feb has 28 days)
      const tempDate = new Date(lastDueYear, oldestDueMonth + 1, 0); // last day of target month
      const actualDueDay = Math.min(dueDay, tempDate.getDate());

      // new Date with negative months auto-adjusts year correctly in JS
      const oldestDueDate = new Date(lastDueYear, oldestDueMonth, actualDueDay);

      dpd = daysBetween(oldestDueDate, today);
      reason = `${emiOverdue} EMI${emiOverdue > 1 ? "s" : ""} Overdue (Since ${oldestDueDate.toLocaleDateString("en-GB")})`;
    } else if (parsedIrregDate) {
      // Fallback: use irregularity date if sanction date unavailable
      dpd = daysBetween(parsedIrregDate, today);
      reason = `${emiOverdue} EMI${emiOverdue > 1 ? "s" : ""} Overdue (Irreg. since ${parsedIrregDate.toLocaleDateString("en-GB")})`;
    } else {
      // Last resort: approximate 30 days per overdue EMI
      dpd = emiOverdue * 30;
      reason = `${emiOverdue} EMI${emiOverdue > 1 ? "s" : ""} Overdue (Approx.)`;
    }
  }

  // ── CC/OD DPD ────────────────────────────────────────────────────────────
  else if (facType === "CCOD") {
    if (parsedIrregDate) {
      dpd = daysBetween(parsedIrregDate, today);
      reason = `Out of Order (Since ${parsedIrregDate.toLocaleDateString("en-GB")})`;
    } else if (balance > limit && limit > 0) {
      // No date available — use SMA class as anchor
      dpd = 15; // conservative starting point
      reason = "Balance exceeds DP/Limit";
      if (smaClass === "SMA-1") { dpd = 45; reason = "Balance exceeds DP/Limit (SMA-1)"; }
      if (smaClass === "SMA-2") { dpd = 75; reason = "Balance exceeds DP/Limit (SMA-2)"; }
    }
  }

  // ── SMA class fallback (no explicit dates, no EMI count) ─────────────────
  if (dpd === 0 && smaClass.includes("SMA")) {
    if (smaClass === "SMA-2") { dpd = 75; reason = `Classified as ${smaClass}`; }
    else if (smaClass === "SMA-1") { dpd = 45; reason = `Classified as ${smaClass}`; }
    else if (smaClass === "SMA-0") { dpd = 15; reason = `Classified as ${smaClass}`; }
  }

  // ── Hard NPA lock (RBI IRAC ≥ 03 = Substandard / Doubtful / Loss) ────────
  const iracNum = parseInt(irac || "0", 10);
  if (iracNum >= 3 || smaClass === "NPA") {
    dpd = Math.max(dpd, 90);
    if (reason === "Standard") reason = `IRAC ${irac} — Hard NPA Lock`;
  }

  return { dpd, reason };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function NPATracking() {
  const [loanRecords, setLoanRecords] = useState<RawLoanRecord[]>([]);
  const [ccodRecords, setCcodRecords] = useState<RawCCODRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<RiskCategory | "ALL">("ALL");
  const [sortBy, setSortBy] = useState<SortField>("dpd");
  const [sortAsc, setSortAsc] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // ── Load data from IndexedDB ────────────────────────────────────────────
  const loadData = async () => {
    setLoading(true);
    try {
      const [loans, ccod] = await Promise.all([
        getAllRecords(STORES.LOAN_DATA) as Promise<RawLoanRecord[]>,
        getAllRecords(STORES.CCOD_DATA) as Promise<RawCCODRecord[]>,
      ]);
      setLoanRecords(loans || []);
      setCcodRecords(ccod || []);
      setLastRefresh(new Date());
    } catch (e) {
      console.error("NPATracking: failed to load data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // ── Build tracked accounts with DPD ────────────────────────────────────
  const today = useMemo(() => new Date(), []);

  const accounts = useMemo<TrackedAccount[]>(() => {
    const result: TrackedAccount[] = [];

    // Term Loans
    loanRecords.forEach(r => {
      const emiOverdue = Math.max(
        r.EMISOvrdue ?? 0,
        r.Shadow_EMI_Overdue ?? 0
      );
      const balance = r.OUTSTAND ?? 0;
      const limit = r.LIMIT ?? 0;
      const irregAmt = r.IRREGAMT ?? 0;
      const irac = r.NEWIRAC ?? "";
      // Use pre-computed RBI IRAC class if available; otherwise fall back to legacy SMA_CLASS
      const computedSMAClass = r.Computed_SMA_Class ?? r.SMA_CLASS ?? "STD";
      const npaSubCategory = r.Computed_NPA_SubCategory ?? "";

      const { dpd, reason } = calculateDPD(
        "LOAN",
        emiOverdue,
        r.IRRGDT ?? null,
        r.SANCTDT ?? null,
        irac,
        computedSMAClass,
        balance,
        limit,
        today
      );

      // Use pre-computed DPD if available and more accurate
      const effectiveDPD = (r.Computed_DPD != null && r.Computed_DPD > 0) ? Math.max(dpd, r.Computed_DPD) : dpd;
      const npaExempt = r.Computed_NPA_Exempt === true;
      const exemptReason = r.Computed_NPA_Exempt_Reason ?? "";

      // Exclude NPA-exempt accounts (Staff Loans) from NPA Tracking
      if (npaExempt) return;

      if (effectiveDPD <= 0) return; // Only stressed accounts

      const daysToNPA = Math.max(0, 90 - effectiveDPD);
      let riskCategory: RiskCategory = "SAFE";
      if (daysToNPA === 0) riskCategory = "NPA";
      else if (daysToNPA <= 7) riskCategory = "7_DAYS";
      else if (daysToNPA <= 15) riskCategory = "15_DAYS";
      else if (daysToNPA <= 30) riskCategory = "30_DAYS";

      result.push({
        id: r.LoanKey,
        cif: r.CIF ?? "",
        name: r.CUSTNAME ?? "Unknown",
        acctDesc: r.ACCTDESC ?? "",
        facType: "LOAN",
        balance,
        limit,
        irregAmt,
        emiOverdue,
        irregDate: r.IRRGDT ?? null,
        sancDate: r.SANCTDT ?? null,
        irac,
        smaClass: computedSMAClass,
        npaSubCategory,
        npaExempt,
        exemptReason,
        category: r.Loan_Category ?? "",
        subCategory: r.Loan_SubCategory ?? "",
        dpd: effectiveDPD,
        daysToNPA,
        riskCategory,
        reason,
      });
    });

    // CC/OD Accounts
    ccodRecords.forEach(r => {
      const balance = r.CurrentBalance ?? 0;
      const limit = r.LIMIT ?? 0;
      const dp = r.DP ?? limit; // Drawing Power; fallback to limit
      const irregAmt = r.IRREGAMT ?? 0;
      const irac = r.NEWIRAC ?? "";
      // Use pre-computed RBI IRAC class if available; otherwise fall back to legacy SMA_CLASS
      const computedSMAClass = r.Computed_SMA_Class ?? r.SMA_CLASS ?? "STD";
      const npaSubCategory = r.Computed_NPA_SubCategory ?? "";

      const { dpd, reason } = calculateDPD(
        "CCOD",
        0, // CC/OD has no EMI concept
        r.IRRGDT ?? null,
        null, // no sanction date for CC/OD
        irac,
        computedSMAClass,
        balance,
        dp, // use Drawing Power for out-of-order check
        today
      );

      // Use pre-computed DPD if available and more accurate
      const effectiveDPD = (r.Computed_DPD != null && r.Computed_DPD > 0) ? Math.max(dpd, r.Computed_DPD) : dpd;
      const npaExempt = r.Computed_NPA_Exempt === true;
      const exemptReason = r.Computed_NPA_Exempt_Reason ?? "";

      // Exclude NPA-exempt accounts (OD against Deposits, Staff OD) from NPA Tracking
      if (npaExempt) return;

      if (effectiveDPD <= 0) return;

      const daysToNPA = Math.max(0, 90 - effectiveDPD);
      let riskCategory: RiskCategory = "SAFE";
      if (daysToNPA === 0) riskCategory = "NPA";
      else if (daysToNPA <= 7) riskCategory = "7_DAYS";
      else if (daysToNPA <= 15) riskCategory = "15_DAYS";
      else if (daysToNPA <= 30) riskCategory = "30_DAYS";

      result.push({
        id: r.LoanKey,
        cif: r.CIF ?? "",
        name: r.CUSTNAME ?? "Unknown",
        acctDesc: r.ACCTDESC ?? "",
        facType: "CCOD",
        balance,
        limit,
        irregAmt,
        emiOverdue: 0,
        irregDate: r.IRRGDT ?? null,
        sancDate: null,
        irac,
        smaClass: computedSMAClass,
        npaSubCategory,
        npaExempt,
        exemptReason,
        category: r.Loan_Category ?? "",
        subCategory: r.Loan_SubCategory ?? "",
        dpd: effectiveDPD,
        daysToNPA,
        riskCategory,
        reason,
      });
    });

    return result;
  }, [loanRecords, ccodRecords, today]);

  // ── Stats ───────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: accounts.length,
    risk7: accounts.filter(a => a.riskCategory === "7_DAYS").length,
    risk15: accounts.filter(a => a.riskCategory === "15_DAYS").length,
    risk30: accounts.filter(a => a.riskCategory === "30_DAYS").length,
    npa: accounts.filter(a => a.riskCategory === "NPA").length,
    totalExposure: accounts.reduce((s, a) => s + a.balance, 0),
  }), [accounts]);

  // ── Filtered + sorted list ──────────────────────────────────────────────
  const filteredAccounts = useMemo(() => {
    let result = filter === "ALL" ? [...accounts] : accounts.filter(a => a.riskCategory === filter);
    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "account") cmp = a.id.localeCompare(b.id);
      else if (sortBy === "limit") cmp = b.limit - a.limit;
      else cmp = b.dpd - a.dpd; // default: dpd desc
      return sortAsc ? -cmp : cmp;
    });
    return result;
  }, [accounts, filter, sortBy, sortAsc]);

  const toggleSort = (field: SortField) => {
    if (sortBy === field) setSortAsc(v => !v);
    else { setSortBy(field); setSortAsc(field === "account"); }
  };

  // ── CSV Export ──────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ["Account No", "CIF", "Customer Name", "Product", "Category", "Sub-Category",
      "Type", "Balance (₹)", "Limit (₹)", "Irregular Amt (₹)", "EMIs Overdue",
      "IRAC", "SMA Class", "Calculated DPD", "Days to NPA", "Risk Category", "Stress Reason"];
    const rows = filteredAccounts.map(a => [
      a.id, a.cif, `"${a.name}"`, `"${a.acctDesc}"`, a.category, a.subCategory,
      a.facType, a.balance, a.limit, a.irregAmt, a.emiOverdue,
      a.irac, a.smaClass, a.dpd, a.daysToNPA === 0 ? "NPA" : a.daysToNPA,
      a.riskCategory.replace("_", " "), `"${a.reason}"`
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `NPA_Tracking_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // ── Render helpers ──────────────────────────────────────────────────────
  const getRiskBg = (cat: RiskCategory | "ALL") => {
    if (cat === "NPA") return "bg-slate-800 text-white border-slate-900";
    if (cat === "7_DAYS") return "bg-red-100 text-red-800 border-red-200";
    if (cat === "15_DAYS") return "bg-orange-100 text-orange-800 border-orange-200";
    if (cat === "30_DAYS") return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-green-100 text-green-800 border-green-200";
  };

  const getRiskIcon = (cat: RiskCategory) => {
    if (cat === "NPA") return <ShieldAlert className="w-3.5 h-3.5 mr-1" />;
    if (cat === "7_DAYS") return <AlertTriangle className="w-3.5 h-3.5 mr-1" />;
    if (cat === "15_DAYS") return <AlertCircle className="w-3.5 h-3.5 mr-1" />;
    if (cat === "30_DAYS") return <Clock className="w-3.5 h-3.5 mr-1" />;
    return null;
  };

  const progressWidth = (daysToNPA: number) =>
    daysToNPA === 0 ? 100 : Math.min(100, Math.max(0, 100 - (daysToNPA / 90) * 100));

  const progressColor = (daysToNPA: number) =>
    daysToNPA === 0 ? "bg-slate-800" : daysToNPA <= 7 ? "bg-red-500" : daysToNPA <= 15 ? "bg-orange-500" : "bg-yellow-500";

  const noData = loanRecords.length === 0 && ccodRecords.length === 0;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-5 bg-slate-50 min-h-full">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-700" />
            NPA Warning System
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            RBI-aligned DPD calculation for stressed accounts · Data from Branch Portfolio uploads
            {lastRefresh && (
              <span className="ml-2 text-slate-400">· Last refreshed {lastRefresh.toLocaleTimeString("en-IN")}</span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 bg-white"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Data
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center items-center h-48">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-700" />
            <p className="text-slate-500 text-sm animate-pulse">Loading loan data...</p>
          </div>
        </div>
      )}

      {/* No data state */}
      {!loading && noData && (
        <div className="max-w-xl mx-auto mt-12 text-center p-10 bg-white rounded-2xl shadow-sm border border-slate-200">
          <Info className="w-14 h-14 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">No Loan Data Available</h3>
          <p className="text-slate-500 mt-2 text-sm">
            Upload your Loan Balance File and CC/OD Balance File via the{" "}
            <span className="font-medium text-blue-700">Data Upload</span> tab first.
            This module reads directly from that data — no separate upload needed.
          </p>
        </div>
      )}

      {/* Main dashboard */}
      {!loading && !noData && (
        <div className="space-y-5">

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Total */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col">
              <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Monitored</span>
              <span className="text-2xl font-bold text-slate-800 mt-1">{stats.total}</span>
              <span className="text-xs text-slate-400 mt-0.5">stressed a/c</span>
            </div>

            {/* Critical 7 days */}
            <div
              onClick={() => setFilter(filter === "7_DAYS" ? "ALL" : "7_DAYS")}
              className={`rounded-xl border shadow-sm p-4 flex flex-col cursor-pointer transition select-none
                ${filter === "7_DAYS" ? "bg-red-50 border-red-400 ring-2 ring-red-200" : "bg-white border-red-100 hover:border-red-300"}`}
            >
              <span className="text-red-700 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Critical
              </span>
              <span className="text-3xl font-black text-slate-800 mt-1">{stats.risk7}</span>
              <span className="text-xs text-slate-400 mt-0.5">≤ 7 days</span>
            </div>

            {/* High 15 days */}
            <div
              onClick={() => setFilter(filter === "15_DAYS" ? "ALL" : "15_DAYS")}
              className={`rounded-xl border shadow-sm p-4 flex flex-col cursor-pointer transition select-none
                ${filter === "15_DAYS" ? "bg-orange-50 border-orange-400 ring-2 ring-orange-200" : "bg-white border-orange-100 hover:border-orange-300"}`}
            >
              <span className="text-orange-700 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> High Risk
              </span>
              <span className="text-3xl font-black text-slate-800 mt-1">{stats.risk15}</span>
              <span className="text-xs text-slate-400 mt-0.5">8–15 days</span>
            </div>

            {/* Medium 30 days */}
            <div
              onClick={() => setFilter(filter === "30_DAYS" ? "ALL" : "30_DAYS")}
              className={`rounded-xl border shadow-sm p-4 flex flex-col cursor-pointer transition select-none
                ${filter === "30_DAYS" ? "bg-yellow-50 border-yellow-400 ring-2 ring-yellow-200" : "bg-white border-yellow-100 hover:border-yellow-300"}`}
            >
              <span className="text-yellow-700 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3 h-3" /> Medium
              </span>
              <span className="text-3xl font-black text-slate-800 mt-1">{stats.risk30}</span>
              <span className="text-xs text-slate-400 mt-0.5">16–30 days</span>
            </div>

            {/* Slipped to NPA */}
            <div
              onClick={() => setFilter(filter === "NPA" ? "ALL" : "NPA")}
              className={`rounded-xl border shadow-sm p-4 flex flex-col cursor-pointer transition select-none
                ${filter === "NPA" ? "bg-slate-100 border-slate-400 ring-2 ring-slate-200" : "bg-white border-slate-200 hover:border-slate-400"}`}
            >
              <span className="text-slate-700 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> Slipped NPA
              </span>
              <span className="text-3xl font-black text-slate-800 mt-1">{stats.npa}</span>
              <span className="text-xs text-slate-400 mt-0.5">DPD ≥ 90</span>
            </div>

            {/* Total Exposure */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col">
              <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Total Exposure</span>
              <span className="text-lg font-bold text-slate-800 mt-1 leading-tight">
                {formatCurrency(stats.totalExposure)}
              </span>
              <span className="text-xs text-slate-400 mt-0.5">stressed a/c</span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Table header bar */}
            <div className="p-3 border-b border-slate-200 flex flex-wrap justify-between items-center gap-2 bg-slate-50/60">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-700">
                <Filter className="w-4 h-4 text-slate-400" />
                {filter === "ALL" ? "All Stressed Accounts" : `Filtered: ${filter.replace("_", " ")}`}
                <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-bold ml-1">
                  {filteredAccounts.length}
                </span>
                {filter !== "ALL" && (
                  <button
                    onClick={() => setFilter("ALL")}
                    className="text-xs text-slate-400 hover:text-slate-700 ml-1 underline"
                  >
                    Clear filter
                  </button>
                )}
              </h3>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-xs text-slate-600">
                  <span className="font-medium mr-1">Sort:</span>
                  {(["dpd", "account", "limit"] as SortField[]).map(f => (
                    <button
                      key={f}
                      onClick={() => toggleSort(f)}
                      className={`flex items-center gap-0.5 px-2 py-1 rounded hover:bg-slate-200 transition capitalize
                        ${sortBy === f ? "bg-slate-200 font-semibold" : ""}`}
                    >
                      {f === "dpd" ? "DPD" : f === "account" ? "Account" : "Limit"}
                      {sortBy === f && <ArrowUpDown className="w-3 h-3" />}
                    </button>
                  ))}
                </div>
                <Button variant="outline" size="sm" onClick={exportCSV} className="text-xs h-7 px-2 bg-white">
                  <Download className="w-3.5 h-3.5 mr-1" /> Export
                </Button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="p-3 cursor-pointer hover:bg-slate-100" onClick={() => toggleSort("account")}>
                      <div className="flex items-center gap-1">Account Details {sortBy === "account" && <ArrowUpDown className="w-3 h-3" />}</div>
                    </th>
                    <th className="p-3 cursor-pointer hover:bg-slate-100" onClick={() => toggleSort("limit")}>
                      <div className="flex items-center gap-1">Facility & Balance {sortBy === "limit" && <ArrowUpDown className="w-3 h-3" />}</div>
                    </th>
                    <th className="p-3">Stress Driver</th>
                    <th className="p-3 text-center cursor-pointer hover:bg-slate-100" onClick={() => toggleSort("dpd")}>
                      <div className="flex items-center justify-center gap-1">DPD {sortBy === "dpd" && <ArrowUpDown className="w-3 h-3" />}</div>
                    </th>
                    <th className="p-3">Days to NPA</th>
                    <th className="p-3">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 text-sm">
                        No accounts in this risk category.
                      </td>
                    </tr>
                  ) : (
                    filteredAccounts.map((acc, i) => (
                      <tr key={`${acc.id}-${i}`} className="hover:bg-blue-50/30 transition">

                        {/* Account Details */}
                        <td className="p-3">
                          <div className="font-bold text-slate-900 text-xs">{acc.id}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[180px] mt-0.5">{acc.name}</div>
                          {acc.acctDesc && (
                            <div className="text-[10px] text-slate-400 truncate max-w-[180px]">{acc.acctDesc}</div>
                          )}
                        </td>

                        {/* Facility & Balance */}
                        <td className="p-3">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider mb-1
                            ${acc.facType === "CCOD"
                              ? "bg-purple-100 text-purple-700 border border-purple-200"
                              : "bg-indigo-100 text-indigo-700 border border-indigo-200"}`}>
                            {acc.facType === "CCOD" ? "CC / OD" : "TERM LOAN"}
                          </span>
                          <div className="text-[11px]">
                            Bal: <span className="font-bold text-slate-800">{formatCurrency(acc.balance)}</span>
                          </div>
                          {acc.limit > 0 && (
                            <div className="text-[11px] text-slate-500">
                              Lmt: {formatCurrency(acc.limit)}
                            </div>
                          )}
                        </td>

                        {/* Stress Driver */}
                        <td className="p-3">
                          <div className="font-medium text-slate-700 text-[11px] mb-1 max-w-[220px] whitespace-normal leading-snug">
                            {acc.reason}
                          </div>
                          <div className="flex flex-wrap gap-1.5 text-[10px]">
                            {acc.irregAmt > 0 && (
                              <span className="text-red-600 font-semibold">
                                Irrg: {formatCurrency(acc.irregAmt)}
                              </span>
                            )}
                            {acc.irregDate && (
                              <span className="text-slate-400">Date: {acc.irregDate}</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                              acc.smaClass === "SMA-2" ? "bg-red-100 text-red-700 border-red-300"
                              : acc.smaClass === "SMA-1" ? "bg-orange-100 text-orange-700 border-orange-300"
                              : acc.smaClass === "SMA-0" ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                              : acc.smaClass === "NPA" ? "bg-slate-800 text-white border-slate-900"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}>
                              {acc.smaClass || "STD"}
                            </span>
                            {acc.npaSubCategory && (
                              <span className="inline-block px-1.5 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded text-[10px] font-semibold">
                                {acc.npaSubCategory}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* DPD Circle — RBI thresholds: SMA-0=1-30d, SMA-1=31-60d, SMA-2=61-90d, NPA>90d */}
                        <td className="p-3 text-center">
                          <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm border-2
                            ${acc.dpd >= 90 ? "bg-slate-800 text-white border-slate-900"
                              : acc.dpd >= 61 ? "bg-red-100 text-red-800 border-red-300"
                              : acc.dpd >= 31 ? "bg-orange-100 text-orange-800 border-orange-300"
                              : "bg-yellow-100 text-yellow-800 border-yellow-300"}`}>
                            {acc.dpd}
                          </div>
                        </td>

                        {/* Progress bar */}
                        <td className="p-3 min-w-[140px]">
                          <div className="flex justify-between items-end mb-1">
                            {acc.daysToNPA === 0 ? (
                              <span className="font-bold text-slate-800 text-xs">NPA Reached</span>
                            ) : (
                              <>
                                <span className="text-sm font-bold text-slate-800">{acc.daysToNPA}</span>
                                <span className="text-[10px] text-slate-400">days left</span>
                              </>
                            )}
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${progressColor(acc.daysToNPA)}`}
                              style={{ width: `${progressWidth(acc.daysToNPA)}%` }}
                            />
                          </div>
                        </td>

                        {/* Risk Badge */}
                        <td className="p-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-[11px] font-bold border shadow-sm ${getRiskBg(acc.riskCategory)}`}>
                            {getRiskIcon(acc.riskCategory)}
                            {acc.riskCategory === "7_DAYS" ? "Critical"
                              : acc.riskCategory === "15_DAYS" ? "High"
                              : acc.riskCategory === "30_DAYS" ? "Medium"
                              : acc.riskCategory === "NPA" ? "NPA"
                              : "Safe"}
                          </span>
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Methodology note */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700 space-y-1.5">
            <p className="font-semibold text-sm">RBI IRACP Norms — Classification Methodology</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              <div>
                <p className="font-semibold mb-1">SMA Classification (Para 31)</p>
                <p>• <span className="font-medium">SMA-0:</span> Overdue 1–30 days</p>
                <p>• <span className="font-medium">SMA-1:</span> Overdue 31–60 days</p>
                <p>• <span className="font-medium">SMA-2:</span> Overdue 61–90 days</p>
                <p>• <span className="font-medium">NPA:</span> Overdue &gt; 90 days</p>
              </div>
              <div>
                <p className="font-semibold mb-1">NPA Sub-Categories (Para 42)</p>
                <p>• <span className="font-medium">Substandard:</span> NPA ≤ 12 months (91–365 days)</p>
                <p>• <span className="font-medium">Doubtful-1 (D1):</span> NPA 12–24 months</p>
                <p>• <span className="font-medium">Doubtful-2 (D2):</span> NPA 24–36 months</p>
                <p>• <span className="font-medium">Doubtful-3 (D3):</span> NPA &gt; 36 months</p>
              </div>
              <div>
                <p className="font-semibold mb-1">Term Loan DPD Calculation</p>
                <p>Counted from oldest unpaid EMI due date (monthly anniversary of sanction date). Fallback: IRRGDT → 30 days × overdue EMIs.</p>
              </div>
              <div>
                <p className="font-semibold mb-1">CC/OD DPD Calculation</p>
                <p>Counted from IRRGDT (Out of Order date). Account is “out of order” when balance continuously exceeds DP/Limit or no credits for 90 days (Para 42).</p>
                <p className="mt-1"><span className="font-medium">Hard Lock:</span> IRAC ≥ 03 → DPD hard-locked at ≥ 90.</p>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
