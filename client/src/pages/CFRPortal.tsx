/**
 * CFRPortal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Design: RBI CFR Portal — faithfully replicates both:
 *   1. "CFR Portal 2.html"  → Query Panel (search form)
 *   2. "Result Panel for CFR.html" → CFR Result Panel (tabbed result grid + legend)
 *
 * Integration: rendered as a tab inside RLMSSupplementer ("CFR Search")
 *
 * Behaviour:
 *   - "Search by Name" opens https://dbie.rbi.org.in/CFR/cfrSearch.rbi in a new
 *     tab (same as original HTML form action) — the actual search must be done
 *     on the live RBI portal since it requires a CSRF token and server session.
 *   - "Search by PAN" similarly opens the PAN search endpoint in a new tab.
 *   - The Result Panel tab below the form shows the fraud-type legend and an
 *     empty DataTables-style grid, matching the original HTML exactly.
 *   - Validation mirrors the original JS: name ≥ 3 chars, PAN must match regex.
 *
 * All styling is inline / Tailwind to avoid polluting global CSS.
 */

import { useState, useRef } from "react";
import { Search, RefreshCw, ExternalLink, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CFRRow {
  fraudNumber: string;
  bankName: string;
  amountInvolved: string;
  nameOfAccount: string;
  nameOfPerpetrator: string;
  panOfPerpetrator: string;
  proprietorName: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AMOUNT_OPTIONS = [
  { value: "all", label: "All Fraud" },
  { value: "less1", label: "Less than 0.1 Lakhs" },
  { value: "1to5", label: "Rs 0.1 Lakhs to 5 Lakhs" },
  { value: "5to50", label: "Rs 5 Lakhs to 50 Lakhs" },
  { value: "abv50", label: "Above 50 Lakhs" },
];

const FRAUD_TYPE_LEGEND = [
  { code: "M.C.B.T.", description: "Misappropriation and criminal breach of trust" },
  { code: "F.E.", description: "Fraudulent encashment/manipulation of books of account and conversion of property" },
  { code: "U.C.F.", description: "Unauthorised credit facility extended for illegal gratification" },
  { code: "N.C.S.", description: "Negligence and cash shortage" },
  { code: "C.F.", description: "Cheating and Forgery" },
  { code: "I.F.X.", description: "Irregularities in foreign exchange transactions" },
  { code: "OTH.", description: "Others" },
];

const RESULT_COLUMNS = [
  "Fraud Number",
  "Bank Name",
  "Amount Involved (Rs. in Lakhs)",
  "Name of Account",
  "Name of Perpetrator",
  "PAN of Perpetrator",
  "Proprietor/Partner/Director Name",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidPAN(pan: string): boolean {
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.toUpperCase());
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CFRPortal() {
  const [partyName, setPartyName] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [amountInvolved, setAmountInvolved] = useState("all");
  const [rows] = useState<CFRRow[]>([]);
  const [pageSize, setPageSize] = useState(10);
  const [searchFilter, setSearchFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [resultPanelOpen, setResultPanelOpen] = useState(true);

  // Validation errors
  const [nameError, setNameError] = useState("");
  const [panError, setPanError] = useState("");

  const panRef = useRef<HTMLInputElement>(null);

  // ─── Validation & Search ────────────────────────────────────────────────────

  function resetErrors() {
    setNameError("");
    setPanError("");
  }

  function handleSearchByName() {
    resetErrors();
    const trimmed = partyName.trim();
    if (trimmed.length < 3) {
      setNameError("Please enter at least three letters of Party / Account Name");
      return;
    }
    // Open the actual RBI CFR portal in a new tab — the live portal requires
    // a server-side CSRF token so we cannot replicate the POST internally.
    const url = `https://dbie.rbi.org.in/CFR/cfrSearch.rbi`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleSearchByPAN() {
    resetErrors();
    const pan = panNumber.trim().toUpperCase();
    if (!pan) {
      setPanError("Please enter full PAN number");
      return;
    }
    if (!isValidPAN(pan)) {
      setPanError("Invalid PAN Number — must be in format AAAAA9999A");
      return;
    }
    const url = `https://dbie.rbi.org.in/CFR/cfrSearchPan.rbi`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleReset() {
    setPartyName("");
    setPanNumber("");
    setAmountInvolved("all");
    resetErrors();
  }

  // ─── Table filtering & pagination ──────────────────────────────────────────

  const filteredRows = rows.filter(r =>
    Object.values(r).some(v => v.toLowerCase().includes(searchFilter.toLowerCase()))
  );
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pagedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Notice Banner ─────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 p-3 rounded-lg border text-sm"
        style={{ background: "#fffbeb", borderColor: "#fde68a", color: "#92400e" }}>
        <ExternalLink className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>
          <strong>Note:</strong> The CFR portal requires a live RBI server session and CSRF token.
          Clicking <em>Search</em> will open the official RBI CFR portal (
          <a href="https://dbie.rbi.org.in/CFR/cfrSearch.rbi" target="_blank" rel="noopener noreferrer"
            className="underline font-semibold">dbie.rbi.org.in</a>
          ) in a new tab where you can complete the search. Log in to the RBI portal first for results.
        </span>
      </div>

      {/* ── Query Panel ───────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Panel header */}
        <div className="px-5 py-3 border-b border-slate-200 flex items-center gap-2"
          style={{ background: "linear-gradient(to right, #16a085, #1abc9c)" }}>
          <Search className="w-4 h-4 text-white" />
          <span className="text-white font-semibold text-sm tracking-wide">Query Panel For Central Fraud Registry</span>
        </div>

        <div className="p-6 bg-white space-y-5">

          {/* Search by Name */}
          <div className="grid grid-cols-12 gap-3 items-start">
            <label className="col-span-4 text-sm font-semibold text-slate-700 text-right pt-2 leading-tight">
              Party / Account Name or<br />Associate Concern Name
            </label>
            <div className="col-span-6 space-y-1">
              <input
                type="text"
                value={partyName}
                onChange={e => { setPartyName(e.target.value); setNameError(""); }}
                placeholder="Party/Account Name or Associate Concern Name"
                maxLength={50}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <p className="text-xs italic" style={{ color: "#16a085" }}>Enter full Party / Account Name</p>
              {nameError && (
                <div className="flex items-center gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {nameError}
                </div>
              )}
            </div>
            <div className="col-span-2">
              <button
                onClick={handleSearchByName}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-white text-sm font-semibold transition-colors"
                style={{ background: "#16a085" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#0e7a65")}
                onMouseLeave={e => (e.currentTarget.style.background = "#16a085")}
              >
                <Search className="w-3.5 h-3.5" />
                Search
              </button>
            </div>
          </div>

          {/* OR divider */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-4" />
            <div className="col-span-8 flex items-center gap-3">
              <div className="flex-1 border-t border-slate-200" />
              <span className="text-sm font-bold text-slate-500">OR</span>
              <div className="flex-1 border-t border-slate-200" />
            </div>
          </div>

          {/* Search by PAN */}
          <div className="grid grid-cols-12 gap-3 items-start">
            <label className="col-span-4 text-sm font-semibold text-slate-700 text-right pt-2">
              PAN Number
            </label>
            <div className="col-span-6 space-y-1">
              <input
                ref={panRef}
                type="text"
                value={panNumber}
                onChange={e => { setPanNumber(e.target.value.toUpperCase()); setPanError(""); }}
                placeholder="PAN Number"
                maxLength={10}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <p className="text-xs italic" style={{ color: "#16a085" }}>Enter full PAN number</p>
              {panError && (
                <div className="flex items-center gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {panError}
                </div>
              )}
            </div>
            <div className="col-span-2">
              <button
                onClick={handleSearchByPAN}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-white text-sm font-semibold transition-colors"
                style={{ background: "#16a085" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#0e7a65")}
                onMouseLeave={e => (e.currentTarget.style.background = "#16a085")}
              >
                <Search className="w-3.5 h-3.5" />
                Search
              </button>
            </div>
          </div>

          {/* Amount Involved + Reset */}
          <div className="grid grid-cols-12 gap-3 items-center">
            <label className="col-span-4 text-sm font-semibold text-slate-700 text-right">
              Amount Involved
            </label>
            <div className="col-span-6">
              <select
                value={amountInvolved}
                onChange={e => setAmountInvolved(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
              >
                {AMOUNT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <button
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-white text-sm font-semibold transition-colors"
                style={{ background: "#16a085" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#0e7a65")}
                onMouseLeave={e => (e.currentTarget.style.background = "#16a085")}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ── CFR Result Panel ──────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Collapsible header */}
        <button
          className="w-full flex items-center justify-between px-5 py-3 border-b border-slate-200 text-left"
          style={{ background: "#ADEBDF" }}
          onClick={() => setResultPanelOpen(v => !v)}
        >
          <span className="font-semibold text-sm" style={{ color: "#16a085" }}>CFR Result Panel</span>
          {resultPanelOpen
            ? <ChevronUp className="w-4 h-4" style={{ color: "#16a085" }} />
            : <ChevronDown className="w-4 h-4" style={{ color: "#16a085" }} />
          }
        </button>

        {resultPanelOpen && (
          <div className="bg-white p-5 space-y-4">

            {/* Section title */}
            <h3 className="font-bold text-base" style={{ color: "#488ac7" }}>Central Fraud Registry</h3>

            {/* DataTable controls */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span>Show</span>
                <select
                  value={pageSize}
                  onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  className="border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                >
                  {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <span>entries</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span>Search:</span>
                <input
                  type="search"
                  value={searchFilter}
                  onChange={e => { setSearchFilter(e.target.value); setCurrentPage(1); }}
                  className="border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder=""
                />
              </div>
            </div>

            {/* Result table */}
            <div className="overflow-x-auto rounded border border-slate-200">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr style={{ background: "#16a085" }}>
                    {RESULT_COLUMNS.map(col => (
                      <th key={col}
                        className="px-3 py-2 text-left font-semibold text-white border-r border-emerald-600 last:border-r-0 whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.length === 0 ? (
                    <tr>
                      <td colSpan={RESULT_COLUMNS.length}
                        className="px-3 py-6 text-center text-slate-400 italic text-sm">
                        {rows.length === 0
                          ? "No data available in table"
                          : "No matching records found"}
                      </td>
                    </tr>
                  ) : (
                    pagedRows.map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                        <td className="px-3 py-1.5 border border-slate-200 text-slate-700">{row.fraudNumber}</td>
                        <td className="px-3 py-1.5 border border-slate-200 text-slate-700">{row.bankName}</td>
                        <td className="px-3 py-1.5 border border-slate-200 text-slate-700">{row.amountInvolved}</td>
                        <td className="px-3 py-1.5 border border-slate-200 text-slate-700">{row.nameOfAccount}</td>
                        <td className="px-3 py-1.5 border border-slate-200 text-slate-700">{row.nameOfPerpetrator}</td>
                        <td className="px-3 py-1.5 border border-slate-200 font-mono text-slate-700">{row.panOfPerpetrator}</td>
                        <td className="px-3 py-1.5 border border-slate-200 text-slate-700">{row.proprietorName}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {rows.length > 0 && (
                  <tfoot>
                    <tr style={{ background: "#488ac7" }}>
                      <td colSpan={RESULT_COLUMNS.length} className="px-3 py-1.5 text-white text-xs">
                        Total Fraud Count = {rows.length}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Pagination info */}
            <div className="flex items-center justify-between flex-wrap gap-2 text-sm text-slate-500">
              <span>
                {filteredRows.length === 0
                  ? "Showing 0 to 0 of 0 entries"
                  : `Showing ${(currentPage - 1) * pageSize + 1} to ${Math.min(currentPage * pageSize, filteredRows.length)} of ${filteredRows.length} entries`}
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1 border border-slate-300 rounded text-xs disabled:opacity-40 hover:bg-slate-50 transition-colors"
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pg = i + 1;
                  return (
                    <button key={pg}
                      onClick={() => setCurrentPage(pg)}
                      className={`px-3 py-1 border rounded text-xs transition-colors ${currentPage === pg
                        ? "text-white border-emerald-600"
                        : "border-slate-300 hover:bg-slate-50"
                        }`}
                      style={currentPage === pg ? { background: "#16a085" } : {}}
                    >
                      {pg}
                    </button>
                  );
                })}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="px-3 py-1 border border-slate-300 rounded text-xs disabled:opacity-40 hover:bg-slate-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>

            {/* Fraud type legend */}
            <div className="mt-2">
              <table className="text-xs border-collapse" style={{ width: "auto", minWidth: "520px", borderColor: "#16a085" }}>
                <tbody>
                  {FRAUD_TYPE_LEGEND.map(({ code, description }) => (
                    <tr key={code}>
                      <td className="border px-3 py-1.5 font-semibold text-left"
                        style={{ borderColor: "#16a085", color: "#128972", minWidth: "70px" }}>
                        {code}
                      </td>
                      <td className="border px-3 py-1.5 text-left text-slate-700"
                        style={{ borderColor: "#16a085" }}>
                        {description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
