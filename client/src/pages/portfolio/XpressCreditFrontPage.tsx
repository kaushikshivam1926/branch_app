/**
 * XpressCreditFrontPage.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders a pre-filled A4 front-page cover sheet for a Personal Loan (PER series)
 * file. Data is fetched from LOAN_DATA in IndexedDB. The component opens as a
 * full-screen modal with a print button; the print stylesheet hides all UI chrome
 * and renders only the A4 page content.
 *
 * Design: Clean official document style — SBI blue header, bordered table layout,
 * checkbox grid for documentation checklist. Fits exactly one A4 page.
 */

import { useEffect, useState } from "react";
import { X, Printer, Loader2 } from "lucide-react";
import { getAllRecords, STORES } from "@/lib/portfolioDb";

// ─── Types ────────────────────────────────────────────────────────────────────
interface LoanFileRecord {
  serialNo: string;
  accountNo: string;
  accountDesc: string;
  cifNo: string;
  customerName: string;
  limit: number | string;
  sanctionDate: string;
  status: string;
  category: string;
}

interface LoanDataRecord {
  LoanKey: string;
  CIF: string;
  CUSTNAME: string;
  ACCTDESC: string;
  LIMIT: number;
  SANCTDT: string;
  Shadow_Add1: string;
  Shadow_Add2: string;
  Shadow_Add3: string;
  Shadow_Add4: string;
  Shadow_PostCode: string;
  Shadow_MobileNo: string;
  [key: string]: unknown;
}

interface Props {
  record: LoanFileRecord;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatCurrency(amount: number): string {
  if (!amount) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);
}

function buildAddress(loan: LoanDataRecord): string {
  const parts = [loan.Shadow_Add1, loan.Shadow_Add2, loan.Shadow_Add3, loan.Shadow_Add4, loan.Shadow_PostCode]
    .map(p => (p || "").trim())
    .filter(Boolean);
  return parts.join(", ") || "—";
}

