import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Printer } from "lucide-react";
import { useBranch } from "@/contexts/BranchContext";
import { loadData, saveData } from "@/lib/db";
import type { NoticeTemplate, TemplateElement } from "./TemplateDesigner";

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

interface PrintPreviewProps {
  account?: LoanAccount;
  accounts?: LoanAccount[];
  template?: NoticeTemplate;
  onClose: () => void;
}

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

const DAK_STORAGE_KEY = "dak-records";  // Unified key used by refNumberEngine

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
    // Format: YY-YY (e.g., "25-26") - matches DakNumberGenerator and refNumberEngine
    fyLabel: `${String(fyStart).slice(-2)}-${String(fyEnd).slice(-2)}`,
  };
}

function generateSerial(records: DakRecord[], fy: string): string {
  const sameFy = records.filter(r => r.financialYear === fy);
  if (!sameFy.length) return "0001";
  const max = Math.max(...sameFy.map(r => parseInt(r.serialNo || "0", 10)));
  return String(max + 1).padStart(4, "0");
}

function buildRef(fy: string, month: string, serial: string, branchCode: string): string {
  return `SBI/${branchCode}/${fy}/${month}/${serial}`;
}

async function loadUnifiedDakRecords(): Promise<DakRecord[]> {
  // Uses unified key from refNumberEngine for consistency across all apps
  const records = (await loadData(DAK_STORAGE_KEY)) || [];
  return Array.isArray(records) ? records : [];
}

