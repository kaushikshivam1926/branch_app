import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Upload, FileText, FileSpreadsheet, Download, Trash2, Edit2, Plus, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useBranch } from "@/contexts/BranchContext";
import { openDB, IDBPDatabase } from "idb";

// ========== Types ==========
interface ACMRow {
  head: string;
  particular: string;
  monthAmount: number | null;
  prevTotal: number | null;
  asOnTotal: number | null;
}

interface ACMReport {
  reportId: string;
  reportDateISO: string;
  reportDateLabel: string;
  importedAt: string;
  includeTotals: boolean;
}

interface ChargeEntry {
  id: string;
  bgl: string;
  payDate: string;
  billNo: string;
  billDate: string;
  payee: string;
  purpose: string;
  amount: number;
  approver: string;
  createdAt: string;
}

interface BGLMaster {
  bglCode: string;
  head: string;
  subHead: string;
}

// ========== Utility Functions ==========
// Indian currency formatting (1,23,456.00)
const formatIndianCurrency = (amount: number | null): string => {
  if (amount === null || amount === undefined) return "0.00";
  const fixed = amount.toFixed(2);
  const [integer, decimal] = fixed.split(".");
  
  // Indian numbering: last 3 digits, then groups of 2
  const lastThree = integer.slice(-3);
  const otherDigits = integer.slice(0, -3);
  const formatted = otherDigits.length > 0
    ? otherDigits.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree
    : lastThree;
  
  return formatted + "." + decimal;
};

// ========== IndexedDB Setup ==========
const DB_NAME = "ChargesReturnDB";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("acmReports")) {
          db.createObjectStore("acmReports", { keyPath: "reportId" });
        }
        if (!db.objectStoreNames.contains("acmRows")) {
          const rowStore = db.createObjectStore("acmRows", { keyPath: ["reportId", "head"] });
          rowStore.createIndex("byReportId", "reportId");
        }
        if (!db.objectStoreNames.contains("chargeEntries")) {
          db.createObjectStore("chargeEntries", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("bglMaster")) {
          const bglStore = db.createObjectStore("bglMaster", { keyPath: "bglCode" });
          // Pre-populate with default BGL codes
          const defaultBGL: BGLMaster[] = [
            { bglCode: "21111", head: "Rent", subHead: "Rent for office building" },
            { bglCode: "21112", head: "Rent", subHead: "Rent for staff quarters" },
            { bglCode: "21121", head: "Telephone", subHead: "Telephone charges" },
            { bglCode: "21131", head: "Stationery", subHead: "Stationery & printing" },
            { bglCode: "21141", head: "Postage", subHead: "Postage & courier" },
            { bglCode: "21151", head: "Electricity", subHead: "Electricity charges" },
            { bglCode: "21161", head: "Water", subHead: "Water charges" },
            { bglCode: "21171", head: "Repairs", subHead: "Repairs & maintenance" },
            { bglCode: "21181", head: "Insurance", subHead: "Insurance premium" },
            { bglCode: "21191", head: "Miscellaneous", subHead: "Other expenses" },
          ];
          defaultBGL.forEach(item => bglStore.add(item));
        }
      },
    });
  }
  return dbPromise;
}

// ========== ACM Parsing Logic ==========
const MONTHS: Record<string, string> = {
  JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
  JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12"
};

