/**
 * Loan Recovery Notice Generator
 * 
 * Main application page with SBI branding
 * Allows CSV upload, displays accounts, and generates print notices
 */

import { useState, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, Printer, PrinterIcon, ArrowLeft } from "lucide-react";
import Papa from "papaparse";
import PrintPreview from "@/components/PrintPreview";

interface LoanAccount {
  sr_no: string;
  account_no: string;
  customer_name: string;
  father_name: string;
  spouse_name: string;
  address1: string;
  address2: string;
  address3: string;
  postcode: string;
  outstanding: string;
  mobile?: string;
}

export default function Home() {
  const [accounts, setAccounts] = useState<LoanAccount[]>([]);
  const [printingAccount, setPrintingAccount] = useState<LoanAccount | null>(null);
  const [printingAll, setPrintingAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => {
        const parsedAccounts = results.data.map((row: any) => ({
          sr_no: row.SR_NO || "",
          account_no: row.ACCOUNT_NO || "",
          customer_name: row.CUSTOMER_NAME || "",
          father_name: row.FATHER_NAME || "",
          spouse_name: row.SPOUSE_NAME || "",
          address1: row.ADDRESS1 || "",
          address2: row.ADDRESS2 || "",
          address3: row.ADDRESS3 || "",
          postcode: row.POSTCODE || "",
          outstanding: row.OUTSTANDING || "",
          mobile: row.MOBILE || "",
        }));
        setAccounts(parsedAccounts);
      },
      error: (error: any) => {
        alert(`Error parsing CSV: ${error.message}`);
      },
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  if (printingAccount) {
    return (
      <PrintPreview
        account={printingAccount}
        onClose={() => setPrintingAccount(null)}
      />
    );
  }

  if (printingAll && accounts.length > 0) {
    return (
      <PrintPreview
        accounts={accounts}
        onClose={() => setPrintingAll(false)}
      />
    );
  }

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
          background: "linear-gradient(to right, #d4007f, #4e1a74)"
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
              State Bank of India
            </h1>
            <p 
              className="text-white/90"
              style={{ fontSize: "0.85rem" }}
            >
              PBB New Market Branch
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-8 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Back Button & Title */}
          <div className="mb-6">
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
            <h2 
              className="text-2xl font-semibold mb-2"
              style={{ color: "#4e1a74" }}
            >
              Loan Recovery Notice Generator
            </h2>
            <p style={{ color: "#666" }}>
              Upload your CSV file and generate recovery notices for non-performing accounts
            </p>
          </div>

          {/* Upload Section */}
          {accounts.length === 0 ? (
            <Card 
              className="p-12 border-2 border-dashed hover:border-opacity-70 transition-colors cursor-pointer bg-white"
              style={{ borderColor: "#4e1a74" }}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center justify-center text-center">
                <Upload className="w-16 h-16 mb-4" style={{ color: "#4e1a74" }} />
                <h3 className="text-2xl font-semibold mb-2" style={{ color: "#333" }}>
                  Upload CSV File
                </h3>
                <p className="mb-4" style={{ color: "#666" }}>
                  Drag and drop your CSV file here, or click to browse
                </p>
                <p className="text-sm" style={{ color: "#999" }}>
                  Expected columns: ACCOUNT_NO, CUSTOMER_NAME, FATHER_NAME, SPOUSE_NAME, ADDRESS1, ADDRESS2, ADDRESS3, POSTCODE, OUTSTANDING
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </Card>
          ) : (
            <>
              {/* Action Buttons */}
              <div className="flex gap-4 mb-6">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="gap-2"
                  style={{ borderColor: "#4e1a74", color: "#4e1a74" }}
                >
                  <Upload className="w-4 h-4" />
                  Upload New File
                </Button>
                <Button
                  onClick={() => setPrintingAll(true)}
                  className="gap-2"
                  style={{ backgroundColor: "#4e1a74" }}
                >
                  <PrinterIcon className="w-4 h-4" />
                  Print All ({accounts.length})
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Accounts Table */}
              <Card className="overflow-hidden bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead style={{ backgroundColor: "#4e1a74" }}>
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-white">
                          S.No
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-white">
                          Account Number
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-white">
                          Customer Name
                        </th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-white">
                          Outstanding Amount
                        </th>
                        <th className="px-6 py-3 text-center text-sm font-semibold text-white">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {accounts.map((account, index) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-sm" style={{ color: "#666" }}>
                            {account.sr_no}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium" style={{ color: "#333" }}>
                            {account.account_no}
                          </td>
                          <td className="px-6 py-4 text-sm" style={{ color: "#444" }}>
                            {account.customer_name}
                          </td>
                          <td className="px-6 py-4 text-sm text-right font-semibold" style={{ color: "#d4007f" }}>
                            ₹ {parseFloat(account.outstanding).toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Button
                              onClick={() => setPrintingAccount(account)}
                              size="sm"
                              variant="outline"
                              className="gap-2"
                              style={{ borderColor: "#4e1a74", color: "#4e1a74" }}
                            >
                              <Printer className="w-4 h-4" />
                              Print
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Summary */}
              <div 
                className="mt-6 p-4 rounded-lg border"
                style={{ backgroundColor: "#4e1a7410", borderColor: "#4e1a7430" }}
              >
                <p className="text-sm" style={{ color: "#4e1a74" }}>
                  <strong>{accounts.length}</strong> accounts loaded • Total Outstanding: <strong>₹ {accounts.reduce((sum, acc) => sum + (parseFloat(acc.outstanding) || 0), 0).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}</strong>
                </p>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Dark horizontal line */}
          <div 
            className="w-full h-px mb-4"
            style={{ backgroundColor: "#333" }}
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
    </div>
  );
}
