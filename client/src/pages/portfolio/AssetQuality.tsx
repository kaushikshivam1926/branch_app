/**
 * Asset Quality Dashboard
 * NPA management, SMA monitoring, and notice generation for borrowers
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { AlertTriangle, Search, Download, Printer, FileText, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAllRecords, getRecordCount, STORES } from "@/lib/portfolioDb";
import { formatINR, formatINRFull } from "@/lib/portfolioTransform";
import { useBranch } from "@/contexts/BranchContext";

export default function AssetQuality() {
  const { branchName, branchCode } = useBranch();
  const [loans, setLoans] = useState<any[]>([]);
  const [ccod, setCcod] = useState<any[]>([]);
  const [npaReport, setNpaReport] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [iracFilter, setIracFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"overview" | "npa-list" | "sma-watch">("overview");
  const [selectedForNotice, setSelectedForNotice] = useState<Set<string>>(new Set());
  const [showNoticePreview, setShowNoticePreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [lc, cc, nc] = await Promise.all([
        getRecordCount(STORES.LOAN_DATA), getRecordCount(STORES.CCOD_DATA), getRecordCount(STORES.NPA_DATA)
      ]);
      if (lc === 0 && cc === 0 && nc === 0) { setHasData(false); setLoading(false); return; }
      setHasData(true);
      const [ld, cd, nd] = await Promise.all([
        getAllRecords(STORES.LOAN_DATA), getAllRecords(STORES.CCOD_DATA), getAllRecords(STORES.NPA_DATA)
      ]);
      setLoans(ld); setCcod(cd); setNpaReport(nd);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  const analytics = useMemo(() => {
    const totalLoanOutstanding = loans.reduce((s, l) => s + Math.abs(l.OUTSTAND || 0), 0);
    const totalCCODBalance = ccod.reduce((s, c) => s + Math.abs(c.CurrentBalance || 0), 0);
    const totalAdvances = totalLoanOutstanding + totalCCODBalance;

    // NPA from loan balance
    const npaLoans = loans.filter(l => l.SMA_CLASS === "NPA" || (l.NEWIRAC && !["00", "01", ""].includes(l.NEWIRAC)));
    const npaCCOD = ccod.filter(c => c.SMA_CLASS === "NPA" || (c.NEWIRAC && !["00", "01", "0", ""].includes(c.NEWIRAC)));
    const npaLoanAmount = npaLoans.reduce((s, l) => s + Math.abs(l.OUTSTAND || 0), 0);
    const npaCCODAmount = npaCCOD.reduce((s, c) => s + Math.abs(c.CurrentBalance || 0), 0);
    const totalNPAAmount = npaLoanAmount + npaCCODAmount;
    const grossNPA = totalAdvances > 0 ? (totalNPAAmount / totalAdvances) * 100 : 0;

    // SMA breakdown
    const smaLoans = {
      SMA0: loans.filter(l => l.SMA_CLASS === "SMA0"),
      SMA1: loans.filter(l => l.SMA_CLASS === "SMA1"),
      SMA2: loans.filter(l => l.SMA_CLASS === "SMA2"),
    };
    const smaCCOD = {
      SMA0: ccod.filter(c => c.SMA_CLASS === "SMA0"),
      SMA1: ccod.filter(c => c.SMA_CLASS === "SMA1"),
      SMA2: ccod.filter(c => c.SMA_CLASS === "SMA2"),
    };

    const smaData = ["SMA0", "SMA1", "SMA2"].map(cls => ({
      class: cls,
      loanCount: (smaLoans as any)[cls].length,
      loanAmount: (smaLoans as any)[cls].reduce((s: number, l: any) => s + Math.abs(l.OUTSTAND || 0), 0),
      ccodCount: (smaCCOD as any)[cls].length,
      ccodAmount: (smaCCOD as any)[cls].reduce((s: number, c: any) => s + Math.abs(c.CurrentBalance || 0), 0),
      totalCount: (smaLoans as any)[cls].length + (smaCCOD as any)[cls].length,
      totalAmount: (smaLoans as any)[cls].reduce((s: number, l: any) => s + Math.abs(l.OUTSTAND || 0), 0) +
        (smaCCOD as any)[cls].reduce((s: number, c: any) => s + Math.abs(c.CurrentBalance || 0), 0),
    }));

    // IRAC classification from NPA report
    const iracMap: Record<string, { count: number; amount: number; desc: string }> = {};
    for (const n of npaReport) {
      const irac = n.IRAC_DESC || "Unknown";
      if (!iracMap[irac]) iracMap[irac] = { count: 0, amount: 0, desc: irac };
      iracMap[irac].count += 1;
      iracMap[irac].amount += Math.abs(n.OUTSTANDING || 0);
    }
    const iracDistribution = Object.values(iracMap).sort((a, b) => b.amount - a.amount);

    // Write-off
    const writeOffLoans = loans.filter(l => l.WRITE_OFF_FLAG === "Y" || l.WRITE_OFF_AMOUNT > 0);
    const writeOffCCOD = ccod.filter(c => c.WRITE_OFF_FLAG === "Y" || c.WRITE_OFF_AMT > 0);
    const totalWriteOff = writeOffLoans.reduce((s, l) => s + (l.WRITE_OFF_AMOUNT || 0), 0) +
      writeOffCCOD.reduce((s, c) => s + (c.WRITE_OFF_AMT || 0), 0);

    // Restructured (RA field is "Y" or "N")
    const raLoans = loans.filter(l => l.RA === "Y");
    const raCCOD = ccod.filter(c => c.RA === "Y");

    return {
      totalAdvances, totalNPAAmount, grossNPA,
      npaLoanCount: npaLoans.length, npaCCODCount: npaCCOD.length,
      npaLoanAmount, npaCCODAmount,
      npaReportCount: npaReport.length,
      smaData, iracDistribution,
      totalWriteOff, writeOffCount: writeOffLoans.length + writeOffCCOD.length,
      raCount: raLoans.length + raCCOD.length,
      raAmount: raLoans.reduce((s, l) => s + Math.abs(l.OUTSTAND || 0), 0) + raCCOD.reduce((s, c) => s + Math.abs(c.CurrentBalance || 0), 0),
    };
  }, [loans, ccod, npaReport]);

  // NPA list for table
  const filteredNPA = useMemo(() => {
    let filtered = npaReport;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(n => (n.CUSTOMER_NAME || "").toLowerCase().includes(term) || (n.ACCOUNT_NO || "").includes(term));
    }
    if (iracFilter !== "All") filtered = filtered.filter(n => n.IRAC_DESC === iracFilter);
    if (typeFilter !== "All") filtered = filtered.filter(n => n.SYS === typeFilter);
    return filtered.sort((a, b) => Math.abs(b.OUTSTANDING || 0) - Math.abs(a.OUTSTANDING || 0));
  }, [npaReport, searchTerm, iracFilter, typeFilter]);

  // SMA watchlist
  const smaWatchlist = useMemo(() => {
    const smaLoansFiltered = loans.filter(l => ["SMA0", "SMA1", "SMA2"].includes(l.SMA_CLASS));
    const smaCCODFiltered = ccod.filter(c => ["SMA0", "SMA1", "SMA2"].includes(c.SMA_CLASS));
    const combined = [
      ...smaLoansFiltered.map(l => ({ acNo: l.LoanKey, name: l.CUSTNAME, type: "Term Loan", sma: l.SMA_CLASS, outstanding: Math.abs(l.OUTSTAND || 0), emiOverdue: l.EMISOvrdue || 0, irac: l.NEWIRAC })),
      ...smaCCODFiltered.map(c => ({ acNo: c.LoanKey, name: c.CUSTNAME, type: "CC/OD", sma: c.SMA_CLASS, outstanding: Math.abs(c.CurrentBalance || 0), emiOverdue: 0, irac: c.NEWIRAC })),
    ];
    return combined.sort((a, b) => {
      const order: Record<string, number> = { SMA2: 0, SMA1: 1, SMA0: 2 };
      return (order[a.sma] ?? 3) - (order[b.sma] ?? 3) || b.outstanding - a.outstanding;
    });
  }, [loans, ccod]);

  function toggleNoticeSelection(acNo: string) {
    const newSet = new Set(selectedForNotice);
    if (newSet.has(acNo)) newSet.delete(acNo);
    else newSet.add(acNo);
    setSelectedForNotice(newSet);
  }

  function selectAllNPA() {
    if (selectedForNotice.size === filteredNPA.length) {
      setSelectedForNotice(new Set());
    } else {
      setSelectedForNotice(new Set(filteredNPA.map(n => n.ACCOUNT_NO)));
    }
  }

  function printNotices() {
    setShowNoticePreview(true);
    setTimeout(() => {
      const printContent = printRef.current;
      if (!printContent) return;
      const printWindow = window.open("", "_blank");
      if (!printWindow) return;
      printWindow.document.write(`
        <html><head><title>NPA Recovery Notices</title>
        <style>
          @page { size: A4; margin: 1.5cm; }
          body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.4; color: #000; }
          .notice { page-break-after: always; padding: 20px; }
          .notice:last-child { page-break-after: auto; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .header h1 { font-size: 16pt; font-weight: bold; margin: 0; }
          .header h2 { font-size: 13pt; margin: 5px 0; }
          .header p { font-size: 10pt; margin: 2px 0; }
          .ref-line { display: flex; justify-content: space-between; margin: 15px 0; font-size: 11pt; }
          .address-block { margin: 15px 0; }
          .subject { font-weight: bold; text-align: center; margin: 15px 0; text-decoration: underline; }
          .body-text { text-align: justify; margin: 10px 0; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          th, td { border: 1px solid #000; padding: 5px 8px; text-align: left; font-size: 11pt; }
          th { background: #f0f0f0; font-weight: bold; }
          .signature { margin-top: 40px; }
          .signature-line { margin-top: 50px; }
        </style></head><body>
        ${printContent.innerHTML}
        </body></html>
      `);
      printWindow.document.close();
      printWindow.print();
    }, 500);
  }

  function exportCSV() {
    const headers = ["Sr No", "Account No", "Customer Name", "Outstanding", "NPA Date", "IRAC", "IRAC Desc", "System", "Address", "Father Name"];
    const csvContent = [
      headers.join(","),
      ...filteredNPA.map(n => [n.SR_NO, n.ACCOUNT_NO, `"${n.CUSTOMER_NAME}"`, n.OUTSTANDING, n.NPA_DATE, n.NEW_IRAC, n.IRAC_DESC, n.SYS, `"${[n.ADDRESS1, n.ADDRESS2, n.ADDRESS3].filter(Boolean).join(", ")}"`, `"${n.FATHER_NAME}"`].join(","))
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `npa_accounts_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  const smaColorMap: Record<string, string> = {
    SMA0: "bg-yellow-100 text-yellow-800 border-yellow-300",
    SMA1: "bg-orange-100 text-orange-800 border-orange-300",
    SMA2: "bg-red-100 text-red-800 border-red-300",
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!hasData) return (
    <div className="flex items-center justify-center h-64"><div className="text-center">
      <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-gray-600 mb-2">No Asset Quality Data</h3>
      <p className="text-gray-400">Upload loan files and NPA report to view asset quality dashboard.</p>
    </div></div>
  );

  const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Asset Quality</h2>
          <p className="text-gray-500 mt-1">NPA monitoring, SMA watchlist, and recovery notice generation</p>
        </div>
        <div className="flex gap-2">
          {["overview", "npa-list", "sma-watch"].map(mode => (
            <Button key={mode} variant={viewMode === mode ? "default" : "outline"} size="sm"
              onClick={() => setViewMode(mode as any)}
              className={viewMode === mode ? "bg-purple-700 hover:bg-purple-800" : ""}>
              {mode === "overview" ? "Overview" : mode === "npa-list" ? "NPA List" : "SMA Watch"}
            </Button>
          ))}
        </div>
      </div>

      {viewMode === "overview" && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-red-200 p-4 shadow-sm">
              <p className="text-xs text-red-500 mb-1">Gross NPA Ratio</p>
              <p className="text-2xl font-bold text-red-700">{analytics.grossNPA.toFixed(2)}%</p>
              <p className="text-xs text-gray-400">{formatINR(analytics.totalNPAAmount)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">NPA Accounts</p>
              <p className="text-2xl font-bold text-gray-800">{analytics.npaReportCount}</p>
              <p className="text-xs text-gray-400">Loans: {analytics.npaLoanCount} | CC/OD: {analytics.npaCCODCount}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Write-Off</p>
              <p className="text-2xl font-bold text-gray-800">{formatINR(analytics.totalWriteOff)}</p>
              <p className="text-xs text-gray-400">{analytics.writeOffCount} accounts</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Restructured</p>
              <p className="text-2xl font-bold text-gray-800">{analytics.raCount}</p>
              <p className="text-xs text-gray-400">{formatINR(analytics.raAmount)}</p>
            </div>
          </div>

          {/* SMA Pipeline */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-4">SMA Pipeline (Stress to NPA)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Classification</th>
                    <th className="text-center py-2 px-3 text-gray-500 font-medium">Loans</th>
                    <th className="text-right py-2 px-3 text-gray-500 font-medium">Loan Amount</th>
                    <th className="text-center py-2 px-3 text-gray-500 font-medium">CC/OD</th>
                    <th className="text-right py-2 px-3 text-gray-500 font-medium">CC/OD Amount</th>
                    <th className="text-center py-2 px-3 text-gray-500 font-medium font-bold">Total</th>
                    <th className="text-right py-2 px-3 text-gray-500 font-medium font-bold">Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.smaData.map(s => (
                    <tr key={s.class} className="border-b border-gray-50">
                      <td className="py-2 px-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${smaColorMap[s.class] || "bg-gray-100 text-gray-600"}`}>{s.class}</span>
                      </td>
                      <td className="py-2 px-3 text-center">{s.loanCount}</td>
                      <td className="py-2 px-3 text-right">{formatINR(s.loanAmount)}</td>
                      <td className="py-2 px-3 text-center">{s.ccodCount}</td>
                      <td className="py-2 px-3 text-right">{formatINR(s.ccodAmount)}</td>
                      <td className="py-2 px-3 text-center font-bold">{s.totalCount}</td>
                      <td className="py-2 px-3 text-right font-bold">{formatINR(s.totalAmount)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-gray-300 bg-red-50">
                    <td className="py-2 px-3 font-bold text-red-700">NPA</td>
                    <td className="py-2 px-3 text-center font-bold text-red-700">{analytics.npaLoanCount}</td>
                    <td className="py-2 px-3 text-right font-bold text-red-700">{formatINR(analytics.npaLoanAmount)}</td>
                    <td className="py-2 px-3 text-center font-bold text-red-700">{analytics.npaCCODCount}</td>
                    <td className="py-2 px-3 text-right font-bold text-red-700">{formatINR(analytics.npaCCODAmount)}</td>
                    <td className="py-2 px-3 text-center font-bold text-red-700">{analytics.npaLoanCount + analytics.npaCCODCount}</td>
                    <td className="py-2 px-3 text-right font-bold text-red-700">{formatINR(analytics.totalNPAAmount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* IRAC Distribution */}
          {analytics.iracDistribution.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h3 className="font-semibold text-gray-700 mb-4">IRAC Classification (from NPA Report)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {analytics.iracDistribution.map(i => (
                  <div key={i.desc} className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-red-700">{i.desc}</p>
                    <p className="text-xl font-bold text-red-800 mt-1">{formatINR(i.amount)}</p>
                    <p className="text-xs text-red-500">{i.count} accounts</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {viewMode === "npa-list" && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Search by name or account no..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
              </div>
              <select value={iracFilter} onChange={e => setIracFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                <option value="All">All IRAC</option>
                {Array.from(new Set(npaReport.map((n: any) => n.IRAC_DESC).filter(Boolean))).map(d => <option key={d as string} value={d as string}>{d as string}</option>)}
              </select>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                <option value="All">All Types</option>
                {Array.from(new Set(npaReport.map((n: any) => n.SYS).filter(Boolean))).map(s => <option key={s as string} value={s as string}>{s as string}</option>)}
              </select>
              <Button variant="outline" size="sm" onClick={exportCSV}><Download className="w-4 h-4 mr-1" /> Export</Button>
              <Button variant="outline" size="sm" onClick={selectAllNPA}>
                {selectedForNotice.size === filteredNPA.length ? "Deselect All" : "Select All"}
              </Button>
              {selectedForNotice.size > 0 && (
                <Button size="sm" onClick={printNotices} className="bg-red-600 hover:bg-red-700 text-white">
                  <Printer className="w-4 h-4 mr-1" /> Print Notices ({selectedForNotice.size})
                </Button>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2">{filteredNPA.length} NPA accounts | {selectedForNotice.size} selected for notice</p>
          </div>

          {/* NPA Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 z-10">
                  <tr className="border-b border-gray-200">
                    <th className="py-3 px-3 w-8"><input type="checkbox" checked={selectedForNotice.size === filteredNPA.length && filteredNPA.length > 0} onChange={selectAllNPA} /></th>
                    <th className="text-left py-3 px-3 text-gray-500 font-medium">Account No</th>
                    <th className="text-left py-3 px-3 text-gray-500 font-medium">Customer</th>
                    <th className="text-right py-3 px-3 text-gray-500 font-medium">Outstanding</th>
                    <th className="text-left py-3 px-3 text-gray-500 font-medium">NPA Date</th>
                    <th className="text-center py-3 px-3 text-gray-500 font-medium">IRAC</th>
                    <th className="text-left py-3 px-3 text-gray-500 font-medium">Type</th>
                    <th className="text-left py-3 px-3 text-gray-500 font-medium">Address</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNPA.map(n => (
                    <tr key={n.ACCOUNT_NO} className={`border-b border-gray-50 hover:bg-gray-50 ${selectedForNotice.has(n.ACCOUNT_NO) ? "bg-red-50" : ""}`}>
                      <td className="py-2 px-3"><input type="checkbox" checked={selectedForNotice.has(n.ACCOUNT_NO)} onChange={() => toggleNoticeSelection(n.ACCOUNT_NO)} /></td>
                      <td className="py-2 px-3 font-mono text-xs text-gray-700">{n.ACCOUNT_NO}</td>
                      <td className="py-2 px-3">
                        <p className="text-gray-700 font-medium">{n.CUSTOMER_NAME}</p>
                        {n.FATHER_NAME && <p className="text-xs text-gray-400">S/o {n.FATHER_NAME}</p>}
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-red-700">{formatINRFull(Math.abs(n.OUTSTANDING || 0))}</td>
                      <td className="py-2 px-3 text-xs text-gray-600">{n.NPA_DATE ? new Date(n.NPA_DATE).toLocaleDateString("en-IN") : "-"}</td>
                      <td className="py-2 px-3 text-center">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">{n.IRAC_DESC}</span>
                      </td>
                      <td className="py-2 px-3 text-xs text-gray-600">{n.SYS}</td>
                      <td className="py-2 px-3 text-xs text-gray-600 truncate max-w-[200px]">{[n.ADDRESS1, n.ADDRESS2, n.ADDRESS3].filter(Boolean).join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {viewMode === "sma-watch" && (
        <>
          {/* SMA Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analytics.smaData.map(s => (
              <div key={s.class} className={`rounded-xl border p-4 ${smaColorMap[s.class]}`}>
                <p className="text-sm font-bold">{s.class}</p>
                <p className="text-xl font-bold mt-1">{formatINR(s.totalAmount)}</p>
                <p className="text-xs">{s.totalCount} accounts (Loans: {s.loanCount}, CC/OD: {s.ccodCount})</p>
              </div>
            ))}
          </div>

          {/* SMA Watchlist Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-700">SMA Watchlist — Accounts at Risk of Slippage</h3>
              <p className="text-xs text-gray-400 mt-1">{smaWatchlist.length} accounts under stress monitoring</p>
            </div>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 z-10">
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-3 text-gray-500 font-medium">Account No</th>
                    <th className="text-left py-3 px-3 text-gray-500 font-medium">Customer</th>
                    <th className="text-left py-3 px-3 text-gray-500 font-medium">Type</th>
                    <th className="text-center py-3 px-3 text-gray-500 font-medium">SMA</th>
                    <th className="text-right py-3 px-3 text-gray-500 font-medium">Outstanding</th>
                    <th className="text-center py-3 px-3 text-gray-500 font-medium">EMIs O/D</th>
                  </tr>
                </thead>
                <tbody>
                  {smaWatchlist.map(s => (
                    <tr key={s.acNo} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 px-3 font-mono text-xs text-gray-700">{s.acNo}</td>
                      <td className="py-2 px-3 text-gray-700 font-medium truncate max-w-[200px]">{s.name}</td>
                      <td className="py-2 px-3 text-xs text-gray-600">{s.type}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${smaColorMap[s.sma] || "bg-gray-100 text-gray-600"}`}>{s.sma}</span>
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-gray-800">{formatINR(s.outstanding)}</td>
                      <td className="py-2 px-3 text-center">{s.emiOverdue > 0 ? <span className="text-red-600 font-medium">{s.emiOverdue}</span> : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Hidden Notice Print Template */}
      <div ref={printRef} style={{ display: showNoticePreview ? "block" : "none", position: "absolute", left: "-9999px" }}>
        {Array.from(selectedForNotice).map(acNo => {
          const npa = npaReport.find((n: any) => n.ACCOUNT_NO === acNo);
          if (!npa) return null;
          return (
            <div key={acNo} className="notice">
              <div className="header">
                <h1>STATE BANK OF INDIA</h1>
                <h2>{branchName}</h2>
                <p>Branch Code: {branchCode}</p>
              </div>
              <div className="ref-line">
                <span>Ref: {branchCode}/NPA/{acNo}/{new Date().getFullYear()}</span>
                <span>Date: {today}</span>
              </div>
              <div className="address-block">
                <p><strong>To,</strong></p>
                <p>{npa.CUSTOMER_NAME}</p>
                {npa.FATHER_NAME && <p>S/o {npa.FATHER_NAME}</p>}
                {npa.ADDRESS1 && <p>{npa.ADDRESS1}</p>}
                {npa.ADDRESS2 && <p>{npa.ADDRESS2}</p>}
                {npa.ADDRESS3 && <p>{npa.ADDRESS3}</p>}
                {npa.POSTCODE && <p>PIN: {npa.POSTCODE}</p>}
              </div>
              <p className="subject">NOTICE FOR RECOVERY OF DUES — ACCOUNT NO: {acNo}</p>
              <p className="body-text">Dear Sir/Madam,</p>
              <p className="body-text">
                It is observed that your above-mentioned loan account has been classified as <strong>Non-Performing Asset ({npa.IRAC_DESC})</strong> with
                effect from <strong>{npa.NPA_DATE ? new Date(npa.NPA_DATE).toLocaleDateString("en-IN") : "N/A"}</strong>.
              </p>
              <table>
                <tbody>
                  <tr><th>Account Number</th><td>{acNo}</td></tr>
                  <tr><th>Outstanding Amount</th><td>{formatINRFull(Math.abs(npa.OUTSTANDING || 0))}</td></tr>
                  <tr><th>NPA Classification</th><td>{npa.IRAC_DESC}</td></tr>
                  <tr><th>NPA Date</th><td>{npa.NPA_DATE ? new Date(npa.NPA_DATE).toLocaleDateString("en-IN") : "N/A"}</td></tr>
                  <tr><th>Account Type</th><td>{npa.SYS}</td></tr>
                </tbody>
              </table>
              <p className="body-text">
                You are hereby called upon to pay the above-mentioned outstanding dues within <strong>15 days</strong> from the date of receipt of this notice,
                failing which the Bank shall be constrained to initiate appropriate legal proceedings for recovery of its dues, including but not limited to
                proceedings under the SARFAESI Act, 2002, and/or filing of suit before the Debt Recovery Tribunal.
              </p>
              <p className="body-text">
                You are advised to contact the undersigned at the earliest to discuss the matter and arrange for immediate repayment.
              </p>
              <div className="signature">
                <p>Yours faithfully,</p>
                <p className="signature-line">_________________________</p>
                <p><strong>Chief/Branch Manager</strong></p>
                <p>State Bank of India</p>
                <p>{branchName}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