function normalizeSpaces(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function parseMoneyToken(token: string | null): number | null {
  const t = String(token ?? "").trim();
  if (!t) return null;
  if (!/^-?[\d,]+(\.\d{1,2})?$/.test(t)) return null;
  const n = Number(t.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function extractReportDate(text: string): { iso: string; label: string } | null {
  const m = text.match(/AS\s+AT\s+([A-Z]{3})\s+(\d{1,2}),\s*(\d{4})/i);
  if (!m) return null;
  const mon = (m[1] || "").toUpperCase();
  const dd = String(m[2]).padStart(2, "0");
  const yyyy = m[3];
  const mm = MONTHS[mon];
  if (!mm) return null;
  return { iso: `${yyyy}-${mm}-${dd}`, label: `${mon.charAt(0)}${mon.slice(1).toLowerCase()} ${Number(dd)}, ${yyyy}` };
}

function isLikelyNoiseLine(line: string): boolean {
  const s = normalizeSpaces(line).toUpperCase();
  if (!s) return true;
  if (s.startsWith("ACM001")) return true;
  if (s.includes("MONTHLY ABSTRACT OF CHARGES")) return true;
  if (s.includes("STATE BANK OF INDIA")) return true;
  if (s.startsWith("BRANCH")) return true;
  if (s.includes("RUN DATE")) return true;
  if (s.includes("INDIAN RUPEE")) return true;
  if (s.startsWith("-----")) return true;
  if (s.startsWith("HEAD")) return true;
  if (s.includes("PARTICULAR OF ENCLOSURE")) return true;
  if (s.includes("REMARK")) return true;
  if (s.includes("I HEREBY CERTIFY")) return true;
  if (s.startsWith("NOTE")) return true;
  if (s.includes("END OF REPORT")) return false;
  return false;
}

function shouldIncludeHead(head: string, includeTotalsFlag: boolean): boolean {
  const u = normalizeSpaces(head).toUpperCase();
  if (includeTotalsFlag) return true;
  if (u.startsWith("TOTAL CHARGES")) return false;
  if (u.startsWith("BALANCE AS PER")) return false;
  if (u === "MISCELLANEOUS") return false;
  return true;
}

function extractHeadAndNumbersFromLine(line: string): { head: string; particular: string; monthAmount: number | null; prevTotal: number | null } | null {
  const raw = String(line || "");
  if (isLikelyNoiseLine(raw)) return null;
  
  // Fixed-width column extraction based on ACM format
  // HEAD: columns 0-42
  // PARTICULAR: columns 42-74
  // AMOUNT: columns 74-89
  // TOTAL TILL PREV MONTH: columns 89-104
  
  if (raw.length < 42) return null; // Line too short to have meaningful data
  
  const headRaw = raw.substring(0, 42).trim();
  const particularRaw = raw.length > 42 ? raw.substring(42, 74).trim() : "";
  const amountRaw = raw.length > 74 ? raw.substring(74, 89).trim() : "";
  const prevTotalRaw = raw.length > 89 ? raw.substring(89, 104).trim() : "";
  
  // Skip if HEAD is empty
  if (!headRaw) return null;
  
  // Skip if both amounts are empty
  const monthAmount = parseMoneyToken(amountRaw);
  const prevTotal = parseMoneyToken(prevTotalRaw);
  if (monthAmount === null && prevTotal === null) return null;
  
  return { 
    head: headRaw, 
    particular: particularRaw || "----",
    monthAmount, 
    prevTotal 
  };
}

function finalizeRow(r: { head: string; particular: string; monthAmount: number | null; prevTotal: number | null }): ACMRow {
  const month = (r.monthAmount == null ? 0 : r.monthAmount);
  const prev = (r.prevTotal == null ? 0 : r.prevTotal);
  return { head: r.head, particular: r.particular, monthAmount: r.monthAmount, prevTotal: r.prevTotal, asOnTotal: month + prev };
}

function parseAcmText(text: string, includeTotalsFlag: boolean): { reportDate: { iso: string; label: string }; rows: ACMRow[] } {
  const reportDate = extractReportDate(text) || { iso: "", label: "—" };
  const lines = String(text || "").split(/\r?\n/);
  const rows: ACMRow[] = [];
  
  for (const line of lines) {
    const r = extractHeadAndNumbersFromLine(line);
    if (!r) continue;
    if (!shouldIncludeHead(r.head, includeTotalsFlag)) continue;
    rows.push(finalizeRow(r));
  }
  
  // Deduplicate by head (keep last occurrence)
  const map = new Map<string, ACMRow>();
  for (const r of rows) map.set(r.head, r);
  const dedup = Array.from(map.values());
  
  // Separate total rows from data rows
  const totalRows: ACMRow[] = [];
  const dataRows: ACMRow[] = [];
  
  for (const row of dedup) {
    const u = row.head.toUpperCase();
    if (u.includes("TOTAL CHARGES FOR THE MONTH") || 
        u.includes("TOTAL CHARGES UPTO PREVIOUS MONTH") || 
        u.includes("BALANCE AS PER GENERAL LEDGER")) {
      totalRows.push(row);
    } else {
      dataRows.push(row);
    }
  }
  
  // Sort data rows by monthAmount descending (nulls last)
  dataRows.sort((a, b) => {
    const aAmt = a.monthAmount ?? -Infinity;
    const bAmt = b.monthAmount ?? -Infinity;
    return bAmt - aAmt;
  });
  
  // Sort total rows in specific order
  const totalOrder = [
    "TOTAL CHARGES FOR THE MONTH",
    "TOTAL CHARGES UPTO PREVIOUS MONTH",
    "BALANCE AS PER GENERAL LEDGER"
  ];
  totalRows.sort((a, b) => {
    const aIdx = totalOrder.findIndex(t => a.head.toUpperCase().includes(t));
    const bIdx = totalOrder.findIndex(t => b.head.toUpperCase().includes(t));
    return aIdx - bIdx;
  });
  
  // Combine: data rows first, then total rows
  const sorted = [...dataRows, ...totalRows];
  
  return { reportDate, rows: sorted };
}

// ========== Main Component ==========
export default function ChargesReturnApp() {
  const [, navigate] = useLocation();
  const { branchName } = useBranch();
  const [activeTab, setActiveTab] = useState<"extractor" | "entry" | "report">("extractor");
  
  // Shared ACM Extractor state (persists across tab switches)
  const [acmCurrentRows, setAcmCurrentRows] = useState<ACMRow[]>([]);
  const [acmReportLabel, setAcmReportLabel] = useState<string>("—");
  const [acmPreviewData, setAcmPreviewData] = useState<{ reportDate: { iso: string; label: string }; rows: ACMRow[] } | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                className="text-white hover:bg-white/20"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Charges Return</h1>
                <p className="text-sm text-purple-100">{branchName}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex gap-2 bg-white rounded-lg p-1 shadow-sm">
          <button
            onClick={() => setActiveTab("extractor")}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === "extractor"
                ? "bg-purple-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <FileText className="inline-block w-4 h-4 mr-2" />
            ACM Extractor
          </button>
          <button
            onClick={() => setActiveTab("entry")}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === "entry"
                ? "bg-purple-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Edit2 className="inline-block w-4 h-4 mr-2" />
            Charges Entry
          </button>
          <button
            onClick={() => setActiveTab("report")}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === "report"
                ? "bg-purple-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <FileSpreadsheet className="inline-block w-4 h-4 mr-2" />
            Charges Return Report
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="container mx-auto px-4 pb-8">
        {activeTab === "extractor" && (
          <ACMExtractorTab 
            currentRows={acmCurrentRows}
            setCurrentRows={setAcmCurrentRows}
            reportLabel={acmReportLabel}
            setReportLabel={setAcmReportLabel}
            previewData={acmPreviewData}
            setPreviewData={setAcmPreviewData}
          />
        )}
        {activeTab === "entry" && <ChargesEntryTab />}
        {activeTab === "report" && <ChargesReturnReportTab />}
      </div>
    </div>
  );
}

// ========== ACM Extractor Tab ==========
interface ACMExtractorTabProps {
  currentRows: ACMRow[];
  setCurrentRows: React.Dispatch<React.SetStateAction<ACMRow[]>>;
  reportLabel: string;
  setReportLabel: React.Dispatch<React.SetStateAction<string>>;
  previewData: { reportDate: { iso: string; label: string }; rows: ACMRow[] } | null;
  setPreviewData: React.Dispatch<React.SetStateAction<{ reportDate: { iso: string; label: string }; rows: ACMRow[] } | null>>;
}

function ACMExtractorTab({ currentRows, setCurrentRows, reportLabel, setReportLabel, previewData, setPreviewData }: ACMExtractorTabProps) {
  const [reports, setReports] = useState<ACMReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string>("");
  const [includeTotals, setIncludeTotals] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    const db = await getDB();
    const allReports = await db.getAll("acmReports");
    setReports(allReports.sort((a, b) => b.reportDateISO.localeCompare(a.reportDateISO)));
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseAcmText(text, includeTotals);
      setPreviewData(parsed);
      setCurrentRows(parsed.rows);
      setReportLabel(parsed.reportDate.label || "—");
      toast.success(`Parsed ${parsed.rows.length} rows. Click "Save Report" to store.`);
    } catch (error) {
      toast.error("Failed to parse file");
      console.error(error);
    }
  }

  async function handleSaveReport() {
    if (!previewData || !previewData.reportDate.iso) {
      toast.error("No valid report data to save");
      return;
    }

    try {
      const db = await getDB();
      const report: ACMReport = {
        reportId: previewData.reportDate.iso,
        reportDateISO: previewData.reportDate.iso,
        reportDateLabel: previewData.reportDate.label,
        importedAt: new Date().toISOString(),
        includeTotals,
      };

      // Delete existing rows for this report
      const tx = db.transaction("acmRows", "readwrite");
      const index = tx.store.index("byReportId");
      const existingRows = await index.getAll(previewData.reportDate.iso);
      for (const row of existingRows) {
        await tx.store.delete([row.reportId, row.head]);
      }
      await tx.done;

      // Save report and rows
      await db.put("acmReports", report);
      for (const row of previewData.rows) {
        await db.put("acmRows", { reportId: report.reportId, ...row });
      }

      toast.success(`Report saved: ${report.reportDateLabel}`);
      await loadReports();
      setSelectedReportId(report.reportId);
    } catch (error) {
      toast.error("Failed to save report");
      console.error(error);
    }
  }

  async function handleLoadReport() {
    if (!selectedReportId) {
      toast.error("Please select a report");
      return;
    }

    try {
      const db = await getDB();
      const report = await db.get("acmReports", selectedReportId);
      if (!report) {
        toast.error("Report not found");
        return;
      }

      const tx = db.transaction("acmRows", "readonly");
      const index = tx.store.index("byReportId");
      const rows = await index.getAll(selectedReportId);
      await tx.done;

      // Apply sorting logic: separate total rows from data rows
      const totalRows: ACMRow[] = [];
      const dataRows: ACMRow[] = [];
      
      for (const row of rows) {
        const u = row.head.toUpperCase();
        if (u.includes("TOTAL CHARGES FOR THE MONTH") || 
            u.includes("TOTAL CHARGES UPTO PREVIOUS MONTH") || 
            u.includes("BALANCE AS PER GENERAL LEDGER")) {
          totalRows.push(row);
        } else {
          dataRows.push(row);
        }
      }
      
      // Sort data rows by monthAmount descending (nulls last)
      dataRows.sort((a, b) => {
        const aAmt = a.monthAmount ?? -Infinity;
        const bAmt = b.monthAmount ?? -Infinity;
        return bAmt - aAmt;
      });
      
      // Sort total rows in specific order
      const totalOrder = [
        "TOTAL CHARGES FOR THE MONTH",
        "TOTAL CHARGES UPTO PREVIOUS MONTH",
        "BALANCE AS PER GENERAL LEDGER"
      ];
      totalRows.sort((a, b) => {
        const aIdx = totalOrder.findIndex(t => a.head.toUpperCase().includes(t));
        const bIdx = totalOrder.findIndex(t => b.head.toUpperCase().includes(t));
        return aIdx - bIdx;
      });
      
      // Combine: data rows first, then total rows
      const sortedRows = [...dataRows, ...totalRows];

      setCurrentRows(sortedRows);
      setReportLabel(report.reportDateLabel);
      setIncludeTotals(report.includeTotals);
      toast.success(`Loaded: ${report.reportDateLabel}`);
    } catch (error) {
      toast.error("Failed to load report");
      console.error(error);
    }
  }

  async function handleExportCSV() {
    if (currentRows.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = ["HEAD", "PARTICULAR OF ENCLOSURE", "AMOUNT (Rs.)", "TOTAL EXPENDITURE TILL END OF PREVIOUS MONTH", `TOTAL AMOUNT AS AT END OF MONTH ENDED AS ON ${reportLabel}`];
    const csvRows = [headers.join(",")];
    
    currentRows.forEach(row => {
      const totalAsOn = (row.monthAmount ?? 0) + (row.prevTotal ?? 0);
      csvRows.push([
        `"${row.head}"`,
        `"${row.particular}"`,
        row.monthAmount ?? "-",
        row.prevTotal ?? "-",
        totalAsOn
      ].join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ACM_Report_${reportLabel.replace(/[^a-zA-Z0-9]/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  }

  async function handleClearAll() {
    if (!confirm("Delete all saved reports? This cannot be undone.")) return;

    try {
      const db = await getDB();
      await db.clear("acmReports");
      await db.clear("acmRows");
      setReports([]);
      setCurrentRows([]);
      setReportLabel("—");
      setSelectedReportId("");
      toast.success("All reports cleared");
    } catch (error) {
      toast.error("Failed to clear reports");
      console.error(error);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-6 bg-white/80 backdrop-blur-sm">
        <h2 className="text-xl font-bold mb-4 text-purple-900">ACM Extractor</h2>
        
        {/* Controls */}
        <div className="space-y-4 mb-6">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="acm-file">Upload ACM Text File</Label>
              <Input
                id="acm-file"
                type="file"
                accept=".txt,text/plain"
                onChange={handleFileUpload}
                className="mt-1"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="report-select">Saved Reports</Label>
              <select
                id="report-select"
                value={selectedReportId}
                onChange={(e) => setSelectedReportId(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-md"
              >
                <option value="">Select a report...</option>
                {reports.map(r => (
                  <option key={r.reportId} value={r.reportId}>
                    {r.reportDateLabel} ({r.reportId})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSaveReport} className="bg-purple-600 hover:bg-purple-700">
              <Save className="w-4 h-4 mr-2" />
              Save Report
            </Button>
            <Button onClick={handleLoadReport} variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Load Saved
            </Button>
            <Button onClick={handleExportCSV} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={handleClearAll} variant="destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>
            <label className="flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={includeTotals}
                onChange={(e) => setIncludeTotals(e.target.checked)}
              />
              <span className="text-sm">Include totals</span>
            </label>
          </div>
        </div>

        {/* Metadata */}
        <div className="flex gap-4 mb-4 text-sm">
          <span>Report: <span className="font-semibold text-purple-700">{reportLabel}</span></span>
          <span>Rows: <span className="font-semibold text-purple-700">{currentRows.length}</span></span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full">
            <thead className="bg-purple-100 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left">HEAD</th>
                <th className="px-4 py-2 text-left">PARTICULAR OF ENCLOSURE</th>
                <th className="px-4 py-2 text-right">AMOUNT (Rs.)</th>
                <th className="px-4 py-2 text-right">TOTAL EXPENDITURE TILL END OF PREVIOUS MONTH</th>
                <th className="px-4 py-2 text-right">TOTAL AMOUNT AS AT END OF MONTH ENDED AS ON {reportLabel}</th>
              </tr>
            </thead>
            <tbody>
              {currentRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No data loaded. Upload a file or load a saved report.
                  </td>
                </tr>
              ) : (
                currentRows.map((row, idx) => {
                  const totalAsOn = (row.monthAmount ?? 0) + (row.prevTotal ?? 0);
                  return (
                    <tr key={idx} className="border-t hover:bg-purple-50">
                      <td className="px-4 py-2">{row.head}</td>
                      <td className="px-4 py-2">{row.particular}</td>
                      <td className="px-4 py-2 text-right">{row.monthAmount !== null ? formatIndianCurrency(row.monthAmount) : "-"}</td>
                      <td className="px-4 py-2 text-right">{row.prevTotal !== null ? formatIndianCurrency(row.prevTotal) : "-"}</td>
                      <td className="px-4 py-2 text-right font-semibold">{formatIndianCurrency(totalAsOn)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-6 bg-blue-50/80 backdrop-blur-sm">
        <h3 className="font-bold mb-2">Notes</h3>
        <ul className="text-sm space-y-1 text-gray-700">
          <li>• Upload ACM text file → Parse & Save → Export CSV</li>
          <li>• Report date must be in format: "AS AT MON DD, YYYY"</li>
          <li>• Toggle "Include totals" to filter out total rows</li>
        </ul>
      </Card>
    </div>
  );
}

// Complete Charges Entry Tab Implementation
// This is the replacement for lines 601-889 in ChargesReturnApp.tsx

function ChargesEntryTab() {
  const [entries, setEntries] = useState<ChargeEntry[]>([]);
  const [bglMaster, setBglMaster] = useState<BGLMaster[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sortState, setSortState] = useState<{ key: string | null; asc: boolean }>({ key: null, asc: true });
  const [payeeSuggestions, setPayeeSuggestions] = useState<string[]>([]);
  const [bglConfigOpen, setBglConfigOpen] = useState(false);
  
  const today = new Date().toISOString().slice(0, 10);
  
  const [formData, setFormData] = useState({
    bglCode: "",
    head: "",
    subHead: "",
    payDate: today,
    billNo: "",
    billDate: today,
    payee: "",
    purpose: "",
    amount: "",
    approver: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const db = await getDB();
    const allEntries = await db.getAll("chargeEntries");
    const allBGL = await db.getAll("bglMaster");
    setEntries(allEntries);
    setBglMaster(allBGL);
    
    // Update payee suggestions
    const payees = [...new Set(allEntries.map((e: any) => e.payee).filter((p: string) => p && p.trim()))].sort();
    setPayeeSuggestions(payees);
  }

  function handleBGLChange(bglCode: string) {
    const bgl = bglMaster.find(b => b.bglCode === bglCode);
    setFormData({
      ...formData,
      bglCode,
      head: bgl?.head || "",
      subHead: bgl?.subHead || "",
    });
  }

  async function handleSave() {
    if (!formData.bglCode || !formData.payDate || !formData.billNo || !formData.billDate || 
        !formData.payee || !formData.purpose || !formData.amount || !formData.approver) {
      toast.error("All fields are mandatory");
      return;
    }

    if (formData.payDate > today || formData.billDate > today) {
      toast.error("Future dates are not allowed");
      return;
    }

    const amt = parseFloat(formData.amount);
    if (!Number.isFinite(amt) || amt === 0) {
      toast.error("Enter a non-zero numeric amount");
      return;
    }

    try {
      const db = await getDB();
      const entry: any = {
        id: editingId || `charge_${Date.now()}`,
        bgl: formData.bglCode,
        payDate: formData.payDate,
        billNo: formData.billNo.trim(),
        billDate: formData.billDate,
        payee: formData.payee.trim(),
        purpose: formData.purpose.trim(),
        amount: amt,
        approver: formData.approver.trim(),
        createdAt: editingId ? entries.find(e => e.id === editingId)?.createdAt || new Date().toISOString() : new Date().toISOString(),
      };

      await db.put("chargeEntries", entry);
      toast.success(editingId ? "Entry updated" : "Charge added");
      handleReset();
      await loadData();
    } catch (error) {
      toast.error("Failed to save entry");
      console.error(error);
    }
  }

  function handleReset() {
    setFormData({
      bglCode: "",
      head: "",
      subHead: "",
      payDate: today,
      billNo: "",
      billDate: today,
      payee: "",
      purpose: "",
      amount: "",
      approver: "",
    });
    setEditingId(null);
  }

  function handleEdit(entry: any) {
    setFormData({
      bglCode: entry.bgl,
      head: bglMaster.find(b => b.bglCode === entry.bgl)?.head || "",
      subHead: bglMaster.find(b => b.bglCode === entry.bgl)?.subHead || "",
      payDate: entry.payDate,
      billNo: entry.billNo,
      billDate: entry.billDate,
      payee: entry.payee,
      purpose: entry.purpose,
      amount: entry.amount.toString(),
      approver: entry.approver,
    });
    setEditingId(entry.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this entry?")) return;

    try {
      const db = await getDB();
      await db.delete("chargeEntries", id);
      toast.success("Entry deleted");
      await loadData();
    } catch (error) {
      toast.error("Failed to delete entry");
      console.error(error);
    }
  }

  async function handleBGLUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      toast.error("Please select a CSV/TXT file");
      return;
    }

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      const db = await getDB();
      
      // Clear existing BGL master
      const tx = db.transaction("bglMaster", "readwrite");
      await tx.store.clear();
      
      // Parse and add new BGL codes (supports both comma and tab separation)
      let lineCount = 0;
      for (const line of lines) {
        lineCount++;
        // Skip header row (if first line contains "BGL" or "Code" or "Head")
        if (lineCount === 1 && /BGL|Code|Head/i.test(line)) {
          continue;
        }
        
        // Try comma first, then tab
        let parts = line.split(',');
        if (parts.length < 3) {
          parts = line.split(/\t/);
        }
        if (parts.length >= 3) {
          const bglCode = parts[0].trim();
          const head = parts[1].trim();
          const subHead = parts[2].trim();
          
          if (bglCode && head && subHead) {
            await tx.store.add({
              bglCode,
              head,
              subHead,
            });
          }
        }
      }
      
      await tx.done;
      toast.success("BGL Codes updated successfully");
      await loadData();
      setBglConfigOpen(false);
    } catch (error) {
      toast.error("Error reading BGL file");
      console.error(error);
    }
  }

  async function handleExportCSV() {
    if (entries.length === 0) {
      toast.error("No charges to export");
      return;
    }

    const escapeCSV = (v: any) => {
      const s = v == null ? "" : String(v);
      return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const csv = [
      ["S.N.", "BGL Number", "Payment Head", "Sub-Head", "Date of Payment", "Bill No.", "Bill Date", "Payee Name", "Purpose", "Amount Paid", "Approver"]
        .map(escapeCSV).join(",")
    ];

    entries.forEach((r: any, i) => {
      const info = bglMaster.find(b => b.bglCode === r.bgl) || { head: "", subHead: "" };
      csv.push([
        String(i + 1),
        r.bgl,
        info.head,
        info.subHead,
        formatDateDDMMYYYY(r.payDate),
        r.billNo,
        formatDateDDMMYYYY(r.billDate),
        r.payee,
        r.purpose,
        formatIndianCurrency(r.amount),
        r.approver
      ].map(escapeCSV).join(","));
    });

    const blob = new Blob([csv.join("\r\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `charges_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  }

  async function handleClearAll() {
    if (!confirm("Clear all charges?")) return;

    try {
      const db = await getDB();
      const tx = db.transaction("chargeEntries", "readwrite");
      await tx.store.clear();
      await tx.done;
      toast.success("All charges cleared");
      await loadData();
    } catch (error) {
      toast.error("Failed to clear charges");
      console.error(error);
    }
  }

  function formatDateDDMMYYYY(isoDate: string): string {
    if (!isoDate) return "";
    const [y, m, d] = isoDate.split("-");
    return `${d}/${m}/${y}`;
  }

  function handleSort(key: string) {
    setSortState({
      key,
      asc: sortState.key === key ? !sortState.asc : true
    });
  }

  // Sort entries
  let sortedEntries = [...entries];
  if (sortState.key) {
    sortedEntries.sort((a: any, b: any) => {
      let x = a[sortState.key!] ?? "";
      let y = b[sortState.key!] ?? "";
      if (sortState.key === "amount") {
        x = Number(x);
        y = Number(y);
      }
      return sortState.asc ? (x > y ? 1 : -1) : (x < y ? 1 : -1);
    });
  }

  // Group entries by BGL code
  const groupedEntries = sortedEntries.reduce((acc: any, entry: any) => {
    if (!acc[entry.bgl]) acc[entry.bgl] = [];
    acc[entry.bgl].push(entry);
    return acc;
  }, {});

  const grandTotal = entries.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);

  return (
    <div className="space-y-4">
      <Card className="p-6 bg-white/80 backdrop-blur-sm">
        <h2 className="text-xl font-bold mb-4 text-purple-900">Charges Entry</h2>
        
        {/* BGL Configuration */}
        <details open={bglConfigOpen} onToggle={(e: any) => setBglConfigOpen(e.target.open)} className="mb-4 border rounded-lg p-4">
          <summary className="cursor-pointer font-semibold text-purple-700 mb-3">BGL Configuration</summary>
          <div className="mt-4 space-y-2">
            <Label htmlFor="bgl-upload" className="text-sm font-medium">Update BGL Codes (CSV)</Label>
            <Input
              id="bgl-upload"
              type="file"
              accept=".csv,.txt"
              onChange={handleBGLUpload}
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              Format: BGL Code, Payment Head, Sub-Head (CSV or tab-separated)
            </p>
          </div>
        </details>

        {/* Form */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <Label htmlFor="bgl-code">BGL Code</Label>
              <Input
                id="bgl-code"
                list="bgl-list"
                value={formData.bglCode}
                onChange={(e) => handleBGLChange(e.target.value)}
                placeholder="e.g. 21111"
                className="mt-1"
              />
              <datalist id="bgl-list">
                {bglMaster.map(bgl => (
                  <option key={bgl.bglCode} value={bgl.bglCode}>{bgl.head}</option>
                ))}
              </datalist>
            </div>

            <div>
              <Label htmlFor="head">Payment Head (Auto)</Label>
              <Input
                id="head"
                value={formData.head}
                readOnly
                placeholder="Select BGL Code first"
                className="bg-gray-50 text-sm"
              />
            </div>

            <div>
              <Label htmlFor="sub-head">Sub-Head (Auto)</Label>
              <Input
                id="sub-head"
                value={formData.subHead}
                readOnly
                placeholder="Select BGL Code first"
                className="bg-gray-50 text-sm"
              />
            </div>

            <div>
              <Label htmlFor="pay-date">Payment Date</Label>
              <Input
                id="pay-date"
                type="date"
                value={formData.payDate}
                max={today}
                onChange={(e) => setFormData({ ...formData, payDate: e.target.value })}
                className="text-sm"
              />
            </div>

            <div>
              <Label htmlFor="bill-no">Bill No.</Label>
              <Input
                id="bill-no"
                value={formData.billNo}
                onChange={(e) => setFormData({ ...formData, billNo: e.target.value })}
                placeholder="Bill #"
                className="text-sm"
              />
            </div>

            <div>
              <Label htmlFor="bill-date">Bill Date</Label>
              <Input
                id="bill-date"
                type="date"
                value={formData.billDate}
                max={today}
                onChange={(e) => setFormData({ ...formData, billDate: e.target.value })}
                className="text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <Label htmlFor="payee">Payee Name</Label>
              <Input
                id="payee"
                list="payee-list"
                value={formData.payee}
                onChange={(e) => setFormData({ ...formData, payee: e.target.value })}
                placeholder="Who was paid?"
                className="text-sm"
              />
              <datalist id="payee-list">
                {payeeSuggestions.map(p => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>

            <div>
              <Label htmlFor="purpose">Purpose</Label>
              <Input
                id="purpose"
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                placeholder="Description"
                className="text-sm"
              />
            </div>

            <div>
              <Label htmlFor="amount">Amount (Rs)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                className="text-sm"
              />
            </div>

            <div>
              <Label htmlFor="approver">Approver</Label>
              <Input
                id="approver"
                value={formData.approver}
                onChange={(e) => setFormData({ ...formData, approver: e.target.value })}
                placeholder="Initials"
                className="text-sm"
              />
            </div>

            <div className="flex items-end">
              <Button onClick={handleSave} className="w-full bg-purple-600 hover:bg-purple-700">
                {editingId ? "Update" : "Add"}
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-3 text-sm text-gray-600">
          Enter details and click Add.
        </div>
      </Card>

      {/* Entries Table */}
      <Card className="p-6 bg-white/80 backdrop-blur-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-purple-900">
            All Entries ({entries.length})
          </h3>
          <div className="flex gap-2">
            <Button onClick={handleExportCSV} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1" />
              Export CSV
            </Button>
            <Button onClick={handleClearAll} variant="outline" size="sm" className="text-red-600 hover:text-red-700">
              <Trash2 className="w-4 h-4 mr-1" />
              Clear Charges
            </Button>
          </div>
        </div>

        {Object.keys(groupedEntries).length === 0 ? (
          <p className="text-center text-gray-500 py-8">No charges yet.</p>
        ) : (
          <div className="space-y-4">
            {Object.keys(groupedEntries).sort().map(bgl => {
              const bglInfo = bglMaster.find(b => b.bglCode === bgl) || { head: bgl, subHead: "" };
              const bglEntries = groupedEntries[bgl];
              const subtotal = bglEntries.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);

              return (
                <div key={bgl}>
                  <h4 className="font-bold text-purple-700 mb-2 bg-purple-50 px-3 py-2 rounded">
                    {bgl} - {bglInfo.head}
                  </h4>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-xs">
                      <thead className="bg-purple-100">
                        <tr>
                          <th className="px-2 py-2 text-left">S.N.</th>
                          <th className="px-2 py-2 text-left cursor-pointer hover:bg-purple-200" onClick={() => handleSort("bgl")}>BGL Number</th>
                          <th className="px-2 py-2 text-left">Head</th>
                          <th className="px-2 py-2 text-left">Sub-Head</th>
                          <th className="px-2 py-2 text-left cursor-pointer hover:bg-purple-200" onClick={() => handleSort("payDate")}>Date of Payment</th>
                          <th className="px-2 py-2 text-left cursor-pointer hover:bg-purple-200" onClick={() => handleSort("billNo")}>Bill No.</th>
                          <th className="px-2 py-2 text-left cursor-pointer hover:bg-purple-200" onClick={() => handleSort("billDate")}>Bill Date</th>
                          <th className="px-2 py-2 text-left cursor-pointer hover:bg-purple-200" onClick={() => handleSort("payee")}>Payee Name</th>
                          <th className="px-2 py-2 text-left cursor-pointer hover:bg-purple-200" onClick={() => handleSort("purpose")}>Purpose</th>
                          <th className="px-2 py-2 text-right cursor-pointer hover:bg-purple-200" onClick={() => handleSort("amount")}>Amount Paid (Rs.)</th>
                          <th className="px-2 py-2 text-left cursor-pointer hover:bg-purple-200" onClick={() => handleSort("approver")}>Approver</th>
                          <th className="px-2 py-2 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bglEntries.map((entry: any, idx: number) => {
                          const currentInfo = bglMaster.find(b => b.bglCode === entry.bgl) || { head: "", subHead: "" };
                          return (
                            <tr key={entry.id} className="border-t hover:bg-purple-50">
                              <td className="px-2 py-2">{idx + 1}</td>
                              <td className="px-2 py-2">{entry.bgl}</td>
                              <td className="px-2 py-2">{currentInfo.head}</td>
                              <td className="px-2 py-2">{currentInfo.subHead}</td>
                              <td className="px-2 py-2">{formatDateDDMMYYYY(entry.payDate)}</td>
                              <td className="px-2 py-2">{entry.billNo}</td>
                              <td className="px-2 py-2">{formatDateDDMMYYYY(entry.billDate)}</td>
                              <td className="px-2 py-2">{entry.payee}</td>
                              <td className="px-2 py-2">{entry.purpose}</td>
                              <td className="px-2 py-2 text-right">{formatIndianCurrency(Number(entry.amount || 0))}</td>
                              <td className="px-2 py-2">{entry.approver}</td>
                              <td className="px-2 py-2 text-center">
                                <div className="flex gap-1 justify-center">
                                  <Button size="sm" variant="ghost" onClick={() => handleEdit(entry)} title="Edit">
                                    ✎
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => handleDelete(entry.id)} className="text-red-600" title="Delete">
                                    🗑
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="bg-purple-50 font-semibold">
                          <td colSpan={9} className="px-2 py-2"><em>Subtotal</em></td>
                          <td className="px-2 py-2 text-right">{formatIndianCurrency(subtotal)}</td>
                          <td colSpan={2}></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            {/* Grand Total */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <tbody>
                  <tr className="bg-purple-200 font-bold">
                    <td colSpan={9} className="px-2 py-2">GRAND TOTAL</td>
                    <td className="px-2 py-2 text-right">{formatIndianCurrency(grandTotal)}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
// ========== Charges Return Report Tab ==========
function ChargesReturnReportTab() {
  const [entries, setEntries] = useState<ChargeEntry[]>([]);
  const { branchName, branchCode } = useBranch();

  useEffect(() => {
    loadEntries();
  }, []);

  async function loadEntries() {
    const db = await getDB();
    const allEntries = await db.getAll("chargeEntries");
    setEntries(allEntries);
  }

  const groupedEntries = entries.reduce((acc, entry) => {
    if (!acc[entry.head]) acc[entry.head] = [];
    acc[entry.head].push(entry);
    return acc;
  }, {} as Record<string, ChargeEntry[]>);

  const grandTotal = entries.reduce((sum, e) => sum + e.amount, 0);

  function handlePrint() {
    window.print();
  }

  function handleExportCSV() {
    if (entries.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = ["Head", "Sub Head", "BGL Code", "Payment Mode", "Cheque/Ref", "Amount", "Remarks"];
    const csvRows = [headers.join(",")];
    
    entries.forEach(entry => {
    csvRows.push([
      `"${entry.head}"`,
      `"${entry.subHead}"`,
      entry.bglCode,
      entry.paymentMode,
      entry.chequeNo || "-",
      formatIndianCurrency(entry.amount),
      `"${entry.remarks || "-"}`
    ].join(","));
    });

    csvRows.push(["", "", "", "", "Grand Total", formatIndianCurrency(grandTotal), ""].join(","));

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Charges_Return_${branchCode}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  }

  return (
    <div className="space-y-4">
      <Card className="p-6 bg-white/80 backdrop-blur-sm print:shadow-none">
        <div className="flex justify-between items-center mb-6 print:hidden">
          <h2 className="text-xl font-bold text-purple-900">Charges Return Report</h2>
          <div className="flex gap-2">
            <Button onClick={handlePrint} variant="outline">
              <FileText className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button onClick={handleExportCSV} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Report Header */}
        <div className="text-center mb-6 print:mb-8">
          <h1 className="text-2xl font-bold">State Bank of India</h1>
          <h2 className="text-xl font-semibold mt-2">{branchName}</h2>
          <h3 className="text-lg mt-2">Charges Return Statement</h3>
          <p className="text-sm text-gray-600 mt-1">Branch Code: {branchCode}</p>
          <p className="text-sm text-gray-600">Date: {new Date().toLocaleDateString("en-IN")}</p>
        </div>

        {entries.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No entries to display. Add charges in the "Charges Entry" tab.</p>
        ) : (
          <>
            {Object.entries(groupedEntries).map(([head, headEntries]) => {
              const subtotal = headEntries.reduce((sum, e) => sum + e.amount, 0);
              return (
                <div key={head} className="mb-6 break-inside-avoid">
                  <h4 className="font-bold text-purple-700 bg-purple-50 px-3 py-2 rounded-t-lg">
                    {head}
                  </h4>
                  <table className="w-full text-sm border border-t-0 rounded-b-lg">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-left border-r">BGL Code</th>
                        <th className="px-3 py-2 text-left border-r">Sub Head</th>
                        <th className="px-3 py-2 text-left border-r">Payment Mode</th>
                        <th className="px-3 py-2 text-left border-r">Cheque/Ref</th>
                        <th className="px-3 py-2 text-right border-r">Amount (₹)</th>
                        <th className="px-3 py-2 text-left">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {headEntries.map(entry => (
                        <tr key={entry.id} className="border-t">
                          <td className="px-3 py-2 border-r">{entry.bglCode}</td>
                          <td className="px-3 py-2 border-r">{entry.subHead}</td>
                          <td className="px-3 py-2 border-r">{entry.paymentMode}</td>
                          <td className="px-3 py-2 border-r">{entry.chequeNo || "-"}</td>
                          <td className="px-3 py-2 text-right border-r">{formatIndianCurrency(entry.amount)}</td>
                          <td className="px-3 py-2">{entry.remarks || "-"}</td>
                        </tr>
                      ))}
                      <tr className="border-t bg-purple-50 font-semibold">
                        <td colSpan={4} className="px-3 py-2 text-right border-r">Subtotal:</td>
                        <td className="px-3 py-2 text-right border-r">₹{formatIndianCurrency(subtotal)}</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })}

            <div className="mt-6 pt-4 border-t-2 border-purple-600">
              <div className="flex justify-end">
                <div className="text-right">
                  <p className="text-lg font-bold text-purple-900">
                    Grand Total: ₹{formatIndianCurrency(grandTotal)}
                  </p>
                </div>
              </div>
            </div>

            {/* Signature Section */}
            <div className="mt-12 print:mt-16 grid grid-cols-2 gap-8">
              <div>
                <p className="font-semibold mb-8">Prepared by:</p>
                <div className="border-t border-gray-400 pt-2">
                  <p className="text-sm">Name & Signature</p>
                  <p className="text-sm text-gray-600">Date: __________</p>
                </div>
              </div>
              <div>
                <p className="font-semibold mb-8">Verified by:</p>
                <div className="border-t border-gray-400 pt-2">
                  <p className="text-sm">Branch Manager</p>
                  <p className="text-sm text-gray-600">Date: __________</p>
                </div>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
