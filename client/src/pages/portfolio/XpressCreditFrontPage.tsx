/*
 * XpressCreditFrontPage.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders a pre-filled A4 front-page cover sheet for a Personal Loan (PER series)
 * file. Data is fetched from LOAN_DATA and DEPOSIT_DATA in IndexedDB.
 * Print uses an isolated iframe (same approach as LetterGenerator) to avoid
 * oklch CSS variable issues and ensure reliable print output.
 */

import { useEffect, useState, useRef } from "react";
import { X, Printer, Loader2 } from "lucide-react";
import { getAllRecords, STORES } from "@/lib/portfolioDb";

const SBI_LOGO_B64 = "data:image/png;base64,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";

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

interface DepositRecord {
  AcNo: string;
  CIF: string;
  Salary_Account_Flag: string;
  Acct_Desc: string;
  [key: string]: unknown;
}

interface Props {
  record: LoanFileRecord;
  onClose: () => void;
}

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

const CHECKLIST_ROWS: { left: string; right: string }[] = [
  { left: "PL Application Form", right: "Loan Agreement" },
  { left: "Consent Form", right: "Loan Arrangement" },
  { left: "CIC Report", right: "Key Fact Statement" },
  { left: "Self-attested PAN Card", right: "Appraisal cum Sanction Report" },
  { left: "KYC", right: "" },
  { left: "UID / Voter Id", right: "No Dues: Required \u2610 / Not Required \u2610" },
  { left: "e-KYC / Electoral Search", right: "Perfios Report" },
  { left: "Salary Slips", right: "Control Return" },
  { left: "A/c Stmnt. / CBS Screenshot", right: "Annexure XP-10 Signed & Sent" },
  { left: "Form 16 / ITR", right: "PSS / RO Verification" },
  { left: "IT Undertaking", right: "SI Letter (PL-12)" },
  { left: "NeSL Disclosure Consent", right: "" },
  { left: "Borrower Ack. (Ann. II)", right: "" },
  { left: "Stamp Paid & Pasted", right: "" },
  { left: "Photograph", right: "" },
];

