/**
 * Asset Quality Dashboard
 * NPA management, SMA monitoring, and notice generation for borrowers
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { AlertTriangle, Search, Download, Printer, FileText, Filter, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAllRecords, getRecordCount, STORES } from "@/lib/portfolioDb";
import { formatINR, formatINRFull } from "@/lib/portfolioTransform";
import { useBranch } from "@/contexts/BranchContext";
import { loadData as dbLoad, saveData as dbSave } from "@/lib/db";
import { toast } from "sonner";

// ─── Dak Number Utilities (same pattern as LetterGenerator) ──────────────────
interface DakRecord {
  id: number;
  refNo: string;
  serialNo: string;
  financialYear: string;
  monthNo: string;
  dateDisplay: string;
  letterType: string;
  letterDestination: string;
  recipientDetails: string;
  subject: string;
  remarks: string;
}

function getDakTodayInfo() {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, "0");
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const y = now.getFullYear();
  const fyStart = now.getMonth() + 1 >= 4 ? y : y - 1;
  const fyEnd = fyStart + 1;
  return {
    dateDisplay: `${d}-${m}-${y}`,
    dateForSubject: `${d}/${m}/${y}`,
    monthNo: m,
    fyLabel: `${fyStart}-${String(fyEnd).slice(-2)}`,
  };
}

function generateDakSerial(records: DakRecord[], fy: string): string {
  const sameFy = records.filter(r => r.financialYear === fy);
  if (!sameFy.length) return "0001";
  const max = Math.max(...sameFy.map(r => parseInt(r.serialNo, 10)));
  return String(max + 1).padStart(4, "0");
}

function buildDakRef(fy: string, month: string, serial: string, branchCode: string): string {
  return `SBI/${branchCode}/${fy}/${month}/${serial}`;
}

export default function AssetQuality() {
  const { branchName, branchCode } = useBranch();
  const [loans, setLoans] = useState<any[]>([]);
  const [ccod, setCcod] = useState<any[]>([]);
  const [npaReport, setNpaReport] = useState<any[]>([]);
  const [customerDim, setCustomerDim] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [iracFilter, setIracFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"overview" | "npa-list" | "sma-watch">("overview");
  const [selectedForNotice, setSelectedForNotice] = useState<Set<string>>(new Set());
  const [showNoticePreview, setShowNoticePreview] = useState(false);
  const [noticeLang, setNoticeLang] = useState<"en" | "hi">("en");
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
      const [ld, cd, nd, custd] = await Promise.all([
        getAllRecords(STORES.LOAN_DATA), getAllRecords(STORES.CCOD_DATA),
        getAllRecords(STORES.NPA_DATA), getAllRecords(STORES.CUSTOMER_DIM)
      ]);
      setLoans(ld); setCcod(cd); setNpaReport(nd); setCustomerDim(custd);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  const analytics = useMemo(() => {
    const totalLoanOutstanding = loans.reduce((s, l) => s + Math.abs(l.OUTSTAND || 0), 0);
    const totalCCODBalance = ccod.reduce((s, c) => s + Math.abs(c.CurrentBalance || 0), 0);
    const totalAdvances = totalLoanOutstanding + totalCCODBalance;

    // NPA from loan balance — use Computed_SMA_Class (RBI IRAC norms)
    // Exclude NPA-exempt accounts: OD against Bank's Deposits and Staff OD
    const npaLoans = loans.filter(l =>
      !l.Computed_NPA_Exempt &&
      (l.Computed_Is_NPA === true || l.Computed_SMA_Class === "NPA")
    );
    const npaCCOD = ccod.filter(c =>
      !c.Computed_NPA_Exempt &&
      (c.Computed_Is_NPA === true || c.Computed_SMA_Class === "NPA")
    );
    const npaLoanAmount = npaLoans.reduce((s, l) => s + Math.abs(l.OUTSTAND || 0), 0);
    const npaCCODAmount = npaCCOD.reduce((s, c) => s + Math.abs(c.CurrentBalance || 0), 0);
    const totalNPAAmount = npaLoanAmount + npaCCODAmount;
    const grossNPA = totalAdvances > 0 ? (totalNPAAmount / totalAdvances) * 100 : 0;

    // SMA breakdown — use Computed_SMA_Class (RBI IRAC norms: SMA-0=1-30d, SMA-1=31-60d, SMA-2=61-90d)
    // Exempt accounts (OD against Deposits, Staff OD) are excluded from SMA stress counts
    const smaLoans = {
      "SMA-0": loans.filter(l => !l.Computed_NPA_Exempt && l.Computed_SMA_Class === "SMA-0"),
      "SMA-1": loans.filter(l => !l.Computed_NPA_Exempt && l.Computed_SMA_Class === "SMA-1"),
      "SMA-2": loans.filter(l => !l.Computed_NPA_Exempt && l.Computed_SMA_Class === "SMA-2"),
    };
    const smaCCOD = {
      "SMA-0": ccod.filter(c => !c.Computed_NPA_Exempt && c.Computed_SMA_Class === "SMA-0"),
      "SMA-1": ccod.filter(c => !c.Computed_NPA_Exempt && c.Computed_SMA_Class === "SMA-1"),
      "SMA-2": ccod.filter(c => !c.Computed_NPA_Exempt && c.Computed_SMA_Class === "SMA-2"),
    };

    const smaData = ["SMA-0", "SMA-1", "SMA-2"].map(cls => ({
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

  // Mobile lookup: account number → MobileNo from Customer 360
  // Strategy: LOAN_DATA/CCOD_DATA has CIF; CUSTOMER_DIM has CIF → MobileNo
  const mobileLookup = useMemo(() => {
    // Build CIF → MobileNo from Customer 360
    const cifToMobile: Record<string, string> = {};
    for (const c of customerDim) {
      if (c.CIF && c.MobileNo) cifToMobile[c.CIF] = c.MobileNo;
    }
    // Build account → CIF from loan and CC/OD data
    const acToMobile: Record<string, string> = {};
    for (const l of loans) {
      if (l.LoanKey && l.CIF && cifToMobile[l.CIF]) {
        acToMobile[l.LoanKey] = cifToMobile[l.CIF];
      }
    }
    for (const c of ccod) {
      if (c.LoanKey && c.CIF && cifToMobile[c.CIF]) {
        acToMobile[c.LoanKey] = cifToMobile[c.CIF];
      }
    }
    return acToMobile;
  }, [loans, ccod, customerDim]);

  // SMA watchlist — use Computed_SMA_Class (RBI IRAC norms); exclude NPA-exempt accounts
  const smaWatchlist = useMemo(() => {
    const smaLoansFiltered = loans.filter(l =>
      !l.Computed_NPA_Exempt && ["SMA-0", "SMA-1", "SMA-2"].includes(l.Computed_SMA_Class || "")
    );
    const smaCCODFiltered = ccod.filter(c =>
      !c.Computed_NPA_Exempt && ["SMA-0", "SMA-1", "SMA-2"].includes(c.Computed_SMA_Class || "")
    );
    const combined = [
      ...smaLoansFiltered.map(l => ({ acNo: l.LoanKey, name: l.CUSTNAME, type: "Term Loan", sma: l.Computed_SMA_Class, dpd: l.Computed_DPD || 0, outstanding: Math.abs(l.OUTSTAND || 0), emiOverdue: l.EMISOvrdue || 0, irac: l.NEWIRAC })),
      ...smaCCODFiltered.map(c => ({ acNo: c.LoanKey, name: c.CUSTNAME, type: "CC/OD", sma: c.Computed_SMA_Class, dpd: c.Computed_DPD || 0, outstanding: Math.abs(c.CurrentBalance || 0), emiOverdue: 0, irac: c.NEWIRAC })),
    ];
    return combined.sort((a, b) => {
      const order: Record<string, number> = { "SMA-2": 0, "SMA-1": 1, "SMA-0": 2 };
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

  async function printNotices() {
    if (selectedForNotice.size === 0) return;
    setShowNoticePreview(true);

    // ── 1. Generate Dak records for each selected account ─────────────────────
    try {
      const { dateDisplay, dateForSubject, monthNo, fyLabel } = getDakTodayInfo();
      const existingDak: DakRecord[] = (await dbLoad("dak-records")) || [];
      let runningRecords = [...existingDak];
      const newDakEntries: DakRecord[] = [];
      const refMap: Record<string, string> = {}; // acNo → refNo

      for (const acNo of Array.from(selectedForNotice)) {
        const npa = npaReport.find((n: any) => n.ACCOUNT_NO === acNo);
        const customerName = npa?.CUSTOMER_NAME || acNo;
        const serial = generateDakSerial(runningRecords, fyLabel);
        const refNo = buildDakRef(fyLabel, monthNo, serial, branchCode || "XXXXX");
        const entry: DakRecord = {
          id: Date.now() + newDakEntries.length,
          refNo,
          serialNo: serial,
          financialYear: fyLabel,
          monthNo,
          dateDisplay,
          letterType: "Notices",
          letterDestination: "Customer",
          recipientDetails: customerName,
          subject: `NPA Notice dt. ${dateForSubject} - A/c ${acNo}`,
          remarks: "Auto-generated",
        };
        newDakEntries.push(entry);
        runningRecords = [...runningRecords, entry]; // keep serial counter monotonic
        refMap[acNo] = refNo;
      }

      await dbSave("dak-records", [...existingDak, ...newDakEntries]);
      toast.success(`${newDakEntries.length} Dak record${newDakEntries.length > 1 ? "s" : ""} saved. Opening print window…`);

      // ── 2. Build print HTML with LAMS format ───────────────────────────────
      const { dateDisplay: printDate } = getDakTodayInfo();
      const isHindi = noticeLang === "hi";
      const fontFace = isHindi
        ? `@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700&display=swap');`
        : "";
      const bodyFont = isHindi
        ? `'Noto Sans Devanagari', 'Mangal', Arial, sans-serif`
        : `'Times New Roman', Georgia, serif`;

      const noticesHTML = Array.from(selectedForNotice).map(acNo => {
        const npa = npaReport.find((n: any) => n.ACCOUNT_NO === acNo);
        if (!npa) return "";
        const refNo = refMap[acNo] || "";
        const customerName = npa.CUSTOMER_NAME || "";
        const fatherName = npa.FATHER_NAME || "";
        const addr1 = npa.ADDRESS1 || "";
        const addr2 = npa.ADDRESS2 || "";
        const addr3 = npa.ADDRESS3 || "";
        const pinCode = npa.POSTCODE || npa.PIN || "";
        // Mobile: prefer Customer 360 lookup, fallback to NPA file field
        const mobile = mobileLookup[acNo] || npa.MOBILE || npa.MOBILE_NO || "";
        const loanSegment = npa.SYS || npa.ACCTDESC || npa.IRAC_DESC || "Loan";
        const outstanding = formatINRFull(Math.abs(npa.OUTSTANDING || 0));
        const npaDate = npa.NPA_DATE
          ? (() => { const dt = new Date(npa.NPA_DATE); const dd = String(dt.getDate()).padStart(2,"0"); const mm = String(dt.getMonth()+1).padStart(2,"0"); return `${dd}/${mm}/${dt.getFullYear()}`; })()
          : (npa.IRRGDT || "—");

        if (isHindi) {
          return `
            <div class="notice">
              <div class="header">
                <h1>&#2349;&#2366;&#2352;&#2340;&#2368;&#2351; &#2360;&#2381;&#2335;&#2375;&#2335; &#2348;&#2376;&#2306;&#2325;</h1>
                <h2>${branchName || "Branch"}</h2>
                <p>&#2358;&#2366;&#2326;&#2366; &#2325;&#2379;&#2337;: ${branchCode || ""}</p>
              </div>
              <div class="address-block">
                <p>&#2358;&#2381;&#2352;&#2368;/&#2358;&#2381;&#2352;&#2368;&#2350;&#2340;&#2368;/&#2325;&#2369;&#2350;&#2366;&#2352;&#2368; <strong>${customerName}</strong></p>
                ${fatherName ? `<p>&#2346;&#2367;&#2340;&#2366;/&#2346;&#2340;&#2367; &#2358;&#2381;&#2352;&#2368; ${fatherName}</p>` : ""}
                ${addr1 ? `<p>${addr1}</p>` : ""}
                ${addr2 ? `<p>${addr2}</p>` : ""}
                ${addr3 ? `<p>${addr3}</p>` : ""}
                ${pinCode ? `<p>PIN &#8211; ${pinCode}</p>` : ""}
                ${mobile ? `<p>&#2350;&#2379;&#2348;&#2366;&#2311;&#2354; &#8211; ${mobile}</p>` : ""}
              </div>
              <div class="ref-line">
                <span>&#2346;&#2340;&#2381;&#2352; &#2360;&#2306;&#2326;&#2381;&#2351;&#2366;: <strong>${refNo}</strong></span>
                <span>&#2342;&#2367;&#2344;&#2366;&#2306;&#2325;: <strong>${printDate}</strong></span>
              </div>
              <p class="salutation">&#2350;&#2361;&#2379;&#2342;&#2351;&#2366;/&#2346;&#2381;&#2352;&#2367;&#2351; &#2350;&#2361;&#2379;&#2342;&#2351;,</p>
              <p class="subject-line">&#2310;&#2346;&#2325;&#2366; ${loanSegment} &#2307;&#2339; &#2326;&#2366;&#2340;&#2366; &#2360;&#2306;&#2326;&#2381;&#2351;&#2366; ${acNo}</p>
              <ol>
                <li>&#2310;&#2346;&#2325;&#2375; &#2313;&#2346;&#2352;&#2381;&#2351;&#2369;&#2325;&#2381;&#2340; ${loanSegment} &#2307;&#2339; &#2326;&#2366;&#2340;&#2366; &#2342;&#2367;&#2344;&#2366;&#2306;&#2325; <strong>${npaDate}</strong> &#2360;&#2375; &#2309;&#2344;&#2367;&#2351;&#2350;&#2367;&#2340;/&#2309;&#2340;&#2367;&#2342;&#2375;&#2351; &#2361;&#2376; &#2324;&#2352; &#2311;&#2360; &#2346;&#2340;&#2381;&#2352; &#2325;&#2368; &#2340;&#2367;&#2925;&#2367; &#2340;&#2325; &#2325;&#2369;&#2354; &#2348;&#2325;&#2366;&#2351;&#2366; &#8377; <strong>${outstanding}</strong> &#2361;&#2376;&#2404;</li>
                <li>&#2325;&#2371;&#2346;&#2351;&#2366; &#2309;&#2344;&#2367;&#2351;&#2350;&#2367;&#2340; &#2352;&#2366;&#2358;&#2367; &#2340;&#2369;&#2352;&#2306;&#2340; &#2332;&#2350;&#2366; &#2325;&#2352; &#2309;&#2346;&#2344;&#2375; &#2326;&#2366;&#2340;&#2375; &#2325;&#2379; &#2344;&#2367;&#2351;&#2350;&#2367;&#2340; &#2325;&#2352;&#2375;&#2306; &#2324;&#2352; &#2332;&#2367;&#2360;&#2360;&#2375; &#2310;&#2346;&#2325;&#2375; &#2325;&#2381;&#2352;&#2375;&#2337;&#2367;&#2335; &#2360;&#2381;&#2325;&#2379;&#2352; &#2346;&#2352; &#2346;&#2381;&#2352;&#2340;&#2367;&#2325;&#2370;&#2354; &#2346;&#2381;&#2352;&#2349;&#2366;&#2357; &#2344; &#2346;&#2396;&#2375;&#2404;</li>
                <li>&#2332;&#2376;&#2360;&#2366; &#2325;&#2367; &#2310;&#2346; &#2332;&#2366;&#2344;&#2340;&#2375; &#2361;&#2376;&#2306;, &#2307;&#2339; &#2326;&#2366;&#2340;&#2375; &#2350;&#2375;&#2306; &#2309;&#2344;&#2367;&#2351;&#2350;&#2367;&#2340;&#2340;&#2366; &#2346;&#2352; &#2342;&#2306;&#2337;&#2366;&#2340;&#2381;&#2350;&#2325; &#2346;&#2381;&#2352;&#2349;&#2366;&#2352; &#2354;&#2327;&#2366;&#2351;&#2366; &#2332;&#2366;&#2340;&#2366; &#2361;&#2376; &#2324;&#2352; &#2348;&#2376;&#2306;&#2325; &#2325;&#2366;&#2344;&#2370;&#2344;&#2368; &#2325;&#2366;&#2352;&#2381;&#2352;&#2357;&#2366;&#2908; &#2358;&#2369;&#2352;&#2370; &#2325;&#2352;&#2344;&#2375; &#2325;&#2366; &#2349;&#2368; &#2309;&#2343;&#2367;&#2325;&#2366;&#2352; &#2361;&#2376;&#2404;</li>
                <li>&#2351;&#2342;&#2367; &#2310;&#2346;&#2344;&#2375; &#2313;&#2346;&#2352;&#2381;&#2351;&#2369;&#2325;&#2381;&#2340; &#2307;&#2339; &#2326;&#2366;&#2340;&#2375; &#2325;&#2379; &#2344;&#2367;&#2351;&#2350;&#2367;&#2340; &#2348;&#2344;&#2366;&#2344;&#2375; &#2325;&#2375; &#2354;&#2367;&#2319; &#2352;&#2366;&#2358;&#2367; &#2346;&#2361;&#2354;&#2375; &#2361;&#2368; &#2332;&#2350;&#2366; &#2325;&#2352; &#2342;&#2368; &#2361;&#2379; &#2340;&#2379; &#2325;&#2371;&#2346;&#2351;&#2366; &#2311;&#2360; &#2360;&#2306;&#2342;&#2375;&#2358; &#2325;&#2379; &#2309;&#2344;&#2342;&#2375;&#2326;&#2366; &#2325;&#2352;&#2375;&#2306;&#2404;</li>
              </ol>
              <div class="signature">
                <p>&#2349;&#2357;&#2342;&#2368;&#2351;,</p>
                <p class="sig-gap"></p>
                <p><strong>&#2358;&#2366;&#2326;&#2366; &#2346;&#2381;&#2352;&#2348;&#2306;&#2343;&#2325;</strong></p>
                <p class="note">(&#2344;&#2379;&#2335; : &#2351;&#2361; &#2319;&#2325; &#2325;&#2306;&#2346;&#2381;&#2351;&#2370;&#2335;&#2352; &#2346;&#2381;&#2352;&#2339;&#2366;&#2354;&#2368; &#2332;&#2344;&#2367;&#2340; &#2346;&#2340;&#2381;&#2352; &#2361;&#2376;&#2404; &#2311;&#2360; &#2346;&#2352; &#2361;&#2360;&#2381;&#2340;&#2366;&#2325;&#2381;&#2359;&#2352; &#2325;&#2368; &#2310;&#2357;&#2358;&#2381;&#2351;&#2325;&#2340;&#2366; &#2344;&#2361;&#2368;&#2306; &#2361;&#2376;&#2404;)</p>
              </div>
            </div>`;
        } else {
          return `
            <div class="notice">
              <div class="header">
                <h1>STATE BANK OF INDIA</h1>
                <h2>${branchName || "Branch"}</h2>
                <p>Branch Code: ${branchCode || ""}</p>
              </div>
              <div class="address-block">
                <p>To,</p>
                <p>Shri/Smt/Kum <strong>${customerName}</strong></p>
                ${fatherName ? `<p>S/o, W/o, D/o <strong>${fatherName}</strong></p>` : ""}
                ${addr1 ? `<p>${addr1}</p>` : ""}
                ${addr2 ? `<p>${addr2}</p>` : ""}
                ${addr3 ? `<p>${addr3}</p>` : ""}
                ${pinCode ? `<p>PIN &#8211; ${pinCode}</p>` : ""}
                ${mobile ? `<p>Mobile &#8211; ${mobile}</p>` : ""}
              </div>
              <div class="ref-line">
                <span>Letter No: <strong>${refNo}</strong></span>
                <span>Dated: <strong>${printDate}</strong></span>
              </div>
              <p class="salutation">Madam/Dear Sir,</p>
              <p class="subject-line">YOUR ${loanSegment} ACCOUNT NO. ${acNo}</p>
              <ol>
                <li>Your captioned <strong>${loanSegment}</strong> account is irregular/overdue since <strong>${npaDate}</strong> and total outstanding as on date of this letter is <strong>&#8377; ${outstanding}</strong>.</li>
                <li>Please arrange to regularize your above account by depositing irregular amount immediately to avoid adverse impact on credit score.</li>
                <li>As you are aware, irregularity in the loan account attracts applicable penal charges as well as Bank also has the right to initiate legal proceedings.</li>
                <li>Please ignore if you have already deposited the amount for regularisation of the above loan account.</li>
              </ol>
              <div class="signature">
                <p>Yours faithfully,</p>
                <p class="sig-gap"></p>
                <p><strong>Branch Manager</strong></p>
                <p class="note">(N.B.: It is a computer system generated advice. Needs no signature)</p>
              </div>
            </div>`;
        }
      }).join("");

      setTimeout(() => {
        const printWindow = window.open("", "_blank");
        if (!printWindow) { toast.error("Please allow popups to print notices."); return; }
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8" />
            <title>NPA Notices — ${printDate}</title>
            <style>
              ${fontFace}
              @page { size: A4; margin: 1.8cm 2cm; }
              *, *::before, *::after { box-sizing: border-box; }
              body { font-family: ${bodyFont}; font-size: 12pt; line-height: 1.55; color: #000; margin: 0; padding: 0; }
              .notice { page-break-after: always; padding: 0; }
              .notice:last-child { page-break-after: auto; }
              .header { text-align: center; margin-bottom: 18px; border-bottom: 2px solid #000; padding-bottom: 10px; }
              .header h1 { font-size: 15pt; font-weight: bold; margin: 0 0 4px 0; letter-spacing: 0.5px; }
              .header h2 { font-size: 12pt; margin: 3px 0; }
              .header p { font-size: 10pt; margin: 2px 0; }
              .address-block { margin: 16px 0 12px 0; }
              .address-block p { margin: 2px 0; }
              .ref-line { display: flex; justify-content: space-between; margin: 14px 0; font-size: 11pt; }
              .salutation { margin: 14px 0 6px 0; }
              .subject-line { font-weight: bold; text-decoration: underline; margin: 6px 0 12px 0; }
              ol { margin: 0 0 16px 0; padding-left: 22px; }
              ol li { margin-bottom: 10px; text-align: justify; }
              .signature { margin-top: 36px; }
              .signature p { margin: 3px 0; }
              .sig-gap { height: 44px; }
              .note { font-size: 9.5pt; font-style: italic; margin-top: 6px; }
            </style>
          </head>
          <body>${noticesHTML}</body>
          </html>`);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 600);
      }, 300);

    } catch (err) {
      console.error(err);
      toast.error("Failed to save Dak records or open print window.");
    }
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

  // RBI IRAC SMA colour map (SMA-0=1-30d, SMA-1=31-60d, SMA-2=61-90d)
  const smaColorMap: Record<string, string> = {
    "SMA-0": "bg-yellow-100 text-yellow-800 border-yellow-300",
    "SMA-1": "bg-orange-100 text-orange-800 border-orange-300",
    "SMA-2": "bg-red-100 text-red-800 border-red-300",
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
              {/* Language toggle */}
              <div className="flex items-center gap-1 border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setNoticeLang("en")}
                  className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold transition ${
                    noticeLang === "en" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Languages className="w-3 h-3" /> EN
                </button>
                <button
                  onClick={() => setNoticeLang("hi")}
                  className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold transition ${
                    noticeLang === "hi" ? "bg-orange-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Languages className="w-3 h-3" /> &#2361;&#2367;
                </button>
              </div>
              {selectedForNotice.size > 0 && (
                <Button size="sm" onClick={printNotices} className="bg-red-600 hover:bg-red-700 text-white">
                  <Printer className="w-4 h-4 mr-1" /> Print Notices ({selectedForNotice.size}) &mdash; {noticeLang === "hi" ? "&#2361;&#2367;&#2306;&#2342;&#2368;" : "English"}
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
                    <th className="text-left py-3 px-3 text-gray-500 font-medium">Mobile</th>
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
                      <td className="py-2 px-3">
                        {mobileLookup[n.ACCOUNT_NO] ? (
                          <a href={`tel:${mobileLookup[n.ACCOUNT_NO]}`} className="text-xs font-mono text-blue-700 hover:underline flex items-center gap-1">
                            <span>&#128222;</span> {mobileLookup[n.ACCOUNT_NO]}
                          </a>
                        ) : (
                          <span className="text-xs text-gray-300 italic">—</span>
                        )}
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
                    <th className="text-center py-3 px-3 text-gray-500 font-medium">SMA Class</th>
                    <th className="text-center py-3 px-3 text-gray-500 font-medium">DPD</th>
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
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${smaColorMap[s.sma] || "bg-gray-100 text-gray-600 border-gray-200"}`}>{s.sma}</span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`text-xs font-bold ${
                          s.dpd >= 61 ? "text-red-700" : s.dpd >= 31 ? "text-orange-600" : "text-yellow-700"
                        }`}>{s.dpd}d</span>
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

      {/* printRef retained for potential future use */}
      <div ref={printRef} style={{ display: "none" }} />
    </div>
  );
}
