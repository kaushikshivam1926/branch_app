/**
 * Charges Return App
 * Prepare charges return report for controlling/regional office
 * 
 * Features:
 * - Manual charges entry with BGL codes
 * - Grouped by BGL with subtotals
 * - Export to CSV
 * - Admin-only access for edit/delete
 */

import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Plus, Download, Trash2, Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useBranch } from "@/contexts/BranchContext";
import { openDB, DBSchema, IDBPDatabase } from "idb";

interface ChargesDB extends DBSchema {
  charges: {
    key: number;
    value: ChargeEntry;
  };
}

interface ChargeEntry {
  id: number;
  bgl: string;
  head: string;
  subHead: string;
  payDate: string;
  billNo: string;
  billDate: string;
  payee: string;
  purpose: string;
  amount: number;
  approver: string;
}

interface BGLMaster {
  [key: string]: {
    label: string;
    head: string;
    sub: string;
  };
}

// Sample BGL Master data
const BGL_MASTER: BGLMaster = {
  "7011": { label: "7011 - Postage & Telegrams", head: "Postage", sub: "Letters" },
  "7012": { label: "7012 - Telephone Charges", head: "Communication", sub: "Telephone" },
  "7013": { label: "7013 - Stationery", head: "Office Supplies", sub: "Stationery" },
  "7014": { label: "7014 - Printing", head: "Office Supplies", sub: "Printing" },
  "7015": { label: "7015 - Electricity", head: "Utilities", sub: "Power" },
  "7016": { label: "7016 - Water Charges", head: "Utilities", sub: "Water" },
  "7017": { label: "7017 - Repairs & Maintenance", head: "Maintenance", sub: "General" },
  "7018": { label: "7018 - Rent", head: "Premises", sub: "Rent" },
  "7019": { label: "7019 - Security Services", head: "Security", sub: "Guards" },
  "7020": { label: "7020 - Housekeeping", head: "Maintenance", sub: "Cleaning" },
};

let dbInstance: IDBPDatabase<ChargesDB> | null = null;

async function getDB() {
  if (dbInstance) return dbInstance;
  dbInstance = await openDB<ChargesDB>("charges-return-db", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("charges")) {
        db.createObjectStore("charges", { keyPath: "id", autoIncrement: true });
      }
    },
  });
  return dbInstance;
}

async function addCharge(charge: Omit<ChargeEntry, "id">): Promise<number> {
  const db = await getDB();
  return await db.add("charges", { ...charge, id: Date.now() } as ChargeEntry);
}

async function listCharges(): Promise<ChargeEntry[]> {
  const db = await getDB();
  return await db.getAll("charges");
}

async function deleteCharge(id: number): Promise<void> {
  const db = await getDB();
  await db.delete("charges", id);
}

async function updateCharge(id: number, data: Partial<ChargeEntry>): Promise<void> {
  const db = await getDB();
  const existing = await db.get("charges", id);
  if (existing) {
    await db.put("charges", { ...existing, ...data });
  }
}

async function clearAllCharges(): Promise<void> {
  const db = await getDB();
  await db.clear("charges");
}