function buildPrintHTML(params: {
  serialNo: string;
  custName: string;
  fathersName: string;
  salaryAcctNo: string;
  salaryAcctType: string;
  cifNo: string;
  acctNo: string;
  acctDesc: string;
  sanctionAmt: number;
  sanctionDate: string;
  address: string;
  mobile: string;
  logoB64: string;
  isClosed?: boolean;
}): string {
  const {
    serialNo, custName, fathersName, salaryAcctNo, salaryAcctType,
    cifNo, acctNo, acctDesc, sanctionAmt, sanctionDate, address, mobile, logoB64,
    isClosed = false,
  } = params;

  const rows = [
    ["Name of Customer", custName],
    ["Father's Name", fathersName || ""],
    ["Salary Account Number", salaryAcctNo || ""],
    ["Salary Account Type", salaryAcctType || ""],
    ["CIF Number", cifNo],
    ["Loan A/c. Number", acctNo],
    ["Loan A/c. Type", acctDesc],
    ["Sanction Amount", formatCurrency(sanctionAmt)],
    ["Sanction Date", formatDate(sanctionDate)],
    ["Address", address],
    ["Mobile Number", mobile],
  ];

  const detailRowsHtml = rows.map(([label, value]) => `
    <tr style="border-bottom: 0.5px solid #e0e0e0;">
      <td style="padding: 1.8mm 3mm; font-weight: 600; color: #333; width: 42mm; vertical-align: top; white-space: nowrap; border-right: 0.5px solid #e0e0e0; background: #f8f9fc;">${label}</td>
      <td style="padding: 1.8mm 3mm; color: #111; vertical-align: top; white-space: pre-wrap;">${value || '<span style="border-bottom: 1px solid #999; display: inline-block; min-width: 80mm;">&nbsp;</span>'}</td>
    </tr>`).join("");

  const checklistHtml = CHECKLIST_ROWS.map((row, i) => `
    <tr style="border-bottom: ${i < CHECKLIST_ROWS.length - 1 ? "0.5px solid #ddd" : "none"};">
      <td style="width: 50%; padding: 1.5mm 3mm; border-right: 0.5px solid #ddd;">
        <span style="display: inline-block; width: 3mm; height: 3mm; border: 1px solid #333; margin-right: 2mm; vertical-align: middle;"></span>
        ${row.left}
      </td>
      <td style="width: 50%; padding: 1.5mm 3mm;">
        ${row.right ? `<span style="display: inline-block; width: 3mm; height: 3mm; border: 1px solid #333; margin-right: 2mm; vertical-align: middle;"></span>${row.right}` : ""}
      </td>
    </tr>`).join("");

  const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #000; background: white; }
    @page { size: A4 portrait; margin: 0; }
    .page { width: 210mm; min-height: 297mm; padding: 12mm 14mm; position: relative; overflow: hidden; }
    table { border-collapse: collapse; width: 100%; }
    .closed-wm { position: fixed; top: 0; left: 0; width: 210mm; height: 297mm; pointer-events: none; z-index: 999; }
    .closed-wm-text {
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 56pt; font-weight: 900; letter-spacing: 10px;
      color: rgba(180,0,0,0.20); white-space: nowrap;
      font-family: Arial, Helvetica, sans-serif; text-transform: uppercase;
      border-top: 3.5px solid rgba(180,0,0,0.25);
      border-bottom: 3.5px solid rgba(180,0,0,0.25);
      padding: 5mm 12mm; line-height: 1;
    }
  </style>
</head>
<body>
${isClosed ? '<div class="closed-wm"><span class="closed-wm-text">CLOSED</span></div>' : ''}
<div class="page">
  <!-- Header -->
  <div style="border-bottom: 3px solid #003399; margin-bottom: 6mm; padding-bottom: 4mm;">
    <div style="display: flex; align-items: center; gap: 10mm;">
      <img src="${logoB64}" style="width: 18mm; height: 18mm; object-fit: contain; flex-shrink: 0;" alt="SBI Logo" />
      <div style="flex: 1;">
        <div style="font-size: 14pt; font-weight: bold; color: #003399; letter-spacing: 0.5px;">STATE BANK OF INDIA</div>
        <div style="font-size: 9pt; color: #555; margin-top: 1mm;">Personal Loan — Xpress Credit File</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 18pt; font-weight: bold; color: #003399; border: 2px solid #003399; padding: 2mm 5mm; border-radius: 4px; letter-spacing: 1px;">${serialNo}</div>
        <div style="font-size: 7.5pt; color: #888; margin-top: 1mm;">Xpress File No.</div>
      </div>
    </div>
  </div>

  <!-- Customer Details -->
  <table style="margin-bottom: 5mm; font-size: 8.5pt; border: 0.5px solid #e0e0e0;">
    <tbody>${detailRowsHtml}</tbody>
  </table>

  <!-- Documentation Checklist -->
  <div style="border: 1.5px solid #003399; border-radius: 3px; overflow: hidden; margin-bottom: 4mm;">
    <div style="background: #003399; color: white; padding: 2mm 4mm; font-size: 9pt; font-weight: bold; letter-spacing: 0.3px;">Documentation Checklist</div>
    <table style="font-size: 8pt;"><tbody>${checklistHtml}</tbody></table>
  </div>

  <!-- Register Entry -->
  <table style="font-size: 8.5pt; border: 1px solid #aaa;">
    <tbody>
      <tr>
        <td style="padding: 2mm 3mm; border-right: 1px solid #aaa; width: 50%;">
          <strong>Loan Application Register</strong><br/>
          <span style="color: #555;">Serial No.: </span>
          <span style="border-bottom: 1px solid #333; display: inline-block; min-width: 30mm;">&nbsp;</span>
        </td>
        <td style="padding: 2mm 3mm; width: 50%;">
          <strong>Document Execution Register</strong><br/>
          <span style="color: #555;">Folio No.: </span>
          <span style="border-bottom: 1px solid #333; display: inline-block; min-width: 15mm;">&nbsp;</span>
          &nbsp;/&nbsp;
          <span style="border-bottom: 1px solid #333; display: inline-block; min-width: 15mm;">&nbsp;</span>
        </td>
      </tr>
    </tbody>
  </table>

  <!-- Footer -->
  <div style="margin-top: 4mm; font-size: 7pt; color: #888; text-align: center; border-top: 0.5px solid #ddd; padding-top: 2mm;">
    SBI Branch Portfolio Dashboard · Generated ${today}
  </div>
</div>
</body>
</html>`;
}

export default function XpressCreditFrontPage({ record, onClose }: Props) {
  const [loanData, setLoanData] = useState<LoanDataRecord | null>(null);
  const [salaryAcctNo, setSalaryAcctNo] = useState<string>("");
  const [salaryAcctType, setSalaryAcctType] = useState<string>("");
  const [fathersName, setFathersName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    (async () => {
      try {
        // Load loan data
        const allLoans: LoanDataRecord[] = await getAllRecords(STORES.LOAN_DATA);
        const match = allLoans.find(
          l => l.LoanKey === record.accountNo ||
               l.LoanKey.replace(/^0+/, "") === record.accountNo.replace(/^0+/, "")
        );
        setLoanData(match || null);

        // Load salary account from DEPOSIT_DATA by CIF
        const cif = match?.CIF || record.cifNo;
        if (cif) {
          const allDeposits: DepositRecord[] = await getAllRecords(STORES.DEPOSIT_DATA);
          const salaryAcct = allDeposits.find(
            d => d.CIF === cif && d.Salary_Account_Flag === "Salary"
          );
          if (salaryAcct) {
            setSalaryAcctNo(salaryAcct.AcNo || "");
            setSalaryAcctType(salaryAcct.Acct_Desc || "");
          }
        }
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [record.accountNo, record.cifNo]);

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

  const handlePrint = () => {
    setPrinting(true);
    const html = buildPrintHTML({
      serialNo: record.serialNo,
      custName,
      fathersName,
      salaryAcctNo,
      salaryAcctType,
      cifNo,
      acctNo,
      acctDesc,
      sanctionAmt,
      sanctionDate,
      address,
      mobile,
      logoB64: SBI_LOGO_B64,
      isClosed: record.status === 'CLOSED',
    });

    const iframe = iframeRef.current;
    if (!iframe) { setPrinting(false); return; }

    iframe.style.display = "block";
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) { setPrinting(false); return; }

    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      iframe.style.display = "none";
      setPrinting(false);
    }, 600);
  };

  return (
    <>
      {/* Hidden iframe for print */}
      <iframe
        ref={iframeRef}
        style={{ display: "none", position: "fixed", top: 0, left: 0, width: "210mm", height: "297mm", border: "none", zIndex: 99999 }}
        title="print-frame"
      />

      {/* Modal Overlay */}
      <div className="fixed inset-0 z-50 bg-black/70 flex flex-col items-center justify-start overflow-auto py-6 px-4">
        {/* Toolbar */}
        <div className="w-full max-w-[220mm] flex items-center justify-between mb-4 flex-shrink-0">
          <div className="text-white font-semibold text-lg">
            Xpress Credit Front Page — <span className="font-mono text-blue-300">{record.serialNo}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              disabled={loading || printing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50"
            >
              {printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              {printing ? "Preparing…" : "Print / Save PDF"}
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/20 text-white text-sm hover:bg-white/30 transition-colors"
            >
              <X className="w-4 h-4" /> Close
            </button>
          </div>
        </div>

        {/* A4 Preview */}
        {loading ? (
          <div className="flex items-center justify-center bg-white rounded shadow-2xl" style={{ width: "210mm", height: "297mm" }}>
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-500">Loading data…</span>
          </div>
        ) : (
          <div
            className="bg-white shadow-2xl rounded flex-shrink-0"
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
            {/* Header */}
            <div style={{ borderBottom: "3px solid #003399", marginBottom: "6mm", paddingBottom: "4mm" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10mm" }}>
                <img src={SBI_LOGO_B64} style={{ width: "18mm", height: "18mm", objectFit: "contain", flexShrink: 0 }} alt="SBI" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14pt", fontWeight: "bold", color: "#003399", letterSpacing: "0.5px" }}>STATE BANK OF INDIA</div>
                  <div style={{ fontSize: "9pt", color: "#555", marginTop: "1mm" }}>Personal Loan — Xpress Credit File</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "18pt", fontWeight: "bold", color: "#003399", border: "2px solid #003399", padding: "2mm 5mm", borderRadius: "4px", letterSpacing: "1px" }}>
                    {record.serialNo}
                  </div>
                  <div style={{ fontSize: "7.5pt", color: "#888", marginTop: "1mm" }}>Xpress File No.</div>
                </div>
              </div>
            </div>

            {/* Customer Details Table */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "5mm", fontSize: "8.5pt", border: "0.5px solid #e0e0e0" }}>
              <tbody>
                <PreviewRow label="Name of Customer" value={custName} />
                {/* Editable Father's Name */}
                <tr style={{ borderBottom: "0.5px solid #e0e0e0" }}>
                  <td style={{ padding: "1.8mm 3mm", fontWeight: 600, color: "#333", width: "42mm", verticalAlign: "top", whiteSpace: "nowrap", borderRight: "0.5px solid #e0e0e0", background: "#f8f9fc" }}>
                    Father's Name
                  </td>
                  <td style={{ padding: "1mm 3mm", verticalAlign: "top" }}>
                    <input
                      type="text"
                      value={fathersName}
                      onChange={e => setFathersName(e.target.value)}
                      placeholder="Enter father's name…"
                      style={{
                        width: "100%", border: "none", borderBottom: "1.5px solid #003399",
                        outline: "none", fontSize: "8.5pt", fontFamily: "Arial, Helvetica, sans-serif",
                        color: "#111", background: "transparent", padding: "0.5mm 0",
                      }}
                    />
                  </td>
                </tr>
                <PreviewRow label="Salary Account Number" value={salaryAcctNo} />
                <PreviewRow label="Salary Account Type" value={salaryAcctType} />
                <PreviewRow label="CIF Number" value={cifNo} />
                <PreviewRow label="Loan A/c. Number" value={acctNo} />
                <PreviewRow label="Loan A/c. Type" value={acctDesc} />
                <PreviewRow label="Sanction Amount" value={formatCurrency(sanctionAmt)} />
                <PreviewRow label="Sanction Date" value={formatDate(sanctionDate)} />
                <PreviewRow label="Address" value={address} multiline />
                <PreviewRow label="Mobile Number" value={mobile} />
              </tbody>
            </table>

            {/* Documentation Checklist */}
            <div style={{ border: "1.5px solid #003399", borderRadius: "3px", overflow: "hidden", marginBottom: "4mm" }}>
              <div style={{ background: "#003399", color: "white", padding: "2mm 4mm", fontSize: "9pt", fontWeight: "bold", letterSpacing: "0.3px" }}>
                Documentation Checklist
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8pt" }}>
                <tbody>
                  {CHECKLIST_ROWS.map((row, i) => (
                    <tr key={i} style={{ borderBottom: i < CHECKLIST_ROWS.length - 1 ? "0.5px solid #ddd" : "none" }}>
                      <td style={{ width: "50%", padding: "1.5mm 3mm", borderRight: "0.5px solid #ddd" }}>
                        <span style={{ display: "inline-block", width: "3mm", height: "3mm", border: "1px solid #333", marginRight: "2mm", verticalAlign: "middle" }} />
                        {row.left}
                      </td>
                      <td style={{ width: "50%", padding: "1.5mm 3mm" }}>
                        {row.right && (
                          <>
                            <span style={{ display: "inline-block", width: "3mm", height: "3mm", border: "1px solid #333", marginRight: "2mm", verticalAlign: "middle" }} />
                            {row.right}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Register Entry */}
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

            {/* Footer */}
            <div style={{ marginTop: "4mm", fontSize: "7pt", color: "#888", textAlign: "center", borderTop: "0.5px solid #ddd", paddingTop: "2mm" }}>
              SBI Branch Portfolio Dashboard · Generated {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function PreviewRow({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <tr style={{ borderBottom: "0.5px solid #e0e0e0" }}>
      <td style={{ padding: "1.8mm 3mm", fontWeight: 600, color: "#333", width: "42mm", verticalAlign: "top", whiteSpace: "nowrap", borderRight: "0.5px solid #e0e0e0", background: "#f8f9fc" }}>
        {label}
      </td>
      <td style={{ padding: "1.8mm 3mm", color: "#111", verticalAlign: "top", whiteSpace: multiline ? "pre-wrap" : "normal" }}>
        {value || <span style={{ borderBottom: "1px solid #999", display: "inline-block", minWidth: "80mm" }}>&nbsp;</span>}
      </td>
    </tr>
  );
}
