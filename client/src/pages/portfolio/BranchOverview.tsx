/**
 * Branch Overview Dashboard
 * Key metrics, portfolio summary, and high-level analytics
 */

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Users, PiggyBank, CreditCard, AlertTriangle, Building2, Wallet } from "lucide-react";
import { getAllRecords, getDataStatus, STORES } from "@/lib/portfolioDb";
import { formatINR } from "@/lib/portfolioTransform";

interface PortfolioMetrics {
  // Deposits
  totalDepositBalance: number;
  totalDepositAccounts: number;
  casaBalance: number;
  termDepositBalance: number;
  casaRatio: number;
  avgDepositBalance: number;
  // Loans
  totalLoanOutstanding: number;
  totalLoanAccounts: number;
  totalCCODBalance: number;
  totalCCODAccounts: number;
  totalAdvances: number;
  avgLoanSize: number;
  // Asset Quality
  totalNPAAccounts: number;
  totalNPAAmount: number;
  grossNPARatio: number;
  smaAccounts: number;
  smaAmount: number;
  // Customers
  totalCustomers: number;
  hniCustomers: number;
  ultraHniCustomers: number;
  nriCustomers: number;
  // Deposit Categories
  depositCategories: { name: string; balance: number; count: number }[];
  // Loan Categories
  loanCategories: { name: string; balance: number; count: number }[];
  // Top Depositors
  topDepositors: { name: string; cif: string; balance: number }[];
  // Top Borrowers
  topBorrowers: { name: string; cif: string; outstanding: number }[];
  // SMA Distribution
  smaDistribution: { class: string; count: number; amount: number }[];
}

