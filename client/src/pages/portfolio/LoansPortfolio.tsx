/**
 * Loans Portfolio Dashboard
 * Loan analytics, SMA tracking, EMI analysis, category breakdown
 */

import { useState, useEffect, useMemo } from "react";
import { Search, Download, CreditCard, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAllRecords, getRecordCount, STORES } from "@/lib/portfolioDb";
import { formatINR, formatINRFull } from "@/lib/portfolioTransform";

export default function LoansPortfolio() {
  const [loans, setLoans] = useState<any[]>([]);
  const [ccod, setCcod] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [smaFilter, setSmaFilter] = useState("All");
  const [exposureFilter, setExposureFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"summary" | "table">("summary");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [lc, cc] = await Promise.all([getRecordCount(STORES.LOAN_DATA), getRecordCount(STORES.CCOD_DATA)]);
      if (lc === 0 && cc === 0) { setHasData(false); setLoading(false); return; }
      setHasData(true);
      const [ld, cd] = await Promise.all([getAllRecords(STORES.LOAN_DATA), getAllRecords(STORES.CCOD_DATA)]);
      setLoans(ld);
      setCcod(cd);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  const analytics = useMemo(() => {
    if (loans.length === 0 && ccod.length === 0) return null;

    const totalLoanOutstanding = loans.reduce((s, l) => s + Math.abs(l.OUTSTAND || 0), 0);
    // Only count negative balances (debit) in CC/OD as loan exposure
    const totalCCODBalance = ccod
      .filter(c => (c.CurrentBalance || 0) < 0)
      .reduce((s, c) => s + Math.abs(c.CurrentBalance), 0);
    const totalAdvances = totalLoanOutstanding + totalCCODBalance;

    // SMA distribution
    const smaMap: Record<string, { count: number; amount: number }> = {};
    for (const l of loans) {
      const sma = l.SMA_CLASS || "Unclassified";
      if (!smaMap[sma]) smaMap[sma] = { count: 0, amount: 0 };
      smaMap[sma].count += 1;
      smaMap[sma].amount += Math.abs(l.OUTSTAND || 0);
    }
    for (const c of ccod) {
      const sma = c.SMA_CLASS || "Unclassified";
      if (!smaMap[sma]) smaMap[sma] = { count: 0, amount: 0 };
      smaMap[sma].count += 1;
      smaMap[sma].amount += Math.abs(c.CurrentBalance || 0);
    }
    const smaOrder = ["STD", "SMA0", "SMA1", "SMA2", "NPA", "Unclassified"];
    const smaDistribution = Object.entries(smaMap)
      .map(([cls, v]) => ({ class: cls, ...v }))
      .sort((a, b) => smaOrder.indexOf(a.class) - smaOrder.indexOf(b.class));

    // Loan category breakdown
    const catMap: Record<string, { balance: number; count: number }> = {};
    for (const l of loans) {
      const cat = l.Loan_Category || "Other";
      if (!catMap[cat]) catMap[cat] = { balance: 0, count: 0 };
      catMap[cat].balance += Math.abs(l.OUTSTAND || 0);
      catMap[cat].count += 1;
    }
    if (ccod.length > 0) {
      // Only count negative balance CC/OD accounts in loan categories
      const negativeCCOD = ccod.filter(c => (c.CurrentBalance || 0) < 0);
      catMap["CC/OD"] = { balance: totalCCODBalance, count: negativeCCOD.length };
    }
    const loanCategories = Object.entries(catMap).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.balance - a.balance);

    // Gold Loans maturing in next 15 days
    const today = new Date();
    const next15Days = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000);
    const goldLoansMaturing = loans.filter(l => {
      const isGold = (l.Loan_Category || "").toLowerCase().includes("gold") || (l.ACCTDESC || "").toLowerCase().includes("gold");
      if (!isGold || !l.Shadow_Maturity_Dt) return false;
      const maturityDate = new Date(l.Shadow_Maturity_Dt);
      return maturityDate >= today && maturityDate <= next15Days;
    });
    const goldMaturityCount = goldLoansMaturing.length;
    const goldMaturityAmount = goldLoansMaturing.reduce((s, l) => s + Math.abs(l.OUTSTAND || 0), 0);

    // Personal Loans repaid ≥50% of sanctioned limit
    const personalLoansHalfRepaid = loans.filter(l => {
      const isPersonal = (l.Loan_Category || "").toLowerCase().includes("personal") || (l.ACCTDESC || "").toLowerCase().includes("personal");
      if (!isPersonal) return false;
      const sanctioned = l.Shadow_App_Lmt || l.LIMIT || 0;
      const outstanding = Math.abs(l.OUTSTAND || 0);
      if (sanctioned === 0) return false;
      const repaidPct = ((sanctioned - outstanding) / sanctioned) * 100;
      return repaidPct >= 50;
    });
    const personalHalfRepaidCount = personalLoansHalfRepaid.length;
    const personalHalfRepaidAmount = personalLoansHalfRepaid.reduce((s, l) => s + Math.abs(l.OUTSTAND || 0), 0);

    // Forecast buckets
    const fbMap: Record<string, { count: number; amount: number }> = {};
    for (const l of loans) {
      const fb = l.Forecast_Bucket || "Unknown";
      if (!fbMap[fb]) fbMap[fb] = { count: 0, amount: 0 };
      fbMap[fb].count += 1;
      fbMap[fb].amount += Math.abs(l.OUTSTAND || 0);
    }
    const fbOrder = ["1 Month", "3 Months", "6 Months", "12 Months", "12+ Months", "Unknown"];
    const forecastBuckets = Object.entries(fbMap).map(([name, v]) => ({ name, ...v })).sort((a, b) => fbOrder.indexOf(a.name) - fbOrder.indexOf(b.name));

    // Interest rate distribution
    const irBands: Record<string, { count: number; amount: number }> = {};
    for (const l of [...loans, ...ccod]) {
      const rate = l.INTRATE || 0;
      let band = "0%";
      if (rate > 0 && rate <= 7) band = "≤7%";
      else if (rate <= 8.5) band = "7-8.5%";
      else if (rate <= 10) band = "8.5-10%";
      else if (rate <= 12) band = "10-12%";
      else if (rate > 12) band = ">12%";
      if (!irBands[band]) irBands[band] = { count: 0, amount: 0 };
      irBands[band].count += 1;
      irBands[band].amount += Math.abs(l.OUTSTAND || l.CurrentBalance || 0);
    }
    const irDistribution = Object.entries(irBands).map(([name, v]) => ({ name, ...v }));

    // Write-off summary
    const writeOffLoans = loans.filter(l => l.WRITE_OFF_FLAG === "Y" || l.WRITE_OFF_AMOUNT > 0);
    const writeOffCCOD = ccod.filter(c => c.WRITE_OFF_FLAG === "Y" || c.WRITE_OFF_AMT > 0);
    const totalWriteOff = writeOffLoans.reduce((s, l) => s + (l.WRITE_OFF_AMOUNT || 0), 0) +
      writeOffCCOD.reduce((s, c) => s + (c.WRITE_OFF_AMT || 0), 0);

    // Restructured (RA field is "Y" or "N")
    const raLoans = loans.filter(l => l.RA === "Y");
    const raCCOD = ccod.filter(c => c.RA === "Y");

    // CC/OD specific
    const irregularCCOD = ccod.filter(c => c.Irregular_Flag === "Irregular" || c.Irregular_Flag === "Overdrawn");
    // Utilization is already a ratio (balance/limit), so multiply by 100 for percentage
    // Filter out null/extreme values for meaningful average
    const validUtilCCOD = ccod.filter(c => c.Utilization != null && c.Utilization >= 0 && c.Utilization <= 5);
    const avgUtilization = validUtilCCOD.length > 0 ? (validUtilCCOD.reduce((s, c) => s + (c.Utilization || 0), 0) / validUtilCCOD.length) * 100 : 0;

    return {
      totalLoanOutstanding, totalCCODBalance, totalAdvances,
      loanCount: loans.length, ccodCount: ccod.length,
      smaDistribution, loanCategories, forecastBuckets, irDistribution,
      goldMaturityCount, goldMaturityAmount,
      personalHalfRepaidCount, personalHalfRepaidAmount,
      totalWriteOff, writeOffCount: writeOffLoans.length + writeOffCCOD.length,
      raCount: raLoans.length + raCCOD.length,
      irregularCCOD: irregularCCOD.length, avgUtilization,
    };
  }, [loans, ccod]);

  // Combined data for table
  const allAccounts = useMemo(() => {
    const combined = [
      ...loans.map(l => ({ ...l, _type: "Term Loan", _outstanding: Math.abs(l.OUTSTAND || 0), _name: l.CUSTNAME, _acNo: l.LoanKey, _cif: l.CIF, _sma: l.SMA_CLASS, _category: l.Loan_Category })),
      ...ccod.map(c => ({ ...c, _type: "CC/OD", _outstanding: Math.abs(c.CurrentBalance || 0), _name: c.CUSTNAME, _acNo: c.LoanKey, _cif: c.CIF, _sma: c.SMA_CLASS, _category: "CC/OD" })),
    ];
    let filtered = combined;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a => (a._name || "").toLowerCase().includes(term) || (a._acNo || "").includes(term) || (a._cif || "").includes(term));
    }
    if (categoryFilter !== "All") filtered = filtered.filter(a => a._category === categoryFilter);
    if (smaFilter !== "All") filtered = filtered.filter(a => (a._sma || "Unclassified") === smaFilter);
    if (exposureFilter !== "All") filtered = filtered.filter(a => a._type === exposureFilter);
    return filtered.sort((a, b) => b._outstanding - a._outstanding);
  }, [loans, ccod, searchTerm, categoryFilter, smaFilter, exposureFilter]);

  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    loans.forEach(l => cats.add(l.Loan_Category || "Other"));
    if (ccod.length > 0) cats.add("CC/OD");
    return ["All", ...Array.from(cats)];
  }, [loans, ccod]);

  function exportCSV() {
    const headers = ["Account No", "CIF", "Customer Name", "Type", "Category", "Outstanding", "Int Rate", "SMA Class", "IRAC", "EMI", "EMIs Overdue"];
    const csvContent = [
      headers.join(","),
      ...allAccounts.map(a => [a._acNo, a._cif, `"${a._name}"`, a._type, a._category, a._outstanding, a.INTRATE || 0, a._sma || "", a.NEWIRAC || "", a.INSTALAMT || "", a.EMISOvrdue || ""].join(","))
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `loans_portfolio_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  const smaColorMap: Record<string, string> = {
    STD: "bg-green-100 text-green-800", SMA0: "bg-yellow-100 text-yellow-800",
    SMA1: "bg-orange-100 text-orange-800", SMA2: "bg-red-100 text-red-800",
    NPA: "bg-red-200 text-red-900", Unclassified: "bg-gray-100 text-gray-600",
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!hasData) return (
    <div className="flex items-center justify-center h-64"><div className="text-center">
      <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-gray-600 mb-2">No Loan Data</h3>
      <p className="text-gray-400">Upload the Loan Balance and/or CC/OD Balance files.</p>
    </div></div>
  );
  if (!analytics) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Loans Portfolio</h2>
          <p className="text-gray-500 mt-1">Advances analytics including Term Loans and CC/OD accounts</p>
        </div>
        <div className="flex gap-2">
          <Button variant={viewMode === "summary" ? "default" : "outline"} size="sm" onClick={() => setViewMode("summary")}
            className={viewMode === "summary" ? "bg-purple-700 hover:bg-purple-800" : ""}>Summary</Button>
          <Button variant={viewMode === "table" ? "default" : "outline"} size="sm" onClick={() => setViewMode("table")}
            className={viewMode === "table" ? "bg-purple-700 hover:bg-purple-800" : ""}>Account View</Button>
        </div>
      </div>

      {viewMode === "summary" ? (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Total Advances</p>
              <p className="text-xl font-bold text-purple-700">{formatINR(analytics.totalAdvances)}</p>
              <p className="text-xs text-gray-400">{(analytics.loanCount + analytics.ccodCount).toLocaleString("en-IN")} accounts</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Term Loans</p>
              <p className="text-xl font-bold text-blue-700">{formatINR(analytics.totalLoanOutstanding)}</p>
              <p className="text-xs text-gray-400">{analytics.loanCount.toLocaleString("en-IN")} accounts</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">CC/OD</p>
              <p className="text-xl font-bold text-green-700">{formatINR(analytics.totalCCODBalance)}</p>
              <p className="text-xs text-gray-400">{analytics.ccodCount.toLocaleString("en-IN")} accounts</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Write-Off</p>
              <p className="text-xl font-bold text-red-700">{formatINR(analytics.totalWriteOff)}</p>
              <p className="text-xs text-gray-400">{analytics.writeOffCount} accounts</p>
            </div>
          </div>

          {/* EMI & SMA Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 mb-3">Key Loan Metrics</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-amber-600 font-medium">Gold Loans Maturing (15 Days)</span>
                    <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">{analytics.goldMaturityCount} a/c</span>
                  </div>
                  <p className="text-lg font-bold text-amber-700">{formatINR(analytics.goldMaturityAmount)}</p>
                </div>
                <div className="border-t border-gray-100 pt-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-green-600 font-medium">Personal Loans Repaid ≥50%</span>
                    <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">{analytics.personalHalfRepaidCount} a/c</span>
                  </div>
                  <p className="text-lg font-bold text-green-700">{formatINR(analytics.personalHalfRepaidAmount)}</p>
                  <p className="text-xs text-gray-500 mt-1">Outstanding amount of well-performing personal loans</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 mb-3">CC/OD Health</h3>
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-sm text-gray-600">Avg Utilization</span><span className="font-medium">{analytics.avgUtilization.toFixed(1)}%</span></div>
                <div className="flex justify-between"><span className="text-sm text-orange-600">Irregular Accounts</span><span className="font-medium text-orange-600">{analytics.irregularCCOD}</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-600">Restructured</span><span className="font-medium">{analytics.raCount}</span></div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 mb-3">SMA Classification</h3>
              <div className="space-y-2">
                {analytics.smaDistribution.map(s => (
                  <div key={s.class} className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${smaColorMap[s.class] || "bg-gray-100 text-gray-600"}`}>{s.class}</span>
                    <span className="text-sm text-gray-600">{s.count} a/c</span>
                    <span className="text-sm font-medium">{formatINR(s.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Category & Forecast */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h3 className="font-semibold text-gray-700 mb-4">Loan Category Breakdown</h3>
              <div className="space-y-3">
                {analytics.loanCategories.map(cat => {
                  const pct = analytics.totalAdvances > 0 ? (cat.balance / analytics.totalAdvances) * 100 : 0;
                  return (
                    <div key={cat.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{cat.name}</span>
                        <span className="font-medium text-gray-800">{formatINR(cat.balance)} <span className="text-gray-400">({cat.count})</span></span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-400 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h3 className="font-semibold text-gray-700 mb-4">Maturity Forecast</h3>
              <div className="space-y-3">
                {analytics.forecastBuckets.map(fb => (
                  <div key={fb.name} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 w-24">{fb.name}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-400 rounded-full" style={{ width: `${analytics.totalLoanOutstanding > 0 ? Math.min((fb.amount / analytics.totalLoanOutstanding) * 100, 100) : 0}%` }} />
                    </div>
                    <span className="text-xs font-medium text-gray-700 w-20 text-right">{formatINR(fb.amount)}</span>
                    <span className="text-xs text-gray-400 w-10 text-right">{fb.count}</span>
                  </div>
                ))}
              </div>

              <h3 className="font-semibold text-gray-700 mt-6 mb-4">Interest Rate Distribution</h3>
              <div className="space-y-2">
                {analytics.irDistribution.map(ir => (
                  <div key={ir.name} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 w-16">{ir.name}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-400 rounded-full" style={{ width: `${analytics.totalAdvances > 0 ? Math.min((ir.amount / analytics.totalAdvances) * 100, 100) : 0}%` }} />
                    </div>
                    <span className="text-xs font-medium text-gray-700 w-20 text-right">{formatINR(ir.amount)}</span>
                    <span className="text-xs text-gray-400 w-10 text-right">{ir.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Search by name, account no, or CIF..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
              </div>
              <select value={exposureFilter} onChange={e => setExposureFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                <option value="All">All Types</option><option value="Term Loan">Term Loan</option><option value="CC/OD">CC/OD</option>
              </select>
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={smaFilter} onChange={e => setSmaFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                <option value="All">All SMA</option><option value="STD">STD</option><option value="SMA0">SMA0</option><option value="SMA1">SMA1</option><option value="SMA2">SMA2</option><option value="NPA">NPA</option>
              </select>
              <Button variant="outline" size="sm" onClick={exportCSV}><Download className="w-4 h-4 mr-1" /> Export</Button>
            </div>
            <p className="text-xs text-gray-400 mt-2">{allAccounts.length.toLocaleString("en-IN")} accounts shown</p>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 z-10">
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-3 text-gray-500 font-medium">Account No</th>
                    <th className="text-left py-3 px-3 text-gray-500 font-medium">CIF</th>
                    <th className="text-left py-3 px-3 text-gray-500 font-medium">Customer</th>
                    <th className="text-left py-3 px-3 text-gray-500 font-medium">Type</th>
                    <th className="text-left py-3 px-3 text-gray-500 font-medium">Product</th>
                    <th className="text-left py-3 px-3 text-gray-500 font-medium">Category</th>
                    <th className="text-right py-3 px-3 text-gray-500 font-medium">Outstanding</th>
                    <th className="text-left py-3 px-3 text-gray-500 font-medium">Maturity Date</th>
                    <th className="text-right py-3 px-3 text-gray-500 font-medium">Rate</th>
                    <th className="text-center py-3 px-3 text-gray-500 font-medium">SMA</th>
                    <th className="text-center py-3 px-3 text-gray-500 font-medium">IRAC</th>
                    <th className="text-right py-3 px-3 text-gray-500 font-medium">EMI</th>
                  </tr>
                </thead>
                <tbody>
                  {allAccounts.slice(0, 500).map(a => (
                    <tr key={a._acNo} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 px-3 text-gray-700 font-mono text-xs">{a._acNo}</td>
                      <td className="py-2 px-3 text-gray-600 text-xs">{a._cif}</td>
                      <td className="py-2 px-3 text-gray-700 font-medium truncate max-w-[180px]">{a._name}</td>
                      <td className="py-2 px-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a._type === "CC/OD" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}`}>{a._type}</span></td>
                      <td className="py-2 px-3 text-gray-600 text-xs truncate max-w-[150px]" title={a.ProductName || a.ACCTDESC || "-"}>{a.ProductName || a.ACCTDESC || "-"}</td>
                      <td className="py-2 px-3 text-gray-600 text-xs">{a._category}</td>
                      <td className="py-2 px-3 text-right font-medium text-gray-800">{formatINRFull(a._outstanding)}</td>
                      <td className="py-2 px-3 text-gray-600 text-xs">{a.Maturity_Dt ? new Date(a.Maturity_Dt).toLocaleDateString("en-IN") : "-"}</td>
                      <td className="py-2 px-3 text-right text-gray-600">{(a.INTRATE || 0) > 0 ? `${a.INTRATE.toFixed(2)}%` : "-"}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${smaColorMap[a._sma || "Unclassified"] || "bg-gray-100 text-gray-600"}`}>{a._sma || "-"}</span>
                      </td>
                      <td className="py-2 px-3 text-center text-xs text-gray-600">{a.NEWIRAC || "-"}</td>
                      <td className="py-2 px-3 text-right text-gray-600">{a.INSTALAMT ? formatINR(a.INSTALAMT) : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {allAccounts.length > 500 && <p className="text-center text-xs text-gray-400 py-3">Showing first 500 of {allAccounts.length.toLocaleString("en-IN")} accounts.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
