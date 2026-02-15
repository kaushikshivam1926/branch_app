/**
 * Deposit Portfolio Dashboard
 * Detailed deposit analytics, category breakdown, maturity analysis, dormancy tracking
 */

import { useState, useEffect, useMemo } from "react";
import { Search, Filter, Download, PiggyBank, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAllRecords, getRecordCount, STORES } from "@/lib/portfolioDb";
import { formatINR, formatINRFull } from "@/lib/portfolioTransform";

export default function DepositPortfolio() {
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [dormancyFilter, setDormancyFilter] = useState("All");
  const [valueBandFilter, setValueBandFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"summary" | "table">("summary");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const count = await getRecordCount(STORES.DEPOSIT_DATA);
      if (count === 0) { setHasData(false); setLoading(false); return; }
      setHasData(true);
      const data = await getAllRecords(STORES.DEPOSIT_DATA);
      setDeposits(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  // Computed analytics
  const analytics = useMemo(() => {
    if (deposits.length === 0) return null;

    const active = deposits.filter(d => d.Dormancy_Flag !== "Closed");
    const totalBalance = active.reduce((s, d) => s + (d.CurrentBalance || 0), 0);

    // Category breakdown
    const catMap: Record<string, { balance: number; count: number; avgBal: number }> = {};
    for (const d of active) {
      const cat = d.Category || "Unknown";
      if (!catMap[cat]) catMap[cat] = { balance: 0, count: 0, avgBal: 0 };
      catMap[cat].balance += d.CurrentBalance || 0;
      catMap[cat].count += 1;
    }
    for (const k of Object.keys(catMap)) {
      catMap[k].avgBal = catMap[k].count > 0 ? catMap[k].balance / catMap[k].count : 0;
    }
    const categories = Object.entries(catMap).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.balance - a.balance);

    // Dormancy breakdown
    const dormMap: Record<string, { count: number; balance: number }> = {};
    for (const d of deposits) {
      const flag = d.Dormancy_Flag || "Unknown";
      if (!dormMap[flag]) dormMap[flag] = { count: 0, balance: 0 };
      dormMap[flag].count += 1;
      dormMap[flag].balance += d.CurrentBalance || 0;
    }
    const dormancy = Object.entries(dormMap).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.count - a.count);

    // Value band breakdown (CASA only)
    const vbMap: Record<string, { count: number; balance: number }> = {};
    for (const d of active) {
      if (d.Deposit_Value_Band) {
        const vb = d.Deposit_Value_Band;
        if (!vbMap[vb]) vbMap[vb] = { count: 0, balance: 0 };
        vbMap[vb].count += 1;
        vbMap[vb].balance += d.CurrentBalance || 0;
      }
    }
    const valueBands = Object.entries(vbMap).map(([name, v]) => ({ name, ...v }));

    // Maturity bucket breakdown (Term deposits)
    const matMap: Record<string, { count: number; balance: number }> = {};
    for (const d of active) {
      if (d.Maturity_Bucket) {
        const mb = d.Maturity_Bucket;
        if (!matMap[mb]) matMap[mb] = { count: 0, balance: 0 };
        matMap[mb].count += 1;
        matMap[mb].balance += d.CurrentBalance || 0;
      }
    }
    const maturityBuckets = Object.entries(matMap).map(([name, v]) => ({ name, ...v }));
    const matOrder = ["Matured", "0–30 Days", "31–90 Days", "91–180 Days", "181–365 Days", "365+ Days"];
    maturityBuckets.sort((a, b) => matOrder.indexOf(a.name) - matOrder.indexOf(b.name));

    // HNI breakdown
    const hniMap: Record<string, { count: number; balance: number }> = {};
    for (const d of active) {
      const hni = d.HNI_Category || "Regular";
      if (!hniMap[hni]) hniMap[hni] = { count: 0, balance: 0 };
      hniMap[hni].count += 1;
      hniMap[hni].balance += d.CurrentBalance || 0;
    }
    const hniBreakdown = Object.entries(hniMap).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.balance - a.balance);

    // Salary/NRI/Wealth flags
    const salaryCount = active.filter(d => d.Salary_Account_Flag === "Salary").length;
    const salaryBalance = active.filter(d => d.Salary_Account_Flag === "Salary").reduce((s, d) => s + (d.CurrentBalance || 0), 0);
    const nriCount = active.filter(d => d.NRI_Client_Flag === "NRI").length;
    const nriBalance = active.filter(d => d.NRI_Client_Flag === "NRI").reduce((s, d) => s + (d.CurrentBalance || 0), 0);
    const wealthCount = active.filter(d => d.Wealth_Client_Flag === "Wealth").length;
    const wealthBalance = active.filter(d => d.Wealth_Client_Flag === "Wealth").reduce((s, d) => s + (d.CurrentBalance || 0), 0);

    // CASA
    const casaCats = ["Regular Savings", "Wealth Account", "Current", "Salary", "Savings Plus", "NRI Savings", "NRI Current", "Government Accounts"];
    const casaBalance = active.filter(d => casaCats.includes(d.Category)).reduce((s, d) => s + (d.CurrentBalance || 0), 0);
    const casaCount = active.filter(d => casaCats.includes(d.Category)).length;
    const termBalance = totalBalance - casaBalance;
    const termCount = active.length - casaCount;

    return {
      totalBalance, totalAccounts: active.length, closedAccounts: deposits.length - active.length,
      categories, dormancy, valueBands, maturityBuckets, hniBreakdown,
      salaryCount, salaryBalance, nriCount, nriBalance, wealthCount, wealthBalance,
      casaBalance, casaCount, termBalance, termCount,
    };
  }, [deposits]);

  // Filtered table data
  const filteredDeposits = useMemo(() => {
    let filtered = deposits;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(d =>
        (d.CustName || "").toLowerCase().includes(term) ||
        (d.AcNo || "").includes(term) ||
        (d.CIF || "").includes(term)
      );
    }
    if (categoryFilter !== "All") filtered = filtered.filter(d => d.Category === categoryFilter);
    if (dormancyFilter !== "All") filtered = filtered.filter(d => d.Dormancy_Flag === dormancyFilter);
    if (valueBandFilter !== "All") filtered = filtered.filter(d => d.Deposit_Value_Band === valueBandFilter);
    return filtered.sort((a, b) => (b.CurrentBalance || 0) - (a.CurrentBalance || 0));
  }, [deposits, searchTerm, categoryFilter, dormancyFilter, valueBandFilter]);

  const uniqueCategories = useMemo(() => ["All", ...Array.from(new Set(deposits.map(d => d.Category).filter(Boolean)))], [deposits]);
  const uniqueDormancy = useMemo(() => ["All", ...Array.from(new Set(deposits.map(d => d.Dormancy_Flag).filter(Boolean)))], [deposits]);

  function exportCSV() {
    const headers = ["AcNo", "CIF", "CustName", "Category", "SubCategory", "CurrentBalance", "INTRATE", "OpenDt", "Maturity_Dt", "Dormancy_Flag", "HNI_Category", "Salary_Account_Flag", "NRI_Client_Flag"];
    const csvContent = [
      headers.join(","),
      ...filteredDeposits.map(d => headers.map(h => `"${d[h] ?? ""}"`).join(","))
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `deposit_portfolio_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <PiggyBank className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No Deposit Data</h3>
          <p className="text-gray-400">Upload the Deposit Shadow file to view deposit analytics.</p>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Deposit Portfolio</h2>
          <p className="text-gray-500 mt-1">Detailed deposit analytics and account-level data</p>
        </div>
        <div className="flex gap-2">
          <Button variant={viewMode === "summary" ? "default" : "outline"} size="sm" onClick={() => setViewMode("summary")}
            className={viewMode === "summary" ? "bg-purple-700 hover:bg-purple-800" : ""}>
            Summary
          </Button>
          <Button variant={viewMode === "table" ? "default" : "outline"} size="sm" onClick={() => setViewMode("table")}
            className={viewMode === "table" ? "bg-purple-700 hover:bg-purple-800" : ""}>
            Account View
          </Button>
        </div>
      </div>

      {viewMode === "summary" ? (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Total Deposits</p>
              <p className="text-xl font-bold text-blue-700">{formatINR(analytics.totalBalance)}</p>
              <p className="text-xs text-gray-400">{analytics.totalAccounts.toLocaleString("en-IN")} active accounts</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">CASA</p>
              <p className="text-xl font-bold text-green-700">{formatINR(analytics.casaBalance)}</p>
              <p className="text-xs text-gray-400">{analytics.casaCount.toLocaleString("en-IN")} accounts</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Term Deposits</p>
              <p className="text-xl font-bold text-purple-700">{formatINR(analytics.termBalance)}</p>
              <p className="text-xs text-gray-400">{analytics.termCount.toLocaleString("en-IN")} accounts</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Avg Balance</p>
              <p className="text-xl font-bold text-gray-700">{formatINR(analytics.totalBalance / analytics.totalAccounts)}</p>
              <p className="text-xs text-gray-400">per account</p>
            </div>
          </div>

          {/* Segment Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-4">
              <p className="text-xs text-blue-600 font-medium mb-1">Salary Accounts</p>
              <p className="text-lg font-bold text-blue-800">{formatINR(analytics.salaryBalance)}</p>
              <p className="text-xs text-blue-500">{analytics.salaryCount.toLocaleString("en-IN")} accounts</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 p-4">
              <p className="text-xs text-green-600 font-medium mb-1">NRI Deposits</p>
              <p className="text-lg font-bold text-green-800">{formatINR(analytics.nriBalance)}</p>
              <p className="text-xs text-green-500">{analytics.nriCount.toLocaleString("en-IN")} accounts</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 p-4">
              <p className="text-xs text-purple-600 font-medium mb-1">Wealth Accounts</p>
              <p className="text-lg font-bold text-purple-800">{formatINR(analytics.wealthBalance)}</p>
              <p className="text-xs text-purple-500">{analytics.wealthCount.toLocaleString("en-IN")} accounts</p>
            </div>
          </div>

          {/* Category & Dormancy */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Breakdown */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h3 className="font-semibold text-gray-700 mb-4">Category Breakdown</h3>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {analytics.categories.map(cat => {
                  const pct = analytics.totalBalance > 0 ? (cat.balance / analytics.totalBalance) * 100 : 0;
                  return (
                    <div key={cat.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 truncate mr-2">{cat.name}</span>
                        <span className="font-medium text-gray-800 whitespace-nowrap">{formatINR(cat.balance)} <span className="text-gray-400">({cat.count})</span></span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dormancy */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h3 className="font-semibold text-gray-700 mb-4">Account Status</h3>
              <div className="space-y-3">
                {analytics.dormancy.map(d => {
                  const colorMap: Record<string, string> = {
                    Active: "bg-green-400", Dormant: "bg-yellow-400", "Dormant/Inoperative": "bg-yellow-400",
                    Frozen: "bg-blue-400", "Zero Balance": "bg-gray-400", Closed: "bg-red-400",
                  };
                  return (
                    <div key={d.name} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${colorMap[d.name] || "bg-gray-300"}`} />
                      <span className="text-sm text-gray-600 flex-1">{d.name}</span>
                      <span className="text-sm font-medium text-gray-700">{d.count.toLocaleString("en-IN")}</span>
                      <span className="text-xs text-gray-400 w-24 text-right">{formatINR(d.balance)}</span>
                    </div>
                  );
                })}
              </div>

              {/* Maturity Buckets */}
              {analytics.maturityBuckets.length > 0 && (
                <>
                  <h3 className="font-semibold text-gray-700 mt-6 mb-4">FD/RD Maturity Profile</h3>
                  <div className="space-y-2">
                    {analytics.maturityBuckets.map(mb => (
                      <div key={mb.name} className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 w-28">{mb.name}</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-400 rounded-full"
                            style={{ width: `${analytics.termBalance > 0 ? Math.min((mb.balance / analytics.termBalance) * 100, 100) : 0}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-700 w-20 text-right">{formatINR(mb.balance)}</span>
                        <span className="text-xs text-gray-400 w-12 text-right">{mb.count}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* HNI Breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-4">HNI Classification</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {analytics.hniBreakdown.map(h => {
                const colorMap: Record<string, string> = {
                  "Ultra HNI": "from-amber-50 to-amber-100 border-amber-200",
                  HNI: "from-blue-50 to-blue-100 border-blue-200",
                  Regular: "from-gray-50 to-gray-100 border-gray-200",
                };
                return (
                  <div key={h.name} className={`bg-gradient-to-br ${colorMap[h.name] || "from-gray-50 to-gray-100 border-gray-200"} rounded-lg border p-4`}>
                    <p className="text-sm font-medium text-gray-600">{h.name}</p>
                    <p className="text-xl font-bold text-gray-800 mt-1">{formatINR(h.balance)}</p>
                    <p className="text-xs text-gray-500">{h.count.toLocaleString("en-IN")} accounts</p>
                  </div>
                );
              })}
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
                <input
                  type="text"
                  placeholder="Search by name, account no, or CIF..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={dormancyFilter} onChange={e => setDormancyFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                {uniqueDormancy.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={valueBandFilter} onChange={e => setValueBandFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                <option value="All">All Bands</option>
                <option value="Very High">Very High (≥₹10L)</option>
                <option value="High">High (≥₹2.5L)</option>
                <option value="Medium">Medium (≥₹50K)</option>
                <option value="Low">Low</option>
              </select>
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <Download className="w-4 h-4 mr-1" /> Export
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-2">{filteredDeposits.length.toLocaleString("en-IN")} accounts shown</p>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 z-10">
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-3 text-gray-500 font-medium">Account No</th>
                    <th className="text-left py-3 px-3 text-gray-500 font-medium">CIF</th>
                    <th className="text-left py-3 px-3 text-gray-500 font-medium">Customer Name</th>
                    <th className="text-left py-3 px-3 text-gray-500 font-medium">Category</th>
                    <th className="text-right py-3 px-3 text-gray-500 font-medium">Balance</th>
                    <th className="text-right py-3 px-3 text-gray-500 font-medium">Int Rate</th>
                    <th className="text-left py-3 px-3 text-gray-500 font-medium">Maturity</th>
                    <th className="text-left py-3 px-3 text-gray-500 font-medium">Status</th>
                    <th className="text-left py-3 px-3 text-gray-500 font-medium">HNI</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDeposits.slice(0, 500).map(d => (
                    <tr key={d.AcNo} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 px-3 text-gray-700 font-mono text-xs">{d.AcNo}</td>
                      <td className="py-2 px-3 text-gray-600 text-xs">{d.CIF}</td>
                      <td className="py-2 px-3 text-gray-700 font-medium truncate max-w-[200px]">{d.CustName}</td>
                      <td className="py-2 px-3 text-gray-600 text-xs">{d.Category}</td>
                      <td className="py-2 px-3 text-right font-medium text-gray-800">{formatINRFull(d.CurrentBalance)}</td>
                      <td className="py-2 px-3 text-right text-gray-600">{d.INTRATE > 0 ? `${d.INTRATE.toFixed(2)}%` : "-"}</td>
                      <td className="py-2 px-3 text-gray-600 text-xs">
                        {d.Maturity_Dt ? new Date(d.Maturity_Dt).toLocaleDateString("en-IN") : "-"}
                      </td>
                      <td className="py-2 px-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          d.Dormancy_Flag === "Active" ? "bg-green-100 text-green-700" :
                          d.Dormancy_Flag === "Closed" ? "bg-red-100 text-red-700" :
                          d.Dormancy_Flag === "Frozen" ? "bg-blue-100 text-blue-700" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>
                          {d.Dormancy_Flag}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          d.HNI_Category === "Ultra HNI" ? "bg-amber-100 text-amber-700" :
                          d.HNI_Category === "HNI" ? "bg-blue-100 text-blue-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          {d.HNI_Category}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredDeposits.length > 500 && (
                <p className="text-center text-xs text-gray-400 py-3">Showing first 500 of {filteredDeposits.length.toLocaleString("en-IN")} accounts. Use filters to narrow results.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