// ─── Checklist items ──────────────────────────────────────────────────────────
const CHECKLIST_ROWS: { left: string; right: string }[] = [
  { left: "PL Application Form", right: "Loan Agreement" },
  { left: "Consent Form", right: "Loan Arrangement" },
  { left: "CIC Report", right: "Key Fact Statement" },
  { left: "Self-attested PAN Card", right: "Appraisal cum Sanction Report" },
  { left: "KYC", right: "" },
  { left: "UID / Voter Id", right: "No Dues Required" },
  { left: "Certificate (NDC)", right: "" },
  { left: "e-KYC / Electoral Search", right: "Not Required" },
  { left: "Salary Slips", right: "NDC Receiving date: ___/___/______" },
  { left: "A/c Stmnt. / CBS Screenshot", right: "Perfios Report" },
  { left: "Form 16 / ITR", right: "Control Return" },
  { left: "IT Undertaking", right: "Annexure XP-10 Signed & Sent" },
  { left: "NeSL Disclosure Consent", right: "PSS / RO Verification" },
  { left: "Borrower Ack. (Ann. II)", right: "SI Letter (PL-12)" },
  { left: "SI Amendment", right: "" },
  { left: "Register Entry", right: "" },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function XpressCreditFrontPage({ record, onClose }: Props) {
  const [loanData, setLoanData] = useState<LoanDataRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const allLoans: LoanDataRecord[] = await getAllRecords(STORES.LOAN_DATA);
        const match = allLoans.find(
          l => l.LoanKey === record.accountNo ||
               l.LoanKey.replace(/^0+/, "") === record.accountNo.replace(/^0+/, "")
        );
        setLoanData(match || null);
      } catch (err) {
        console.error("Failed to load loan data:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [record.accountNo]);

  const handlePrint = () => {
    window.print();
  };

  // Merge record fields with live LOAN_DATA (prefer live data where available)
  const custName = loanData?.CUSTNAME || record.customerName || "—";
  const cifNo = loanData?.CIF || record.cifNo || "—";
  const acctNo = loanData?.LoanKey || record.accountNo || "—";
  const acctDesc = loanData?.ACCTDESC || record.accountDesc || "—";
  const sanctionAmt = loanData?.LIMIT || (typeof record.limit === "string" ? parseFloat(record.limit) || 0 : record.limit) || 0;
  const sanctionDate = loanData?.SANCTDT || record.sanctionDate || "";
  const address = loanData ? buildAddress(loanData) : "—";
  const mobile = loanData?.Shadow_MobileNo
    ? `+91 - ${loanData.Shadow_MobileNo.replace(/^\+91[-\s]?/, "")}`
    : "—";

  return (
    <>
      {/* ── Print CSS (injected into <head> via style tag) ── */}
      <style>{`
        @media print {
          body > *:not(#xpress-print-root) { display: none !important; }
          #xpress-print-root { position: fixed; inset: 0; z-index: 9999; background: white; }
          .no-print { display: none !important; }
          .print-page {
            width: 210mm;
            min-height: 297mm;
            margin: 0;
            padding: 12mm 14mm;
            box-sizing: border-box;
            font-size: 9pt;
            color: #000;
            background: white;
          }
          @page { size: A4 portrait; margin: 0; }
        }
      `}</style>

      {/* ── Modal Overlay (hidden in print) ── */}
      <div id="xpress-print-root" className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center no-print" style={{ display: "flex" }}>
        {/* Toolbar */}
        <div className="no-print absolute top-4 right-4 flex gap-2 z-10">
          <button
            onClick={handlePrint}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            Print / Save PDF
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/20 text-white text-sm hover:bg-white/30 transition-colors"
          >
            <X className="w-4 h-4" /> Close
          </button>
        </div>

        {/* A4 Preview Container */}
        <div className="overflow-auto max-h-screen py-16 px-4">
          {loading ? (
            <div className="flex items-center justify-center w-[210mm] h-[297mm] bg-white rounded shadow-2xl">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-500">Loading loan data…</span>
            </div>
          ) : (
            <FrontPageContent
              serialNo={record.serialNo}
              custName={custName}
              cifNo={cifNo}
              acctNo={acctNo}
              acctDesc={acctDesc}
              sanctionAmt={sanctionAmt}
              sanctionDate={sanctionDate}
              address={address}
              mobile={mobile}
            />
          )}
        </div>
      </div>

      {/* ── Actual Print Target (always rendered, visible only in print) ── */}
      {!loading && (
        <div className="hidden print:block">
          <FrontPageContent
            serialNo={record.serialNo}
            custName={custName}
            cifNo={cifNo}
            acctNo={acctNo}
            acctDesc={acctDesc}
            sanctionAmt={sanctionAmt}
            sanctionDate={sanctionDate}
            address={address}
            mobile={mobile}
          />
        </div>
      )}
    </>
  );
}

// ─── FrontPageContent ─────────────────────────────────────────────────────────
interface ContentProps {
  serialNo: string;
  custName: string;
  cifNo: string;
  acctNo: string;
  acctDesc: string;
  sanctionAmt: number;
  sanctionDate: string;
  address: string;
  mobile: string;
}

function FrontPageContent({
  serialNo, custName, cifNo, acctNo, acctDesc,
  sanctionAmt, sanctionDate, address, mobile,
}: ContentProps) {
  return (
    <div
      className="print-page bg-white shadow-2xl rounded"
      style={{
        width: "210mm",
        minHeight: "297mm",
        padding: "12mm 14mm",
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: "9pt",
        color: "#000",
        boxSizing: "border-box",
      }}
    >
      {/* ── Header ── */}
      <div style={{ borderBottom: "3px solid #003399", marginBottom: "6mm", paddingBottom: "4mm" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10mm" }}>
          {/* SBI Logo placeholder */}
          <div style={{
            width: "18mm", height: "18mm", border: "1.5px solid #003399",
            borderRadius: "50%", display: "flex", alignItems: "center",
            justifyContent: "center", flexShrink: 0,
          }}>
            <span style={{ fontSize: "8pt", fontWeight: "bold", color: "#003399", textAlign: "center", lineHeight: 1.2 }}>SBI</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "14pt", fontWeight: "bold", color: "#003399", letterSpacing: "0.5px" }}>
              STATE BANK OF INDIA
            </div>
            <div style={{ fontSize: "9pt", color: "#555", marginTop: "1mm" }}>
              Personal Loan — Xpress Credit File
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{
              fontSize: "18pt", fontWeight: "bold", color: "#003399",
              border: "2px solid #003399", padding: "2mm 5mm", borderRadius: "4px",
              letterSpacing: "1px",
            }}>
              {serialNo}
            </div>
            <div style={{ fontSize: "7.5pt", color: "#888", marginTop: "1mm" }}>Xpress File No.</div>
          </div>
        </div>
      </div>

      {/* ── Customer Details Table ── */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "5mm", fontSize: "8.5pt" }}>
        <tbody>
          <DetailRow label="Name of Customer" value={custName} />
          <DetailRow label="Father's Name" value="" blank />
          <DetailRow label="Salary Account Number" value="" blank />
          <DetailRow label="Salary Account Type" value="" blank />
          <DetailRow label="CIF Number" value={cifNo} />
          <DetailRow label="Loan A/c. Number" value={acctNo} />
          <DetailRow label="Loan A/c. Type" value={acctDesc} />
          <DetailRow label="Sanction Amount" value={formatCurrency(sanctionAmt)} />
          <DetailRow label="Sanction Date" value={formatDate(sanctionDate)} />
          <DetailRow label="Address" value={address} multiline />
          <DetailRow label="Mobile Number" value={mobile} />
        </tbody>
      </table>

      {/* ── Documentation Checklist ── */}
      <div style={{
        border: "1.5px solid #003399", borderRadius: "3px", overflow: "hidden",
        marginBottom: "4mm",
      }}>
        <div style={{
          background: "#003399", color: "white", padding: "2mm 4mm",
          fontSize: "9pt", fontWeight: "bold", letterSpacing: "0.3px",
        }}>
          Documentation Checklist
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8pt" }}>
          <tbody>
            {CHECKLIST_ROWS.map((row, i) => (
              <tr key={i} style={{ borderBottom: i < CHECKLIST_ROWS.length - 1 ? "0.5px solid #ddd" : "none" }}>
                <td style={{ width: "50%", padding: "1.5mm 3mm", borderRight: "0.5px solid #ddd" }}>
                  <span style={{
                    display: "inline-block", width: "3mm", height: "3mm",
                    border: "1px solid #333", marginRight: "2mm", verticalAlign: "middle",
                    flexShrink: 0,
                  }} />
                  {row.left}
                </td>
                <td style={{ width: "50%", padding: "1.5mm 3mm" }}>
                  {row.right && (
                    <>
                      <span style={{
                        display: "inline-block", width: "3mm", height: "3mm",
                        border: "1px solid #333", marginRight: "2mm", verticalAlign: "middle",
                        flexShrink: 0,
                      }} />
                      {row.right}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Register Entry Section ── */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8.5pt", border: "1px solid #aaa" }}>
        <tbody>
          <tr>
            <td style={{ padding: "2mm 3mm", borderRight: "1px solid #aaa", width: "50%" }}>
              <strong>Loan Application Register</strong><br />
              <span style={{ color: "#555" }}>Serial No.: </span>
              <span style={{ borderBottom: "1px solid #333", display: "inline-block", minWidth: "30mm" }}>&nbsp;</span>
            </td>
            <td style={{ padding: "2mm 3mm", width: "50%" }}>
              <strong>Document Execution Register</strong><br />
              <span style={{ color: "#555" }}>Folio No.: </span>
              <span style={{ borderBottom: "1px solid #333", display: "inline-block", minWidth: "15mm" }}>&nbsp;</span>
              {" / "}
              <span style={{ borderBottom: "1px solid #333", display: "inline-block", minWidth: "15mm" }}>&nbsp;</span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Footer ── */}
      <div style={{ marginTop: "4mm", fontSize: "7pt", color: "#888", textAlign: "center", borderTop: "0.5px solid #ddd", paddingTop: "2mm" }}>
        SBI Branch Portfolio Dashboard · Generated {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
      </div>
    </div>
  );
}

// ─── Detail Row ───────────────────────────────────────────────────────────────
function DetailRow({
  label, value, blank, multiline
}: { label: string; value: string; blank?: boolean; multiline?: boolean }) {
  return (
    <tr style={{ borderBottom: "0.5px solid #e0e0e0" }}>
      <td style={{
        padding: "1.8mm 3mm", fontWeight: "600", color: "#333",
        width: "42mm", verticalAlign: "top", whiteSpace: "nowrap",
        borderRight: "0.5px solid #e0e0e0", background: "#f8f9fc",
      }}>
        {label}
      </td>
      <td style={{ padding: "1.8mm 3mm", color: "#111", verticalAlign: "top" }}>
        {blank ? (
          <span style={{ borderBottom: "1px solid #999", display: "inline-block", minWidth: "80mm" }}>&nbsp;</span>
        ) : multiline ? (
          <span style={{ whiteSpace: "pre-wrap" }}>{value}</span>
        ) : (
          value || "—"
        )}
      </td>
    </tr>
  );
}