export default function ChargesReturnApp() {
  const [, navigate] = useLocation();
  const { branchName } = useBranch();
  const [charges, setCharges] = useState<ChargeEntry[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Form state
  const [bgl, setBgl] = useState("");
  const [payDate, setPayDate] = useState("");
  const [billNo, setBillNo] = useState("");
  const [billDate, setBillDate] = useState("");
  const [payee, setPayee] = useState("");
  const [purpose, setPurpose] = useState("");
  const [amount, setAmount] = useState("");
  const [approver, setApprover] = useState("");
  
  const [status, setStatus] = useState<{ message: string; type: "success" | "error" | "" }>({ message: "", type: "" });
  const [isAdmin, setIsAdmin] = useState(true); // Simplified for now

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    loadCharges();
  }, []);

  async function loadCharges() {
    const data = await listCharges();
    setCharges(data);
  }

  function resetForm() {
    setBgl("");
    setPayDate("");
    setBillNo("");
    setBillDate("");
    setPayee("");
    setPurpose("");
    setAmount("");
    setApprover("");
    setEditingId(null);
    setStatus({ message: "", type: "" });
  }

  async function handleSave() {
    if (!bgl || !payDate || !billNo || !billDate || !payee || !purpose || !approver || !amount) {
      setStatus({ message: "All fields are required", type: "error" });
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount === 0) {
      setStatus({ message: "Amount must be a valid non-zero number", type: "error" });
      return;
    }

    const bglInfo = BGL_MASTER[bgl];
    if (!bglInfo) {
      setStatus({ message: "Invalid BGL code", type: "error" });
      return;
    }

    if (editingId !== null) {
      // Update existing
      await updateCharge(editingId, {
        bgl,
        head: bglInfo.head,
        subHead: bglInfo.sub,
        payDate,
        billNo,
        billDate,
        payee,
        purpose,
        amount: numAmount,
        approver,
      });
      setStatus({ message: "Charge updated successfully", type: "success" });
    } else {
      // Add new
      await addCharge({
        bgl,
        head: bglInfo.head,
        subHead: bglInfo.sub,
        payDate,
        billNo,
        billDate,
        payee,
        purpose,
        amount: numAmount,
        approver,
      });
      setStatus({ message: "Charge added successfully", type: "success" });
    }

    resetForm();
    loadCharges();
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this charge entry?")) return;
    await deleteCharge(id);
    loadCharges();
  }

  function handleEdit(charge: ChargeEntry) {
    setBgl(charge.bgl);
    setPayDate(charge.payDate);
    setBillNo(charge.billNo);
    setBillDate(charge.billDate);
    setPayee(charge.payee);
    setPurpose(charge.purpose);
    setAmount(charge.amount.toString());
    setApprover(charge.approver);
    setEditingId(charge.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setStatus({ message: "Editing charge. Update fields and click Save.", type: "success" });
  }

  async function handleClearAll() {
    if (!confirm("Clear all charges? This cannot be undone.")) return;
    await clearAllCharges();
    loadCharges();
  }

  function handleExportCSV() {
    if (charges.length === 0) {
      alert("No charges to export");
      return;
    }

    const headers = ["S.No", "BGL", "Head", "Sub-Head", "Pay Date", "Bill No", "Bill Date", "Payee", "Purpose", "Amount", "Approver"];
    const rows = charges.map((c, i) => [
      i + 1,
      c.bgl,
      c.head,
      c.subHead,
      formatDateDDMMYYYY(c.payDate),
      c.billNo,
      formatDateDDMMYYYY(c.billDate),
      c.payee,
      c.purpose,
      c.amount.toFixed(2),
      c.approver,
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `charges-return-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function formatDateDDMMYYYY(isoDate: string): string {
    if (!isoDate) return "";
    const [y, m, d] = isoDate.split("-");
    return `${d}/${m}/${y}`;
  }

  function format2(num: number): string {
    return num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Group charges by BGL
  const grouped: { [bgl: string]: ChargeEntry[] } = {};
  charges.forEach((c) => {
    if (!grouped[c.bgl]) grouped[c.bgl] = [];
    grouped[c.bgl].push(c);
  });

  const sortedBGLs = Object.keys(grouped).sort();
  let grandTotal = 0;
  charges.forEach((c) => (grandTotal += c.amount));

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #f7f4fb 0%, #ede7f6 100%)" }}>
      {/* Header */}
      <header
        className="text-white p-4 shadow-md"
        style={{
          background: "linear-gradient(90deg, #d4007f 0%, #4e1a74 100%)",
        }}
      >
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back to Home</span>
            </button>
            <div className="h-6 w-px bg-white/30"></div>
            <div>
              <h1 className="text-xl font-bold">Charges Return</h1>
              <p className="text-sm opacity-90">{branchName}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto p-4">
        {/* Input Form */}
        <Card
          className="p-5 mb-4"
          style={{
            background: "rgba(255, 255, 255, 0.55)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.4)",
          }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: "#4e1a74" }}>
            {editingId !== null ? "Edit Charge Entry" : "Add Charge Entry"}
          </h2>

          {status.message && (
            <div
              className={`mb-4 p-3 rounded-md text-sm ${
                status.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
              }`}
            >
              {status.message}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1" style={{ color: "#6c757d" }}>
                BGL Code
              </label>
              <select
                value={bgl}
                onChange={(e) => setBgl(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                style={{ borderColor: "#d0d7de" }}
              >
                <option value="">Select BGL</option>
                {Object.keys(BGL_MASTER).map((code) => (
                  <option key={code} value={code}>
                    {BGL_MASTER[code].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1" style={{ color: "#6c757d" }}>
                Date of Payment
              </label>
              <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} max={today} />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1" style={{ color: "#6c757d" }}>
                Bill No.
              </label>
              <Input type="text" value={billNo} onChange={(e) => setBillNo(e.target.value)} placeholder="Bill number" />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1" style={{ color: "#6c757d" }}>
                Bill Date
              </label>
              <Input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} max={today} />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1" style={{ color: "#6c757d" }}>
                Payee Name
              </label>
              <Input type="text" value={payee} onChange={(e) => setPayee(e.target.value)} placeholder="Who was paid?" />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1" style={{ color: "#6c757d" }}>
                Amount (Rs)
              </label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-1" style={{ color: "#6c757d" }}>
                Purpose
              </label>
              <Input type="text" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Description" />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1" style={{ color: "#6c757d" }}>
                Approver
              </label>
              <Input type="text" value={approver} onChange={(e) => setApprover(e.target.value)} placeholder="Initials" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <Button onClick={handleSave} className="gap-2" style={{ backgroundColor: "#0b5ed7" }}>
              <Save className="w-4 h-4" />
              {editingId !== null ? "Update" : "Add"}
            </Button>
            <Button onClick={resetForm} variant="outline" className="gap-2">
              <X className="w-4 h-4" />
              Reset
            </Button>
          </div>
        </Card>

        {/* Charges Table */}
        <Card
          className="p-5"
          style={{
            background: "rgba(255, 255, 255, 0.55)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.4)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ color: "#4e1a74" }}>
              All Charges ({charges.length})
            </h2>
            <div className="flex gap-2">
              <Button onClick={handleExportCSV} variant="outline" className="gap-2" size="sm">
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
              {isAdmin && (
                <Button onClick={handleClearAll} variant="outline" className="gap-2 text-red-600" size="sm">
                  <Trash2 className="w-4 h-4" />
                  Clear All
                </Button>
              )}
            </div>
          </div>

          <div className="overflow-auto rounded-md border bg-white" style={{ maxHeight: "500px", borderColor: "#d0d7de" }}>
            <table className="w-full text-sm">
              <thead style={{ backgroundColor: "#f1f3f5", position: "sticky", top: 0 }}>
                <tr>
                  <th className="px-3 py-2 text-left font-semibold" style={{ color: "#6c757d" }}>
                    S.No
                  </th>
                  <th className="px-3 py-2 text-left font-semibold" style={{ color: "#6c757d" }}>
                    BGL
                  </th>
                  <th className="px-3 py-2 text-left font-semibold" style={{ color: "#6c757d" }}>
                    Head
                  </th>
                  <th className="px-3 py-2 text-left font-semibold" style={{ color: "#6c757d" }}>
                    Sub-Head
                  </th>
                  <th className="px-3 py-2 text-left font-semibold" style={{ color: "#6c757d" }}>
                    Pay Date
                  </th>
                  <th className="px-3 py-2 text-left font-semibold" style={{ color: "#6c757d" }}>
                    Bill No
                  </th>
                  <th className="px-3 py-2 text-left font-semibold" style={{ color: "#6c757d" }}>
                    Bill Date
                  </th>
                  <th className="px-3 py-2 text-left font-semibold" style={{ color: "#6c757d" }}>
                    Payee
                  </th>
                  <th className="px-3 py-2 text-left font-semibold" style={{ color: "#6c757d" }}>
                    Purpose
                  </th>
                  <th className="px-3 py-2 text-right font-semibold" style={{ color: "#6c757d" }}>
                    Amount (Rs)
                  </th>
                  <th className="px-3 py-2 text-left font-semibold" style={{ color: "#6c757d" }}>
                    Approver
                  </th>
                  {isAdmin && (
                    <th className="px-3 py-2 text-left font-semibold" style={{ color: "#6c757d" }}>
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {charges.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 12 : 11} className="px-3 py-4 text-center text-gray-500">
                      No charges yet. Add your first entry above.
                    </td>
                  </tr>
                ) : (
                  <>
                    {sortedBGLs.map((bglCode) => {
                      const bglCharges = grouped[bglCode];
                      const subtotal = bglCharges.reduce((sum, c) => sum + c.amount, 0);
                      const bglInfo = BGL_MASTER[bglCode] || { label: bglCode, head: "", sub: "" };

                      return (
                        <React.Fragment key={bglCode}>
                          <tr className="bg-purple-50">
                            <td colSpan={isAdmin ? 12 : 11} className="px-3 py-2 font-semibold" style={{ color: "#4e1a74" }}>
                              {bglInfo.label}
                            </td>
                          </tr>
                          {bglCharges.map((charge, idx) => (
                            <tr key={charge.id} className="border-t hover:bg-gray-50" style={{ borderColor: "#d0d7de" }}>
                              <td className="px-3 py-2" style={{ color: "#6c757d" }}>
                                {idx + 1}
                              </td>
                              <td className="px-3 py-2" style={{ color: "#0969da" }}>
                                {charge.bgl}
                              </td>
                              <td className="px-3 py-2" style={{ color: "#6c757d" }}>
                                {charge.head}
                              </td>
                              <td className="px-3 py-2" style={{ color: "#6c757d" }}>
                                {charge.subHead}
                              </td>
                              <td className="px-3 py-2" style={{ color: "#6c757d" }}>
                                {formatDateDDMMYYYY(charge.payDate)}
                              </td>
                              <td className="px-3 py-2" style={{ color: "#6c757d" }}>
                                {charge.billNo}
                              </td>
                              <td className="px-3 py-2" style={{ color: "#6c757d" }}>
                                {formatDateDDMMYYYY(charge.billDate)}
                              </td>
                              <td className="px-3 py-2" style={{ color: "#6c757d" }}>
                                {charge.payee}
                              </td>
                              <td className="px-3 py-2" style={{ color: "#6c757d" }}>
                                {charge.purpose.length > 40 ? charge.purpose.substring(0, 40) + "..." : charge.purpose}
                              </td>
                              <td className="px-3 py-2 text-right font-mono" style={{ color: "#6c757d" }}>
                                {format2(charge.amount)}
                              </td>
                              <td className="px-3 py-2" style={{ color: "#6c757d" }}>
                                {charge.approver}
                              </td>
                              {isAdmin && (
                                <td className="px-3 py-2">
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleEdit(charge)}
                                      title="Edit"
                                      className="h-8 w-8 p-0"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDelete(charge.id)}
                                      title="Delete"
                                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                          <tr className="bg-gray-50 font-italic">
                            <td colSpan={9} className="px-3 py-2 text-right italic" style={{ color: "#6c757d" }}>
                              Subtotal
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-semibold" style={{ color: "#6c757d" }}>
                              {format2(subtotal)}
                            </td>
                            <td colSpan={isAdmin ? 2 : 1}></td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                    <tr className="bg-purple-100 font-bold">
                      <td colSpan={9} className="px-3 py-2 text-right font-bold" style={{ color: "#4e1a74" }}>
                        GRAND TOTAL
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold" style={{ color: "#4e1a74" }}>
                        {format2(grandTotal)}
                      </td>
                      <td colSpan={isAdmin ? 2 : 1}></td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-3 text-center text-sm text-gray-600">
        <div className="container mx-auto">
          State Bank of India • {branchName} • Charges Return System
        </div>
      </footer>
    </div>
  );
}
