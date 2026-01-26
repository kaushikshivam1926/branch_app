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
  bglCode: string;
  head: string;
  subHead: string;
  paymentMode: string;
  chequeNo: string;
  amount: number;
  remarks: string;
  createdAt: string;
}

interface BGLMaster {
  bglCode: string;
  head: string;
  subHead: string;
}

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
function parseAcmText(text: string, includeTotals: boolean): { reportDate: { iso: string; label: string }; rows: ACMRow[] } {
  const lines = text.split("\n");
  let reportDate = { iso: "", label: "" };
  const rows: ACMRow[] = [];

  // Extract report date (AS AT MON DD, YYYY format)
  for (const line of lines) {
    const match = line.match(/AS\s+AT\s+([A-Z]+)\s+(\d{1,2}),\s+(\d{4})/i);
    if (match) {
      const monthStr = match[1];
      const day = match[2].padStart(2, "0");
      const year = match[3];
      const monthMap: Record<string, string> = {
        JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
        JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12"
      };
      const month = monthMap[monthStr.toUpperCase()] || "01";
      reportDate = { iso: `${year}-${month}-${day}`, label: `${monthStr} ${day}, ${year}` };
      break;
    }
  }

  // Parse data rows (BGL code pattern: 5 digits followed by amounts)
  for (const line of lines) {
    const match = line.match(/^(\d{5})\s+(.+?)\s+([\d,]+\.\d{2}|-)\s+([\d,]+\.\d{2}|-)\s+([\d,]+\.\d{2}|-)$/);
    if (match) {
      const head = match[2].trim();
      const monthAmount = match[3] === "-" ? null : parseFloat(match[3].replace(/,/g, ""));
      const prevTotal = match[4] === "-" ? null : parseFloat(match[4].replace(/,/g, ""));
      const asOnTotal = match[5] === "-" ? null : parseFloat(match[5].replace(/,/g, ""));
      
      // Filter out total rows if includeTotals is false
      if (!includeTotals && (head.toLowerCase().includes("total") || head.toLowerCase().includes("grand"))) {
        continue;
      }
      
      rows.push({ head, monthAmount, prevTotal, asOnTotal });
    }
  }

  return { reportDate, rows };
}

// ========== Main Component ==========
export default function ChargesReturnApp() {
  const [, navigate] = useLocation();
  const { branchName } = useBranch();
  const [activeTab, setActiveTab] = useState<"extractor" | "entry" | "report">("extractor");

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
        {activeTab === "extractor" && <ACMExtractorTab />}
        {activeTab === "entry" && <ChargesEntryTab />}
        {activeTab === "report" && <ChargesReturnReportTab />}
      </div>
    </div>
  );
}

