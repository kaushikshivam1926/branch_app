/**
 * LoanClosureModule.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Design: SBI Dashboard — clean white card layout, consistent with Branch Portfolio
 * Full workflow:
 *   Step 1 → Select account type (Live / Already Closed)
 *   Step 2 → Enter account number → fetch from LOAN_DATA
 *   Step 3 → Review & edit details + co-borrower option
 *   Step 4 → Print Closure Application
 *   Step 5 → Confirm "Physical Request Obtained"
 *   Step 6 → NOC type selection + extra fields
 *   Step 7 → Print NOC(s)
 */

import { useState, useRef, useCallback } from "react";
import {
  Search, CheckCircle, AlertCircle, ChevronRight, ChevronLeft,
  Printer, UserPlus, X, Edit3, Users, FileText, ClipboardCheck,
  Loader2, RotateCcw, Info, Plus, Trash2
} from "lucide-react";
import { getAllRecords, STORES } from "@/lib/portfolioDb";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LoanDataRecord {
  LoanKey: string;
  CIF: string;
  CUSTNAME: string;
  ACCTDESC: string;
  LIMIT: number;
  INSTALAMT: number;
  INTRATE: number;
  SANCTDT: string;
  Maturity_Dt: string;
  Shadow_Add1: string;
  Shadow_Add2: string;
  Shadow_Add3: string;
  Shadow_Add4: string;
  Shadow_PostCode: string;
  Shadow_MobileNo: string;
  Loan_Category: string;
  ProductCode: string;
  [key: string]: unknown;
}

interface CoBorrower {
  id: string;
  name: string;
  cif: string;
  address: string;
  mobile: string;
  source: "db" | "manual";
}

interface ClosureDetails {
  accountNo: string;
  accountType: string; // "live" | "closed"
  borrowerName: string;
  borrowerTitle: string; // Mr. / Ms. / Mrs.
  cif: string;
  loanType: string; // ACCTDESC
  loanCategory: string; // Home Loan / Vehicle Loan / Personal Loan etc.
  sanctionAmount: number;
  address: string;
  mobile: string;
  savingsAccountNo: string;
  closureDate: string; // DD/MM/YYYY
  // Vehicle-specific
  vehicleRegNo: string;
  vahanRefNo: string;
  vahanRefDate: string;
  bankRefNo: string;
  // HL-specific
  cersaiDate: string;
  letterSerial: string;
  // Co-borrowers
  coBorrowers: CoBorrower[];
  hasJointBorrowers: boolean;
}

type WorkflowStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtCurrency(n: number): string {
  if (!n) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function ordinalDate(dateStr: string): string {
  if (!dateStr) return "___________";
  // Accept DD/MM/YYYY or ISO
  let d: Date;
  if (dateStr.includes("/")) {
    const [dd, mm, yyyy] = dateStr.split("/");
    d = new Date(`${yyyy}-${mm}-${dd}`);
  } else {
    d = new Date(dateStr);
  }
  if (isNaN(d.getTime())) return dateStr;
  const day = d.getDate();
  const suffix = day === 1 || day === 21 || day === 31 ? "st" : day === 2 || day === 22 ? "nd" : day === 3 || day === 23 ? "rd" : "th";
  const month = d.toLocaleDateString("en-IN", { month: "long" });
  const year = d.getFullYear();
  return `${day}${suffix} ${month} ${year}`;
}

function todayDDMMYYYY(): string {
  return new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function todayOrdinal(): string {
  return ordinalDate(new Date().toISOString());
}

function buildAddress(loan: LoanDataRecord): string {
  return [loan.Shadow_Add1, loan.Shadow_Add2, loan.Shadow_Add3, loan.Shadow_Add4, loan.Shadow_PostCode]
    .map(p => (p || "").trim()).filter(Boolean).join(", ") || "";
}

function detectNocType(loanCategory: string, acctDesc: string): "general" | "home" | "vehicle" {
  const cat = (loanCategory || "").toLowerCase();
  const desc = (acctDesc || "").toLowerCase();
  if (cat.includes("home") || desc.includes("home") || desc.includes("hl") || desc.includes("suraksha") || desc.includes("maxgain")) return "home";
  if (cat.includes("vehicle") || cat.includes("auto") || cat.includes("car") || desc.includes("car") || desc.includes("vehicle") || desc.includes("auto")) return "vehicle";
  return "general";
}

function getLoanTypeLabel(loanCategory: string, acctDesc: string): string {
  const cat = (loanCategory || "").toLowerCase();
  if (cat.includes("home")) return "Home Loan";
  if (cat.includes("vehicle") || cat.includes("auto") || cat.includes("car")) return "Auto Loan";
  if (cat.includes("personal") || cat.includes("xpress")) return "Personal Loan";
  if (cat.includes("pension")) return "Pension Loan";
  if (cat.includes("gold")) return "Gold Loan";
  if (cat.includes("education")) return "Education Loan";
  if (cat.includes("pm surya") || cat.includes("pmsg") || cat.includes("solar")) return "PM Surya Ghar Loan";
  if (cat.includes("msme") || cat.includes("business")) return "Business Loan";
  return acctDesc || "Loan";
}

// ─── SBI Logo (base64 inline) ─────────────────────────────────────────────────
const SBI_LOGO_B64 = "data:image/png;base64,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";

// ─── Step Indicator ───────────────────────────────────────────────────────────

const STEPS = [
  { n: 1, label: "Account" },
  { n: 2, label: "Fetch" },
  { n: 3, label: "Review" },
  { n: 4, label: "Application" },
  { n: 5, label: "Confirm" },
  { n: 6, label: "NOC Setup" },
  { n: 7, label: "Print NOC" },
];

function StepIndicator({ current }: { current: WorkflowStep }) {
  return (
    <div className="flex items-center gap-0 mb-6 overflow-x-auto pb-1">
      {STEPS.map((s, i) => (
        <div key={s.n} className="flex items-center">
          <div className={`flex flex-col items-center min-w-[56px] ${current === s.n ? "opacity-100" : current > s.n ? "opacity-80" : "opacity-40"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors
              ${current === s.n ? "bg-blue-600 border-blue-600 text-white" :
                current > s.n ? "bg-green-500 border-green-500 text-white" :
                "bg-white border-gray-300 text-gray-400"}`}>
              {current > s.n ? <CheckCircle className="w-4 h-4" /> : s.n}
            </div>
            <span className={`text-[10px] mt-1 font-medium text-center leading-tight ${current === s.n ? "text-blue-700" : current > s.n ? "text-green-600" : "text-gray-400"}`}>
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-0.5 w-6 mx-0.5 mt-[-10px] transition-colors ${current > s.n ? "bg-green-400" : "bg-gray-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Editable Field ───────────────────────────────────────────────────────────

function EditableField({ label, value, onChange, type = "text", placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || `Enter ${label.toLowerCase()}…`}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
      />
    </div>
  );
}

function EditableSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ─── Print helper ─────────────────────────────────────────────────────────────

function printHTML(html: string, iframeRef: React.RefObject<HTMLIFrameElement | null>) {
  const iframe = iframeRef.current;
  if (!iframe) return;
  iframe.style.display = "block";
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) return;
  doc.open(); doc.write(html); doc.close();
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    iframe.style.display = "none";
  }, 600);
}

// ─── Closure Application HTML ─────────────────────────────────────────────────

function buildClosureApplicationHTML(d: ClosureDetails, logoB64: string): string {
  const loanTypeText = d.loanCategory.includes("Home") ? "Home" :
    d.loanCategory.includes("Vehicle") || d.loanCategory.includes("Auto") || d.loanCategory.includes("Car") ? "Car" :
    d.loanCategory.includes("Personal") || d.loanCategory.includes("Xpress") ? "Personal" :
    d.loanCategory.includes("Gold") ? "Gold" :
    d.loanCategory.includes("Pension") ? "Pension" :
    d.loanCategory.includes("Education") ? "Education" : "Loan";

  const coBorrowerLine = d.hasJointBorrowers && d.coBorrowers.length > 0
    ? `<p style="margin:0 0 6pt 0;">Co-Borrower(s): ${d.coBorrowers.map(c => `<strong>${c.name}</strong>`).join(", ")}</p>`
    : "";

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:"Times New Roman",Times,serif;font-size:12pt;color:#000;background:white;}
@page{size:A4 portrait;margin:25mm 20mm 20mm 25mm;}
.page{width:170mm;min-height:247mm;padding:0;}
p{margin-bottom:8pt;line-height:1.6;}
.underline{text-decoration:underline;}
.sig-block{margin-top:30pt;}
</style></head>
<body>
<div class="page">
  <div style="text-align:right;margin-bottom:20pt;">
    <img src="${logoB64}" style="width:14mm;height:14mm;object-fit:contain;" alt="SBI"/>
  </div>
  <p>To,<br/>Branch Manager,<br/>State Bank of India,<br/>PBB New Market, Bhopal</p>
  <p style="margin-top:12pt;"><strong>Sub: Closure of Loan Account and issuance of No Dues Certificate</strong></p>
  <p style="margin-top:12pt;">
    I, <span class="underline"><strong>${d.borrowerName || "___________________________"}</strong></span>
    ${d.hasJointBorrowers && d.coBorrowers.length > 0 ? ` along with ${d.coBorrowers.map(c => `<span class="underline"><strong>${c.name}</strong></span>`).join(", ")}` : ""}
    have availed ${loanTypeText} Loan with account No.&nbsp;
    <span class="underline"><strong>${d.accountNo || "_______________"}</strong></span>
    from your branch. I wish to close the loan account and I have repaid total outstanding loan amount or
    debit my Saving / Current Account No.&nbsp;
    <span class="underline"><strong>${d.savingsAccountNo || "_______________"}</strong></span>
    to repay total outstanding loan amount plus any accrued interest and charges.
    Further, kindly also issue a No Dues Certificate for the loan account.
  </p>
  <p>Thanks and regards,</p>
  ${coBorrowerLine}
  <div class="sig-block">
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="width:50%;vertical-align:top;">
          <p>Sign: _____________________</p>
          <p>Name: <strong>${d.borrowerName || "____________________"}</strong></p>
          <p>Date: ${d.closureDate ? d.closureDate.replace(/\//g, " / ") : "___ / ___ / _______"}</p>
          <p>Mob: ${d.mobile || "_____________________"}</p>
        </td>
        ${d.hasJointBorrowers && d.coBorrowers.length > 0 ? `
        <td style="width:50%;vertical-align:top;padding-left:10mm;">
          ${d.coBorrowers.map(c => `
          <p>Sign: _____________________</p>
          <p>Name: <strong>${c.name}</strong></p>
          <p>Mob: ${c.mobile || "_____________________"}</p>
          `).join("<br/>")}
        </td>` : ""}
      </tr>
    </table>
  </div>
</div>
</body></html>`;
}

// ─── General NOC HTML ─────────────────────────────────────────────────────────

function buildGeneralNOCHTML(d: ClosureDetails, logoB64: string): string {
  const loanTypeLabel = getLoanTypeLabel(d.loanCategory, d.loanType);
  const closureDateOrdinal = ordinalDate(d.closureDate);
  const todayOrd = ordinalDate(todayDDMMYYYY());

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:Arial,Helvetica,sans-serif;font-size:11pt;color:#000;background:white;}
@page{size:A4 portrait;margin:20mm 20mm 20mm 25mm;}
.page{width:165mm;min-height:257mm;}
p{line-height:1.7;margin-bottom:10pt;}
</style></head>
<body>
<div class="page">
  <!-- Header -->
  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20pt;border-bottom:2px solid #003399;padding-bottom:8pt;">
    <img src="${logoB64}" style="width:16mm;height:16mm;object-fit:contain;" alt="SBI"/>
    <div style="text-align:right;">
      <div style="font-size:13pt;font-weight:bold;color:#003399;">भारतीय स्टेट बैंक</div>
      <div style="font-size:13pt;font-weight:bold;color:#003399;">STATE BANK OF INDIA</div>
    </div>
  </div>

  <p style="text-align:center;font-weight:bold;text-decoration:underline;font-size:12pt;margin-bottom:20pt;">
    TO WHOMSOEVER IT MAY CONCERN
  </p>

  <p style="text-align:justify;">
    This is to certify that ${d.borrowerTitle} <strong>${d.borrowerName}</strong>
    ${d.hasJointBorrowers && d.coBorrowers.length > 0 ? ` along with ${d.coBorrowers.map(c => `<strong>${c.name}</strong>`).join(", ")}` : ""}
    had availed a <strong>${loanTypeLabel}</strong> of amount
    <strong>Rs. ${fmtCurrency(d.sanctionAmount).replace("₹", "").trim()}/-</strong>
    with account number <strong>${d.accountNo}</strong> from our PBB New Market Branch, Bhopal.
    The loan account has already been closed on <strong>${closureDateOrdinal}</strong>
    and no dues is outstanding against this loan account.
    This letter has been issued at the request of the customer for this specific loan account only.
  </p>

  <div style="margin-top:40pt;">
    <p>Yours faithfully,</p>
    <div style="margin-top:30pt;">
      <p style="margin:0;">(Branch Manager)</p>
      <p style="margin:0;">State Bank of India</p>
      <p style="margin:0;">PBB New Market (13042),</p>
      <p style="margin:0;">Bhopal (M.P)</p>
      <p style="margin:0;">Date: ${todayOrd}</p>
    </div>
  </div>
</div>
</body></html>`;
}

// ─── Home Loan NOC HTML ───────────────────────────────────────────────────────

function buildHLNOCHTML(d: ClosureDetails, logoB64: string): string {
  const closureDateOrdinal = ordinalDate(d.closureDate);
  const todayOrd = ordinalDate(todayDDMMYYYY());
  const pronoun = d.borrowerTitle === "Ms." || d.borrowerTitle === "Mrs." ? "her" : "his";

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:Arial,Helvetica,sans-serif;font-size:11pt;color:#000;background:white;}
@page{size:A4 portrait;margin:20mm 20mm 20mm 25mm;}
.page{width:165mm;min-height:257mm;}
p{line-height:1.7;margin-bottom:8pt;}
</style></head>
<body>
<div class="page">
  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16pt;border-bottom:2px solid #003399;padding-bottom:6pt;">
    <img src="${logoB64}" style="width:14mm;height:14mm;object-fit:contain;" alt="SBI"/>
    <div style="text-align:right;">
      <div style="font-size:12pt;font-weight:bold;color:#003399;">STATE BANK OF INDIA</div>
      <div style="font-size:9pt;color:#555;">PBB New Market Branch, Bhopal</div>
    </div>
  </div>

  <p>To,<br/>Assistant General Manager,<br/>RACPC – I, Bhopal (M.P.)</p>
  <p>Madam/Dear Sir,</p>
  <p style="text-align:center;font-weight:bold;text-decoration:underline;margin:10pt 0;">No Dues Certificate</p>
  <p style="text-align:center;font-weight:bold;">${d.borrowerTitle} ${d.borrowerName}</p>
  <p style="text-align:center;">Home Loan Account: <strong>${d.accountNo}</strong></p>

  <p style="margin-top:14pt;text-align:justify;">
    As per request of our customer(s) ${d.borrowerTitle} <strong>${d.borrowerName}</strong>
    ${d.hasJointBorrowers && d.coBorrowers.length > 0 ? ` and ${d.coBorrowers.map(c => `<strong>${c.name}</strong>`).join(", ")}` : ""},
    we have closed ${pronoun} Home Loan Account bearing A/c. No. <strong>${d.accountNo}</strong>
    on <strong>${closureDateOrdinal}</strong>.
    Please hand over the related documents to the customer(s).
  </p>

  <div style="margin-top:36pt;">
    <p>Yours faithfully,</p>
    <div style="margin-top:28pt;">
      <p style="margin:0;">(Branch Manager)</p>
      <p style="margin:0;">State Bank of India</p>
      <p style="margin:0;">PBB New Market (13042),</p>
      <p style="margin:0;">Bhopal (M.P)</p>
      <p style="margin:0;">Date: ${todayOrd}</p>
    </div>
  </div>
</div>
</body></html>`;
}

// ─── HL Annexure I HTML ───────────────────────────────────────────────────────

function buildHLAnnexureHTML(d: ClosureDetails, logoB64: string): string {
  const closureDateOrdinal = ordinalDate(d.closureDate);
  const todayOrd = ordinalDate(todayDDMMYYYY());
  const todayFmt = todayDDMMYYYY();
  // Letter number: SBI/13042/YY-YY/03/___
  const now = new Date();
  const fy = now.getMonth() >= 3 ? `${now.getFullYear()}-${String(now.getFullYear() + 1).slice(2)}` : `${now.getFullYear() - 1}-${String(now.getFullYear()).slice(2)}`;
  const letterNo = `SBI/13042/${fy}/03/${d.letterSerial || "___"}`;

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:Arial,Helvetica,sans-serif;font-size:11pt;color:#000;background:white;}
@page{size:A4 portrait;margin:20mm 20mm 20mm 25mm;}
.page{width:165mm;min-height:257mm;}
p{line-height:1.7;margin-bottom:8pt;}
</style></head>
<body>
<div class="page">
  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16pt;border-bottom:2px solid #003399;padding-bottom:6pt;">
    <img src="${logoB64}" style="width:14mm;height:14mm;object-fit:contain;" alt="SBI"/>
    <div style="text-align:right;">
      <div style="font-size:12pt;font-weight:bold;color:#003399;">STATE BANK OF INDIA</div>
      <div style="font-size:9pt;color:#555;">PBB New Market Branch, Bhopal</div>
    </div>
  </div>

  <p>Letter No.: <strong>${letterNo}</strong></p>
  <p>Date: <strong>${todayOrd}</strong></p>

  <p style="margin-top:10pt;">
    To,<br/>
    ${d.borrowerTitle} ${d.borrowerName},<br/>
    ${d.address ? d.address.split(",").join(",<br/>") : "___________________________"}
  </p>

  <p>Madam/Dear Sir,</p>
  <p><strong>Loan Account No: ${d.accountNo}</strong></p>
  <p><strong>Branch/CPC: PBB New Market Branch, Bhopal</strong></p>

  <p style="text-align:center;font-weight:bold;text-decoration:underline;margin:10pt 0;">
    INTIMATION OF TITLE DOCUMENTS COLLECTION AFTER CLOSURE OF LOAN
  </p>

  <p style="text-align:justify;">
    Please refer to the Home Loan Account No. <strong>${d.accountNo}</strong> maintained by our PBB New Market Branch.
  </p>
  <p style="text-align:justify;">
    2. As the full and final payment of the dues to the Bank of the above-mentioned Loan has been made on
    <strong>${closureDateOrdinal}</strong> and CERSAI charge satisfied on
    <strong>${d.cersaiDate ? ordinalDate(d.cersaiDate) : "____________"}</strong>,
    we advise you to visit our RACPC/HLC along with all property holders and collect the original property
    documents with us against the mentioned loan account within 15 days of the date of this letter.
  </p>
  <p style="text-align:justify;">
    3. In case you fail to visit the HLC to collect the documents, the bank will not be liable to pay any
    compensation/penalty for delay in delivery of documents as per Reserve Bank of India notification
    RBI/2023-24/60DoR.MCS.REC.38/01.01.001/2023-24 dated 13.09.2023.
  </p>
  <p style="text-align:justify;">
    4. Also, the bank shall be entitled to levy charges at the rate of ₹1,000/- + GST per quarter or part
    thereof for delay in collection of the documents (after 60 days of full and final payment and resultant
    closure of the loan). T&amp;C apply.
  </p>

  <div style="margin-top:30pt;">
    <p>Yours faithfully,</p>
    <div style="margin-top:28pt;">
      <p style="margin:0;">Branch Manager</p>
      <p style="margin:0;">PBB New Market Branch</p>
    </div>
  </div>
</div>
</body></html>`;
}

// ─── Vehicle NOC HTML ─────────────────────────────────────────────────────────

function buildVehicleNOCHTML(d: ClosureDetails, logoB64: string): string {
  const closureDateFmt = d.closureDate || todayDDMMYYYY();
  const todayFmt = todayDDMMYYYY();

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:Arial,Helvetica,sans-serif;font-size:10pt;color:#000;background:white;}
@page{size:A4 portrait;margin:15mm 15mm 15mm 20mm;}
.page{width:175mm;min-height:267mm;}
p{line-height:1.6;margin-bottom:6pt;}
.header-row{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12pt;border-bottom:1.5px solid #003399;padding-bottom:6pt;}
.section-title{text-align:center;font-weight:bold;text-decoration:underline;margin:10pt 0;}
table.details{width:100%;border-collapse:collapse;margin:10pt 0;}
table.details td{padding:3pt 6pt;font-size:10pt;}
table.details td:first-child{font-weight:600;width:50mm;color:#333;}
.page-break{page-break-before:always;}
</style></head>
<body>

<!-- PAGE 1: Closure Letter (Annexure A) -->
<div class="page">
  <div style="text-align:right;font-size:9pt;color:#555;margin-bottom:4pt;">Annexure A</div>
  <div class="header-row">
    <img src="${logoB64}" style="width:14mm;height:14mm;object-fit:contain;" alt="SBI"/>
    <div style="text-align:center;flex:1;">
      <div style="font-weight:bold;font-size:12pt;color:#003399;">STATE BANK OF INDIA</div>
      <div style="font-size:9pt;color:#555;">PBB New Market Branch, Bhopal</div>
    </div>
  </div>

  <p class="section-title">TO WHOM SO EVER IT MAY CONCERN</p>
  <p class="section-title">AUTO LOAN CLOSURE LETTER</p>

  <p style="text-align:justify;margin-bottom:12pt;">
    This is to certify that the auto loan account of under mentioned borrower is closed. You may vacate
    Hire Purchase/Lease/Hypothecation charges noted in your Regional Transport Office record as well as in
    Certificate of Registration of the owner of the vehicle since Loan-cum Hypothecation Agreement between
    Bank and borrower has been terminated.
  </p>

  <table class="details">
    <tr><td>Name of the Borrower :</td><td>${d.borrowerTitle} ${d.borrowerName}</td></tr>
    <tr><td>Loan Account No :</td><td>${d.accountNo}</td></tr>
    <tr><td>Loan Amount :</td><td>${d.sanctionAmount ? d.sanctionAmount.toLocaleString("en-IN") : "___________"}</td></tr>
    <tr><td>Date of Loan Closure :</td><td>${closureDateFmt}</td></tr>
    <tr><td>Bank Ref. No :</td><td>${d.bankRefNo || "___________________________"}</td></tr>
    <tr><td>Vehicle Registration No :</td><td>${d.vehicleRegNo || "___________"}</td></tr>
    <tr><td>Vahan Ref. No :</td><td>${d.vahanRefNo || "___________"}</td></tr>
    <tr><td>Vahan Ref. Date :</td><td>${d.vahanRefDate || "___________"}</td></tr>
  </table>

  <div style="margin-top:20pt;display:flex;justify-content:space-between;align-items:flex-end;">
    <div><p>Date : ${todayFmt}</p></div>
    <div style="text-align:center;">
      <div style="width:50mm;height:18mm;border:1px dashed #ccc;display:flex;align-items:center;justify-content:center;font-size:8pt;color:#aaa;">[Stamp &amp; Signature]</div>
      <p style="margin-top:4pt;">(Signature of the Branch Manager)</p>
    </div>
  </div>
</div>

<!-- PAGE 2: Form 35 (Copy 1) -->
<div class="page page-break">
  <p style="margin-bottom:4pt;">Vahan Ref No : <strong>${d.vahanRefNo || "___________"}</strong></p>
  <p style="margin-bottom:12pt;">Bank Ref No : <strong>${d.bankRefNo || "___________________________"}</strong></p>

  <p class="section-title">FORM 35</p>
  <p style="text-align:center;font-size:9pt;">(See Rule 61(1))</p>
  <p style="text-align:center;">Notice of Termination of an Agreement of</p>
  <p style="text-align:center;margin-bottom:12pt;">Hire Purchase/Lease/Hypothecation</p>

  <p style="font-size:9pt;text-align:justify;margin-bottom:12pt;">
    (To be made in duplicate and in Triplicate where the original Registering Authority is different, the duplicate
    copy and the triplicate copy with the endorsement of the Registering Authority to be returned to the financier
    simultaneously on making the entry in the Certificate of Registration and form 24)
  </p>

  <p>To</p>
  <p>The Registering Authority</p>
  <p style="margin-bottom:12pt;">................................</p>

  <p style="text-align:justify;">
    We hereby declare that the agreement of Hire Purchase/Lease/Hypothecation entered into between us has been
    terminated. We, therefore, request that the note endorsed in the Certificate of Registration of Vehicle
    No. <strong>${d.vehicleRegNo || "___________"}</strong> in respect of the said Agreement between us be cancelled.
    The Certificate of Registration together with the fee is enclosed.
  </p>

  <div style="margin-top:24pt;display:flex;justify-content:space-between;align-items:flex-end;">
    <div>
      <p>Date : ${todayFmt}</p>
      <p style="font-size:8pt;color:#555;">*Strike out whichever is inapplicable</p>
    </div>
    <div style="text-align:center;">
      <div style="width:50mm;height:18mm;border:1px dashed #ccc;display:flex;align-items:center;justify-content:center;font-size:8pt;color:#aaa;">[Stamp &amp; Signature]</div>
      <p style="margin-top:4pt;font-size:9pt;">Signature of the FINANCIER with official Seal and address.</p>
    </div>
  </div>
  <p style="margin-top:8pt;font-size:8.5pt;font-style:italic;">
    "Vehicle Owner may visit the <strong>https://parivahan.gov.in/parivahan/</strong> portal for endorsement of
    hypothecation termination on the Registration Certificate."
  </p>
</div>

<!-- PAGE 3: Form 35 (Copy 2) -->
<div class="page page-break">
  <p style="margin-bottom:4pt;">Vahan Ref No : <strong>${d.vahanRefNo || "___________"}</strong></p>
  <p style="margin-bottom:12pt;">Bank Ref No : <strong>${d.bankRefNo || "___________________________"}</strong></p>

  <p class="section-title">FORM 35</p>
  <p style="text-align:center;font-size:9pt;">(See Rule 61(1))</p>
  <p style="text-align:center;">Notice of Termination of an Agreement of</p>
  <p style="text-align:center;margin-bottom:12pt;">Hire Purchase/Lease/Hypothecation</p>

  <p style="font-size:9pt;text-align:justify;margin-bottom:12pt;">
    (To be made in duplicate and in Triplicate where the original Registering Authority is different, the duplicate
    copy and the triplicate copy with the endorsement of the Registering Authority to be returned to the financier
    simultaneously on making the entry in the Certificate of Registration and form 24)
  </p>

  <p>To</p>
  <p>The Registering Authority</p>
  <p style="margin-bottom:12pt;">................................</p>

  <p style="text-align:justify;">
    We hereby declare that the agreement of Hire Purchase/Lease/Hypothecation entered into between us has been
    terminated. We, therefore, request that the note endorsed in the Certificate of Registration of Vehicle
    No. <strong>${d.vehicleRegNo || "___________"}</strong> in respect of the said Agreement between us be cancelled.
    The Certificate of Registration together with the fee is enclosed.
  </p>

  <div style="margin-top:24pt;display:flex;justify-content:space-between;align-items:flex-end;">
    <div>
      <p>Date : ${todayFmt}</p>
      <p style="font-size:8pt;color:#555;">*Strike out whichever is inapplicable</p>
    </div>
    <div style="text-align:center;">
      <div style="width:50mm;height:18mm;border:1px dashed #ccc;display:flex;align-items:center;justify-content:center;font-size:8pt;color:#aaa;">[Stamp &amp; Signature]</div>
      <p style="margin-top:4pt;font-size:9pt;">Signature of the FINANCIER with official Seal and address.</p>
    </div>
  </div>
  <p style="margin-top:8pt;font-size:8.5pt;font-style:italic;">
    "Vehicle Owner may visit the <strong>https://parivahan.gov.in/parivahan/</strong> portal for endorsement of
    hypothecation termination on the Registration Certificate."
  </p>
</div>

</body></html>`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LoanClosureModule() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const [step, setStep] = useState<WorkflowStep>(1);
  const [accountType, setAccountType] = useState<"live" | "closed" | "">("");
  const [searchInput, setSearchInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [physicalConfirmed, setPhysicalConfirmed] = useState(false);

  // CIF search for co-borrower
  const [cifSearchInput, setCifSearchInput] = useState("");
  const [cifSearchResults, setCifSearchResults] = useState<LoanDataRecord[]>([]);
  const [cifSearching, setCifSearching] = useState(false);

  const [details, setDetails] = useState<ClosureDetails>({
    accountNo: "",
    accountType: "",
    borrowerName: "",
    borrowerTitle: "Mr.",
    cif: "",
    loanType: "",
    loanCategory: "",
    sanctionAmount: 0,
    address: "",
    mobile: "",
    savingsAccountNo: "",
    closureDate: todayDDMMYYYY(),
    vehicleRegNo: "",
    vahanRefNo: "",
    vahanRefDate: "",
    bankRefNo: "",
    cersaiDate: "",
    letterSerial: "",
    coBorrowers: [],
    hasJointBorrowers: false,
  });

  const nocType = detectNocType(details.loanCategory, details.loanType);

  // ── Step 2: Fetch account ──────────────────────────────────────────────────

  const fetchAccount = useCallback(async () => {
    if (!searchInput.trim()) return;
    setSearching(true);
    setSearchError("");
    try {
      const allLoans: LoanDataRecord[] = await getAllRecords(STORES.LOAN_DATA);
      const q = searchInput.trim().replace(/^0+/, "");
      const match = allLoans.find(l =>
        l.LoanKey === searchInput.trim() ||
        l.LoanKey.replace(/^0+/, "") === q
      );
      if (!match) {
        setSearchError(`No loan account found for "${searchInput.trim()}". Please check the account number.`);
        setSearching(false);
        return;
      }
      const addr = buildAddress(match);
      setDetails(prev => ({
        ...prev,
        accountNo: match.LoanKey,
        accountType: accountType,
        borrowerName: match.CUSTNAME || "",
        borrowerTitle: "Mr.",
        cif: match.CIF || "",
        loanType: match.ACCTDESC || "",
        loanCategory: (match.Loan_Category as string) || "",
        sanctionAmount: match.LIMIT || 0,
        address: addr,
        mobile: match.Shadow_MobileNo ? `+91 ${match.Shadow_MobileNo.replace(/^\+91[-\s]?/, "")}` : "",
      }));
      setStep(3);
    } catch (err) {
      setSearchError("Error reading database. Please ensure data is uploaded.");
    } finally {
      setSearching(false);
    }
  }, [searchInput, accountType]);

  // ── CIF Search for co-borrower ─────────────────────────────────────────────

  const searchCIF = useCallback(async () => {
    if (!cifSearchInput.trim()) return;
    setCifSearching(true);
    try {
      const allLoans: LoanDataRecord[] = await getAllRecords(STORES.LOAN_DATA);
      const q = cifSearchInput.trim().toLowerCase();
      const results = allLoans.filter(l =>
        (l.CIF || "").toLowerCase().includes(q) ||
        (l.CUSTNAME || "").toLowerCase().includes(q)
      ).slice(0, 8);
      setCifSearchResults(results);
    } catch {
      setCifSearchResults([]);
    } finally {
      setCifSearching(false);
    }
  }, [cifSearchInput]);

  const addCoBorrowerFromDB = (loan: LoanDataRecord) => {
    const addr = buildAddress(loan);
    const cb: CoBorrower = {
      id: Date.now().toString(),
      name: loan.CUSTNAME || "",
      cif: loan.CIF || "",
      address: addr,
      mobile: loan.Shadow_MobileNo || "",
      source: "db",
    };
    setDetails(prev => ({ ...prev, coBorrowers: [...prev.coBorrowers, cb] }));
    setCifSearchResults([]);
    setCifSearchInput("");
  };

  const addManualCoBorrower = () => {
    const cb: CoBorrower = { id: Date.now().toString(), name: "", cif: "", address: "", mobile: "", source: "manual" };
    setDetails(prev => ({ ...prev, coBorrowers: [...prev.coBorrowers, cb] }));
  };

  const updateCoBorrower = (id: string, field: keyof CoBorrower, value: string) => {
    setDetails(prev => ({
      ...prev,
      coBorrowers: prev.coBorrowers.map(c => c.id === id ? { ...c, [field]: value } : c),
    }));
  };

  const removeCoBorrower = (id: string) => {
    setDetails(prev => ({ ...prev, coBorrowers: prev.coBorrowers.filter(c => c.id !== id) }));
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <iframe ref={iframeRef}
        style={{ display: "none", position: "fixed", top: 0, left: 0, width: "210mm", height: "297mm", border: "none", zIndex: 99999 }}
        title="print-frame" />

      <div className="flex flex-col h-full bg-gray-50 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Loan Closure Module</h1>
              <p className="text-xs text-gray-500">Generate closure applications and NOCs for all loan types</p>
            </div>
            {step > 1 && (
              <button
                onClick={() => { setStep(1); setSearchInput(""); setSearchError(""); setPhysicalConfirmed(false); setDetails(d => ({ ...d, coBorrowers: [], hasJointBorrowers: false })); }}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> New Closure
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-3xl mx-auto">
            <StepIndicator current={step} />

            {/* ── STEP 1: Account Type Selection ── */}
            {step === 1 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <h2 className="text-base font-bold text-gray-800 mb-6">Select Account Status</h2>
                <div className="grid grid-cols-2 gap-4 mb-8">
                  {[
                    { value: "live", label: "Currently Live Account", desc: "Loan is active in CBS. Fetch details from database.", icon: "🟢", color: "blue" },
                    { value: "closed", label: "Already Closed Account", desc: "Loan is already closed. Enter details manually.", icon: "🔴", color: "gray" },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setAccountType(opt.value as "live" | "closed")}
                      className={`p-5 rounded-xl border-2 text-left transition-all ${accountType === opt.value
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 bg-white hover:border-gray-300"}`}
                    >
                      <div className="text-2xl mb-2">{opt.icon}</div>
                      <div className="font-semibold text-gray-800 text-sm">{opt.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{opt.desc}</div>
                    </button>
                  ))}
                </div>
                <button
                  disabled={!accountType}
                  onClick={() => setStep(2)}
                  className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ── STEP 2: Account Number Entry ── */}
            {step === 2 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <div className="flex items-center gap-2 mb-2">
                  <button onClick={() => setStep(1)} className="text-gray-400 hover:text-gray-600">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <h2 className="text-base font-bold text-gray-800">
                    {accountType === "live" ? "Enter Loan Account Number" : "Enter Account Details Manually"}
                  </h2>
                </div>
                <p className="text-xs text-gray-500 mb-6">
                  {accountType === "live"
                    ? "Enter the CBS loan account number to fetch borrower details from the database."
                    : "The account is already closed. Enter the account number and we'll try to find it in the database, or you can fill details manually in the next step."}
                </p>
                <div className="flex gap-3 mb-4">
                  <input
                    type="text"
                    value={searchInput}
                    onChange={e => { setSearchInput(e.target.value); setSearchError(""); }}
                    onKeyDown={e => e.key === "Enter" && fetchAccount()}
                    placeholder="e.g. 38867699704"
                    className="flex-1 px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono"
                  />
                  <button
                    onClick={fetchAccount}
                    disabled={searching || !searchInput.trim()}
                    className="px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-40 flex items-center gap-2"
                  >
                    {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    {searching ? "Searching…" : "Fetch"}
                  </button>
                </div>
                {searchError && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <div>{searchError}</div>
                      {accountType === "closed" && (
                        <button
                          onClick={() => {
                            setDetails(prev => ({ ...prev, accountNo: searchInput.trim(), accountType: "closed" }));
                            setStep(3);
                          }}
                          className="mt-2 text-blue-600 underline text-xs"
                        >
                          Continue with manual entry →
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 3: Review & Edit Details ── */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-blue-500" /> Review & Edit Borrower Details
                    </h2>
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-medium">
                      {details.loanCategory || details.loanType || "Loan"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <EditableSelect label="Title" value={details.borrowerTitle}
                      onChange={v => setDetails(p => ({ ...p, borrowerTitle: v }))}
                      options={[{ value: "Mr.", label: "Mr." }, { value: "Ms.", label: "Ms." }, { value: "Mrs.", label: "Mrs." }, { value: "Dr.", label: "Dr." }, { value: "Shri", label: "Shri" }, { value: "Smt.", label: "Smt." }]} />
                    <EditableField label="Borrower Name" value={details.borrowerName} required
                      onChange={v => setDetails(p => ({ ...p, borrowerName: v }))} />
                    <EditableField label="CIF Number" value={details.cif}
                      onChange={v => setDetails(p => ({ ...p, cif: v }))} />
                    <EditableField label="Loan Account Number" value={details.accountNo} required
                      onChange={v => setDetails(p => ({ ...p, accountNo: v }))} />
                    <EditableField label="Loan Type / Product" value={details.loanType}
                      onChange={v => setDetails(p => ({ ...p, loanType: v }))} />
                    <EditableField label="Loan Category" value={details.loanCategory}
                      onChange={v => setDetails(p => ({ ...p, loanCategory: v }))} />
                    <EditableField label="Sanction Amount (₹)" value={details.sanctionAmount ? String(details.sanctionAmount) : ""}
                      type="number" onChange={v => setDetails(p => ({ ...p, sanctionAmount: parseFloat(v) || 0 }))} />
                    <EditableField label="Mobile Number" value={details.mobile}
                      onChange={v => setDetails(p => ({ ...p, mobile: v }))} />
                    <div className="col-span-2">
                      <EditableField label="Registered Address" value={details.address}
                        onChange={v => setDetails(p => ({ ...p, address: v }))} />
                    </div>
                    <EditableField label="Savings/Current A/c to Debit (for closure application)" value={details.savingsAccountNo}
                      placeholder="Enter savings/current account no." onChange={v => setDetails(p => ({ ...p, savingsAccountNo: v }))} />
                    <EditableField label="Date of Closure (DD/MM/YYYY)" value={details.closureDate}
                      placeholder="DD/MM/YYYY" onChange={v => setDetails(p => ({ ...p, closureDate: v }))} />
                  </div>
                </div>

                {/* Co-Borrower Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-500" /> Co-Borrower / Joint Borrower
                    </h2>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div
                        onClick={() => setDetails(p => ({ ...p, hasJointBorrowers: !p.hasJointBorrowers }))}
                        className={`w-11 h-6 rounded-full transition-colors relative ${details.hasJointBorrowers ? "bg-purple-600" : "bg-gray-200"}`}
                      >
                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${details.hasJointBorrowers ? "translate-x-5" : "translate-x-0.5"}`} />
                      </div>
                      <span className="text-sm font-medium text-gray-700">Joint / Co-borrowed Loan</span>
                    </label>
                  </div>

                  {details.hasJointBorrowers && (
                    <div className="space-y-4">
                      {/* CIF Search */}
                      <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                        <p className="text-xs font-semibold text-purple-700 mb-2">Search Co-Borrower by CIF or Name</p>
                        <div className="flex gap-2">
                          <input type="text" value={cifSearchInput}
                            onChange={e => setCifSearchInput(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && searchCIF()}
                            placeholder="Enter CIF number or name…"
                            className="flex-1 px-3 py-2 text-sm border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white" />
                          <button onClick={searchCIF} disabled={cifSearching}
                            className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-40 flex items-center gap-1.5">
                            {cifSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                            Search
                          </button>
                          <button onClick={addManualCoBorrower}
                            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-1.5">
                            <Plus className="w-3.5 h-3.5" /> Manual
                          </button>
                        </div>
                        {cifSearchResults.length > 0 && (
                          <div className="mt-2 border border-purple-200 rounded-lg bg-white divide-y divide-gray-100 max-h-48 overflow-y-auto">
                            {cifSearchResults.map(r => (
                              <button key={r.LoanKey} onClick={() => addCoBorrowerFromDB(r)}
                                className="w-full text-left px-3 py-2 hover:bg-purple-50 transition-colors text-sm">
                                <span className="font-medium text-gray-800">{r.CUSTNAME}</span>
                                <span className="text-gray-400 ml-2 text-xs">CIF: {r.CIF}</span>
                                <span className="text-gray-400 ml-2 text-xs">{r.LoanKey}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Co-borrower cards */}
                      {details.coBorrowers.map((cb, idx) => (
                        <div key={cb.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold text-gray-600">Co-Borrower {idx + 1} {cb.source === "db" ? "(from database)" : "(manual entry)"}</span>
                            <button onClick={() => removeCoBorrower(cb.id)} className="text-red-400 hover:text-red-600">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <EditableField label="Name" value={cb.name} required
                              onChange={v => updateCoBorrower(cb.id, "name", v)} />
                            <EditableField label="CIF" value={cb.cif}
                              onChange={v => updateCoBorrower(cb.id, "cif", v)} />
                            <EditableField label="Mobile" value={cb.mobile}
                              onChange={v => updateCoBorrower(cb.id, "mobile", v)} />
                            <div className="col-span-2">
                              <EditableField label="Address" value={cb.address}
                                onChange={v => updateCoBorrower(cb.id, "address", v)} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep(2)}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition-colors">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    disabled={!details.borrowerName || !details.accountNo}
                    onClick={() => setStep(4)}
                    className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    Proceed to Closure Application <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 4: Closure Application ── */}
            {step === 4 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-base font-bold text-gray-800 mb-1 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" /> Loan Closure Application
                </h2>
                <p className="text-xs text-gray-500 mb-6">Preview the closure application. Print or save as PDF, then obtain the physical signed copy from the customer.</p>

                {/* Preview */}
                <div className="border border-gray-200 rounded-xl p-6 bg-gray-50 mb-6 font-serif text-sm leading-relaxed">
                  <div className="text-right mb-4">
                    <img src={SBI_LOGO_B64} className="w-10 h-10 object-contain inline-block" alt="SBI" />
                  </div>
                  <p>To,<br />Branch Manager,<br />State Bank of India,<br />PBB New Market, Bhopal</p>
                  <p className="mt-4 font-semibold">Sub: Closure of Loan Account and issuance of No Dues Certificate</p>
                  <p className="mt-4 text-justify">
                    I, <strong className="underline">{details.borrowerName || "___________________________"}</strong>
                    {details.hasJointBorrowers && details.coBorrowers.length > 0 && (
                      <> along with {details.coBorrowers.map(c => <strong key={c.id} className="underline">{c.name}</strong>).reduce((a, b) => <>{a}, {b}</>)}</>
                    )}
                    {" "}have availed{" "}
                    {details.loanCategory.includes("Home") ? "Home" :
                      details.loanCategory.includes("Vehicle") || details.loanCategory.includes("Car") || details.loanCategory.includes("Auto") ? "Car" :
                        details.loanCategory.includes("Personal") ? "Personal" :
                          details.loanCategory.includes("Gold") ? "Gold" :
                            details.loanCategory.includes("Pension") ? "Pension" : "Loan"} Loan with account No.{" "}
                    <strong className="underline">{details.accountNo || "_______________"}</strong> from your branch.
                    I wish to close the loan account and I have repaid total outstanding loan amount or debit my Saving / Current Account No.{" "}
                    <strong className="underline">{details.savingsAccountNo || "_______________"}</strong> to repay total outstanding loan amount plus any accrued interest and charges.
                    Further, kindly also issue a No Dues Certificate for the loan account.
                  </p>
                  <p className="mt-4">Thanks and regards,</p>
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div>
                      <p>Sign: _____________________</p>
                      <p>Name: <strong>{details.borrowerName}</strong></p>
                      <p>Date: {details.closureDate ? details.closureDate.replace(/\//g, " / ") : "___ / ___ / _______"}</p>
                      <p>Mob: {details.mobile || "_____________________"}</p>
                    </div>
                    {details.hasJointBorrowers && details.coBorrowers.length > 0 && (
                      <div>
                        {details.coBorrowers.map(c => (
                          <div key={c.id} className="mb-2">
                            <p>Sign: _____________________</p>
                            <p>Name: <strong>{c.name}</strong></p>
                            <p>Mob: {c.mobile || "_____________________"}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep(3)}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition-colors">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    onClick={() => printHTML(buildClosureApplicationHTML(details, SBI_LOGO_B64), iframeRef)}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors">
                    <Printer className="w-4 h-4" /> Print / Save PDF
                  </button>
                  <button onClick={() => setStep(5)}
                    className="flex-1 py-3 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                    Physical Copy Obtained → <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 5: Physical Confirmation ── */}
            {step === 5 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <h2 className="text-base font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-green-500" /> Physical Request Confirmation
                </h2>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                  <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-800">
                    Please ensure you have obtained the <strong>signed physical copy</strong> of the closure application from the customer before proceeding to generate the NOC.
                  </p>
                </div>

                <label className="flex items-start gap-3 cursor-pointer mb-8 p-4 rounded-xl border-2 border-dashed transition-colors hover:border-green-400"
                  style={{ borderColor: physicalConfirmed ? "#16a34a" : "#d1d5db", background: physicalConfirmed ? "#f0fdf4" : "white" }}>
                  <input type="checkbox" checked={physicalConfirmed}
                    onChange={e => setPhysicalConfirmed(e.target.checked)}
                    className="mt-0.5 w-5 h-5 rounded accent-green-600" />
                  <div>
                    <div className="font-semibold text-gray-800 text-sm">Physical Request Obtained</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      I confirm that the signed physical closure application has been received from{" "}
                      <strong>{details.borrowerTitle} {details.borrowerName}</strong>
                      {details.hasJointBorrowers && details.coBorrowers.length > 0 && (
                        <> and co-borrower(s): {details.coBorrowers.map(c => c.name).join(", ")}</>
                      )}.
                    </div>
                  </div>
                </label>

                <div className="flex gap-3">
                  <button onClick={() => setStep(4)}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition-colors">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    disabled={!physicalConfirmed}
                    onClick={() => setStep(6)}
                    className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    Proceed to NOC Generation <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 6: NOC Setup ── */}
            {step === 6 && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-500" /> NOC Configuration
                  </h2>

                  {/* NOC Type */}
                  <div className="mb-5">
                    <label className="block text-xs font-semibold text-gray-500 mb-2">NOC Type (auto-detected from loan category)</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: "general", label: "General NOC", desc: "To Whomsoever It May Concern" },
                        { value: "home", label: "Home Loan NOC", desc: "HL NOC + Annexure I (2 docs)" },
                        { value: "vehicle", label: "Auto Loan NOC", desc: "Closure Letter + Form 35 (3 pages)" },
                      ].map(opt => (
                        <button key={opt.value}
                          onClick={() => setDetails(p => ({ ...p, loanCategory: opt.value === "home" ? "Home Loan" : opt.value === "vehicle" ? "Vehicle Loan" : p.loanCategory }))}
                          className={`p-3 rounded-xl border-2 text-left transition-all text-xs ${nocType === opt.value ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-gray-300"}`}>
                          <div className="font-semibold text-gray-800">{opt.label}</div>
                          <div className="text-gray-500 mt-0.5">{opt.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Common: Closure Date */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <EditableField label="Date of Loan Closure (DD/MM/YYYY)" value={details.closureDate}
                      placeholder="DD/MM/YYYY" onChange={v => setDetails(p => ({ ...p, closureDate: v }))} />
                  </div>

                  {/* Vehicle-specific fields */}
                  {nocType === "vehicle" && (
                    <div className="bg-orange-50 rounded-xl p-4 border border-orange-100 mb-4">
                      <p className="text-xs font-semibold text-orange-700 mb-3">Auto Loan — Additional Fields</p>
                      <div className="grid grid-cols-2 gap-4">
                        <EditableField label="Vehicle Registration No." value={details.vehicleRegNo}
                          placeholder="e.g. MP04EA5297" onChange={v => setDetails(p => ({ ...p, vehicleRegNo: v }))} />
                        <EditableField label="Vahan Ref. No." value={details.vahanRefNo}
                          placeholder="e.g. 251203290829" onChange={v => setDetails(p => ({ ...p, vahanRefNo: v }))} />
                        <EditableField label="Vahan Ref. Date (DD/MM/YYYY)" value={details.vahanRefDate}
                          placeholder="DD/MM/YYYY" onChange={v => setDetails(p => ({ ...p, vahanRefDate: v }))} />
                        <EditableField label="Bank Ref. No." value={details.bankRefNo}
                          placeholder="e.g. SBICB25350034954425660262" onChange={v => setDetails(p => ({ ...p, bankRefNo: v }))} />
                      </div>
                    </div>
                  )}

                  {/* HL-specific fields */}
                  {nocType === "home" && (
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 mb-4">
                      <p className="text-xs font-semibold text-blue-700 mb-3">Home Loan — Additional Fields (for Annexure I)</p>
                      <div className="grid grid-cols-2 gap-4">
                        <EditableField label="CERSAI Charge Satisfied Date (DD/MM/YYYY)" value={details.cersaiDate}
                          placeholder="DD/MM/YYYY (leave blank if not yet)" onChange={v => setDetails(p => ({ ...p, cersaiDate: v }))} />
                        <EditableField label="Letter Serial No. (SBI/13042/YY-YY/03/___)" value={details.letterSerial}
                          placeholder="e.g. 042" onChange={v => setDetails(p => ({ ...p, letterSerial: v }))} />
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Documents to be Generated:</p>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {nocType === "home" && (
                        <>
                          <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500" /> Home Loan NOC (Letter to RACPC)</li>
                          <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500" /> Annexure I — Intimation to Collect HL Documents</li>
                        </>
                      )}
                      {nocType === "vehicle" && (
                        <>
                          <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500" /> Auto Loan Closure Letter (Annexure A)</li>
                          <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500" /> Form 35 — Notice of Termination of HP/Hypothecation (2 copies)</li>
                        </>
                      )}
                      {nocType === "general" && (
                        <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500" /> General NOC — To Whomsoever It May Concern</li>
                      )}
                    </ul>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep(5)}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition-colors">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    disabled={!details.closureDate}
                    onClick={() => setStep(7)}
                    className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    Generate NOC(s) <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 7: Print NOC ── */}
            {step === 7 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-base font-bold text-gray-800 mb-2 flex items-center gap-2">
                  <Printer className="w-4 h-4 text-indigo-500" /> Print NOC Documents
                </h2>
                <p className="text-xs text-gray-500 mb-6">
                  Click each button to print or save the respective document as PDF.
                  {nocType === "home" && " For Home Loans, both the NOC and Annexure I should be printed."}
                  {nocType === "vehicle" && " For Auto Loans, the closure letter and Form 35 (3 pages) will print together."}
                </p>

                {/* Summary card */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 mb-6 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-gray-500 text-xs">Borrower:</span> <strong>{details.borrowerTitle} {details.borrowerName}</strong></div>
                    <div><span className="text-gray-500 text-xs">Account No.:</span> <strong>{details.accountNo}</strong></div>
                    <div><span className="text-gray-500 text-xs">Loan Type:</span> <strong>{details.loanType || details.loanCategory}</strong></div>
                    <div><span className="text-gray-500 text-xs">Closure Date:</span> <strong>{details.closureDate}</strong></div>
                    {details.hasJointBorrowers && details.coBorrowers.length > 0 && (
                      <div className="col-span-2"><span className="text-gray-500 text-xs">Co-Borrower(s):</span> <strong>{details.coBorrowers.map(c => c.name).join(", ")}</strong></div>
                    )}
                  </div>
                </div>

                {/* Print buttons */}
                <div className="space-y-3 mb-6">
                  {nocType === "general" && (
                    <button
                      onClick={() => printHTML(buildGeneralNOCHTML(details, SBI_LOGO_B64), iframeRef)}
                      className="w-full flex items-center gap-3 px-5 py-4 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors">
                      <Printer className="w-5 h-5" />
                      <div className="text-left">
                        <div>Print General NOC</div>
                        <div className="text-xs font-normal opacity-80">To Whomsoever It May Concern — {getLoanTypeLabel(details.loanCategory, details.loanType)}</div>
                      </div>
                    </button>
                  )}

                  {nocType === "home" && (
                    <>
                      <button
                        onClick={() => printHTML(buildHLNOCHTML(details, SBI_LOGO_B64), iframeRef)}
                        className="w-full flex items-center gap-3 px-5 py-4 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors">
                        <Printer className="w-5 h-5" />
                        <div className="text-left">
                          <div>Print Home Loan NOC</div>
                          <div className="text-xs font-normal opacity-80">No Dues Certificate — Letter to RACPC-I, Bhopal</div>
                        </div>
                      </button>
                      <button
                        onClick={() => printHTML(buildHLAnnexureHTML(details, SBI_LOGO_B64), iframeRef)}
                        className="w-full flex items-center gap-3 px-5 py-4 rounded-xl bg-teal-600 text-white font-semibold text-sm hover:bg-teal-700 transition-colors">
                        <Printer className="w-5 h-5" />
                        <div className="text-left">
                          <div>Print Annexure I</div>
                          <div className="text-xs font-normal opacity-80">Intimation to Collect HL Documents — Letter to Customer</div>
                        </div>
                      </button>
                    </>
                  )}

                  {nocType === "vehicle" && (
                    <button
                      onClick={() => printHTML(buildVehicleNOCHTML(details, SBI_LOGO_B64), iframeRef)}
                      className="w-full flex items-center gap-3 px-5 py-4 rounded-xl bg-orange-600 text-white font-semibold text-sm hover:bg-orange-700 transition-colors">
                      <Printer className="w-5 h-5" />
                      <div className="text-left">
                        <div>Print Auto Loan Closure Letter + Form 35</div>
                        <div className="text-xs font-normal opacity-80">Annexure A + Form 35 (2 copies) — 3 pages total</div>
                      </div>
                    </button>
                  )}
                </div>

                {/* Completion */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3 mb-6">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-green-800 text-sm">Closure Process Complete</div>
                    <div className="text-xs text-green-700 mt-0.5">
                      All documents have been generated. Ensure the NOC is signed and stamped by the Branch Manager before handing over to the customer.
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep(6)}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition-colors">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    onClick={() => { setStep(1); setSearchInput(""); setSearchError(""); setPhysicalConfirmed(false); setDetails({ accountNo: "", accountType: "", borrowerName: "", borrowerTitle: "Mr.", cif: "", loanType: "", loanCategory: "", sanctionAmount: 0, address: "", mobile: "", savingsAccountNo: "", closureDate: todayDDMMYYYY(), vehicleRegNo: "", vahanRefNo: "", vahanRefDate: "", bankRefNo: "", cersaiDate: "", letterSerial: "", coBorrowers: [], hasJointBorrowers: false }); }}
                    className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                    <RotateCcw className="w-4 h-4" /> Start New Closure
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
