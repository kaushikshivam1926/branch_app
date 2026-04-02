/**
 * Data Upload Component
 * Handles CSV file uploads, auto-detection, processing, and status display
 */

import { useState, useEffect, useRef } from "react";
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, Trash2, RefreshCw, Database, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getDataStatus,
  getUploadLogs,
  clearStore,
  STORES,
  setSetting,
  addUploadLog,
} from "@/lib/portfolioDb";
import {
  parseCSV,
  processProductMapping,
  processLoanProductMapping,
  processDepositShadow,
  processLoanShadow,
  processLoanBalance,
  processCCODBalance,
  processNPAReport,
  reprocessCCODClassification,
  buildCustomerDimension,
  detectFileType,
  FILE_TYPE_LABELS,
  extractFileDateFromName,
  extractBranchCodeFromName,
  FILE_TYPES_WITH_DATE_IN_NAME,
  FILE_TYPES_WITH_UPLOAD_DATE,
} from "@/lib/portfolioTransform";
import { useBranch } from "@/contexts/BranchContext";

interface UploadStatus {
  fileName: string;
  fileType: string;
  status: "pending" | "processing" | "success" | "error";
  recordCount?: number;
  errorMessage?: string;
  fileDate?: string;
  branchCode?: string;
}

export default function DataUpload() {
  const { branchCode: configuredBranchCode } = useBranch();
  const [dataStatus, setDataStatus] = useState<any>(null);
  const [uploadLogs, setUploadLogs] = useState<any[]>([]);
  const [uploads, setUploads] = useState<UploadStatus[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [buildingCustomers, setBuildingCustomers] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const [reprocessResult, setReprocessResult] = useState<{ total: number; resolved: number; unresolved: number; unmappedCodes: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    try {
      const status = await getDataStatus();
      setDataStatus(status);
      const logs = await getUploadLogs();
      setUploadLogs(logs.reverse().slice(0, 20));
    } catch (e) {
      console.error("Failed to load status:", e);
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    const newUploads: UploadStatus[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const upload: UploadStatus = {
        fileName: file.name,
        fileType: "detecting...",
        status: "pending",
      };
      newUploads.push(upload);
    }
    setUploads(newUploads);

    // Processing priority: mapping files must be processed before data files
    // so that category lookups work correctly even when all files are uploaded at once.
    const PROCESSING_PRIORITY: Record<string, number> = {
      "product-mapping": 1,
      "loan-product-mapping": 1,
      "loan-shadow": 2,
      "deposit-shadow": 2,
      "loan-balance": 3,
      "ccod-balance": 3,
      "npa-report": 3,
    };

    // Pre-read all files and detect types so we can sort by priority
    const fileEntries: { file: File; idx: number; text: string; fileType: string | null }[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const text = await file.text();
      const firstLine = text.split(/\r?\n/)[0] || "";
      let headerLine = firstLine;
      if (headerLine.charCodeAt(0) === 0xfeff) headerLine = headerLine.slice(1);
      const headers = headerLine.split(",").map((h) => h.trim());
      const ft = detectFileType(file.name, headers);
      fileEntries.push({ file, idx: i, text, fileType: ft });
    }
    fileEntries.sort((a, b) => {
      const pa = a.fileType ? (PROCESSING_PRIORITY[a.fileType] ?? 5) : 5;
      const pb = b.fileType ? (PROCESSING_PRIORITY[b.fileType] ?? 5) : 5;
      return pa - pb;
    });

    for (const { file, idx: i, text, fileType } of fileEntries) {
      try {
        newUploads[i].status = "processing";
        setUploads([...newUploads]);

        if (!fileType) {
          newUploads[i].status = "error";
          newUploads[i].fileType = "Unknown";
          newUploads[i].errorMessage = "Could not detect file type. Please check the file format.";
          setUploads([...newUploads]);
          toast.error(`Could not detect type for: ${file.name}`);
          continue;
        }

        newUploads[i].fileType = FILE_TYPE_LABELS[fileType] || fileType;

        // Branch code validation (skip for product mapping files)
        if (fileType !== "product-mapping" && fileType !== "loan-product-mapping" && configuredBranchCode) {
          const fileBranchCode = extractBranchCodeFromName(file.name);
          if (fileBranchCode && fileBranchCode !== configuredBranchCode) {
            newUploads[i].status = "error";
            newUploads[i].errorMessage = `Branch code mismatch: file has ${fileBranchCode}, configured branch is ${configuredBranchCode}`;
            setUploads([...newUploads]);
            toast.error(`Branch code mismatch for ${file.name}: expected ${configuredBranchCode}, got ${fileBranchCode}`);
            continue;
          }
        }

        // Extract file date
        let fileDate: string | undefined;
        if (FILE_TYPES_WITH_DATE_IN_NAME.includes(fileType)) {
          const extractedDate = extractFileDateFromName(file.name);
          if (extractedDate) fileDate = extractedDate;
        } else if (FILE_TYPES_WITH_UPLOAD_DATE.includes(fileType)) {
          // Use upload date for product mapping files
          fileDate = new Date().toISOString().split('T')[0];
        }

        const fileBranchCode = extractBranchCodeFromName(file.name);
        newUploads[i].fileDate = fileDate;
        newUploads[i].branchCode = fileBranchCode || undefined;

        let count = 0;
        switch (fileType) {
          case "product-mapping":
            count = await processProductMapping(text);
            break;
          case "loan-product-mapping":
            count = await processLoanProductMapping(text);
            break;
          case "deposit-shadow":
            count = await processDepositShadow(text);
            break;
          case "loan-shadow":
            count = await processLoanShadow(text);
            break;
          case "loan-balance":
            count = await processLoanBalance(text);
            break;
          case "ccod-balance":
            count = await processCCODBalance(text);
            break;
          case "npa-report":
            count = await processNPAReport(text);
            break;
        }

        newUploads[i].status = "success";
        newUploads[i].recordCount = count;
        setUploads([...newUploads]);
        toast.success(`${FILE_TYPE_LABELS[fileType]}: ${count.toLocaleString("en-IN")} records processed`);
        
        // Log upload with file date and branch code
        await addUploadLog({
          fileType,
          fileName: file.name,
          recordCount: count,
          status: "success",
          fileDate,
          branchCode: fileBranchCode || undefined,
        });
      } catch (err: any) {
        newUploads[i].status = "error";
        newUploads[i].errorMessage = err.message || "Processing failed";
        setUploads([...newUploads]);
        toast.error(`Error processing ${file.name}: ${err.message}`);
      }
    }

    // Auto-build customer dimension after uploads
    const hasDepositsOrLoans = newUploads.some(
      (u) => u.status === "success" && (u.fileType.includes("Deposit") || u.fileType.includes("Loan") || u.fileType.includes("CC/OD"))
    );
    if (hasDepositsOrLoans) {
      setBuildingCustomers(true);
      try {
        const custCount = await buildCustomerDimension();
        toast.success(`Customer dimension built: ${custCount.toLocaleString("en-IN")} customers`);
      } catch (err: any) {
        toast.error("Failed to build customer dimension: " + err.message);
      }
      setBuildingCustomers(false);
    }

    setIsProcessing(false);
    await loadStatus();

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleClearAllData() {
    if (!confirm("Are you sure you want to clear ALL portfolio data? This action cannot be undone.")) return;
    try {
      await clearStore(STORES.PRODUCT_MAPPING);
      await clearStore(STORES.LOAN_PRODUCT_MAPPING);
      await clearStore(STORES.DEPOSIT_DATA);
      await clearStore(STORES.LOAN_DATA);
      await clearStore(STORES.CCOD_DATA);
      await clearStore(STORES.NPA_DATA);
      await clearStore(STORES.LOAN_SHADOW);
      await clearStore(STORES.DEPOSIT_SHADOW);
      await clearStore(STORES.CUSTOMER_DIM);
      await clearStore(STORES.UPLOAD_LOG);
      setUploads([]);
      await loadStatus();
      toast.success("All portfolio data cleared");
    } catch (err: any) {
      toast.error("Failed to clear data: " + err.message);
    }
  }

  async function handleRebuildCustomers() {
    setBuildingCustomers(true);
    try {
      const count = await buildCustomerDimension();
      toast.success(`Customer dimension rebuilt: ${count.toLocaleString("en-IN")} customers`);
      await loadStatus();
    } catch (err: any) {
      toast.error("Failed to rebuild: " + err.message);
    }
    setBuildingCustomers(false);
  }

  async function handleReprocessCCOD() {
    setReprocessing(true);
    setReprocessResult(null);
    try {
      const result = await reprocessCCODClassification();
      setReprocessResult(result);
      await buildCustomerDimension();
      await loadStatus();
      if (result.unresolved === 0) {
        toast.success(`CC/OD re-classified: ${result.resolved} of ${result.total} accounts resolved`);
      } else {
        toast.warning(`CC/OD re-classified: ${result.resolved} resolved, ${result.unresolved} still unresolved`);
      }
    } catch (err: any) {
      toast.error("Re-process failed: " + err.message);
    }
    setReprocessing(false);
  }

  const statusColor = (count: number) => (count > 0 ? "text-green-600" : "text-orange-500");
  const statusBg = (count: number) => (count > 0 ? "bg-green-50 border-green-200" : "bg-orange-50 border-orange-200");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Data Upload</h2>
        <p className="text-gray-500 mt-1">Upload raw CSV files from the bank's reporting system. Files are auto-detected and processed locally.</p>
      </div>

      {/* Upload Area */}
      <div className="bg-white rounded-xl border-2 border-dashed border-purple-300 p-8 text-center hover:border-purple-500 transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          id="csv-upload"
        />
        <label htmlFor="csv-upload" className="cursor-pointer">
          <Upload className="w-12 h-12 mx-auto text-purple-400 mb-4" />
          <p className="text-lg font-semibold text-gray-700">
            {isProcessing ? "Processing..." : "Click to upload CSV files"}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Supports: Deposit Shadow, Loan Shadow, Loan Balance, CC/OD Balance, NPA Report, Product Mapping
          </p>
          <p className="text-xs text-gray-400 mt-1">You can select multiple files at once</p>
        </label>
      </div>

      {/* Upload Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-2">Recommended Upload Order:</p>
            <ol className="list-decimal ml-4 space-y-1">
              <li><strong>Deposit Product Category Mapping</strong> (one-time, at first use)</li>
              <li><strong>Loan Product Category Mapping</strong> (one-time, at first use)</li>
              <li><strong>Loan Shadow</strong> (month-end) — upload before Loan Balance for data merging</li>
              <li><strong>Deposit Shadow</strong> (month-end)</li>
              <li><strong>Loan Balance</strong> (daily T+2)</li>
              <li><strong>CC/OD Balance</strong> (daily T+2)</li>
              <li><strong>NPA Report</strong> (daily T+2)</li>
            </ol>
            <p className="mt-2 text-blue-600">Customer 360 is automatically built after each upload.</p>
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-700 mb-3">Upload Progress</h3>
          <div className="space-y-2">
            {uploads.map((u, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                {u.status === "pending" && <AlertCircle className="w-5 h-5 text-gray-400" />}
                {u.status === "processing" && <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />}
                {u.status === "success" && <CheckCircle className="w-5 h-5 text-green-500" />}
                {u.status === "error" && <XCircle className="w-5 h-5 text-red-500" />}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">{u.fileName}</p>
                  <p className="text-xs text-gray-500">
                    {u.fileType}
                    {u.recordCount != null && ` — ${u.recordCount.toLocaleString("en-IN")} records`}
                    {u.fileDate && ` — file date: ${new Date(u.fileDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`}
                    {u.errorMessage && <span className="text-red-500"> — {u.errorMessage}</span>}
                  </p>
                </div>
              </div>
            ))}
            {buildingCustomers && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50">
                <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                <p className="text-sm text-blue-700">Building Customer 360 dimension...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Data Status */}
      {dataStatus && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
              <Database className="w-5 h-5" />
              Data Status
            </h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRebuildCustomers}
                disabled={buildingCustomers}
                className="text-xs"
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${buildingCustomers ? "animate-spin" : ""}`} />
                Rebuild Customer 360
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReprocessCCOD}
                disabled={reprocessing}
                className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                title="Re-classify CC/OD accounts using the already-stored Deposit Shadow and Loan Product Mapping. Run this after uploading the Deposit Shadow if CC/OD accounts show wrong categories."
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${reprocessing ? "animate-spin" : ""}`} />
                Re-classify CC/OD
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAllData}
                className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Clear All Data
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Deposit Product Mapping", count: dataStatus.productMapping, icon: "📋", fileType: "product-mapping" },
              { label: "Loan Product Mapping", count: dataStatus.loanProductMapping, icon: "📝", fileType: "loan-product-mapping" },
              { label: "Deposit Accounts", count: dataStatus.deposits, icon: "🏦", fileType: "deposit-shadow" },
              { label: "Loan Accounts", count: dataStatus.loans, icon: "💳", fileType: "loan-balance" },
              { label: "CC/OD Accounts", count: dataStatus.ccod, icon: "💰", fileType: "ccod-balance" },
              { label: "NPA Accounts", count: dataStatus.npa, icon: "⚠️", fileType: "npa-report" },
              { label: "Loan Shadow", count: dataStatus.loanShadow, icon: "📊", fileType: "loan-shadow" },
              { label: "Deposit Shadow", count: dataStatus.depositShadow, icon: "📈", fileType: "deposit-shadow" },
              { label: "Customers", count: dataStatus.customers, icon: "👥" },
            ].map((item) => {
              const recentLog = uploadLogs.find((log: any) => log.fileType === item.fileType && log.status === "success");
              const fileDate = recentLog?.fileDate ? new Date(recentLog.fileDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : null;
              
              return (
                <div
                  key={item.label}
                  className={`p-3 rounded-lg border ${statusBg(item.count)}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span>{item.icon}</span>
                    <span className="text-xs font-medium text-gray-600">{item.label}</span>
                  </div>
                  <p className={`text-lg font-bold ${statusColor(item.count)}`}>
                    {item.count.toLocaleString("en-IN")}
                  </p>
                  {fileDate && (
                    <p className="text-xs text-gray-500 mt-1">file date: {fileDate}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Re-process CCOD result panel */}
          {reprocessResult && (
            <div className={`mt-3 p-3 rounded-lg border text-sm ${
              reprocessResult.unresolved === 0
                ? "bg-green-50 border-green-200"
                : "bg-amber-50 border-amber-200"
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-gray-700">CC/OD Re-classification Result</span>
              </div>
              <div className="flex gap-4 text-xs mb-2">
                <span className="text-gray-600">Total: <strong>{reprocessResult.total}</strong></span>
                <span className="text-green-700">Resolved: <strong>{reprocessResult.resolved}</strong></span>
                <span className={reprocessResult.unresolved > 0 ? "text-amber-700" : "text-gray-400"}>
                  Unresolved: <strong>{reprocessResult.unresolved}</strong>
                </span>
              </div>
              {reprocessResult.unmappedCodes.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-amber-700 mb-1">Unmapped product codes (add these to Loan Product Mapping):</p>
                  <div className="flex flex-wrap gap-1">
                    {reprocessResult.unmappedCodes.map((code, i) => (
                      <span key={i} className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-mono">{code}</span>
                    ))}
                  </div>
                </div>
              )}
              {reprocessResult.unresolved === 0 && (
                <p className="text-xs text-green-700">All CC/OD accounts successfully classified. Refresh the Loans Portfolio to see updated categories.</p>
              )}
            </div>
          )}
        </div>
      )}
      {/* Upload History */}
      {uploadLogs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-700 mb-3">Recent Upload History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Upload Date</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">File Date</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">File Type</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">File Name</th>
                  <th className="text-right py-2 px-3 text-gray-500 font-medium">Records</th>
                  <th className="text-center py-2 px-3 text-gray-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {uploadLogs.map((log, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2 px-3 text-gray-600">
                      {log.uploadDate ? new Date(log.uploadDate).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "-"}
                    </td>
                    <td className="py-2 px-3 text-gray-600">
                      {log.fileDate ? new Date(log.fileDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                    </td>
                    <td className="py-2 px-3 text-gray-700 font-medium">
                      {FILE_TYPE_LABELS[log.fileType] || log.fileType}
                    </td>
                    <td className="py-2 px-3 text-gray-600 truncate max-w-[200px]">{log.fileName}</td>
                    <td className="py-2 px-3 text-right text-gray-700">{(log.recordCount || 0).toLocaleString("en-IN")}</td>
                    <td className="py-2 px-3 text-center">
                      {log.status === "success" ? (
                        <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
                          <CheckCircle className="w-3 h-3" /> Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600 text-xs font-medium">
                          <XCircle className="w-3 h-3" /> Error
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