// ========== ACM Extractor Tab ==========
function ACMExtractorTab() {
  const [reports, setReports] = useState<ACMReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string>("");
  const [currentRows, setCurrentRows] = useState<ACMRow[]>([]);
  const [reportLabel, setReportLabel] = useState<string>("—");
  const [includeTotals, setIncludeTotals] = useState(true);
  const [previewData, setPreviewData] = useState<{ reportDate: { iso: string; label: string }; rows: ACMRow[] } | null>(null);

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

      setCurrentRows(rows);
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

    const headers = ["Payment Head", "Amount (Rs.)", "Total till last month", `Total as on ${reportLabel}`];
    const csvRows = [headers.join(",")];
    
    currentRows.forEach(row => {
      csvRows.push([
        `"${row.head}"`,
        row.monthAmount ?? "-",
        row.prevTotal ?? "-",
        row.asOnTotal ?? "-"
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
                <th className="px-4 py-2 text-left">Payment Head</th>
                <th className="px-4 py-2 text-right">Amount (Rs.)</th>
                <th className="px-4 py-2 text-right">Total till last month</th>
                <th className="px-4 py-2 text-right">Total as on {reportLabel}</th>
              </tr>
            </thead>
            <tbody>
              {currentRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    No data loaded. Upload a file or load a saved report.
                  </td>
                </tr>
              ) : (
                currentRows.map((row, idx) => (
                  <tr key={idx} className="border-t hover:bg-purple-50">
                    <td className="px-4 py-2">{row.head}</td>
                    <td className="px-4 py-2 text-right">{row.monthAmount?.toFixed(2) ?? "-"}</td>
                    <td className="px-4 py-2 text-right">{row.prevTotal?.toFixed(2) ?? "-"}</td>
                    <td className="px-4 py-2 text-right">{row.asOnTotal?.toFixed(2) ?? "-"}</td>
                  </tr>
                ))
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

// ========== Charges Entry Tab ==========
function ChargesEntryTab() {
  const [entries, setEntries] = useState<ChargeEntry[]>([]);
  const [bglMaster, setBglMaster] = useState<BGLMaster[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    bglCode: "",
    head: "",
    subHead: "",
    paymentMode: "Cash",
    chequeNo: "",
    amount: "",
    remarks: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const db = await getDB();
    const allEntries = await db.getAll("chargeEntries");
    const allBGL = await db.getAll("bglMaster");
    setEntries(allEntries.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    setBglMaster(allBGL);
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
    if (!formData.bglCode || !formData.amount) {
      toast.error("BGL Code and Amount are required");
      return;
    }

    try {
      const db = await getDB();
      const entry: ChargeEntry = {
        id: editingId || `charge_${Date.now()}`,
        bglCode: formData.bglCode,
        head: formData.head,
        subHead: formData.subHead,
        paymentMode: formData.paymentMode,
        chequeNo: formData.chequeNo,
        amount: parseFloat(formData.amount),
        remarks: formData.remarks,
        createdAt: editingId ? entries.find(e => e.id === editingId)?.createdAt || new Date().toISOString() : new Date().toISOString(),
      };

      await db.put("chargeEntries", entry);
      toast.success(editingId ? "Entry updated" : "Entry added");
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
      paymentMode: "Cash",
      chequeNo: "",
      amount: "",
      remarks: "",
    });
    setEditingId(null);
  }

  function handleEdit(entry: ChargeEntry) {
    setFormData({
      bglCode: entry.bglCode,
      head: entry.head,
      subHead: entry.subHead,
      paymentMode: entry.paymentMode,
      chequeNo: entry.chequeNo,
      amount: entry.amount.toString(),
      remarks: entry.remarks,
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

  // Group entries by head
  const groupedEntries = entries.reduce((acc, entry) => {
    if (!acc[entry.head]) acc[entry.head] = [];
    acc[entry.head].push(entry);
    return acc;
  }, {} as Record<string, ChargeEntry[]>);

  return (
    <div className="space-y-4">
      <Card className="p-6 bg-white/80 backdrop-blur-sm">
        <h2 className="text-xl font-bold mb-4 text-purple-900">
          {editingId ? "Edit Charge Entry" : "Add Charge Entry"}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <Label htmlFor="bgl-code">BGL Code *</Label>
            <select
              id="bgl-code"
              value={formData.bglCode}
              onChange={(e) => handleBGLChange(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-md"
            >
              <option value="">Select BGL Code...</option>
              {bglMaster.map(bgl => (
                <option key={bgl.bglCode} value={bgl.bglCode}>
                  {bgl.bglCode} - {bgl.head}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="head">Head</Label>
            <Input
              id="head"
              value={formData.head}
              readOnly
              className="bg-gray-50"
            />
          </div>

          <div>
            <Label htmlFor="sub-head">Sub Head</Label>
            <Input
              id="sub-head"
              value={formData.subHead}
              readOnly
              className="bg-gray-50"
            />
          </div>

          <div>
            <Label htmlFor="payment-mode">Payment Mode</Label>
            <select
              id="payment-mode"
              value={formData.paymentMode}
              onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
              className="w-full mt-1 px-3 py-2 border rounded-md"
            >
              <option value="Cash">Cash</option>
              <option value="Cheque">Cheque</option>
              <option value="Online">Online</option>
            </select>
          </div>

          <div>
            <Label htmlFor="cheque-no">Cheque/Ref No</Label>
            <Input
              id="cheque-no"
              value={formData.chequeNo}
              onChange={(e) => setFormData({ ...formData, chequeNo: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="amount">Amount (Rs.) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Input
              id="remarks"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700">
            {editingId ? <Save className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            {editingId ? "Update" : "Add Entry"}
          </Button>
          {editingId && (
            <Button onClick={handleReset} variant="outline">
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          )}
        </div>
      </Card>

      {/* Entries Table */}
      <Card className="p-6 bg-white/80 backdrop-blur-sm">
        <h3 className="text-lg font-bold mb-4 text-purple-900">
          All Entries ({entries.length})
        </h3>

        {Object.keys(groupedEntries).length === 0 ? (
          <p className="text-center text-gray-500 py-8">No entries yet. Add your first charge entry above.</p>
        ) : (
          Object.entries(groupedEntries).map(([head, headEntries]) => {
            const subtotal = headEntries.reduce((sum, e) => sum + e.amount, 0);
            return (
              <div key={head} className="mb-6">
                <h4 className="font-bold text-purple-700 mb-2 flex justify-between items-center">
                  <span>{head}</span>
                  <span className="text-sm">Subtotal: ₹{subtotal.toFixed(2)}</span>
                </h4>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-purple-100">
                      <tr>
                        <th className="px-3 py-2 text-left">BGL Code</th>
                        <th className="px-3 py-2 text-left">Sub Head</th>
                        <th className="px-3 py-2 text-left">Payment Mode</th>
                        <th className="px-3 py-2 text-left">Cheque/Ref</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                        <th className="px-3 py-2 text-left">Remarks</th>
                        <th className="px-3 py-2 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {headEntries.map(entry => (
                        <tr key={entry.id} className="border-t hover:bg-purple-50">
                          <td className="px-3 py-2">{entry.bglCode}</td>
                          <td className="px-3 py-2">{entry.subHead}</td>
                          <td className="px-3 py-2">{entry.paymentMode}</td>
                          <td className="px-3 py-2">{entry.chequeNo || "-"}</td>
                          <td className="px-3 py-2 text-right">₹{entry.amount.toFixed(2)}</td>
                          <td className="px-3 py-2">{entry.remarks || "-"}</td>
                          <td className="px-3 py-2 text-center">
                            <div className="flex gap-1 justify-center">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEdit(entry)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(entry.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
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
      entry.amount.toFixed(2),
      `"${entry.remarks || "-"}"`
    ].join(","));
    });

    csvRows.push(["", "", "", "", "Grand Total", grandTotal.toFixed(2), ""].join(","));

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
                          <td className="px-3 py-2 text-right border-r">{entry.amount.toFixed(2)}</td>
                          <td className="px-3 py-2">{entry.remarks || "-"}</td>
                        </tr>
                      ))}
                      <tr className="border-t bg-purple-50 font-semibold">
                        <td colSpan={4} className="px-3 py-2 text-right border-r">Subtotal:</td>
                        <td className="px-3 py-2 text-right border-r">₹{subtotal.toFixed(2)}</td>
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
                    Grand Total: ₹{grandTotal.toFixed(2)}
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
