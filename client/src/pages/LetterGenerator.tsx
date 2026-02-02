import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Upload, FileText, Save, CheckCircle, Download, Trash2 } from "lucide-react";
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
  const csvInputRef = useRef<HTMLInputElement>(null);
  
  // Template data
  const [templateHTML, setTemplateHTML] = useState<string>("");
  const docxInputRef = useRef<HTMLInputElement>(null);
  
  // Dak Metadata
  const [dakMetadata, setDakMetadata] = useState<DakMetadata>({
    letterType: "",
    letterDestination: "",
    recipientDetails: "",
    subject: "",
    remarks: ""
  });
  
  // Generated letters
  const [generatedLetters, setGeneratedLetters] = useState<GeneratedLetter[]>([]);
  
  // Load saved data
  useEffect(() => {
    const loadSavedData = async () => {
      const saved = await loadData(STORAGE_KEY);
      if (saved) {
        if (saved.csvData) setCSVData(saved.csvData);
        if (saved.templateHTML) setTemplateHTML(saved.templateHTML);
        if (saved.dakMetadata) setDakMetadata(saved.dakMetadata);
        if (saved.generatedLetters) setGeneratedLetters(saved.generatedLetters);
      }
    };
    loadSavedData();
  }, []);
  
  // Save data whenever it changes
  useEffect(() => {
    if (csvData || templateHTML || generatedLetters.length > 0) {
      saveData(STORAGE_KEY, {
        csvData,
        templateHTML,
        dakMetadata,
        generatedLetters
      });
    }
  }, [csvData, templateHTML, dakMetadata, generatedLetters]);
  
  // Handle CSV upload
  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const rows = results.data as Record<string, string>[];
        
        setCSVData({ headers, rows: rows.filter(row => Object.values(row).some(v => v)) });
        toast.success(`CSV uploaded: ${rows.length} records found`);
      },
      error: (error) => {
        toast.error(`CSV parsing error: ${error.message}`);
      }
    });
  };
  
  // Handle DOCX upload
  const handleDOCXUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      setTemplateHTML(result.value);
      toast.success("Template uploaded successfully");
    } catch (error) {
      toast.error("Failed to parse DOCX file");
    }
  };
  
  // Editor ref for cursor position
  const editorRef = useRef<HTMLDivElement>(null);
  
  // Handle template change
  const handleTemplateChange = () => {
    if (editorRef.current) {
      setTemplateHTML(editorRef.current.innerHTML);
    }
  };
  
  // Add field at cursor position
  const handleAddField = (fieldName: string) => {
    const selection = window.getSelection();
    if (!selection || !editorRef.current) return;
    
    // Check if there's a valid range
    if (selection.rangeCount === 0) {
      // No selection, append to end of editor
      const badge = document.createElement("span");
      badge.className = "inline-block px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm font-medium mx-1";
      badge.contentEditable = "false";
      badge.textContent = `{{${fieldName}}}`;
      editorRef.current.appendChild(badge);
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
    
    // Move cursor after badge
    range.setStartAfter(badge);
    range.setEndAfter(badge);
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
      const dakData = await loadData("sbi-dak-records");
      const existingRecords: DakRecord[] = dakData || [];
      
      const today = getTodayInfo();
      let currentSerial = parseInt(generateSerial(existingRecords, today.fyLabel));
      
      const letters: GeneratedLetter[] = [];
      
      for (const row of csvData.rows) {
        const serialStr = String(currentSerial).padStart(4, "0");
        const refNo = buildRef(today.fyLabel, today.monthNo, serialStr, branchCode);
        
        // Replace placeholders in template
        let content = templateHTML;
        content = content.replace(/\{\{RefNo\}\}/g, refNo);
        content = content.replace(/\{\{DakNumber\}\}/g, refNo);
        content = content.replace(/\{\{Date\}\}/g, today.dateDisplay);
        
        // Replace CSV field placeholders
        csvData.headers.forEach(header => {
          const value = row[header] || "";
          content = content.replace(new RegExp(`\\{\\{${header}\\}\\}`, "g"), value);
        });
        
        // Process recipient details with CSV fields
        let processedRecipient = dakMetadata.recipientDetails;
        csvData.headers.forEach(header => {
          const value = row[header] || "";
          processedRecipient = processedRecipient.replace(new RegExp(`\\{\\{${header}\\}\\}`, "g"), value);
        });
        
        letters.push({
          id: `${Date.now()}-${currentSerial}`,
          refNo,
          date: today.dateDisplay,
          content,
          data: row,
          dakMetadata: {
            ...dakMetadata,
            recipientDetails: processedRecipient
          }
        });
        
        currentSerial++;
      }
      
      setGeneratedLetters(letters);
      toast.success(`${letters.length} letters generated successfully`);
    } catch (error) {
      toast.error("Failed to generate letters");
      console.error(error);
    }
  };
  
  // Finalize and save to Dak Generator
  const handleFinalizeAndDownload = async () => {
    if (generatedLetters.length === 0) return;
    
    try {
      // Load existing Dak records
      const dakData = await loadData("sbi-dak-records");
      const existingRecords: DakRecord[] = dakData || [];
      
      const today = getTodayInfo();
      
      // Create new Dak records for each letter
      const newDakRecords: DakRecord[] = generatedLetters.map((letter, index) => {
        const serialNo = letter.refNo.split("/").pop() || "0001";
        
        return {
          id: Date.now() + index,
          refNo: letter.refNo,
          serialNo,
          financialYear: today.fyLabel,
          monthNo: today.monthNo,
          dateDisplay: letter.date,
          letterType: letter.dakMetadata.letterType,
          letterDestination: letter.dakMetadata.letterDestination,
          recipientDetails: letter.dakMetadata.recipientDetails,
          subject: letter.dakMetadata.subject,
          remarks: letter.dakMetadata.remarks
        };
      });
      
      // Save to Dak Generator storage
      const updatedRecords = [...existingRecords, ...newDakRecords];
      await saveData("sbi-dak-records", updatedRecords);
      
      // Download all letters as single HTML file
      const allLettersHTML = generatedLetters.map((letter, index) => `
        <div style="page-break-after: always; padding: 20px;">
          <h3>Letter ${index + 1}</h3>
          <p><strong>Reference No:</strong> ${letter.refNo}</p>
          <p><strong>Date:</strong> ${letter.date}</p>
          <hr style="margin: 20px 0;">
          ${letter.content}
        </div>
      `).join("");
      
      const fullHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Generated Letters</title>
          <style>
            body { font-family: Arial, sans-serif; }
            @media print {
              .page-break { page-break-after: always; }
            }
          </style>
        </head>
        <body>
          ${allLettersHTML}
        </body>
        </html>
      `;
      
      const blob = new Blob([fullHTML], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Letters_${today.dateDisplay}.html`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success(`${generatedLetters.length} letters downloaded and ${newDakRecords.length} Dak records updated!`);
      
      // Clear generated letters after finalization
      setGeneratedLetters([]);
    } catch (error) {
      toast.error("Failed to finalize and download");
      console.error(error);
    }
  };
  
  // Clear all data
  const handleClearAll = async () => {
    if (!confirm("Clear all data? This cannot be undone.")) return;
    
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
    setCurrentStep("upload");
    
    await saveData(STORAGE_KEY, {});
    toast.success("All data cleared");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <header 
        className="w-full px-6 flex items-center"
        style={{ 
          background: "linear-gradient(to right, #d4007f, #4e1a74)",
          height: '101px',
          paddingTop: '0px'
        }}
      >
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img 
              src="/images/sbi-logo.png" 
              alt="SBI Logo" 
              className="h-28 invert"
            />
            <div className="text-white">
              <h1 style={{ fontSize: "1.3rem", fontWeight: "600", marginBottom: "0.25rem" }}>
                Letter & Notice Generator
              </h1>
              <p style={{ fontSize: "0.85rem", opacity: 0.95 }}>
                {branchName}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className={`flex items-center gap-2 ${currentStep === "upload" ? "text-purple-700 font-semibold" : "text-gray-400"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === "upload" ? "bg-purple-700 text-white" : "bg-gray-300"}`}>1</div>
            <span>Upload Files</span>
          </div>
          <div className="w-16 h-1 bg-gray-300"></div>
          <div className={`flex items-center gap-2 ${currentStep === "editor" ? "text-purple-700 font-semibold" : "text-gray-400"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === "editor" ? "bg-purple-700 text-white" : "bg-gray-300"}`}>2</div>
            <span>Edit Template</span>
          </div>
          <div className="w-16 h-1 bg-gray-300"></div>
          <div className={`flex items-center gap-2 ${currentStep === "generate" ? "text-purple-700 font-semibold" : "text-gray-400"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === "generate" ? "bg-purple-700 text-white" : "bg-gray-300"}`}>3</div>
            <span>Generate & Download</span>
          </div>
        </div>

        {/* Step 1: Upload Files */}
        {currentStep === "upload" && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Upload className="w-6 h-6 text-purple-700" />
                <h2 className="text-xl font-semibold">Upload CSV Data</h2>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Upload a CSV file containing recipient data with headers (e.g., Name, Address, Amount)
              </p>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                className="hidden"
              />
              <Button onClick={() => csvInputRef.current?.click()} className="w-full">
                <Upload className="w-4 h-4 mr-2" />
                Choose CSV File
              </Button>
              {csvData && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                  <p className="text-sm text-green-800">
                    ✓ {csvData.rows.length} records loaded
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Fields: {csvData.headers.join(", ")}
                  </p>
                </div>
              )}
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <FileText className="w-6 h-6 text-purple-700" />
                <h2 className="text-xl font-semibold">Upload Letter Template</h2>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Upload a .doc/.docx file containing your letter template
              </p>
              <input
                ref={docxInputRef}
                type="file"
                accept=".doc,.docx"
                onChange={handleDOCXUpload}
                className="hidden"
              />
              <Button onClick={() => docxInputRef.current?.click()} className="w-full">
                <FileText className="w-4 h-4 mr-2" />
                Choose DOCX File
              </Button>
              {templateHTML && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                  <p className="text-sm text-green-800">
                    ✓ Template uploaded successfully
                  </p>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Action Buttons for Upload Step */}
        <div className="flex items-center justify-between mt-6">
          {currentStep === "upload" && (
            <Button onClick={handleClearAll} variant="outline" className="gap-2">
              <Trash2 className="w-4 h-4" />
              Clear All
            </Button>
          )}
          
          {currentStep === "upload" && csvData && templateHTML && (
            <Button onClick={() => setCurrentStep("editor")} size="lg">
              Continue to Template Editor
            </Button>
          )}
        </div>

        {/* Step 2: Template Editor with Dak Metadata */}
        {currentStep === "editor" && csvData && (
          <>
            {/* Dak Metadata Form */}
            <Card className="p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Letter Details (for Dak Number Generator)</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold mb-1 block">Letter Type *</Label>
                  <select
                    value={dakMetadata.letterType}
                    onChange={(e) => setDakMetadata({ ...dakMetadata, letterType: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border text-sm bg-white"
                  >
                    <option value="">-- Select --</option>
                    {LETTER_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <Label className="text-sm font-semibold mb-1 block">Letter Destination *</Label>
                  <select
                    value={dakMetadata.letterDestination}
                    onChange={(e) => setDakMetadata({ ...dakMetadata, letterDestination: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border text-sm bg-white"
                  >
                    <option value="">-- Select --</option>
                    {LETTER_DESTINATIONS.map(dest => (
                      <option key={dest} value={dest}>{dest}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <Label className="text-sm font-semibold mb-1 block">Recipient Details</Label>
                  <Input
                    value={dakMetadata.recipientDetails}
                    onChange={(e) => setDakMetadata({ ...dakMetadata, recipientDetails: e.target.value })}
                    placeholder="Type or use {{FieldName}} from CSV"
                    className="text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    You can use CSV fields like: {csvData.headers.slice(0, 3).map(h => `{{${h}}}`).join(", ")}
                  </p>
                </div>
                
                <div>
                  <Label className="text-sm font-semibold mb-1 block">Subject *</Label>
                  <Input
                    value={dakMetadata.subject}
                    onChange={(e) => setDakMetadata({ ...dakMetadata, subject: e.target.value })}
                    placeholder="Enter subject"
                    className="text-sm"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <Label className="text-sm font-semibold mb-1 block">Remarks (Optional)</Label>
                  <Input
                    value={dakMetadata.remarks}
                    onChange={(e) => setDakMetadata({ ...dakMetadata, remarks: e.target.value })}
                    placeholder="Additional remarks"
                    className="text-sm"
                  />
                </div>
              </div>
            </Card>

            {/* Template Editor */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Available Fields</h3>
                <p className="text-sm text-gray-600 mb-4">Click to add fields to your template:</p>
                <div className="space-y-2">
                  <Button 
                    onClick={() => handleAddField("RefNo")}
                    variant="outline"
                    className="w-full justify-start"
                    size="sm"
                  >
                    + Reference Number
                  </Button>
                  <Button 
                    onClick={() => handleAddField("Date")}
                    variant="outline"
                    className="w-full justify-start"
                    size="sm"
                  >
                    + Date
                  </Button>
                  {csvData.headers.map(header => (
                    <Button
                      key={header}
                      onClick={() => handleAddField(header)}
                      variant="outline"
                      className="w-full justify-start"
                      size="sm"
                    >
                      + {header}
                    </Button>
                  ))}
                </div>
              </Card>
              
              <Card className="md:col-span-2 p-6">
                <h3 className="text-lg font-semibold mb-4">Template Editor</h3>
                <p className="text-sm text-gray-600 mb-4">Click in the editor and then click a field button to insert it at cursor position. You can also type and format text directly.</p>
                <div 
                  ref={editorRef}
                  contentEditable
                  className="p-4 bg-white border-2 border-purple-200 rounded min-h-96 prose max-w-none focus:outline-none focus:border-purple-400"
                  onInput={handleTemplateChange}
                  dangerouslySetInnerHTML={{ __html: templateHTML }}
                  suppressContentEditableWarning
                />
              </Card>
            </div>
          </>
        )}

        {/* Action Buttons for Editor Step */}
        {currentStep === "editor" && (
          <div className="flex items-center justify-between mt-6">
            <Button onClick={() => setCurrentStep("upload")} variant="outline">
              Back to Upload
            </Button>
            <Button onClick={handleSaveTemplate} className="gap-2">
              <Save className="w-4 h-4" />
              Save Template & Continue
            </Button>
          </div>
        )}

        {/* Step 3: Generate & Download */}
        {currentStep === "generate" && (
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Generate Letters</h3>
              <p className="text-sm text-gray-600 mb-4">
                Ready to generate {csvData?.rows.length || 0} letters with automatic Dak number assignment
              </p>
              
              {generatedLetters.length === 0 ? (
                <Button onClick={handleGenerateLetters} size="lg" className="gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Generate Letters
                </Button>
              ) : (
                <div>
                  <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded">
                    <p className="text-green-800 font-semibold">
                      ✓ {generatedLetters.length} letters generated successfully
                    </p>
                  </div>
                  
                  {/* Preview All Letters */}
                  <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                    {generatedLetters.map((letter, index) => (
                      <div key={letter.id} className="border rounded-lg p-4 bg-white">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-semibold">Letter {index + 1}</p>
                            <p className="text-sm text-gray-600">Ref: {letter.refNo}</p>
                            <p className="text-sm text-gray-600">Date: {letter.date}</p>
                          </div>
                        </div>
                        <div 
                          className="mt-2 p-3 bg-gray-50 rounded text-sm max-h-40 overflow-auto prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: letter.content }}
                        />
                      </div>
                    ))}
                  </div>
                  
                  <Button onClick={handleFinalizeAndDownload} size="lg" className="gap-2 bg-green-600 hover:bg-green-700">
                    <Download className="w-5 h-5" />
                    Finalise and Download All
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">
                    This will download all letters and update {generatedLetters.length} records in Dak Number Generator
                  </p>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Action Buttons for Generate Step */}
        {currentStep === "generate" && generatedLetters.length === 0 && (
          <div className="flex items-center justify-between mt-6">
            <Button onClick={() => setCurrentStep("editor")} variant="outline">
              Back to Editor
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