export default function PrintPreview({ account, accounts, template, onClose }: PrintPreviewProps) {
  const { branchCode } = useBranch();
  const printRef = useRef<HTMLDivElement>(null);
  const hasPreparedDakRecords = useRef(false);
  const [letterDate, setLetterDate] = useState(new Date().toISOString().split('T')[0]);
  const [accountRefMap, setAccountRefMap] = useState<Record<string, string>>({});
  const [isPreparingRefs, setIsPreparingRefs] = useState(true);

  const targetAccounts = account ? [account] : (accounts || []);

  useEffect(() => {
    const prepareDakRecords = async () => {
      if (hasPreparedDakRecords.current) {
        setIsPreparingRefs(false);
        return;
      }

      if (!targetAccounts.length) {
        setIsPreparingRefs(false);
        hasPreparedDakRecords.current = true;
        return;
      }

      setIsPreparingRefs(true);

      try {
        const existingRecords = await loadUnifiedDakRecords();
        const { dateDisplay, monthNo, fyLabel } = getTodayInfo();

        const currentSerial = parseInt(generateSerial(existingRecords, fyLabel), 10);
        const refsByAccount: Record<string, string> = {};

        const newRecords: DakRecord[] = targetAccounts.map((acc, idx) => {
          const serial = String(currentSerial + idx).padStart(4, "0");
          const refNo = buildRef(fyLabel, monthNo, serial, branchCode);
          refsByAccount[acc.account_no] = refNo;

          const recipientDetails = [acc.customer_name, acc.address1, acc.address2, acc.address3]
            .filter(Boolean)
            .join(", ");

          return {
            id: Date.now() + idx,
            refNo,
            serialNo: serial,
            financialYear: fyLabel,
            monthNo,
            dateDisplay,
            letterType: "Notices",
            letterDestination: "Customer",
            recipientDetails,
            subject: `Loan Recovery Notice - A/C ${acc.account_no}`,
            remarks: `Outstanding: ${acc.outstanding || "N/A"}`,
          };
        });

        await saveData(DAK_STORAGE_KEY, [...existingRecords, ...newRecords]);
        setAccountRefMap(refsByAccount);
        hasPreparedDakRecords.current = true;
      } catch (error) {
        console.error("Failed to prepare Dak records for notices:", error);
      } finally {
        setIsPreparingRefs(false);
      }
    };

    prepareDakRecords();
  }, [branchCode, targetAccounts]);

  const replaceFieldValues = (content: string, acc: LoanAccount): string => {
    const refNo = accountRefMap[acc.account_no] || "";
    
    return content
      .replace(/{{ref_no}}/g, refNo)
      .replace(/{{date}}/g, new Date(letterDate).toLocaleDateString('en-IN'))
      .replace(/{{customer_name}}/g, acc.customer_name)
      .replace(/{{father_name}}/g, acc.father_name || "")
      .replace(/{{spouse_name}}/g, acc.spouse_name || "")
      .replace(/{{account_no}}/g, acc.account_no)
      .replace(/{{address1}}/g, acc.address1 || "")
      .replace(/{{address2}}/g, acc.address2 || "")
      .replace(/{{address3}}/g, acc.address3 || "")
      .replace(/{{postcode}}/g, acc.postcode || "")
      .replace(/{{mobile}}/g, acc.mobile || "")
      .replace(/{{outstanding}}/g, `₹ ${parseFloat(acc.outstanding).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`);
  };

  const handlePrint = () => {
    if (isPreparingRefs) return;

    const printWindow = window.open("", "_blank");
    if (printWindow && printRef.current) {
      printWindow.document.write(printRef.current.innerHTML);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const formatAddress = (addr1: string, addr2: string, addr3: string) => {
    return [addr1, addr2, addr3].filter(a => a && a.trim()).join(", ");
  };

  const renderNotice = (acc: LoanAccount) => {
    // If template is provided, use it; otherwise use default layout
    if (template && template.type === "text" && template.textContent) {
      // Text-based template from Word document
      const processedText = replaceFieldValues(template.textContent, acc);
      return (
        <div key={acc.account_no} className="page-break print:page-break-after-always">
          <div style={{
            width: "210mm",
            minHeight: "297mm",
            margin: "0 auto",
            padding: "20mm",
            backgroundColor: "white",
            fontFamily: "serif",
            fontSize: "12px",
            lineHeight: "1.6",
            whiteSpace: "pre-wrap",
          }}>
            {processedText}
          </div>
        </div>
      );
    }
    
    if (template && template.type === "visual" && template.elements.length > 0) {
      return (
        <div key={acc.account_no} className="page-break print:page-break-after-always">
          <div style={{
            width: "210mm",
            height: "297mm",
            margin: "0 auto",
            padding: "20mm",
            backgroundColor: "white",
            fontFamily: "Arial, sans-serif",
            position: "relative",
          }}>
            {template.elements.map(element => {
              const displayContent = element.type === "field" 
                ? replaceFieldValues(element.content, acc)
                : element.content;
              
              return (
                <div
                  key={element.id}
                  style={{
                    position: "absolute",
                    left: element.x,
                    top: element.y,
                    fontSize: `${element.fontSize}px`,
                    fontWeight: element.fontWeight,
                    fontStyle: element.fontStyle,
                    textDecoration: element.textDecoration,
                    textAlign: element.textAlign,
                    width: element.width ? `${element.width}px` : "auto",
                  }}
                >
                  {displayContent}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Default template fallback
    return (
    <div key={acc.account_no} className="page-break print:page-break-after-always">
      <div style={{
        width: "210mm",
        height: "297mm",
        margin: "0 auto",
        padding: "20mm",
        backgroundColor: "white",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Arial, sans-serif",
        fontSize: "12px",
        lineHeight: "1.6",
        position: "relative",
      }}>
        {/* Header Placeholder */}
        <div style={{
          textAlign: "center",
          marginBottom: "20px",
          borderBottom: "2px solid #333",
          paddingBottom: "15px",
          minHeight: "40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "14px",
          fontWeight: "bold",
          color: "#666",
        }}>
          <img
            src="/header-placeholder.png"
            alt="Bank Header"
            style={{
              maxHeight: "40px",
              maxWidth: "100%",
              display: "none", // Hidden until user provides image
            }}
          />
          <span style={{ display: "block" }}>
            [BANK HEADER - Place header-placeholder.png in root folder]
          </span>
        </div>

        {/* Letter Content */}
        <div style={{ flex: 1 }}>
          {/* Letter Reference and Date */}
          <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between" }}>
            <div>
              <strong>Letter Reference No.:</strong> {accountRefMap[acc.account_no] || "Generating..."}
            </div>
            <div>
              <strong>Letter Date:</strong> {new Date(letterDate).toLocaleDateString('en-IN')}
            </div>
          </div>

          {/* Recipient Address */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ marginBottom: "10px" }}>
              <strong>{acc.customer_name}</strong>
            </div>
            <div style={{ marginBottom: "5px" }}>
              {acc.father_name && <div>S/O: {acc.father_name}</div>}
              {acc.spouse_name && <div>W/O: {acc.spouse_name}</div>}
            </div>
            <div style={{ marginBottom: "5px" }}>
              {acc.address1 && <div>{acc.address1}</div>}
              {acc.address2 && <div>{acc.address2}</div>}
              {acc.address3 && <div>{acc.address3}</div>}
            </div>
            <div style={{ marginBottom: "5px" }}>
              <strong>PIN Code:</strong> {acc.postcode}
            </div>
            {acc.mobile && (
              <div style={{ marginBottom: "5px" }}>
                <strong>Mobile Number:</strong> {acc.mobile}
              </div>
            )}
          </div>

          {/* Letter Body */}
          <div style={{ marginBottom: "20px", textAlign: "justify" }}>
            <p style={{ marginBottom: "15px" }}>Dear {acc.customer_name.split(" ")[0]},</p>

            <p style={{ marginBottom: "15px" }}>
              <strong>RE: NOTICE FOR RECOVERY OF OUTSTANDING DUES</strong>
            </p>

            <p style={{ marginBottom: "15px" }}>
              <strong>Account Number: {acc.account_no}</strong>
            </p>

            <p style={{ marginBottom: "15px" }}>
              This is to bring to your notice that your loan account bearing number {acc.account_no} is in default. 
              As per our records, you have an outstanding balance of <strong>₹ {parseFloat(acc.outstanding).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}</strong> which is overdue.
            </p>

            <p style={{ marginBottom: "15px" }}>
              We hereby request you to settle the outstanding dues within 30 days from the date of this letter. 
              Failure to do so may result in further action as per the terms and conditions of your loan agreement 
              and applicable laws.
            </p>

            <p style={{ marginBottom: "15px" }}>
              Please contact our branch immediately to arrange for the payment or discuss a suitable repayment plan.
            </p>

            <p style={{ marginBottom: "15px" }}>
              For any queries or clarifications, please feel free to contact us at your earliest convenience.
            </p>

            <p>Yours faithfully,</p>
          </div>

          {/* Signature Area */}
          <div style={{ marginTop: "40px", marginBottom: "20px" }}>
            <div style={{ marginBottom: "50px" }}>
              _________________________
            </div>
            <div>
              <strong>Authorized Signatory</strong>
            </div>
          </div>
        </div>

        {/* Footer Placeholder */}
        <div style={{
          textAlign: "center",
          borderTop: "2px solid #333",
          paddingTop: "15px",
          minHeight: "30px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "10px",
          color: "#666",
          marginTop: "auto",
        }}>
          <img
            src="/footer-placeholder.png"
            alt="Bank Footer"
            style={{
              maxHeight: "30px",
              maxWidth: "100%",
              display: "none", // Hidden until user provides image
            }}
          />
          <span style={{ display: "block" }}>
            [BANK FOOTER - Place footer-placeholder.png in root folder]
          </span>
        </div>
      </div>
    </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex flex-col">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {account ? `Print Notice - ${account.account_no}` : `Print All Notices (${accounts?.length || 0})`}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handlePrint}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
            disabled={isPreparingRefs}
          >
            <Printer className="w-4 h-4" />
            {isPreparingRefs ? "Preparing References..." : "Print"}
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            size="icon"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 overflow-auto bg-gray-100 p-4">
        <div ref={printRef} className="mx-auto" style={{ width: "fit-content" }}>
          {account ? (
            renderNotice(account)
          ) : (
            accounts?.map((acc) => renderNotice(acc))
          )}
        </div>
      </div>

      {/* Footer with info */}
      <div className="bg-white border-t border-gray-200 p-4 text-sm text-gray-600">
        <p>
          💡 <strong>Tip:</strong> To customize the header and footer, place <code className="bg-gray-100 px-2 py-1 rounded">header-placeholder.png</code> and <code className="bg-gray-100 px-2 py-1 rounded">footer-placeholder.png</code> in your root folder. 
          The images will automatically appear on all printed notices.
        </p>
      </div>
    </div>
  );
}
