/**
 * Dak Number Generator (Letter Dak Management System)
 * 
 * Converted from standalone HTML to React component
 * Maintains SBI branding and offline localStorage functionality
 */

import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, RotateCcw, Printer, FileText, LogIn, LogOut, Pencil, Trash2 } from "lucide-react";
import { loadData, saveData } from "@/lib/db";
import { useBranch } from "@/contexts/BranchContext";

const ADMIN_PASSWORD = "sbi@13042";
const STORAGE_KEY = "sbi_letter_refs_13042";

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

function getTodayInfo() {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, "0");
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const y = now.getFullYear();

  const fyStart = now.getMonth() + 1 >= 4 ? y : y - 1;
  const fyEnd = fyStart + 1;

  return {
    dateDisplay: `${d}-${m}-${y}`,
    monthNo: m,
    fyLabel: `${fyStart}-${String(fyEnd).slice(-2)}`
  };
}

async function loadRecords(): Promise<DakRecord[]> {
  try {
    const data = await loadData("sbi-dak-records");
    if (data) return data;
    
    // Fallback to localStorage for migration
    const localData = localStorage.getItem(STORAGE_KEY);
    if (localData) {
      const parsed = JSON.parse(localData);
      // Migrate to IndexedDB
      await saveData("sbi-dak-records", parsed);
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
}

async function saveRecordsToStorage(records: DakRecord[]) {
  try {
    await saveData("sbi-dak-records", records);
  } catch (error) {
    console.error("Failed to save records:", error);
    // Fallback to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }
}

function generateSerial(records: DakRecord[], fy: string): string {
  const sameFy = records.filter(r => r.financialYear === fy);
  if (!sameFy.length) return "0001";
  const max = Math.max(...sameFy.map(r => parseInt(r.serialNo)));
  return String(max + 1).padStart(4, "0");
}

function buildRef(fy: string, month: string, serial: string, branchCode: string): string {
  return `SBI/${branchCode}/${fy}/${month}/${serial}`;
}

function generateSlipHTML(record: DakRecord): string {
  return `
    <html>
    <head>
      <title>Reference Slip</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
          line-height: 1.5;
        }
        h2 {
          text-align: center;
          margin-bottom: 10px;
        }
        .row {
          margin-bottom: 6px;
        }
        .label {
          font-weight: bold;
        }
        .box {
          border: 1px solid #000;
          padding: 10px;
          margin-top: 10px;
        }
        @media print {
          button { display: none; }
        }
      </style>
    </head>
    <body>
      <h2>SBI – Letter Reference Slip</h2>

      <div class="box">
        <div class="row"><span class="label">Reference No:</span> ${record.refNo}</div>
        <div class="row"><span class="label">Date:</span> ${record.dateDisplay}</div>
        <div class="row"><span class="label">Financial Year:</span> ${record.financialYear}</div>
        <div class="row"><span class="label">Month:</span> ${record.monthNo}</div>
        <div class="row"><span class="label">Letter Type:</span> ${record.letterType}</div>
        <div class="row"><span class="label">Destination:</span> ${record.letterDestination}</div>
        <div class="row"><span class="label">Recipient:</span> ${record.recipientDetails}</div>
        <div class="row"><span class="label">Subject:</span> ${record.subject}</div>
        <div class="row"><span class="label">Remarks:</span> ${record.remarks || ""}</div>
      </div>

      <button onclick="window.print()">Print / Save as PDF</button>
    </body>
    </html>
  `;
}

export default function DakNumberGenerator() {
  const { branchName, branchCode } = useBranch();
  const today = getTodayInfo();
  
  const [records, setRecords] = useState<DakRecord[]>([]);
  const [refNo, setRefNo] = useState("");
  const [letterType, setLetterType] = useState("");
  const [letterDestination, setLetterDestination] = useState("");
  const [recipientDetails, setRecipientDetails] = useState("");
  const [subject, setSubject] = useState("");
  const [remarks, setRemarks] = useState("");
  const [status, setStatus] = useState<{ message: string; type: "success" | "error" | "" }>({ message: "", type: "" });
  
  // Admin state
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoginStatus, setAdminLoginStatus] = useState("");
  const [filterFy, setFilterFy] = useState("");
  const [searchText, setSearchText] = useState("");

  // Load records on mount
  useEffect(() => {
    const initRecords = async () => {
      const loadedRecords = await loadRecords();
      setRecords(loadedRecords);
      const serial = generateSerial(loadedRecords, today.fyLabel);
      setRefNo(buildRef(today.fyLabel, today.monthNo, serial, branchCode));
    };
    initRecords();
  }, [today.fyLabel, today.monthNo, branchCode]);

  const handleSave = async () => {
    if (!letterType || !letterDestination || !recipientDetails || !subject) {
      setStatus({ message: "Please fill all required fields.", type: "error" });
      return;
    }

    const serial = generateSerial(records, today.fyLabel);
    const ref = buildRef(today.fyLabel, today.monthNo, serial, branchCode);

    const record: DakRecord = {
      id: Date.now(),
      refNo: ref,
      serialNo: serial,
      financialYear: today.fyLabel,
      monthNo: today.monthNo,
      dateDisplay: today.dateDisplay,
      letterType,
      letterDestination,
      recipientDetails,
      subject,
      remarks
    };

    const newRecords = [...records, record];
    setRecords(newRecords);
    await saveRecordsToStorage(newRecords);

    setStatus({ message: "Saved successfully.", type: "success" });

    // Reset form
    setLetterType("");
    setLetterDestination("");
    setRecipientDetails("");
    setSubject("");
    setRemarks("");

    // Generate next reference
    const nextSerial = generateSerial(newRecords, today.fyLabel);
    setRefNo(buildRef(today.fyLabel, today.monthNo, nextSerial, branchCode));
  };

  const handleReset = () => {
    setLetterType("");
    setLetterDestination("");
    setRecipientDetails("");
    setSubject("");
    setRemarks("");
    setStatus({ message: "", type: "" });
    const serial = generateSerial(records, today.fyLabel);
    setRefNo(buildRef(today.fyLabel, today.monthNo, serial, branchCode));
  };

  const handlePrintSlip = () => {
    const record = records.find(r => r.refNo === refNo);
    if (!record) {
      alert("Please save the reference first.");
      return;
    }
    const slipWindow = window.open("", "_blank", "width=600,height=700");
    if (slipWindow) {
      slipWindow.document.write(generateSlipHTML(record));
      slipWindow.document.close();
    }
  };

  const handleExportPDF = () => {
    const record = records.find(r => r.refNo === refNo);
    if (!record) {
      alert("Please save the reference first.");
      return;
    }
    const slipWindow = window.open("", "_blank", "width=600,height=700");
    if (slipWindow) {
      slipWindow.document.write(generateSlipHTML(record));
      slipWindow.document.close();
      slipWindow.onload = () => slipWindow.print();
    }
  };

  const handleAdminLogin = () => {
    if (adminPassword === ADMIN_PASSWORD) {
      setIsAdminLoggedIn(true);
      setShowLoginModal(false);
      setAdminLoginStatus("");
      setAdminPassword("");
    } else {
      setAdminLoginStatus("Incorrect password.");
    }
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    setAdminPassword("");
  };
  const handleUpdateRecord = async (id: number) => {    const r = records.find(x => x.id === id);
    if (!r) return;

    const newType = prompt("Letter Type:", r.letterType);
    if (newType === null) return;

    const newDest = prompt("Destination:", r.letterDestination);
    if (newDest === null) return;

    const newRec = prompt("Recipient:", r.recipientDetails);
    if (newRec === null) return;

    const newSub = prompt("Subject:", r.subject);
    if (newSub === null) return;

    const newRem = prompt("Remarks:", r.remarks);
    if (newRem === null) return;

    const updatedRecords = records.map(rec => 
      rec.id === id 
        ? { ...rec, letterType: newType, letterDestination: newDest, recipientDetails: newRec, subject: newSub, remarks: newRem }
        : rec
    );
    setRecords(updatedRecords);
    await saveRecordsToStorage(updatedRecords);
  };

  const handleDeleteRecord = async (id: number) => {
    if (!confirm("Delete this record?")) return;
    const updatedRecords = records.filter(r => r.id !== id);
    setRecords(updatedRecords);
    await saveRecordsToStorage(updatedRecords);
  };

  // Get unique FYs for filter
  const uniqueFYs = Array.from(new Set(records.map(r => r.financialYear)));

  // Filter records for admin table
  const filteredRecords = records.filter(r => {
    if (filterFy && r.financialYear !== filterFy) return false;
    if (searchText) {
      const search = searchText.toLowerCase();
      return r.subject.toLowerCase().includes(search) ||
             r.recipientDetails.toLowerCase().includes(search) ||
             r.refNo.toLowerCase().includes(search);
    }
    return true;
  });

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{ 
        backgroundColor: "#f7f4fb",
        fontFamily: "'Poppins', 'Effra', sans-serif"
      }}
    >
      {/* Header Banner */}
      <header 
        className="w-full py-4 px-6"
        style={{ 
          background: "linear-gradient(to right, #d4007f, #4e1a74)",
          boxShadow: "0 0 14px rgba(212, 0, 127, 0.45)"
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          {/* SBI Logo */}
          <div className="flex-shrink-0">
            <img 
              src="/images/sbi-logo.png" 
              alt="State Bank of India" 
              className="h-28 w-auto"
              style={{ filter: "brightness(0) invert(1)" }}
            />
          </div>
          
          {/* Bank Name */}
          <div className="flex flex-col justify-center">
            <h1 
              className="text-white font-semibold leading-tight"
              style={{ fontSize: "1.3rem" }}
            >
              Dak Management System
            </h1>
          </div>

          {/* Admin Login/Logout Button */}
          <div className="ml-auto">
            {!isAdminLoggedIn ? (
              <Button
                onClick={() => setShowLoginModal(true)}
                variant="outline"
                className="gap-2 bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                <LogIn className="w-4 h-4" />
                Admin Login
              </Button>
            ) : (
              <Button
                onClick={handleAdminLogout}
                variant="outline"
                className="gap-2 bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-6 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Back Button */}
          <Link href="/">
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-2 mb-4 hover:bg-white/50"
              style={{ color: "#4e1a74" }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>

          {/* Entry Form Card */}
          <Card 
            className="p-5 mb-5"
            style={{ 
              background: "rgba(255, 255, 255, 0.55)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255, 255, 255, 0.4)"
            }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: "#084298" }}>
              New Letter Reference
            </h3>

            {/* Row 1: Reference, FY, Month */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold mb-1" style={{ color: "#6c757d" }}>
                  Reference Number
                </label>
                <input 
                  type="text" 
                  value={refNo}
                  readOnly
                  className="w-full px-3 py-2 rounded-md border text-sm"
                  style={{ backgroundColor: "#f8fafc", borderColor: "#d0d7de" }}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1" style={{ color: "#6c757d" }}>
                  Financial Year
                </label>
                <input 
                  type="text" 
                  value={today.fyLabel}
                  readOnly
                  className="w-full px-3 py-2 rounded-md border text-sm"
                  style={{ backgroundColor: "#f8fafc", borderColor: "#d0d7de" }}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1" style={{ color: "#6c757d" }}>
                  Month
                </label>
                <input 
                  type="text" 
                  value={today.monthNo}
                  readOnly
                  className="w-full px-3 py-2 rounded-md border text-sm"
                  style={{ backgroundColor: "#f8fafc", borderColor: "#d0d7de" }}
                />
              </div>
            </div>

            {/* Row 2: Letter Type, Destination, Recipient */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold mb-1" style={{ color: "#6c757d" }}>
                  Letter Type
                </label>
                <select 
                  value={letterType}
                  onChange={(e) => setLetterType(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border text-sm bg-white"
                  style={{ borderColor: "#d0d7de" }}
                >
                  <option value="">-- Select --</option>
                  <option>Letter</option>
                  <option>Memo</option>
                  <option>Note</option>
                  <option>NOC</option>
                  <option>Notices</option>
                  <option>Others</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1" style={{ color: "#6c757d" }}>
                  Letter Destination
                </label>
                <select 
                  value={letterDestination}
                  onChange={(e) => setLetterDestination(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border text-sm bg-white"
                  style={{ borderColor: "#d0d7de" }}
                >
                  <option value="">-- Select --</option>
                  <option>Customer</option>
                  <option>LHO</option>
                  <option>ZO</option>
                  <option>RBO</option>
                  <option>Other Branch</option>
                  <option>Vendor</option>
                  <option>Law Enforcement Agencies</option>
                  <option>Others</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1" style={{ color: "#6c757d" }}>
                  Recipient Details
                </label>
                <input 
                  type="text" 
                  value={recipientDetails}
                  onChange={(e) => setRecipientDetails(e.target.value)}
                  placeholder="Name / A/c No. / Address"
                  className="w-full px-3 py-2 rounded-md border text-sm"
                  style={{ borderColor: "#d0d7de" }}
                />
              </div>
            </div>

            {/* Row 3: Subject, Remarks */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-1" style={{ color: "#6c757d" }}>
                  Subject
                </label>
                <input 
                  type="text" 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject of letter"
                  className="w-full px-3 py-2 rounded-md border text-sm"
                  style={{ borderColor: "#d0d7de" }}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1" style={{ color: "#6c757d" }}>
                  Remarks (optional)
                </label>
                <textarea 
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border text-sm resize-y min-h-[60px]"
                  style={{ borderColor: "#d0d7de" }}
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-wrap gap-2 mt-4">
              <Button 
                onClick={handleSave}
                className="gap-2"
                style={{ backgroundColor: "#0b5ed7" }}
              >
                <Save className="w-4 h-4" />
                Save
              </Button>
              <Button 
                onClick={handleReset}
                variant="outline"
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </Button>
              <Button 
                onClick={handlePrintSlip}
                variant="outline"
                className="gap-2"
              >
                <Printer className="w-4 h-4" />
                Print Slip
              </Button>
              <Button 
                onClick={handleExportPDF}
                variant="outline"
                className="gap-2"
              >
                <FileText className="w-4 h-4" />
                Export PDF
              </Button>
              {status.message && (
                <span 
                  className="text-sm self-center ml-2"
                  style={{ color: status.type === "success" ? "#198754" : "#dc3545" }}
                >
                  {status.message}
                </span>
              )}
            </div>
          </Card>

          {/* Admin Panel Card - Only visible when logged in */}
          {isAdminLoggedIn && (
          <Card 
            className="p-5"
            style={{ 
              background: "rgba(255, 255, 255, 0.55)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255, 255, 255, 0.4)"
            }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: "#084298" }}>
              Admin Panel
            </h3>

            <div>
                {/* Filters */}
                <div className="flex flex-wrap items-end gap-3 mb-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1" style={{ color: "#6c757d" }}>
                      Filter by FY
                    </label>
                    <select 
                      value={filterFy}
                      onChange={(e) => setFilterFy(e.target.value)}
                      className="px-3 py-2 rounded-md border text-sm bg-white"
                      style={{ borderColor: "#d0d7de", minWidth: "120px" }}
                    >
                      <option value="">All</option>
                      {uniqueFYs.map(fy => (
                        <option key={fy} value={fy}>{fy}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1" style={{ color: "#6c757d" }}>
                      Search
                    </label>
                    <input 
                      type="text" 
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      placeholder="Search..."
                      className="px-3 py-2 rounded-md border text-sm"
                      style={{ borderColor: "#d0d7de", width: "180px" }}
                    />
                  </div>
                  <Button 
                    onClick={handleAdminLogout}
                    variant="outline"
                    className="gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </Button>
                </div>

                {/* Records Table */}
                <div 
                  className="overflow-auto rounded-md border bg-white"
                  style={{ maxHeight: "360px", borderColor: "#d0d7de" }}
                >
                  <table className="w-full text-sm">
                    <thead style={{ backgroundColor: "#f1f3f5" }}>
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold" style={{ color: "#6c757d" }}>Ref No</th>
                        <th className="px-3 py-2 text-left font-semibold" style={{ color: "#6c757d" }}>Date</th>
                        <th className="px-3 py-2 text-left font-semibold" style={{ color: "#6c757d" }}>FY</th>
                        <th className="px-3 py-2 text-left font-semibold" style={{ color: "#6c757d" }}>Month</th>
                        <th className="px-3 py-2 text-left font-semibold" style={{ color: "#6c757d" }}>Type</th>
                        <th className="px-3 py-2 text-left font-semibold" style={{ color: "#6c757d" }}>Destination</th>
                        <th className="px-3 py-2 text-left font-semibold" style={{ color: "#6c757d" }}>Recipient</th>
                        <th className="px-3 py-2 text-left font-semibold" style={{ color: "#6c757d" }}>Subject</th>
                        <th className="px-3 py-2 text-left font-semibold" style={{ color: "#6c757d" }}>Remarks</th>
                        <th className="px-3 py-2 text-left font-semibold" style={{ color: "#6c757d" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecords.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="px-3 py-4 text-center" style={{ color: "#6c757d" }}>
                            No records
                          </td>
                        </tr>
                      ) : (
                        filteredRecords.map(r => (
                          <tr key={r.id} className="border-t" style={{ borderColor: "#e5e7eb" }}>
                            <td className="px-3 py-2">{r.refNo}</td>
                            <td className="px-3 py-2">{r.dateDisplay}</td>
                            <td className="px-3 py-2">{r.financialYear}</td>
                            <td className="px-3 py-2">{r.monthNo}</td>
                            <td className="px-3 py-2">{r.letterType}</td>
                            <td className="px-3 py-2">{r.letterDestination}</td>
                            <td className="px-3 py-2">{r.recipientDetails}</td>
                            <td className="px-3 py-2">{r.subject}</td>
                            <td className="px-3 py-2">{r.remarks}</td>
                            <td className="px-3 py-2">
                              <div className="flex gap-1">
                                <Button 
                                  size="sm" 
                                  onClick={() => handleUpdateRecord(r.id)}
                                  style={{ backgroundColor: "#198754", padding: "4px 8px" }}
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  onClick={() => handleDeleteRecord(r.id)}
                                  style={{ backgroundColor: "#dc3545", padding: "4px 8px" }}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Dark horizontal line */}
          <div 
            className="w-full h-px mb-4"
            style={{ backgroundColor: "#4e1a74" }}
          />
          
          {/* Credit text */}
          <p 
            className="text-center text-sm"
            style={{ color: "#666" }}
          >
            Ideation by <strong className="font-semibold">Shivam Kaushik</strong> Developed with AI
          </p>
        </div>
      </footer>

      {/* Admin Login Modal */}
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Admin Login</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                placeholder="Enter admin password"
                autoFocus
              />
            </div>
            {adminLoginStatus && (
              <p className="text-sm text-destructive">{adminLoginStatus}</p>
            )}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowLoginModal(false);
                  setAdminPassword("");
                  setAdminLoginStatus("");
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleAdminLogin}>
                <LogIn className="w-4 h-4 mr-2" />
                Login
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
