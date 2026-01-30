import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Upload, FileText, Save, CheckCircle, Download, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import Papa from "papaparse";
import mammoth from "mammoth";
import { loadData, saveData } from "@/lib/db";
import { useBranch } from "@/contexts/BranchContext";

interface CSVData {
  headers: string[];
  rows: Record<string, string>[];
}

interface TemplateField {
  id: string;
  placeholder: string;
  csvHeader: string | null;
  x: number;
  y: number;
}

interface GeneratedLetter {
  id: string;
  dakNumber: string;
  date: string;
  content: string;
  data: Record<string, string>;
}

const STORAGE_KEY = "sbi-letter-generator";
const DAK_STORAGE_KEY = "sbi_letter_refs_13042";

export default function LetterGenerator() {
  const [, navigate] = useLocation();
  const { branchName } = useBranch();
  
  // Step management
  const [currentStep, setCurrentStep] = useState<"upload" | "editor" | "preview">("upload");
  
  // CSV data
  const [csvData, setCSVData] = useState<CSVData | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  
  // Template data
  const [templateHTML, setTemplateHTML] = useState<string>("");
  const [templateFields, setTemplateFields] = useState<TemplateField[]>([]);
  const docxInputRef = useRef<HTMLInputElement>(null);
  
  // Generated letters
  const [generatedLetters, setGeneratedLetters] = useState<GeneratedLetter[]>([]);
  
  // Load saved data
  useEffect(() => {
    const loadSavedData = async () => {
      const saved = await loadData(STORAGE_KEY);
      if (saved) {
        if (saved.csvData) setCSVData(saved.csvData);
        if (saved.templateHTML) setTemplateHTML(saved.templateHTML);
        if (saved.templateFields) setTemplateFields(saved.templateFields);
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
        templateFields,
        generatedLetters
      });
    }
  }, [csvData, templateHTML, templateFields, generatedLetters]);
  
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
      toast.error(`Template upload error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };
  
  // Generate Dak number
  const generateDakNumber = async (): Promise<string> => {
    const dakData = await loadData(DAK_STORAGE_KEY);
    const records = dakData?.records || [];
    
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    
    // Find the last number for today
    const todayPrefix = `${year}${month}${day}`;
    const todayRecords = records.filter((r: any) => r.dakNumber.startsWith(todayPrefix));
    const lastNumber = todayRecords.length > 0 
      ? Math.max(...todayRecords.map((r: any) => parseInt(r.dakNumber.slice(-4))))
      : 0;
    
    const newNumber = String(lastNumber + 1).padStart(4, "0");
    return `${todayPrefix}${newNumber}`;
  };
  
  // Save Dak record
  const saveDakRecord = async (dakNumber: string, subject: string) => {
    const dakData = await loadData(DAK_STORAGE_KEY);
    const records = dakData?.records || [];
    
    const newRecord = {
      id: Date.now(),
      dakNumber,
      date: new Date().toLocaleDateString("en-IN"),
      subject: subject || "Generated Letter",
      type: "Outward",
      status: "Pending"
    };
    
    records.push(newRecord);
    await saveData(DAK_STORAGE_KEY, { ...dakData, records });
  };
  
  // Generate letters
  const handleGenerateLetters = async () => {
    if (!csvData || !templateHTML) {
      toast.error("Please upload both CSV and template");
      return;
    }
    
    const letters: GeneratedLetter[] = [];
    
    for (const row of csvData.rows) {
      const dakNumber = await generateDakNumber();
      const date = new Date().toLocaleDateString("en-IN");
      
      // Replace placeholders in template
      let content = templateHTML;
      content = content.replace(/\{\{DakNumber\}\}/g, dakNumber);
      content = content.replace(/\{\{Date\}\}/g, date);
      
      // Replace CSV field placeholders
      templateFields.forEach(field => {
        if (field.csvHeader) {
          const value = row[field.csvHeader] || "";
          content = content.replace(new RegExp(`\\{\\{${field.placeholder}\\}\\}`, "g"), value);
        }
      });
      
      letters.push({
        id: `${Date.now()}-${Math.random()}`,
        dakNumber,
        date,
        content,
        data: row
      });
      
      // Save to Dak Number Generator
      await saveDakRecord(dakNumber, row[csvData.headers[0]] || "Generated Letter");
    }
    
    setGeneratedLetters(letters);
    setCurrentStep("preview");
    toast.success(`${letters.length} letters generated successfully`);
  };
  
  // Add field to template
  const handleAddField = (csvHeader: string) => {
    const placeholder = csvHeader.replace(/\s+/g, "_");
    const newField: TemplateField = {
      id: `field-${Date.now()}`,
      placeholder,
      csvHeader,
      x: 0,
      y: 0
    };
    setTemplateFields([...templateFields, newField]);
    
    // Insert placeholder into template
    setTemplateHTML(prev => prev + `<p>{{${placeholder}}}</p>`);
    toast.success(`Field "${csvHeader}" added to template`);
  };
  
  // Save template
  const handleSaveTemplate = () => {
    if (!templateHTML) {
      toast.error("No template to save");
      return;
    }
    
    toast.success("Template saved successfully");
    setCurrentStep("preview");
  };
  
  // Download letter
  const handleDownloadLetter = (letter: GeneratedLetter) => {
    const blob = new Blob([letter.content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Letter_${letter.dakNumber}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Letter downloaded");
  };
  
  // Clear all data
  const handleClearAll = async () => {
    if (confirm("Are you sure you want to clear all data?")) {
      setCSVData(null);
      setTemplateHTML("");
      setTemplateFields([]);
      setGeneratedLetters([]);
      await saveData(STORAGE_KEY, null);
      setCurrentStep("upload");
      toast.success("All data cleared");
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <header 
        className="w-full py-2 px-6"
        style={{ 
          background: "linear-gradient(to right, #d4007f, #4e1a74)",
          height: '101px',
          paddingTop: '0px'
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate("/")}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Back to home"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <img 
              src="/images/sbi-logo-white.png" 
              alt="SBI Logo" 
              className="h-28 w-auto object-contain"
            />
            <div className="text-white">
              <h1 className="font-bold" style={{ fontSize: "1.3rem" }}>
                State Bank of India
              </h1>
              <p className="opacity-90" style={{ fontSize: "0.85rem" }}>
                {branchName}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-purple-900 mb-2">Letter & Notice Generator</h2>
          <p className="text-gray-600">Upload CSV data and template to generate personalized letters with automatic Dak numbers</p>
        </div>
        
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-4 mb-8">
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
          <div className={`flex items-center gap-2 ${currentStep === "preview" ? "text-purple-700 font-semibold" : "text-gray-400"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === "preview" ? "bg-purple-700 text-white" : "bg-gray-300"}`}>3</div>
            <span>Generate & Download</span>
          </div>
        </div>
        
        {/* Step 1: Upload */}
        {currentStep === "upload" && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload CSV Data
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Upload a CSV file containing the data for your letters. The first row should contain column headers.
              </p>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                className="hidden"
              />
              <Button
                onClick={() => csvInputRef.current?.click()}
                className="w-full"
                variant={csvData ? "outline" : "default"}
              >
                <Upload className="w-4 h-4 mr-2" />
                {csvData ? "Change CSV File" : "Upload CSV File"}
              </Button>
              
              {csvData && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="font-semibold text-green-800 mb-2">✓ CSV Loaded</p>
                  <p className="text-sm text-gray-700">Records: {csvData.rows.length}</p>
                  <p className="text-sm text-gray-700">Headers: {csvData.headers.join(", ")}</p>
                </div>
              )}
            </Card>
            
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Upload Template
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Upload a .doc or .docx file containing your letter template. You'll be able to add placeholders in the next step.
              </p>
              <input
                ref={docxInputRef}
                type="file"
                accept=".doc,.docx"
                onChange={handleDOCXUpload}
                className="hidden"
              />
              <Button
                onClick={() => docxInputRef.current?.click()}
                className="w-full"
                variant={templateHTML ? "outline" : "default"}
              >
                <Upload className="w-4 h-4 mr-2" />
                {templateHTML ? "Change Template" : "Upload Template"}
              </Button>
              
              {templateHTML && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="font-semibold text-green-800">✓ Template Loaded</p>
                  <p className="text-sm text-gray-700 mt-2">Preview:</p>
                  <div 
                    className="mt-2 p-2 bg-white border rounded text-xs max-h-32 overflow-auto"
                    dangerouslySetInnerHTML={{ __html: templateHTML.substring(0, 200) + "..." }}
                  />
                </div>
              )}
            </Card>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="mt-6 flex gap-4 justify-center">
          {currentStep === "upload" && csvData && templateHTML && (
            <Button onClick={() => setCurrentStep("editor")} size="lg">
              Continue to Template Editor
            </Button>
          )}
          
          {currentStep === "editor" && (
            <>
              <Button onClick={() => setCurrentStep("upload")} variant="outline">
                Back to Upload
              </Button>
              <Button onClick={handleSaveTemplate} className="gap-2">
                <Save className="w-4 h-4" />
                Save Template
              </Button>
              <Button onClick={handleGenerateLetters} className="gap-2">
                <CheckCircle className="w-4 h-4" />
                Generate Letters
              </Button>
            </>
          )}
          
          {currentStep === "preview" && (
            <>
              <Button onClick={() => setCurrentStep("editor")} variant="outline">
                Back to Editor
              </Button>
              <Button onClick={handleClearAll} variant="destructive" className="gap-2">
                <Trash2 className="w-4 h-4" />
                Clear All
              </Button>
            </>
          )}
        </div>
        
        {/* Step 2: Template Editor */}
        {currentStep === "editor" && csvData && (
          <div className="mt-8 grid md:grid-cols-3 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Available Fields</h3>
              <p className="text-sm text-gray-600 mb-4">Click to add fields to your template:</p>
              <div className="space-y-2">
                <Button 
                  onClick={() => handleAddField("DakNumber")}
                  variant="outline"
                  className="w-full justify-start"
                  size="sm"
                >
                  + Dak Number
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
              <h3 className="text-lg font-semibold mb-4">Template Preview</h3>
              <div 
                className="p-4 bg-white border rounded min-h-96 prose max-w-none"
                dangerouslySetInnerHTML={{ __html: templateHTML }}
              />
            </Card>
          </div>
        )}
        
        {/* Step 3: Preview & Download */}
        {currentStep === "preview" && generatedLetters.length > 0 && (
          <div className="mt-8">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Generated Letters ({generatedLetters.length})</h3>
              <div className="space-y-4">
                {generatedLetters.map(letter => (
                  <div key={letter.id} className="border rounded-lg p-4 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-semibold">Dak Number: {letter.dakNumber}</p>
                        <p className="text-sm text-gray-600">Date: {letter.date}</p>
                      </div>
                      <Button onClick={() => handleDownloadLetter(letter)} size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                    <div 
                      className="mt-2 p-3 bg-gray-50 rounded text-sm max-h-40 overflow-auto prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: letter.content }}
                    />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
