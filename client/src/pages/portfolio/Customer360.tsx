/**
 * Customer 360 Dashboard
 * Complete customer view with deposits, loans, and exposure analysis
 */

import { useState, useEffect, useMemo } from "react";
import { Search, Users, User, ChevronDown, ChevronUp, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAllRecords, getRecordsByIndex, getRecordCount, STORES } from "@/lib/portfolioDb";
import { formatINR, formatINRFull } from "@/lib/portfolioTransform";

export default function Customer360() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("All");
  const [selectedCIF, setSelectedCIF] = useState<string | null>(null);
  const [customerDetail, setCustomerDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const count = await getRecordCount(STORES.CUSTOMER_DIM);
      if (count === 0) { setHasData(false); setLoading(false); return; }
      setHasData(true);
      const data = await getAllRecords(STORES.CUSTOMER_DIM);
      setCustomers(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function loadCustomerDetail(cif: string) {
    setDetailLoading(true);
    setSelectedCIF(cif);
    try {
      const [deposits, loans, ccod] = await Promise.all([
        getRecordsByIndex(STORES.DEPOSIT_DATA, "CIF", cif),
        getRecordsByIndex(STORES.LOAN_DATA, "CIF", cif),
        getRecordsByIndex(STORES.CCOD_DATA, "CIF", cif),
      ]);
      // Also check loan data where Shadow_CIF matches
      const customer = customers.find(c => c.CIF === cif);
      setCustomerDetail({ customer, deposits, loans, ccod });
    } catch (e) { console.error(e); }
    setDetailLoading(false);
  }

  const filteredCustomers = useMemo(() => {
    let filtered = customers;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        (c.CustName || "").toLowerCase().includes(term) ||
        (c.CIF || "").includes(term)
      );
    }
    if (segmentFilter !== "All") filtered = filtered.filter(c => c.CustomerSegment === segmentFilter);
    return filtered.sort((a, b) => ((b.TotalDeposits || 0) + (b.TotalLoans || 0) + (b.TotalCCOD || 0)) - ((a.TotalDeposits || 0) + (a.TotalLoans || 0) + (a.TotalCCOD || 0)));
  }, [customers, searchTerm, segmentFilter]);

  const segments = useMemo(() => {
    const segMap: Record<string, number> = {};
    for (const c of customers) {
      const seg = c.CustomerSegment || "Regular";
      segMap[seg] = (segMap[seg] || 0) + 1;
    }
    return Object.entries(segMap).sort((a, b) => b[1] - a[1]);
  }, [customers]);

  function exportCSV() {
    const headers = ["CIF", "Customer Name", "Segment", "HNI Category", "Total Deposits", "Total Loans", "Total CC/OD", "Net Exposure", "Deposit Count", "Loan Count", "CC/OD Count", "Has NPA"];
    const csvContent = [
      headers.join(","),
      ...filteredCustomers.map(c => [c.CIF, `"${c.CustName}"`, c.CustomerSegment, c.HNI_Category, c.TotalDeposits, c.TotalLoans, c.TotalCCOD, c.NetExposure, c.DepositCount, c.LoanCount, c.CCODCount, c.HasNPA].join(","))
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `customer_360_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  const segColorMap: Record<string, string> = {
    "Ultra HNI": "bg-amber-100 text-amber-800", HNI: "bg-blue-100 text-blue-800",
    NRI: "bg-green-100 text-green-800", Wealth: "bg-purple-100 text-purple-800",
    Salary: "bg-cyan-100 text-cyan-800", Regular: "bg-gray-100 text-gray-600",
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!hasData) return (
    <div className="flex items-center justify-center h-64"><div className="text-center">
      <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-gray-600 mb-2">No Customer Data</h3>
      <p className="text-gray-400">Upload deposit and/or loan files to build Customer 360.</p>
    </div></div>
  );

  // Detail view
  if (selectedCIF && customerDetail) {
    const { customer, deposits, loans, ccod } = customerDetail;
    const totalDeposits = deposits.reduce((s: number, d: any) => s + (d.CurrentBalance || 0), 0);
    const totalLoans = loans.reduce((s: number, l: any) => s + Math.abs(l.OUTSTAND || 0), 0);
    const totalCCOD = ccod.reduce((s: number, c: any) => s + Math.abs(c.CurrentBalance || 0), 0);

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => { setSelectedCIF(null); setCustomerDetail(null); }}>
            <X className="w-4 h-4 mr-1" /> Back to List
          </Button>
          <h2 className="text-2xl font-bold text-gray-800">Customer 360</h2>
        </div>

        {detailLoading ? (
          <div className="flex items-center justify-center h-32"><div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <>
            {/* Customer Header */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xl font-bold">
                  {(customer?.CustName || "?").charAt(0)}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-800">{customer?.CustName || "Unknown"}</h3>
                  <p className="text-sm text-gray-500">CIF: {selectedCIF}</p>
                  <div className="flex gap-2 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${segColorMap[customer?.CustomerSegment] || "bg-gray-100 text-gray-600"}`}>
                      {customer?.CustomerSegment || "Regular"}
                    </span>
                    {customer?.HasNPA && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">NPA</span>}
                    {customer?.NRI_Client_Flag === "NRI" && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">NRI</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Mobile</p>
                  <p className="text-sm text-gray-700">{customer?.MobileNo || "-"}</p>
                  <p className="text-xs text-gray-500 mt-1">Address</p>
                  <p className="text-sm text-gray-700">{[customer?.Add1, customer?.Add2, customer?.Add3].filter(Boolean).join(", ") || "-"}</p>
                </div>
              </div>
            </div>

            {/* Exposure Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs text-blue-600 font-medium">Total Deposits</p>
                <p className="text-xl font-bold text-blue-800">{formatINR(totalDeposits)}</p>
                <p className="text-xs text-blue-500">{deposits.length} accounts</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <p className="text-xs text-purple-600 font-medium">Term Loans</p>
                <p className="text-xl font-bold text-purple-800">{formatINR(totalLoans)}</p>
                <p className="text-xs text-purple-500">{loans.length} accounts</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-xs text-green-600 font-medium">CC/OD</p>
                <p className="text-xl font-bold text-green-800">{formatINR(totalCCOD)}</p>
                <p className="text-xs text-green-500">{ccod.length} accounts</p>
              </div>
              <div className={`${totalDeposits - totalLoans - totalCCOD >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"} border rounded-xl p-4`}>
                <p className={`text-xs font-medium ${totalDeposits - totalLoans - totalCCOD >= 0 ? "text-emerald-600" : "text-red-600"}`}>Net Exposure</p>
                <p className={`text-xl font-bold ${totalDeposits - totalLoans - totalCCOD >= 0 ? "text-emerald-800" : "text-red-800"}`}>
                  {formatINR(totalDeposits - totalLoans - totalCCOD)}
                </p>
                <p className="text-xs text-gray-500">{totalDeposits - totalLoans - totalCCOD >= 0 ? "Net Depositor" : "Net Borrower"}</p>
              </div>
            </div>

            {/* Deposit Accounts */}
            {deposits.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <h3 className="font-semibold text-gray-700 mb-4">Deposit Accounts ({deposits.length})</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-gray-500 font-medium">Account No</th>
                        <th className="text-left py-2 px-3 text-gray-500 font-medium">Category</th>
                        <th className="text-left py-2 px-3 text-gray-500 font-medium">Product</th>
                        <th className="text-right py-2 px-3 text-gray-500 font-medium">Balance</th>
                        <th className="text-right py-2 px-3 text-gray-500 font-medium">Rate</th>
                        <th className="text-left py-2 px-3 text-gray-500 font-medium">Maturity</th>
                        <th className="text-left py-2 px-3 text-gray-500 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deposits.sort((a: any, b: any) => (b.CurrentBalance || 0) - (a.CurrentBalance || 0)).map((d: any) => (
                        <tr key={d.AcNo} className="border-b border-gray-50">
                          <td className="py-2 px-3 font-mono text-xs text-gray-700">{d.AcNo}</td>
                          <td className="py-2 px-3 text-xs text-gray-600">{d.Category}</td>
                          <td className="py-2 px-3 text-xs text-gray-600 truncate max-w-[150px]">{d.Acct_Desc || d.PROD_DESC || "-"}</td>
                          <td className="py-2 px-3 text-right font-medium text-gray-800">{formatINRFull(d.CurrentBalance)}</td>
                          <td className="py-2 px-3 text-right text-gray-600">{d.INTRATE > 0 ? `${d.INTRATE.toFixed(2)}%` : "-"}</td>
                          <td className="py-2 px-3 text-xs text-gray-600">{d.Maturity_Dt ? new Date(d.Maturity_Dt).toLocaleDateString("en-IN") : "-"}</td>
                          <td className="py-2 px-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              d.Dormancy_Flag === "Active" ? "bg-green-100 text-green-700" :
                              d.Dormancy_Flag === "Closed" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                            }`}>{d.Dormancy_Flag}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Loan Accounts */}
            {loans.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <h3 className="font-semibold text-gray-700 mb-4">Term Loan Accounts ({loans.length})</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-gray-500 font-medium">Account No</th>
                        <th className="text-left py-2 px-3 text-gray-500 font-medium">Product</th>
                        <th className="text-right py-2 px-3 text-gray-500 font-medium">Outstanding</th>
                        <th className="text-right py-2 px-3 text-gray-500 font-medium">Limit</th>
                        <th className="text-right py-2 px-3 text-gray-500 font-medium">EMI</th>
                        <th className="text-right py-2 px-3 text-gray-500 font-medium">Rate</th>
                        <th className="text-center py-2 px-3 text-gray-500 font-medium">SMA</th>
                        <th className="text-center py-2 px-3 text-gray-500 font-medium">EMIs O/D</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loans.sort((a: any, b: any) => Math.abs(b.OUTSTAND || 0) - Math.abs(a.OUTSTAND || 0)).map((l: any) => (
                        <tr key={l.LoanKey} className="border-b border-gray-50">
                          <td className="py-2 px-3 font-mono text-xs text-gray-700">{l.LoanKey}</td>
                          <td className="py-2 px-3 text-xs text-gray-600 truncate max-w-[180px]">{l.ACCTDESC}</td>
                          <td className="py-2 px-3 text-right font-medium text-gray-800">{formatINRFull(Math.abs(l.OUTSTAND || 0))}</td>
                          <td className="py-2 px-3 text-right text-gray-600">{formatINR(l.LIMIT)}</td>
                          <td className="py-2 px-3 text-right text-gray-600">{l.INSTALAMT ? formatINR(l.INSTALAMT) : "-"}</td>
                          <td className="py-2 px-3 text-right text-gray-600">{l.INTRATE > 0 ? `${l.INTRATE.toFixed(2)}%` : "-"}</td>
                          <td className="py-2 px-3 text-center">
                            {l.SMA_CLASS && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              l.SMA_CLASS === "STD" ? "bg-green-100 text-green-700" :
                              l.SMA_CLASS === "NPA" ? "bg-red-100 text-red-700" :
                              "bg-orange-100 text-orange-700"
                            }`}>{l.SMA_CLASS}</span>}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {l.EMISOvrdue > 0 ? <span className="text-red-600 font-medium">{l.EMISOvrdue}</span> : <span className="text-gray-400">-</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* CC/OD Accounts */}
            {ccod.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <h3 className="font-semibold text-gray-700 mb-4">CC/OD Accounts ({ccod.length})</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-gray-500 font-medium">Account No</th>
                        <th className="text-left py-2 px-3 text-gray-500 font-medium">Product</th>
                        <th className="text-right py-2 px-3 text-gray-500 font-medium">Balance</th>
                        <th className="text-right py-2 px-3 text-gray-500 font-medium">Limit</th>
                        <th className="text-right py-2 px-3 text-gray-500 font-medium">DP</th>
                        <th className="text-right py-2 px-3 text-gray-500 font-medium">Rate</th>
                        <th className="text-center py-2 px-3 text-gray-500 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ccod.sort((a: any, b: any) => Math.abs(b.CurrentBalance || 0) - Math.abs(a.CurrentBalance || 0)).map((c: any) => (
                        <tr key={c.LoanKey} className="border-b border-gray-50">
                          <td className="py-2 px-3 font-mono text-xs text-gray-700">{c.LoanKey}</td>
                          <td className="py-2 px-3 text-xs text-gray-600 truncate max-w-[180px]">{c.ACCTDESC}</td>
                          <td className="py-2 px-3 text-right font-medium text-gray-800">{formatINRFull(Math.abs(c.CurrentBalance || 0))}</td>
                          <td className="py-2 px-3 text-right text-gray-600">{formatINR(c.LIMIT)}</td>
                          <td className="py-2 px-3 text-right text-gray-600">{formatINR(c.DP)}</td>
                          <td className="py-2 px-3 text-right text-gray-600">{c.INTRATE > 0 ? `${c.INTRATE.toFixed(2)}%` : "-"}</td>
                          <td className="py-2 px-3 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              c.Irregular_Flag === "Regular" ? "bg-green-100 text-green-700" :
                              c.Irregular_Flag === "Irregular" ? "bg-orange-100 text-orange-700" :
                              "bg-red-100 text-red-700"
                            }`}>{c.Irregular_Flag}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Customer 360</h2>
        <p className="text-gray-500 mt-1">Complete customer view with deposits, loans, and exposure analysis</p>
      </div>

      {/* Segment Summary */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setSegmentFilter("All")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${segmentFilter === "All" ? "bg-purple-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          All ({customers.length.toLocaleString("en-IN")})
        </button>
        {segments.map(([seg, count]) => (
          <button key={seg} onClick={() => setSegmentFilter(seg)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${segmentFilter === seg ? "bg-purple-700 text-white" : `${segColorMap[seg] || "bg-gray-100 text-gray-600"} hover:opacity-80`}`}>
            {seg} ({count.toLocaleString("en-IN")})
          </button>
        ))}
      </div>

      {/* Search & Export */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search by customer name or CIF..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="w-4 h-4 mr-1" /> Export</Button>
        </div>
        <p className="text-xs text-gray-400 mt-2">{filteredCustomers.length.toLocaleString("en-IN")} customers</p>
      </div>

      {/* Customer Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-3 text-gray-500 font-medium">CIF</th>
                <th className="text-left py-3 px-3 text-gray-500 font-medium">Customer Name</th>
                <th className="text-center py-3 px-3 text-gray-500 font-medium">Segment</th>
                <th className="text-right py-3 px-3 text-gray-500 font-medium">Deposits</th>
                <th className="text-right py-3 px-3 text-gray-500 font-medium">Loans</th>
                <th className="text-right py-3 px-3 text-gray-500 font-medium">CC/OD</th>
                <th className="text-right py-3 px-3 text-gray-500 font-medium">Net Exposure</th>
                <th className="text-center py-3 px-3 text-gray-500 font-medium">A/c</th>
                <th className="text-center py-3 px-3 text-gray-500 font-medium">NPA</th>
                <th className="text-center py-3 px-3 text-gray-500 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.slice(0, 500).map(c => (
                <tr key={c.CIF} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => loadCustomerDetail(c.CIF)}>
                  <td className="py-2 px-3 font-mono text-xs text-gray-700">{c.CIF}</td>
                  <td className="py-2 px-3 text-gray-700 font-medium truncate max-w-[200px]">{c.CustName || "-"}</td>
                  <td className="py-2 px-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${segColorMap[c.CustomerSegment] || "bg-gray-100 text-gray-600"}`}>{c.CustomerSegment}</span>
                  </td>
                  <td className="py-2 px-3 text-right text-blue-700 font-medium">{formatINR(c.TotalDeposits)}</td>
                  <td className="py-2 px-3 text-right text-purple-700 font-medium">{c.TotalLoans > 0 ? formatINR(c.TotalLoans) : "-"}</td>
                  <td className="py-2 px-3 text-right text-green-700 font-medium">{c.TotalCCOD > 0 ? formatINR(c.TotalCCOD) : "-"}</td>
                  <td className={`py-2 px-3 text-right font-medium ${c.NetExposure >= 0 ? "text-emerald-700" : "text-red-700"}`}>{formatINR(c.NetExposure)}</td>
                  <td className="py-2 px-3 text-center text-xs text-gray-500">{c.DepositCount + c.LoanCount + c.CCODCount}</td>
                  <td className="py-2 px-3 text-center">
                    {c.HasNPA ? <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">Yes</span> : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={(e) => { e.stopPropagation(); loadCustomerDetail(c.CIF); }}>
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredCustomers.length > 500 && <p className="text-center text-xs text-gray-400 py-3">Showing first 500 of {filteredCustomers.length.toLocaleString("en-IN")} customers.</p>}
        </div>
      </div>
    </div>
  );
}