export default function BranchOverview() {
  const [metrics, setMetrics] = useState<PortfolioMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    loadMetrics();
  }, []);

  async function loadMetrics() {
    setLoading(true);
    try {
      const status = await getDataStatus();
      if (!status.hasData) {
        setHasData(false);
        setLoading(false);
        return;
      }
      setHasData(true);

      const [deposits, loans, ccod, npa, customers] = await Promise.all([
        getAllRecords(STORES.DEPOSIT_DATA),
        getAllRecords(STORES.LOAN_DATA),
        getAllRecords(STORES.CCOD_DATA),
        getAllRecords(STORES.NPA_DATA),
        getAllRecords(STORES.CUSTOMER_DIM),
      ]);

      // Deposit metrics (excluding duplicates with CC/OD)
      const activeDeposits = deposits.filter((d: any) => d.Dormancy_Flag !== "Closed");
      let totalDepositBalance = activeDeposits.reduce((sum: number, d: any) => sum + (d.CurrentBalance || 0), 0);
      
      // Add positive balances from CC/OD accounts (cross-product logic)
      const ccodPositiveBalance = ccod
        .filter((c: any) => (c.CurrentBalance || 0) > 0)
        .reduce((sum: number, c: any) => sum + c.CurrentBalance, 0);
      totalDepositBalance += ccodPositiveBalance;
      
      const casaCategories = ["Regular Savings", "Wealth Account", "Current", "Salary", "Savings Plus", "NRI Savings", "NRI Current", "Government Accounts"];
      const termCategories = ["Term Deposit", "Recurring Deposit", "Term Deposit (NRO)", "Term Deposit (NRE)", "Term Deposit (RFC/FCNB)", "Recurring Deposit (NRE)", "Recurring Deposit (NRO)", "MOD", "PPF", "Sukanya Samriddhi", "Mahila Samman"];
      let casaBalance = activeDeposits.filter((d: any) => casaCategories.includes(d.Category)).reduce((sum: number, d: any) => sum + (d.CurrentBalance || 0), 0);
      casaBalance += ccodPositiveBalance; // CC/OD positive balances counted in CASA
      const termDepositBalance = activeDeposits.filter((d: any) => termCategories.includes(d.Category)).reduce((sum: number, d: any) => sum + (d.CurrentBalance || 0), 0);

      // Deposit category breakdown
      const depCatMap: Record<string, { balance: number; count: number }> = {};
      for (const d of activeDeposits) {
        const cat = (d as any).Category || "Unknown";
        if (!depCatMap[cat]) depCatMap[cat] = { balance: 0, count: 0 };
        depCatMap[cat].balance += d.CurrentBalance || 0;
        depCatMap[cat].count += 1;
      }
      const depositCategories = Object.entries(depCatMap)
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.balance - a.balance);

      // Loan metrics (excluding positive CC/OD balances)
      const totalLoanOutstanding = loans.reduce((sum: number, l: any) => sum + Math.abs(l.OUTSTAND || 0), 0);
      // Only count negative balances (debit) in CC/OD as loan exposure
      const totalCCODBalance = ccod
        .filter((c: any) => (c.CurrentBalance || 0) < 0)
        .reduce((sum: number, c: any) => sum + Math.abs(c.CurrentBalance), 0);
      const totalAdvances = totalLoanOutstanding + totalCCODBalance;

      // Loan category breakdown
      const loanCatMap: Record<string, { balance: number; count: number }> = {};
      for (const l of loans) {
        const cat = (l as any).Loan_Category || "Other";
        if (!loanCatMap[cat]) loanCatMap[cat] = { balance: 0, count: 0 };
        loanCatMap[cat].balance += Math.abs(l.OUTSTAND || 0);
        loanCatMap[cat].count += 1;
      }
      // Add CC/OD as category
      if (ccod.length > 0) {
        loanCatMap["CC/OD"] = { balance: totalCCODBalance, count: ccod.length };
      }
      const loanCategories = Object.entries(loanCatMap)
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.balance - a.balance);

      // Asset quality
      const npaLoans = loans.filter((l: any) => l.SMA_CLASS === "NPA" || (l.NEWIRAC && !["00", "01", ""].includes(l.NEWIRAC)));
      const npaCCOD = ccod.filter((c: any) => c.SMA_CLASS === "NPA" || (c.NEWIRAC && !["00", "01", "0", ""].includes(c.NEWIRAC)));
      const totalNPAAmount = npaLoans.reduce((s: number, l: any) => s + Math.abs(l.OUTSTAND || 0), 0) +
        npaCCOD.reduce((s: number, c: any) => s + Math.abs(c.CurrentBalance || 0), 0);
      const grossNPARatio = totalAdvances > 0 ? (totalNPAAmount / totalAdvances) * 100 : 0;

      // SMA distribution
      const smaMap: Record<string, { count: number; amount: number }> = {};
      for (const l of loans) {
        const sma = (l as any).SMA_CLASS || "";
        if (sma && sma !== "") {
          if (!smaMap[sma]) smaMap[sma] = { count: 0, amount: 0 };
          smaMap[sma].count += 1;
          smaMap[sma].amount += Math.abs(l.OUTSTAND || 0);
        }
      }
      const smaDistribution = Object.entries(smaMap)
        .map(([cls, v]) => ({ class: cls, ...v }))
        .sort((a, b) => {
          const order: Record<string, number> = { STD: 0, SMA0: 1, SMA1: 2, SMA2: 3, NPA: 4 };
          return (order[a.class] ?? 5) - (order[b.class] ?? 5);
        });

      const smaAccounts = loans.filter((l: any) => ["SMA0", "SMA1", "SMA2"].includes(l.SMA_CLASS)).length;
      const smaAmount = loans.filter((l: any) => ["SMA0", "SMA1", "SMA2"].includes(l.SMA_CLASS)).reduce((s: number, l: any) => s + Math.abs(l.OUTSTAND || 0), 0);

      // Customer metrics
      const hniCustomers = customers.filter((c: any) => c.HNI_Category === "HNI").length;
      const ultraHniCustomers = customers.filter((c: any) => c.HNI_Category === "Ultra HNI").length;
      const nriCustomers = customers.filter((c: any) => c.NRI_Client_Flag === "NRI").length;

      // Top depositors
      const topDepositors = [...customers]
        .sort((a: any, b: any) => (b.TotalDeposits || 0) - (a.TotalDeposits || 0))
        .slice(0, 10)
        .map((c: any) => ({ name: c.CustName, cif: c.CIF, balance: c.TotalDeposits }));

      // Top borrowers
      const topBorrowers = [...customers]
        .filter((c: any) => (c.TotalLoans || 0) + (c.TotalCCOD || 0) > 0)
        .sort((a: any, b: any) => ((b.TotalLoans || 0) + (b.TotalCCOD || 0)) - ((a.TotalLoans || 0) + (a.TotalCCOD || 0)))
        .slice(0, 10)
        .map((c: any) => ({ name: c.CustName, cif: c.CIF, outstanding: (c.TotalLoans || 0) + (c.TotalCCOD || 0) }));

      setMetrics({
        totalDepositBalance,
        totalDepositAccounts: activeDeposits.length,
        casaBalance,
        termDepositBalance,
        casaRatio: totalDepositBalance > 0 ? (casaBalance / totalDepositBalance) * 100 : 0,
        avgDepositBalance: activeDeposits.length > 0 ? totalDepositBalance / activeDeposits.length : 0,
        totalLoanOutstanding,
        totalLoanAccounts: loans.length,
        totalCCODBalance,
        totalCCODAccounts: ccod.length,
        totalAdvances,
        avgLoanSize: loans.length > 0 ? totalLoanOutstanding / loans.length : 0,
        totalNPAAccounts: npa.length,
        totalNPAAmount,
        grossNPARatio,
        smaAccounts,
        smaAmount,
        totalCustomers: customers.length,
        hniCustomers,
        ultraHniCustomers,
        nriCustomers,
        depositCategories,
        loanCategories,
        topDepositors,
        topBorrowers,
        smaDistribution,
      });
    } catch (err) {
      console.error("Failed to load metrics:", err);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No Data Available</h3>
          <p className="text-gray-400">Please upload CSV files in the Data Upload section to view the dashboard.</p>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  const smaColorMap: Record<string, string> = {
    STD: "bg-green-100 text-green-800",
    SMA0: "bg-yellow-100 text-yellow-800",
    SMA1: "bg-orange-100 text-orange-800",
    SMA2: "bg-red-100 text-red-800",
    NPA: "bg-red-200 text-red-900",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Branch Overview</h2>
        <p className="text-gray-500 mt-1">Comprehensive portfolio summary and key performance indicators</p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Deposits */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">Total Deposits</span>
            <PiggyBank className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{formatINR(metrics.totalDepositBalance)}</p>
          <p className="text-xs text-gray-400 mt-1">{metrics.totalDepositAccounts.toLocaleString("en-IN")} accounts</p>
        </div>

        {/* Total Advances */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">Total Advances</span>
            <CreditCard className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{formatINR(metrics.totalAdvances)}</p>
          <p className="text-xs text-gray-400 mt-1">{(metrics.totalLoanAccounts + metrics.totalCCODAccounts).toLocaleString("en-IN")} accounts</p>
        </div>

        {/* Gross NPA */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">Gross NPA</span>
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-600">{metrics.grossNPARatio.toFixed(2)}%</p>
          <p className="text-xs text-gray-400 mt-1">{formatINR(metrics.totalNPAAmount)} ({metrics.totalNPAAccounts} a/c)</p>
        </div>

        {/* Total Customers */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">Total Customers</span>
            <Users className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{metrics.totalCustomers.toLocaleString("en-IN")}</p>
          <p className="text-xs text-gray-400 mt-1">
            HNI: {metrics.hniCustomers} | Ultra HNI: {metrics.ultraHniCustomers}
          </p>
        </div>
      </div>

      {/* Second Row - CASA, CD Ratio, SMA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CASA */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-3">CASA Ratio</h3>
          <div className="flex items-end gap-3">
            <p className="text-3xl font-bold text-blue-600">{metrics.casaRatio.toFixed(1)}%</p>
            <div className="text-xs text-gray-400 pb-1">
              <p>CASA: {formatINR(metrics.casaBalance)}</p>
              <p>Term: {formatINR(metrics.termDepositBalance)}</p>
            </div>
          </div>
          <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(metrics.casaRatio, 100)}%` }} />
          </div>
        </div>

        {/* CD Ratio */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-3">CD Ratio</h3>
          <div className="flex items-end gap-3">
            <p className="text-3xl font-bold text-purple-600">
              {metrics.totalDepositBalance > 0 ? ((metrics.totalAdvances / metrics.totalDepositBalance) * 100).toFixed(1) : "0.0"}%
            </p>
            <div className="text-xs text-gray-400 pb-1">
              <p>Advances: {formatINR(metrics.totalAdvances)}</p>
              <p>Deposits: {formatINR(metrics.totalDepositBalance)}</p>
            </div>
          </div>
          <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full"
              style={{ width: `${Math.min(metrics.totalDepositBalance > 0 ? (metrics.totalAdvances / metrics.totalDepositBalance) * 100 : 0, 100)}%` }}
            />
          </div>
        </div>

        {/* SMA Summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-3">SMA Accounts</h3>
          <p className="text-3xl font-bold text-orange-600">{metrics.smaAccounts}</p>
          <p className="text-xs text-gray-400 mt-1">{formatINR(metrics.smaAmount)} outstanding</p>
          <div className="mt-3 flex gap-1">
            {metrics.smaDistribution.map((s) => (
              <span
                key={s.class}
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${smaColorMap[s.class] || "bg-gray-100 text-gray-600"}`}
              >
                {s.class}: {s.count}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Deposit & Loan Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deposit Categories */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-4">Deposit Portfolio Composition</h3>
          <div className="space-y-3">
            {metrics.depositCategories.slice(0, 10).map((cat) => {
              const pct = metrics.totalDepositBalance > 0 ? (cat.balance / metrics.totalDepositBalance) * 100 : 0;
              return (
                <div key={cat.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{cat.name}</span>
                    <span className="font-medium text-gray-800">{formatINR(cat.balance)} <span className="text-gray-400">({cat.count})</span></span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Loan Categories */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-4">Advances Portfolio Composition</h3>
          <div className="space-y-3">
            {metrics.loanCategories.slice(0, 10).map((cat) => {
              const pct = metrics.totalAdvances > 0 ? (cat.balance / metrics.totalAdvances) * 100 : 0;
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
      </div>

      {/* Top Depositors & Borrowers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Depositors */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-4">Top 10 Depositors</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-gray-500 font-medium">#</th>
                  <th className="text-left py-2 text-gray-500 font-medium">Customer</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {metrics.topDepositors.map((d, i) => (
                  <tr key={d.cif} className="border-b border-gray-50">
                    <td className="py-2 text-gray-400">{i + 1}</td>
                    <td className="py-2 text-gray-700 font-medium">{d.name || d.cif}</td>
                    <td className="py-2 text-right text-gray-800 font-medium">{formatINR(d.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Borrowers */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-4">Top 10 Borrowers</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-gray-500 font-medium">#</th>
                  <th className="text-left py-2 text-gray-500 font-medium">Customer</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {metrics.topBorrowers.map((b, i) => (
                  <tr key={b.cif} className="border-b border-gray-50">
                    <td className="py-2 text-gray-400">{i + 1}</td>
                    <td className="py-2 text-gray-700 font-medium">{b.name || b.cif}</td>
                    <td className="py-2 text-right text-gray-800 font-medium">{formatINR(b.outstanding)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
