import { useState, useRef, useEffect } from "react";
import { Upload, FileText, Save, CheckCircle, Download, Trash2, Home, Bold, Italic, Underline, Strikethrough, Undo, Redo } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import Papa from "papaparse";
import mammoth from "mammoth";
import { loadData, saveData } from "@/lib/db";
import { useBranch } from "@/contexts/BranchContext";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface CSVData {
  headers: string[];
  rows: Record<string, string>[];
}

interface DakMetadata {
  letterType: string;
  letterDestination: string;
  recipientDetails: string;
  subject: string;
  remarks: string;
}

interface GeneratedLetter {
  id: string;
  refNo: string;
  date: string;
  content: string;
  data: Record<string, string>;
  dakMetadata: DakMetadata;
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

const STORAGE_KEY = "sbi-letter-generator";

// Letter Type options (same as Dak Generator)
const LETTER_TYPES = ["Letter", "Memo", "Note", "NOC", "Notices", "Others"];

// Letter Destination options (same as Dak Generator)
const LETTER_DESTINATIONS = [
  "Customer",
  "LHO",
  "ZO",
  "RBO",
  "Other Branch",
  "Vendor",
  "Law Enforcement Agencies",
  "Others"
];

// Dak Number Generator utility functions
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

function generateSerial(records: DakRecord[], fy: string): string {
  const sameFy = records.filter(r => r.financialYear === fy);
  if (!sameFy.length) return "0001";
  const max = Math.max(...sameFy.map(r => parseInt(r.serialNo)));
  return String(max + 1).padStart(4, "0");
}

function buildRef(fy: string, month: string, serial: string, branchCode: string): string {
  return `SBI/${branchCode}/${fy}/${month}/${serial}`;
}

export default function LetterGenerator() {
  const [, navigate] = useLocation();
  const { branchName, branchCode } = useBranch();
  
  // Step management
  const [currentStep, setCurrentStep] = useState<"upload" | "editor" | "generate">("upload");
  
  // CSV data
  const [csvData, setCSVData] = useState<CSVData | null>(null);
  
  // Template
  const [templateHTML, setTemplateHTML] = useState<string>("");
  
  // Dak metadata
  const [dakMetadata, setDakMetadata] = useState<DakMetadata>({
    letterType: "",
    letterDestination: "",
    recipientDetails: "",
    subject: "",
    remarks: ""
  });
  
  // Generated letters
  const [generatedLetters, setGeneratedLetters] = useState<GeneratedLetter[]>([]);
  
  // Handle CSV upload
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const rows = results.data as Record<string, string>[];
        setCSVData({ headers, rows: rows.filter(r => Object.values(r).some(v => v)) });
        toast.success(`CSV loaded: ${rows.length} rows`);
      },
      error: () => toast.error("Failed to parse CSV")
    });
  };
  
  // Handle DOCX upload
  const handleDOCXUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      setTemplateHTML(result.value);
      toast.success("Template loaded successfully");
      setCurrentStep("editor");
    } catch (error) {
      toast.error("Failed to load template");
    }
  };
  
  // Editor ref for cursor position
  const editorRef = useRef<HTMLDivElement>(null);
  
  // Track undo/redo history
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Handle template change with history tracking
  const handleTemplateChange = () => {
    if (editorRef.current) {
      const newHTML = editorRef.current.innerHTML;
      setTemplateHTML(newHTML);
      
      // Add to history
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newHTML);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  };
  
  // Initialize history when template loads
  useEffect(() => {
    if (templateHTML && history.length === 0) {
      setHistory([templateHTML]);
      setHistoryIndex(0);
    }
  }, [templateHTML]);
  
  // Undo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const prevHTML = history[newIndex];
      setTemplateHTML(prevHTML);
      if (editorRef.current) {
        editorRef.current.innerHTML = prevHTML;
      }
    }
  };
  
  // Redo
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const nextHTML = history[newIndex];
      setTemplateHTML(nextHTML);
      if (editorRef.current) {
        editorRef.current.innerHTML = nextHTML;
      }
    }
  };
  
  // Rich text formatting
  const applyFormat = (command: string) => {
    document.execCommand(command, false);
    handleTemplateChange();
  };
  
  // Add field at cursor position
  const handleAddField = (fieldName: string) => {
    if (!editorRef.current) return;
    
    // Focus editor first
    editorRef.current.focus();
    
    const selection = window.getSelection();
    if (!selection) return;
    
    // Check if there's a valid range
    if (selection.rangeCount === 0) {
      // No selection, append to end of editor
      const badge = document.createElement("span");
      badge.className = "inline-block px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm font-medium mx-1";
      badge.contentEditable = "false";
      badge.textContent = `{{${fieldName}}}`;
      editorRef.current.appendChild(badge);
      
      // Add space after badge
      const space = document.createTextNode(" ");
      editorRef.current.appendChild(space);
      
      handleTemplateChange();
      return;
    }
    
    const range = selection.getRangeAt(0);
    
    // Create field badge
    const badge = document.createElement("span");
    badge.className = "inline-block px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm font-medium mx-1";
    badge.contentEditable = "false";
    badge.textContent = `{{${fieldName}}}`;
    
    range.deleteContents();
    range.insertNode(badge);
    
    // Add space after badge
    const space = document.createTextNode(" ");
    range.setStartAfter(badge);
    range.insertNode(space);
    
    // Move cursor after space
    range.setStartAfter(space);
    range.setEndAfter(space);
    selection.removeAllRanges();
    selection.addRange(range);
    
    handleTemplateChange();
  };
  
  // Save template
  const handleSaveTemplate = () => {
    if (!templateHTML) {
      toast.error("Template is empty");
      return;
    }
    
    if (!dakMetadata.letterType || !dakMetadata.letterDestination || !dakMetadata.subject) {
      toast.error("Please fill Letter Type, Destination, and Subject");
      return;
    }
    
    toast.success("Template saved successfully");
    setCurrentStep("generate");
  };
  
  // Generate letters with Dak integration
  const handleGenerateLetters = async () => {
    if (!csvData || !templateHTML) {
      toast.error("Please upload both CSV and template");
      return;
    }
    
    try {
      // Load existing Dak records
      const existingRecords = (await loadData("dak-records")) || [];
      const { dateDisplay, monthNo, fyLabel } = getTodayInfo();
      
      const letters: GeneratedLetter[] = [];
      let currentSerial = parseInt(generateSerial(existingRecords, fyLabel));
      
      for (const row of csvData.rows) {
        const serial = String(currentSerial).padStart(4, "0");
        const refNo = buildRef(fyLabel, monthNo, serial, branchCode);
        
        // Replace placeholders
        let content = templateHTML;
        csvData.headers.forEach(header => {
          const value = row[header] || "";
          content = content.replace(new RegExp(`{{${header}}}`, "g"), value);
        });
        
        // Process recipient details placeholders
        let recipientDetails = dakMetadata.recipientDetails;
        csvData.headers.forEach(header => {
          const value = row[header] || "";
          recipientDetails = recipientDetails.replace(new RegExp(`{{${header}}}`, "g"), value);
        });
        
        letters.push({
          id: `letter-${currentSerial}`,
          refNo,
          date: dateDisplay,
          content,
          data: row,
          dakMetadata: {
            ...dakMetadata,
            recipientDetails
          }
        });
        
        currentSerial++;
      }
      
      setGeneratedLetters(letters);
      toast.success(`Generated ${letters.length} letters`);
    } catch (error) {
      toast.error("Failed to generate letters");
    }
  };
  
  // Finalize and print/download letters with Dak integration
  const handleFinalizeAndDownload = async () => {
    if (generatedLetters.length === 0) {
      toast.error("No letters to download");
      return;
    }
    
    try {
      // Update Dak records first
      const existingRecords = (await loadData("dak-records")) || [];
      const newRecords: DakRecord[] = generatedLetters.map((letter, idx) => ({
        id: Date.now() + idx,
        refNo: letter.refNo,
        serialNo: letter.refNo.split("/").pop() || "",
        financialYear: letter.refNo.split("/")[2] || "",
        monthNo: letter.refNo.split("/")[3] || "",
        dateDisplay: letter.date,
        letterType: letter.dakMetadata.letterType,
        letterDestination: letter.dakMetadata.letterDestination,
        recipientDetails: letter.dakMetadata.recipientDetails,
        subject: letter.dakMetadata.subject,
        remarks: letter.dakMetadata.remarks
      }));
      
      await saveData("dak-records", [...existingRecords, ...newRecords]);
      
      // Open print window with formatted letters
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Please allow popups to print letters");
        return;
      }
      
      // Build HTML content for all letters
      const lettersHTML = generatedLetters.map(letter => `
        <div style="
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          padding: 20mm;
          background: white;
          font-family: Arial, sans-serif;
          font-size: 12pt;
          line-height: 1.6;
          page-break-after: always;
        ">
          <div style="text-align: right; margin-bottom: 20px;">
            <strong>Ref No:</strong> ${letter.refNo}<br>
            <strong>Date:</strong> ${letter.date}
          </div>
          <div>
            ${letter.content}
          </div>
        </div>
      `).join("");
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Letters - ${new Date().toLocaleDateString()}</title>
          <style>
            @media print {
              @page { margin: 0; }
              body { margin: 0; }
            }
            body {
              margin: 0;
              padding: 0;
            }
          </style>
        </head>
        <body>
          ${lettersHTML}
        </body>
        </html>
      `);
      printWindow.document.close();
      
      // Trigger print dialog after a short delay
      setTimeout(() => {
        printWindow.print();
      }, 500);
      
      toast.success(`Updated ${generatedLetters.length} Dak records. Print dialog opened.`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to process letters");
    }
  };
  
  // Reset
  const handleReset = () => {
    setCSVData(null);
    setTemplateHTML("");
    setDakMetadata({
      letterType: "",
      letterDestination: "",
      recipientDetails: "",
      subject: "",
      remarks: ""
    });
    setGeneratedLetters([]);
    setHistory([]);
    setHistoryIndex(-1);
    setCurrentStep("upload");
    toast.success("Reset complete");
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header 
        className="w-full px-6 flex items-center justify-between"
        style={{ 
          background: "linear-gradient(to right, #d4007f, #4e1a74)",
          height: '101px',
          paddingTop: '0px'
        }}
      >
        <div className="flex items-center gap-4">
          <img 
            src="/images/sbi-logo.png" 
            alt="SBI Logo" 
            className="h-28 invert"
          />
          <div className="text-white">
            <h1 className="font-bold" style={{ fontSize: '1.3rem' }}>Letter & Notice Generator</h1>
            <p className="text-sm opacity-90" style={{ fontSize: '0.85rem' }}>{branchName}</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate("/")}
          className="bg-white/10 border-white/30 text-white hover:bg-white/20"
        >
          <Home className="mr-2 h-4 w-4" />
          Back to Home
        </Button>
      </header>

      {/* Main Content */}
      <div className="container mx-auto p-6">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className={`flex items-center gap-2 ${currentStep === "upload" ? "text-purple-600 font-semibold" : "text-gray-400"}`}>
            <Upload className="h-5 w-5" />
            <span>Upload Files</span>
          </div>
          <div className="h-px w-16 bg-gray-300" />
          <div className={`flex items-center gap-2 ${currentStep === "editor" ? "text-purple-600 font-semibold" : "text-gray-400"}`}>
            <FileText className="h-5 w-5" />
            <span>Edit Template</span>
          </div>
          <div className="h-px w-16 bg-gray-300" />
          <div className={`flex items-center gap-2 ${currentStep === "generate" ? "text-purple-600 font-semibold" : "text-gray-400"}`}>
            <CheckCircle className="h-5 w-5" />
            <span>Generate & Download</span>
          </div>
        </div>

        {/* Step 1: Upload Files */}
        {currentStep === "upload" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Step 1: Upload CSV Data</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="csv-upload">Upload CSV File</Label>
                  <Input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    className="mt-2"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Upload a CSV file containing data with headers
                  </p>
                </div>
                {csvData && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded">
                    <p className="text-green-700 font-medium">
                      ✓ CSV loaded: {csvData.rows.length} rows, {csvData.headers.length} columns
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Headers: {csvData.headers.join(", ")}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Step 2: Upload Letter Template</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="docx-upload">Upload DOCX Template</Label>
                  <Input
                    id="docx-upload"
                    type="file"
                    accept=".doc,.docx"
                    onChange={handleDOCXUpload}
                    className="mt-2"
                    disabled={!csvData}
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Upload a Word document (.docx) template
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Step 2: Edit Template */}
        {currentStep === "editor" && (
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Available Fields */}
            <Card className="p-6 lg:col-span-1">
              <h3 className="font-semibold mb-4">Available Fields</h3>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {/* System Fields */}
                <div className="mb-3 pb-3 border-b">
                  <p className="text-xs text-gray-500 mb-2">System Fields</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddField("ref_no")}
                    className="w-full justify-start mb-2"
                  >
                    Reference Number
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddField("date")}
                    className="w-full justify-start"
                  >
                    Letter Date
                  </Button>
                </div>
                
                {/* CSV Fields */}
                {csvData && csvData.headers.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">CSV Fields</p>
                    {csvData.headers.map(header => (
                      <Button
                        key={header}
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddField(header)}
                        className="w-full justify-start mb-2"
                      >
                        {header}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Dak Metadata Form */}
              <div className="mt-6 space-y-4 border-t pt-4">
                <h3 className="font-semibold">Letter Details</h3>
                
                <div>
                  <Label>Letter Type *</Label>
                  <select
                    className="w-full mt-1 p-2 border rounded"
                    value={dakMetadata.letterType}
                    onChange={(e) => setDakMetadata({...dakMetadata, letterType: e.target.value})}
                  >
                    <option value="">Select Type</option>
                    {LETTER_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <Label>Letter Destination *</Label>
                  <select
                    className="w-full mt-1 p-2 border rounded"
                    value={dakMetadata.letterDestination}
                    onChange={(e) => setDakMetadata({...dakMetadata, letterDestination: e.target.value})}
                  >
                    <option value="">Select Destination</option>
                    {LETTER_DESTINATIONS.map(dest => (
                      <option key={dest} value={dest}>{dest}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <Label>Recipient Details</Label>
                  <Input
                    placeholder="Type or use {{field}} placeholders"
                    value={dakMetadata.recipientDetails}
                    onChange={(e) => setDakMetadata({...dakMetadata, recipientDetails: e.target.value})}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label>Subject *</Label>
                  <Input
                    placeholder="Enter subject"
                    value={dakMetadata.subject}
                    onChange={(e) => setDakMetadata({...dakMetadata, subject: e.target.value})}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label>Remarks (Optional)</Label>
                  <Input
                    placeholder="Enter remarks"
                    value={dakMetadata.remarks}
                    onChange={(e) => setDakMetadata({...dakMetadata, remarks: e.target.value})}
                    className="mt-1"
                  />
                </div>
              </div>
            </Card>

            {/* Template Editor */}
            <Card className="p-6 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Template Editor</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Reset
                  </Button>
                  <Button onClick={handleSaveTemplate}>
                    <Save className="h-4 w-4 mr-2" />
                    Save & Continue
                  </Button>
                </div>
              </div>
              
              {/* Rich Text Toolbar */}
              <div className="flex gap-2 mb-4 p-2 bg-gray-100 rounded border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => applyFormat("bold")}
                  title="Bold"
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => applyFormat("italic")}
                  title="Italic"
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => applyFormat("underline")}
                  title="Underline"
                >
                  <Underline className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => applyFormat("strikeThrough")}
                  title="Strikethrough"
                >
                  <Strikethrough className="h-4 w-4" />
                </Button>
                <div className="w-px bg-gray-300 mx-2" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  title="Undo"
                >
                  <Undo className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                  title="Redo"
                >
                  <Redo className="h-4 w-4" />
                </Button>
              </div>
              
              <div
                ref={editorRef}
                contentEditable
                onInput={handleTemplateChange}
                className="min-h-[600px] p-6 border rounded bg-white prose max-w-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                dangerouslySetInnerHTML={{ __html: templateHTML }}
                suppressContentEditableWarning
              />
              
              <p className="text-sm text-gray-500 mt-2">
                Click inside the editor to place cursor, then click a field button to insert it at that position.
              </p>
            </Card>
          </div>
        )}

        {/* Step 3: Generate & Download */}
        {currentStep === "generate" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Generate & Download Letters</h2>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep("editor")}
                  >
                    Back to Edit Template
                  </Button>
                  <Button
                    onClick={handleGenerateLetters}
                    disabled={generatedLetters.length > 0}
                  >
                    Generate Letters
                  </Button>
                </div>
              </div>
              
              {generatedLetters.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Click "Generate Letters" to create personalized letters</p>
                </div>
              )}
              
              {generatedLetters.length > 0 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded">
                    <p className="text-green-700 font-medium">
                      ✓ Generated {generatedLetters.length} letters
                    </p>
                    <Button onClick={handleFinalizeAndDownload}>
                      <Download className="h-4 w-4 mr-2" />
                      Finalise and Print/Download All
                    </Button>
                  </div>
                  
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {generatedLetters.map((letter, idx) => (
                      <Card key={letter.id} className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold">Letter {idx + 1}</p>
                            <p className="text-sm text-gray-600">Ref No: {letter.refNo}</p>
                            <p className="text-sm text-gray-600">Date: {letter.date}</p>
                          </div>
                        </div>
                        <div 
                          className="prose max-w-none text-sm border-t pt-4 mt-4"
                          dangerouslySetInnerHTML={{ __html: letter.content }}
                        />
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
