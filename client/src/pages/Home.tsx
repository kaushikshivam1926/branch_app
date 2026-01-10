import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, Printer, PrinterIcon } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Loan Recovery Notice Generator
          </h1>
          <p className="text-slate-600">
            Upload your CSV file and generate recovery notices for non-performing accounts
          </p>
        </div>

        {/* Upload Section */}
        {accounts.length === 0 ? (
          <Card className="p-12 border-2 border-dashed border-slate-300 hover:border-slate-400 transition-colors cursor-pointer"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center justify-center text-center">
              <Upload className="w-16 h-16 text-slate-400 mb-4" />
              <h2 className="text-2xl font-semibold text-slate-900 mb-2">
                Upload CSV File
              </h2>
              <p className="text-slate-600 mb-4">
                Drag and drop your CSV file here, or click to browse
              </p>
              <p className="text-sm text-slate-500">
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
              >
                <Upload className="w-4 h-4" />
                Upload New File
              </Button>
              <Button
                onClick={() => setPrintingAll(true)}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
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
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-100 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                        S.No
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                        Account Number
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                        Customer Name
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">
                        Outstanding Amount
                      </th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-slate-900">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {accounts.map((account, index) => (
                      <tr key={index} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {account.sr_no}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">
                          {account.account_no}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {account.customer_name}
                        </td>
                        <td className="px-6 py-4 text-sm text-right font-semibold text-red-600">
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
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>{accounts.length}</strong> accounts loaded • Total Outstanding: <strong>₹ {accounts.reduce((sum, acc) => sum + (parseFloat(acc.outstanding) || 0), 0).toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}</strong>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
