import React, { useState, useEffect } from 'react';
import { getAllRecords, getRecordsByIndex, getRecord, STORES } from '@/lib/portfolioDb';
import { formatINR } from '@/lib/portfolioTransform';
import { 
  FileText, 
  Users, 
  PlusCircle, 
  Layers, 
  BarChart2, 
  Search, 
  Calendar, 
  User, 
  Building, 
  MapPin, 
  Mail, 
  Briefcase, 
  Activity, 
  TrendingUp, 
  AlertTriangle, 
  CheckSquare, 
  Sparkles, 
  Copy, 
  Share2, 
  Trash2, 
  Check, 
  X, 
  ChevronRight, 
  Filter, 
  ThumbsUp, 
  Clock, 
  Eye,
  RefreshCw,
  Zap,
  IndianRupee,
  Phone,
  Store,
  UserCheck,
  Printer,
  Edit,
  Home,
  Download
} from 'lucide-react';
import { Link } from 'wouter';
import { sbiLogoUrl } from '@/lib/assets';
import { useBranch } from '@/contexts/BranchContext';
import { Button } from '@/components/ui/button';
import * as XLSX from 'xlsx';


// ==========================================
// MOCK DATA: INDIAN BANKING CONTEXT
// ==========================================
const generateReferenceNo = (visitDate, existingReports) => {
  if (!visitDate) return `UNKNOWN-${Date.now()}`;
  const dateStr = visitDate.replace(/-/g, '');
  const sameDayReports = existingReports.filter(r => r.referenceNo && r.referenceNo.startsWith(dateStr));
  const maxSeq = sameDayReports.reduce((max, r) => {
    const seq = parseInt(r.referenceNo.slice(8), 10);
    return isNaN(seq) ? max : Math.max(max, seq);
  }, 0);
  const nextSeq = String(maxSeq + 1).padStart(3, '0');
  return `${dateStr}${nextSeq}`;
};

const INITIAL_REPORTS = [
  {
    id: "rep-1",
    referenceNo: "20260601001",
    visitDate: "2026-06-01",
    companyName: "Sharma Enterprises",
    customerMobile: "9876543210",
    customerAddress: "Andheri East Industrial Estate, Mumbai",
    customerCIF: "",
    visitorName: "Rajesh Kumar (Official - SME)",
    visitPlace: "Customer Office, Andheri East",
    contacts: [
      { name: "Anil Sharma", role: "Managing Director", mobile: "9876543210" },
      { name: "Priya Desai", role: "Chief Accountant", mobile: "9876543211" }
    ],
    prospectiveData: {
      productPitched: "Working Capital / OD Limit",
      dealSize: "25000000",
      existingBanker: "HDFC Bank, ICICI Bank",
      decisionMakerMet: "Yes",
      pastSbiRelationship: "No",
      keyPainPoints: "High interest rate on current OD limit with HDFC. Need better FX conversion rates for their raw material imports from China."
    },
    discussionNotes: "Met with Anil Ji to discuss migrating their primary Current Account and an enhanced Working Capital / OD Limit of ₹2.5 Cr. He is interested in our Trade Forex pricing. Priya asked about API integration with Tally Prime for bulk payout processing.",
    actionItems: [
      { id: "act-1-1", task: "Share customized OD Limit proposal and Forex margin matrix", owner: "Rajesh Kumar", deadline: "2026-06-08", completed: true },
      { id: "act-1-2", task: "Arrange a call with the CMS Tech Team regarding Tally API", owner: "Rajesh Kumar", deadline: "2026-06-12", completed: false }
    ],
    createdAt: "2026-06-01T16:30:00.000Z"
  },
  {
    id: "rep-2",
    referenceNo: "20260603001",
    visitDate: "2026-06-03",
    companyName: "Dr. Ramesh Gupta (HNI)",
    customerMobile: "9123456789",
    customerAddress: "Banjara Hills, Hyderabad",
    customerCIF: "12345678",
    visitorName: "Sneha Patel (Official - Wealth)",
    visitPlace: "Customer Residence, Banjara Hills",
    contacts: [
      { name: "Dr. Ramesh Gupta", role: "Account Holder", mobile: "9123456789" }
    ],
    prospectiveData: {
      productPitched: "Equity Mutual Funds (Flexi-Cap NFO)",
      dealSize: "5000000",
      existingBanker: "",
      decisionMakerMet: "Yes",
      pastSbiRelationship: "",
      keyPainPoints: "Looking to diversify ₹50 Lakhs into Equity Mutual Funds due to recent tax changes."
    },
    discussionNotes: "Quarterly portfolio review. Dr. Gupta is satisfied with his current FD yields but is looking to diversify ₹50 Lakhs into Equity Mutual Funds due to recent tax changes. Highlighted the new Flexi-Cap NFO we are distributing.",
    actionItems: [
      { id: "act-2-1", task: "Send NFO product brochure and historical return comparisons", owner: "Sneha Patel", deadline: "2026-06-05", completed: true },
      { id: "act-2-2", task: "Schedule branch visit for KYC updation for demat account", owner: "Branch Operations", deadline: "2026-06-10", completed: false }
    ],
    createdAt: "2026-06-03T11:15:00.000Z"
  }
];

const INITIAL_WALKINS = [
  {
    id: "walkin-1",
    timestamp: "2026-06-06T09:15:00.000Z",
    name: "Vikash Singh",
    phone: "+91 98765 43210",
    purpose: "Personal Loan",
    assignedTo: "Amit Verma",
    status: "In Progress",
    notes: "Looking for a ₹5L personal loan for home renovation. Provided CIBIL consent.",
    expectedValue: "500000"
  },
  {
    id: "walkin-2",
    timestamp: "2026-06-06T14:30:00.000Z",
    name: "Meera Reddy",
    phone: "+91 91234 56789",
    purpose: "New Savings Account",
    assignedTo: "Pending",
    status: "New Lead",
    notes: "Wants to open a joint savings account. Has PAN and Aadhaar ready.",
    expectedValue: "25000"
  }
];

export default function App() {
  const { branchName, branchCode } = useBranch();
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const [reports, setReports] = useState(() => {
    const saved = localStorage.getItem('bank_visit_reports');
    return saved ? JSON.parse(saved) : INITIAL_REPORTS;
  });

  const [walkins, setWalkins] = useState(() => {
    const saved = localStorage.getItem('bank_walkin_leads');
    return saved ? JSON.parse(saved) : INITIAL_WALKINS;
  });

  const [activeTab, setActiveTab] = useState('walkin'); // 'walkin' | 'new_visit' | 'dashboard' | 'insights'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); 
  const [selectedReport, setSelectedReport] = useState(null);
  const [editingReportId, setEditingReportId] = useState(null);
  const [notification, setNotification] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Gemini state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiOutput, setAiOutput] = useState(null);
  const [aiOutputTab, setAiOutputTab] = useState('email');

  // New Visit Report Form State
  const initialFormState = {
    visitDate: new Date().toISOString().split('T')[0],
    companyName: '',
    customerMobile: '',
    customerAddress: '',
    customerCIF: '',
    visitorName: '',
    visitPlace: '',
    contacts: [{ name: '', role: '', mobile: '' }],
    prospectiveData: {
      productPitched: '',
      dealSize: '',
      existingBanker: '',
      decisionMakerMet: '',
      pastSbiRelationship: '',
      keyPainPoints: ''
    },
    discussionNotes: '',
    actionItems: [{ id: '1', task: '', owner: '', deadline: '', completed: false }]
  };
  const [formData, setFormData] = useState(initialFormState);

  // Customer Search State
  const [searchMode, setSearchMode] = useState('cif');
  const [cifMobileSearchTerm, setCifMobileSearchTerm] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [bankingRelationship, setBankingRelationship] = useState(null);

  // Walk-in Form State
  const initialWalkinState = {
    name: '',
    phone: '',
    purpose: 'New Savings Account',
    notes: '',
    expectedValue: ''
  };
  const [walkinForm, setWalkinForm] = useState(initialWalkinState);

  // Sync state with LocalStorage
  useEffect(() => {
    localStorage.setItem('bank_visit_reports', JSON.stringify(reports));
  }, [reports]);

  useEffect(() => {
    localStorage.setItem('bank_walkin_leads', JSON.stringify(walkins));
  }, [walkins]);

  // Toast notification helper
  const triggerNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // ==========================================
  // WALK-IN HANDLERS
  // ==========================================
  const handleWalkinSubmit = (e) => {
    e.preventDefault();
    if (!walkinForm.name.trim() || !walkinForm.phone.trim()) {
      return triggerNotification("Name and Phone are required", "error");
    }

    const newWalkin = {
      ...walkinForm,
      id: "walkin-" + Date.now(),
      timestamp: new Date().toISOString(),
      assignedTo: "Pending",
      status: "New Lead"
    };

    setWalkins([newWalkin, ...walkins]);
    setWalkinForm(initialWalkinState);
    triggerNotification("Walk-in lead registered successfully!");
  };

  const updateWalkinStatus = (id, newStatus, newAssignee = null) => {
    const updated = walkins.map(w => {
      if (w.id === id) {
        return { 
          ...w, 
          status: newStatus, 
          ...(newAssignee && { assignedTo: newAssignee }) 
        };
      }
      return w;
    });
    setWalkins(updated);
    triggerNotification(`Lead marked as ${newStatus}`);
  };

  const deleteWalkin = (id) => {
    setConfirmModal({
      isOpen: true,
      title: "Remove Walk-in Lead",
      message: "Are you sure you want to remove this walk-in lead from the queue? This action cannot be undone.",
      onConfirm: () => {
        setWalkins(prev => prev.filter(w => w.id !== id));
        triggerNotification("Walk-in removed");
      }
    });
  };

  // ==========================================
  // VISIT REPORT FORM HANDLERS
  // ==========================================
  const resetSearchState = () => {
    setCifMobileSearchTerm('');
    setSearchPerformed(false);
    setSearchResult(null);
    setBankingRelationship(null);
    setSearchMode('cif');
  };

  const searchCustomer = async () => {
    const term = cifMobileSearchTerm.trim();
    if (!term) return;
    setSearchLoading(true);
    setSearchPerformed(true);
    try {
      let customer = null;
      if (searchMode === 'cif') {
        customer = await getRecord(STORES.CUSTOMER_DIM, term);
      } else {
        const allCustomers = await getAllRecords(STORES.CUSTOMER_DIM);
        customer = allCustomers.find(c => (c.MobileNo || '').replace(/\s/g, '') === term);
      }

      if (customer) {
        setSearchResult(customer);
        const addr = [customer.Add1, customer.Add2, customer.Add3].filter(Boolean).join(', ');
        setFormData(prev => ({
          ...prev,
          companyName: customer.CustName || '',
          customerMobile: customer.MobileNo || '',
          customerAddress: addr,
          customerCIF: customer.CIF || '',
        }));

        const [deposits, loans, ccod] = await Promise.all([
          getRecordsByIndex(STORES.DEPOSIT_DATA, 'CIF', customer.CIF),
          getRecordsByIndex(STORES.LOAN_DATA, 'CIF', customer.CIF),
          getRecordsByIndex(STORES.CCOD_DATA, 'CIF', customer.CIF),
        ]);
        const depositTotal = deposits.reduce((s, d) => s + (d.CurrentBalance || 0), 0);
        const loanOutstanding = loans.reduce((s, l) => s + Math.abs(l.OUTSTAND || 0), 0);
        const ccodExposure = ccod.reduce((s, c) => s + Math.max(Math.abs(c.CurrentBalance || 0), Math.abs(c.LIMIT || 0)), 0);
        setBankingRelationship({
          depositCount: deposits.length,
          depositTotal,
          loanCount: loans.length,
          loanOutstanding,
          ccodCount: ccod.length,
          ccodExposure,
          totalExposure: loanOutstanding + ccodExposure
        });
      } else {
        setSearchResult(null);
        setBankingRelationship(null);
      }
    } catch (err) {
      console.error('Customer search failed:', err);
      setSearchResult(null);
      setBankingRelationship(null);
    }
    setSearchLoading(false);
  };

  const handleInputChange = (field, value, section = null) => {
    if (section) {
      setFormData(prev => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleContactChange = (index, field, value) => {
    const updatedContacts = [...formData.contacts];
    updatedContacts[index][field] = value;
    setFormData(prev => ({ ...prev, contacts: updatedContacts }));
  };

  const addContactRow = () => setFormData(prev => ({ ...prev, contacts: [...prev.contacts, { name: '', role: '', mobile: '' }] }));
  const removeContactRow = (index) => {
    if (formData.contacts.length === 1) return;
    setFormData(prev => ({ ...prev, contacts: formData.contacts.filter((_, i) => i !== index) }));
  };

  const handleActionItemChange = (index, field, value) => {
    const updatedActions = [...formData.actionItems];
    updatedActions[index][field] = value;
    setFormData(prev => ({ ...prev, actionItems: updatedActions }));
  };

  const addActionItemRow = () => setFormData(prev => ({ ...prev, actionItems: [...prev.actionItems, { id: Date.now().toString(), task: '', owner: '', deadline: '', completed: false }] }));
  const removeActionItemRow = (index) => {
    if (formData.actionItems.length === 1) return;
    setFormData(prev => ({ ...prev, actionItems: formData.actionItems.filter((_, i) => i !== index) }));
  };

  const handleSelectReport = async (report) => {
    setSelectedReport(report);
    setAiOutput(null);
    if (report.customerCIF && !report.bankingRelationship) {
      try {
        const [deposits, loans, ccod] = await Promise.all([
          getRecordsByIndex(STORES.DEPOSIT_DATA, 'CIF', report.customerCIF),
          getRecordsByIndex(STORES.LOAN_DATA, 'CIF', report.customerCIF),
          getRecordsByIndex(STORES.CCOD_DATA, 'CIF', report.customerCIF),
        ]);
        const depositTotal = deposits.reduce((s, d) => s + (d.CurrentBalance || 0), 0);
        const loanOutstanding = loans.reduce((s, l) => s + Math.abs(l.OUTSTAND || 0), 0);
        const ccodExposure = ccod.reduce((s, c) => s + Math.max(Math.abs(c.CurrentBalance || 0), Math.abs(c.LIMIT || 0)), 0);
        
        const relationship = {
          depositCount: deposits.length,
          depositTotal,
          loanCount: loans.length,
          loanOutstanding,
          ccodCount: ccod.length,
          ccodExposure,
          totalExposure: loanOutstanding + ccodExposure
        };
        
        const updatedReport = { ...report, bankingRelationship: relationship };
        setReports(prev => prev.map(r => r.id === report.id ? updatedReport : r));
        setSelectedReport(updatedReport);
      } catch (err) {
        console.error("Failed to load banking relationship dynamically:", err);
      }
    }
  };

  const handleEditReport = async (report) => {
    setEditingReportId(report.id);
    const copiedReport = JSON.parse(JSON.stringify(report));
    setFormData(copiedReport);
    
    // Set search and customer details states so the edit form displays everything correctly
    setSearchPerformed(true);
    if (copiedReport.customerCIF) {
      setSearchMode('cif');
      setCifMobileSearchTerm(copiedReport.customerCIF);
      setSearchResult({ CIF: copiedReport.customerCIF, CustName: copiedReport.companyName });
      
      if (copiedReport.bankingRelationship) {
        setBankingRelationship(copiedReport.bankingRelationship);
      } else {
        // Fallback: fetch from IndexedDB dynamically if not stored in report
        try {
          const [deposits, loans, ccod] = await Promise.all([
            getRecordsByIndex(STORES.DEPOSIT_DATA, 'CIF', copiedReport.customerCIF),
            getRecordsByIndex(STORES.LOAN_DATA, 'CIF', copiedReport.customerCIF),
            getRecordsByIndex(STORES.CCOD_DATA, 'CIF', copiedReport.customerCIF),
          ]);
          const depositTotal = deposits.reduce((s, d) => s + (d.CurrentBalance || 0), 0);
          const loanOutstanding = loans.reduce((s, l) => s + Math.abs(l.OUTSTAND || 0), 0);
          const ccodExposure = ccod.reduce((s, c) => s + Math.max(Math.abs(c.CurrentBalance || 0), Math.abs(c.LIMIT || 0)), 0);
          const rel = {
            depositCount: deposits.length,
            depositTotal,
            loanCount: loans.length,
            loanOutstanding,
            ccodCount: ccod.length,
            ccodExposure,
            totalExposure: loanOutstanding + ccodExposure
          };
          setBankingRelationship(rel);
          copiedReport.bankingRelationship = rel;
          setFormData(copiedReport);
        } catch (err) {
          setBankingRelationship(null);
        }
      }
    } else {
      setSearchMode('mobile');
      setCifMobileSearchTerm(copiedReport.customerMobile || '');
      setSearchResult(null);
      setBankingRelationship(null);
    }
    
    setActiveTab('new_visit');
  };

  const handleSubmitReport = (e) => {
    e.preventDefault();
    if (!formData.companyName.trim()) return triggerNotification("Customer Name is required", "error");
    if (!formData.visitorName.trim()) return triggerNotification("Visiting Official is required", "error");
    if (!formData.discussionNotes.trim()) return triggerNotification("Discussion notes cannot be empty", "error");

    const cleanedContacts = formData.contacts.filter(c => c.name.trim() !== '');
    const cleanedActions = formData.actionItems.filter(a => a.task.trim() !== '');

    const finalReport = {
      ...formData,
      bankingRelationship: bankingRelationship, // Save the bankingRelationship details inside the report!
      id: editingReportId || "rep-" + Date.now(),
      referenceNo: editingReportId ? formData.referenceNo : generateReferenceNo(formData.visitDate, reports),
      contacts: cleanedContacts.length > 0 ? cleanedContacts : [{ name: 'N/A', role: 'N/A', mobile: 'N/A' }],
      actionItems: cleanedActions,
      createdAt: editingReportId ? formData.createdAt : new Date().toISOString()
    };

    if (editingReportId) {
      setReports(reports.map(r => r.id === editingReportId ? finalReport : r));
      if (selectedReport?.id === editingReportId) {
        setSelectedReport(finalReport);
      }
      triggerNotification("Visit report updated successfully!");
    } else {
      setReports([finalReport, ...reports]);
      triggerNotification("Visit report logged successfully!");
    }
    
    setFormData(initialFormState);
    setEditingReportId(null);
    resetSearchState();
    setActiveTab('dashboard');
  };

  const toggleActionComplete = (reportId, actionId) => {
    const updatedReports = reports.map(r => {
      if (r.id === reportId) {
        return { ...r, actionItems: r.actionItems.map(a => a.id === actionId ? { ...a, completed: !a.completed } : a) };
      }
      return r;
    });
    setReports(updatedReports);
    if (selectedReport?.id === reportId) {
      setSelectedReport(prev => ({ ...prev, actionItems: prev.actionItems.map(a => a.id === actionId ? { ...a, completed: !a.completed } : a) }));
    }
  };

  const handleDeleteReport = (id) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Visit Report",
      message: "Are you sure you want to permanently delete this customer visit report? This action cannot be undone.",
      onConfirm: () => {
        setReports(prev => prev.filter(r => r.id !== id));
        setSelectedReport(null);
        setAiOutput(null);
        triggerNotification("Report deleted", "error");
      }
    });
  };

  const handleCopyReportToClipboard = (report) => {
    const summaryText = `
CUSTOMER VISIT REPORT: ${report.companyName.toUpperCase()}
Date: ${report.visitDate}
Visiting Official: ${report.visitorName}
Place: ${report.visitPlace || 'N/A'}
${report.customerCIF ? `CIF: ${report.customerCIF}` : ''}

CONTACTS MET:
${report.contacts.map(c => `- ${c.name} (${c.role}) - ${c.mobile || 'N/A'}`).join('\n')}

PROSPECTIVE BUSINESS:
- Product Pitched: ${report.prospectiveData.productPitched || 'N/A'}
- Expected Business Value: ₹${Number(report.prospectiveData.dealSize || 0).toLocaleString('en-IN')}
- Existing Banker: ${report.prospectiveData.existingBanker || 'None'}
- Decision Maker Present: ${report.prospectiveData.decisionMakerMet || 'N/A'}
- Customer Requirements: ${report.prospectiveData.keyPainPoints || 'N/A'}

DISCUSSION SUMMARY:
${report.discussionNotes}

ACTION ITEMS:
${report.actionItems.map(a => `- [${a.completed ? 'X' : ' '}] ${a.task} (Owner: ${a.owner}, Due: ${a.deadline || 'N/A'})`).join('\n')}
    `;

    const textArea = document.createElement("textarea");
    textArea.value = summaryText.trim();
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      triggerNotification("Report details copied to clipboard!");
    } catch (err) {
      triggerNotification("Could not copy. Please select and copy manually.", "error");
    }
    document.body.removeChild(textArea);
  };

  const handleDownloadExcel = () => {
    try {
      const title = `State Bank of India ${branchName || ''} (${branchCode || ''})`;
      
      const headers = [
        "Reference No.",
        "Date of Visit",
        "Name of Customer",
        "Mobile Number",
        "CIF Number, if existing relationship",
        "Place of Visit",
        "Product Pitched",
        "Prospective Value",
        "Discussion Minutes",
        "Additional Remarks"
      ];

      const sortedReports = [...reports].sort((a, b) => {
        const refA = a.referenceNo || a.id || '';
        const refB = b.referenceNo || b.id || '';
        return refA.localeCompare(refB);
      });

      const dataRows = sortedReports.map((report) => {
        const additionalRemarks = report.actionItems && report.actionItems.length > 0 
          ? report.actionItems.map(a => `${a.task}${a.owner ? ` (Owner: ${a.owner})` : ''}`).join('; ')
          : '';

        return [
          report.referenceNo || report.id.split('-')[1] || '',
          report.visitDate || '',
          report.companyName || '',
          report.customerMobile || '',
          report.customerCIF || '',
          report.visitPlace || '',
          report.prospectiveData?.productPitched || '',
          report.prospectiveData?.dealSize ? Number(report.prospectiveData.dealSize) : '',
          report.discussionNotes || '',
          additionalRemarks
        ];
      });

      const aoaData = [
        [title, "", "", "", "", "", "", "", "", ""],
        headers,
        ...dataRows
      ];

      const ws = XLSX.utils.aoa_to_sheet(aoaData);

      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Visit Register");

      XLSX.writeFile(wb, `Visit_Log_Book_Register_${branchCode || 'export'}.xlsx`);
      triggerNotification("Visit Log Book downloaded successfully as Excel!");
    } catch (error) {
      console.error("Error exporting excel:", error);
      triggerNotification("Failed to export Excel sheet", "error");
    }
  };

  // ==========================================
  // GEMINI AI ASSISTANT
  // ==========================================
  const generateAIAssistance = async (report) => {
    setAiLoading(true);
    setAiOutput(null);

    const apiKey = ""; 
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    const reportDetails = JSON.stringify(report, null, 2);

    const systemPrompt = "You are an elite Branch Manager and Senior Official at an Indian Bank. Draft professional business follow-ups and intelligence summaries from customer site visits. Write with clarity, warmth, and action-driven structure. Assume amounts are in INR (Rupees).";
    
    const userPrompt = `
      Analyze the Customer Visit Report and generate TWO options. Mark them clearly with [EMAIL_START] and [SUMMARY_START] delimiters.
      
      Option 1: A professional Follow-Up Email.
      - Make the tone warm, precise, and appreciative.
      - Recap primary banking pain points addressed (loans, deposits, forex, etc.).
      - Clearly outline assigned action items.
      - Ready to send to ${report.contacts[0]?.name || 'the customer'} from ${report.visitorName}.

      Option 2: An Internal Branch Summary.
      - A 3-bullet point executive digest of the meeting emphasizing business opportunities (CASA, Loans, Fee Income).
      - Strategic next steps to secure business.

      Report Data:
      ${reportDetails}
    `;

    const payload = { contents: [{ parts: [{ text: userPrompt }] }], systemInstruction: { parts: [{ text: systemPrompt }] } };

    const maxRetries = 5;
    let delay = 1000;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`HTTP Error Status: ${response.status}`);
        
        const data = await response.json();
        const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (textOutput) {
          let emailPart = textOutput;
          let summaryPart = textOutput;

          if (textOutput.includes('[EMAIL_START]') || textOutput.includes('[SUMMARY_START]')) {
            const emailRegex = /\[EMAIL_START\]([\s\S]*?)(?=\[SUMMARY_START\]|$)/;
            const summaryRegex = /\[SUMMARY_START\]([\s\S]*?)$/;
            const emailMatch = textOutput.match(emailRegex);
            const summaryMatch = textOutput.match(summaryRegex);
            emailPart = emailMatch ? emailMatch[1].trim() : textOutput;
            summaryPart = summaryMatch ? summaryMatch[1].trim() : "Internal summary could not be cleanly separated.";
          } else {
            const splitIndex = textOutput.indexOf("Option 2");
            if (splitIndex !== -1) {
              emailPart = textOutput.substring(0, splitIndex).replace("Option 1:", "").trim();
              summaryPart = textOutput.substring(splitIndex).replace("Option 2:", "").trim();
            }
          }

          setAiOutput({ email: emailPart, summary: summaryPart });
          setAiLoading(false);
          triggerNotification("AI drafted content successfully!");
          return;
        } else {
          throw new Error("Empty response from AI");
        }
      } catch (err) {
        if (attempt === maxRetries - 1) {
          setAiLoading(false);
          triggerNotification("AI service unavailable. Please try again later.", "error");
          return;
        }
        await new Promise(res => setTimeout(res, delay));
        delay *= 2;
      }
    }
  };

  // ==========================================
  // METRICS (INSIGHTS)
  // ==========================================
  const totalVisits = reports.length;

  const totalPipelineValue = reports
    .reduce((sum, r) => sum + Number(r.prospectiveData?.dealSize || 0), 0);

  const activeLeads = walkins.filter(w => w.status === 'New Lead' || w.status === 'In Progress').length;
  const convertedLeads = walkins.filter(w => w.status === 'Converted').length;

  const prospectiveCount = reports.filter(r => !r.customerCIF).length;
  const existingCount = reports.filter(r => r.customerCIF).length;
  const upsellPotentialTotal = reports.filter(r => r.customerCIF)
    .reduce((sum, r) => sum + Number(r.prospectiveData?.dealSize || 0), 0);
  const averageHealthScore = reports.filter(r => r.customerCIF).length > 0 ? "4.5" : "N/A";

  const filteredReports = reports.filter(report => {
    const matchesSearch = 
      report.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.visitorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.discussionNotes.toLowerCase().includes(searchQuery.toLowerCase());
      
    let matchesType = true;
    if (filterType === 'prospective') {
      matchesType = !report.customerCIF;
    } else if (filterType === 'existing') {
      matchesType = !!report.customerCIF;
    }

    return matchesSearch && matchesType;
  });

  return (
    <div 
      className="min-h-screen flex flex-col text-slate-800"
      style={{ 
        backgroundColor: "#f7f4fb",
        fontFamily: "'Poppins', 'Effra', sans-serif"
      }}
    >
      {/* GLOBAL TOAST */}
      {notification && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-4 rounded-xl shadow-2xl flex items-center gap-3 border transition-all transform duration-300 translate-y-0 ${
          notification.type === 'error' ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
        }`}>
          {notification.type === 'error' ? <AlertTriangle className="h-5 w-5 text-rose-600" /> : <Check className="h-5 w-5 text-emerald-600" />}
          <span className="font-medium text-sm">{notification.message}</span>
        </div>
      )}

      {/* HEADER BANNER */}
      <header 
        className="w-full py-2 px-6 print:hidden"
        style={{ 
          background: "linear-gradient(to right, #d4007f, #4e1a74)",
          height: '101px',
          paddingTop: '0px'
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* SBI Logo */}
            <div className="flex-shrink-0">
              <img 
                src={sbiLogoUrl} 
                alt="State Bank of India" 
                className="h-28 w-auto"
                style={{ filter: "brightness(0) invert(1)" }}
              />
            </div>
            
            {/* Title and Branch Name */}
            <div className="flex flex-col justify-center">
              <h1 
                className="text-white font-semibold leading-tight"
                style={{ fontSize: "1.3rem" }}
              >
                Visit Log Book
              </h1>
              <p 
                className="text-white/90"
                style={{ fontSize: "0.85rem" }}
              >
                {branchName} ({branchCode})
              </p>
            </div>
          </div>

          <div>
            <Link href="/">
              <Button
                variant="outline"
                className="bg-white/20 hover:bg-white/30 text-white border-white/40 gap-2"
              >
                <Home className="w-4 h-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* TAB NAVIGATION CONTROLS */}
      <div className="w-full bg-white border-b border-gray-200 py-3 px-6 print:hidden shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => { setActiveTab('walkin'); setSelectedReport(null); }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'walkin' ? 'bg-[#4e1a74] text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Users className="h-4 w-4" />
            Branch Leads
            {activeLeads > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{activeLeads}</span>
            )}
          </button>
          <div className="w-px h-6 bg-gray-300 mx-1"></div>
          <button
            onClick={() => { setActiveTab('dashboard'); setSelectedReport(null); }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'dashboard' ? 'bg-[#4e1a74] text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <FileText className="h-4 w-4" /> Customer Visits
          </button>
          <button
            onClick={() => { setActiveTab('new_visit'); setSelectedReport(null); setEditingReportId(null); setFormData(initialFormState); resetSearchState(); }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'new_visit' ? 'bg-[#4e1a74] text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <PlusCircle className="h-4 w-4" /> Log Visit
          </button>
          <button
            onClick={() => { setActiveTab('insights'); setSelectedReport(null); }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'insights' ? 'bg-[#4e1a74] text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <BarChart2 className="h-4 w-4" /> Branch Analytics
          </button>
        </div>
      </div>


      {/* CORE CONTENT LAYOUT */}
      <main className="print:hidden flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 flex flex-col gap-6">
        
        {/* TAB: WALK-IN LEAD MANAGEMENT */}
        {activeTab === 'walkin' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* NEW WALK-IN FORM (4 COLS) */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden sticky top-28">
              <div className="bg-[#f7f4fb] p-5 border-b border-gray-200">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                  <UserCheck className="text-[#4e1a74] h-5 w-5" /> New Lead Entry
                </h2>
                <p className="text-[10px] text-slate-500 mt-1">Register walk-in sourcing and assign to Official for conversion.</p>
              </div>

              <form onSubmit={handleWalkinSubmit} className="p-5 space-y-4">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Customer Name *</label>
                  <input
                    type="text" required placeholder="e.g. Ramesh Kumar"
                    value={walkinForm.name} onChange={(e) => setWalkinForm({...walkinForm, name: e.target.value})}
                    className="w-full bg-white border border-gray-300 rounded-lg py-2.5 px-3 text-sm text-slate-800 focus:border-[#4e1a74] focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Mobile Number *</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="tel" required placeholder="+91"
                        value={walkinForm.phone} onChange={(e) => setWalkinForm({...walkinForm, phone: e.target.value})}
                        className="w-full bg-white border border-gray-300 rounded-lg py-2.5 pl-9 pr-3 text-sm text-slate-800 focus:border-[#4e1a74] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Product Interest</label>
                    <select
                      value={walkinForm.purpose} onChange={(e) => setWalkinForm({...walkinForm, purpose: e.target.value})}
                      className="w-full bg-white border border-gray-300 rounded-lg py-2.5 px-3 text-sm text-slate-800 focus:border-[#4e1a74] focus:outline-none"
                    >
                      <option>New Savings Account</option>
                      <option>Current / Business Account</option>
                      <option>Personal Loan</option>
                      <option>Home Loan</option>
                      <option>Credit Card Enquiry</option>
                      <option>Mutual Funds / Investments</option>
                      <option>Forex / Remittance</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Expected Value (₹)</label>
                    <input
                      type="number" placeholder="Optional"
                      value={walkinForm.expectedValue} onChange={(e) => setWalkinForm({...walkinForm, expectedValue: e.target.value})}
                      className="w-full bg-white border border-gray-300 rounded-lg py-2.5 px-3 text-sm text-slate-800 focus:border-[#4e1a74] focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Initial Requirements / Notes</label>
                  <textarea
                    rows={2} placeholder="Customer needs..."
                    value={walkinForm.notes} onChange={(e) => setWalkinForm({...walkinForm, notes: e.target.value})}
                    className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm text-slate-800 focus:border-[#4e1a74] focus:outline-none"
                  />
                </div>
                <button type="submit" className="w-full py-2.5 text-sm font-bold bg-[#4e1a74] hover:bg-[#4e1a74]/90 text-white rounded-lg shadow-md transition-all">
                  Log Branch Lead
                </button>
              </form>
            </div>

            {/* LEAD MANAGEMENT BOARD (8 COLS) */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* ACTIVE LEADS */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-5">
                <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[#4e1a74]" /> Active Walk-in Leads
                  </h3>
                  <span className="bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full font-semibold">{activeLeads} Active</span>
                </div>

                <div className="space-y-3">
                  {walkins.filter(w => w.status === 'New Lead' || w.status === 'In Progress').length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-4 text-center">No active leads currently in pipeline.</p>
                  ) : (
                    walkins.filter(w => w.status === 'New Lead' || w.status === 'In Progress').map(walkin => (
                      <div key={walkin.id} className="bg-gray-50/50 border border-gray-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
                        {walkin.status === 'New Lead' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500"></div>}
                        {walkin.status === 'In Progress' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>}
                        
                        <div className="flex-1 pl-2">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-slate-800 text-sm">{walkin.name}</span>
                            <span className="text-xs text-slate-500">• {walkin.phone}</span>
                            {walkin.expectedValue && (
                               <span className="ml-2 text-xs font-bold text-emerald-600">₹{Number(walkin.expectedValue).toLocaleString('en-IN')}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs mt-1">
                            <span className="bg-gray-100 text-slate-700 border border-gray-200 px-2 py-0.5 rounded font-medium">
                              {walkin.purpose}
                            </span>
                            <span className="text-slate-400 text-[10px]">Logged: {new Date(walkin.timestamp).toLocaleDateString()}</span>
                          </div>
                          {walkin.notes && <p className="text-xs text-slate-500 mt-2 font-serif italic">"{walkin.notes}"</p>}
                        </div>
                        
                        <div className="flex flex-col items-end gap-2 shrink-0 border-t border-gray-100 pt-3 md:border-0 md:pt-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Official:</span>
                            <input 
                              type="text" 
                              placeholder="Assign Official Name..." 
                              className="bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#4e1a74] w-40 text-right"
                              onBlur={(e) => updateWalkinStatus(walkin.id, walkin.status, e.target.value)}
                              defaultValue={walkin.assignedTo === 'Pending' ? '' : walkin.assignedTo}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <select 
                              value={walkin.status}
                              onChange={(e) => updateWalkinStatus(walkin.id, e.target.value)}
                              className={`text-xs font-bold px-2 py-1.5 rounded-lg border focus:outline-none ${walkin.status === 'New Lead' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}
                            >
                              <option value="New Lead">New Lead</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Converted">Converted ✅</option>
                              <option value="Dropped">Dropped ❌</option>
                            </select>
                            <button 
                              type="button"
                              onClick={(e) => { 
                                e.preventDefault(); 
                                e.stopPropagation(); 
                                deleteWalkin(walkin.id); 
                              }} 
                              className="text-rose-600 hover:text-rose-700 p-1.5 hover:bg-rose-50 rounded-lg"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* CLOSED LEADS */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-5 opacity-90">
                <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-emerald-600" /> Closed / Processed Leads
                  </h3>
                  <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full font-semibold">{convertedLeads} Converted</span>
                </div>

                <div className="space-y-2">
                  {walkins.filter(w => w.status === 'Converted' || w.status === 'Dropped').map(walkin => (
                    <div key={walkin.id} className="bg-gray-50/50 border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-700 text-xs">{walkin.name}</span>
                        <span className="text-[10px] text-slate-500 ml-2">({walkin.purpose})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-slate-500">Official: <span className="font-medium text-slate-700">{walkin.assignedTo}</span></span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${walkin.status === 'Converted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>{walkin.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {activeTab === 'new_visit' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden max-w-4xl mx-auto w-full">
            <div className="bg-[#f7f4fb] p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-[#4e1a74] flex items-center gap-2">
                <Briefcase className="text-[#4e1a74] h-5 w-5" /> {editingReportId ? 'Edit Customer Visit Report' : 'Customer Visit Report'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">Log external client meetings, business sourcing, and account reviews.</p>
            </div>

            <form onSubmit={handleSubmitReport} className="p-6 md:p-8 space-y-8">
              {/* CIF / MOBILE SEARCH */}
              <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-200 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                  <Search className="h-5 w-5 text-[#4e1a74]" />
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Search Customer</h3>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1 shrink-0">
                    <button type="button" onClick={() => { setSearchMode('cif'); setCifMobileSearchTerm(''); }}
                      className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${searchMode === 'cif' ? 'bg-[#4e1a74] text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
                      CIF Number
                    </button>
                    <button type="button" onClick={() => { setSearchMode('mobile'); setCifMobileSearchTerm(''); }}
                      className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${searchMode === 'mobile' ? 'bg-[#4e1a74] text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
                      Mobile Number
                    </button>
                  </div>
                  <div className="relative flex-1">
                    <input type="text" placeholder={searchMode === 'cif' ? 'Enter CIF Number...' : 'Enter 10-digit Mobile Number...'}
                      value={cifMobileSearchTerm} onChange={(e) => setCifMobileSearchTerm(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); searchCustomer(); } }}
                      className="w-full bg-white border border-gray-300 rounded-xl py-3 px-4 text-sm text-slate-800 placeholder-slate-400 focus:border-[#4e1a74] focus:ring-1 focus:ring-[#4e1a74] focus:outline-none"
                    />
                  </div>
                  <button type="button" onClick={searchCustomer} disabled={searchLoading || !cifMobileSearchTerm.trim()}
                    className="bg-[#4e1a74] text-white p-3 rounded-xl hover:bg-[#3a1157] disabled:opacity-50 transition-all shrink-0">
                    {searchLoading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* CUSTOMER DETAILS - Auto-populated on search match */}
              {searchPerformed && searchResult && (
                <div className="bg-green-50/70 p-5 rounded-2xl border border-green-200 space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-green-200">
                    <UserCheck className="h-5 w-5 text-green-700" />
                    <h3 className="text-sm font-bold text-green-800 uppercase tracking-wider">Customer Found</h3>
                    <span className="ml-auto text-xs font-mono text-green-600 bg-green-100 px-2 py-0.5 rounded-lg">CIF: {searchResult.CIF}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-green-700 mb-1">Customer Name</label>
                      <p className="text-sm font-semibold text-slate-800 bg-white rounded-lg px-3 py-2 border border-green-200">{formData.companyName || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-green-700 mb-1">Mobile Number</label>
                      <p className="text-sm text-slate-800 bg-white rounded-lg px-3 py-2 border border-green-200">{formData.customerMobile || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-green-700 mb-1">Address</label>
                      <p className="text-sm text-slate-800 bg-white rounded-lg px-3 py-2 border border-green-200 truncate" title={formData.customerAddress}>{formData.customerAddress || '-'}</p>
                    </div>
                  </div>
                  {/* Banking Relationship Summary */}
                  {bankingRelationship && (
                    <div className="mt-2">
                      <label className="block text-[10px] uppercase font-bold text-green-700 mb-2">Existing Banking Relationship</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-white rounded-xl p-3 border border-green-200 text-center">
                          <p className="text-[10px] uppercase font-semibold text-blue-600">Deposit Accounts</p>
                          <p className="text-lg font-bold text-slate-800">{bankingRelationship.depositCount}</p>
                          <p className="text-xs text-blue-600 font-medium">{formatINR(bankingRelationship.depositTotal)}</p>
                        </div>
                        <div className="bg-white rounded-xl p-3 border border-green-200 text-center">
                          <p className="text-[10px] uppercase font-semibold text-purple-600">Loan Accounts (TL)</p>
                          <p className="text-lg font-bold text-slate-800">{bankingRelationship.loanCount}</p>
                          <p className="text-xs text-purple-600 font-medium">{formatINR(bankingRelationship.loanOutstanding)}</p>
                        </div>
                        <div className="bg-white rounded-xl p-3 border border-green-200 text-center">
                          <p className="text-[10px] uppercase font-semibold text-emerald-600">CC/OD Accounts</p>
                          <p className="text-lg font-bold text-slate-800">{bankingRelationship.ccodCount}</p>
                          <p className="text-xs text-emerald-600 font-medium">{formatINR(bankingRelationship.ccodExposure)}</p>
                        </div>
                        <div className="bg-white rounded-xl p-3 border border-green-200 text-center">
                          <p className="text-[10px] uppercase font-semibold text-indigo-600">Total Loan Exposure</p>
                          <p className="text-lg font-bold text-indigo-700">{formatINR(bankingRelationship.totalExposure)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* CUSTOMER DETAILS - Manual entry when NOT found */}
              {searchPerformed && !searchResult && (
                <div className="bg-amber-50/70 p-5 rounded-2xl border border-amber-200 space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-amber-200">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wider">Customer Not Found — Enter Details Manually</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-amber-700 mb-1">Customer / Business Name *</label>
                      <div className="relative">
                        <Building className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <input type="text" required placeholder="e.g. Gupta Enterprises"
                          value={formData.companyName} onChange={(e) => handleInputChange('companyName', e.target.value)}
                          className="w-full bg-white border border-amber-300 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-[#4e1a74] focus:outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-amber-700 mb-1">Mobile Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <input type="tel" placeholder="e.g. 9876543210"
                          value={formData.customerMobile} onChange={(e) => handleInputChange('customerMobile', e.target.value)}
                          className="w-full bg-white border border-amber-300 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-[#4e1a74] focus:outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-amber-700 mb-1">Address</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <input type="text" placeholder="Customer address"
                          value={formData.customerAddress} onChange={(e) => handleInputChange('customerAddress', e.target.value)}
                          className="w-full bg-white border border-amber-300 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-[#4e1a74] focus:outline-none" />
                      </div>
                    </div>
                  </div>
                  <div className="bg-amber-100/60 rounded-xl px-4 py-3 border border-amber-200">
                    <p className="text-xs font-semibold text-amber-800 flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5" /> No existing banking relationship with the branch.
                    </p>
                  </div>
                </div>
              )}

              {/* VISIT DETAILS */}
              {searchPerformed && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">Date of Visit</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                      <input
                        type="date" value={formData.visitDate} onChange={(e) => handleInputChange('visitDate', e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-800 focus:border-[#4e1a74] focus:ring-1 focus:ring-[#4e1a74] focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">Place of Visit</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text" placeholder="e.g. Customer Office, Branch, Virtual"
                        value={formData.visitPlace} onChange={(e) => handleInputChange('visitPlace', e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-[#4e1a74] focus:ring-1 focus:ring-[#4e1a74] focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">Visiting Official *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text" required placeholder="e.g. Anil Sharma"
                        value={formData.visitorName} onChange={(e) => handleInputChange('visitorName', e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-[#4e1a74] focus:ring-1 focus:ring-[#4e1a74] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* PROSPECTIVE BUSINESS DETAILS */}
              {searchPerformed && (
                <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-200 space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                    <TrendingUp className="h-5 w-5 text-[#4e1a74]" />
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Prospective Business Detail</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-2">Product Pitched / Offered</label>
                      <input
                        type="text" placeholder="e.g. Home Loan, CC/OD, Term Loan"
                        value={formData.prospectiveData.productPitched} onChange={(e) => handleInputChange('productPitched', e.target.value, 'prospectiveData')}
                        className="w-full bg-white border border-gray-300 rounded-xl py-2.5 px-4 text-sm text-slate-800 focus:border-[#4e1a74] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-2">Amount of Prospective Business (₹)</label>
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <input
                          type="number" placeholder="e.g. 5000000"
                          value={formData.prospectiveData.dealSize} onChange={(e) => handleInputChange('dealSize', e.target.value, 'prospectiveData')}
                          className="w-full bg-white border border-gray-300 rounded-xl py-2.5 pl-9 pr-4 text-sm text-slate-800 focus:border-[#4e1a74] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-2">Existing Banker, if any</label>
                      <input
                        type="text" placeholder="e.g. HDFC Bank, ICICI Bank"
                        value={formData.prospectiveData.existingBanker} onChange={(e) => handleInputChange('existingBanker', e.target.value, 'prospectiveData')}
                        className="w-full bg-white border border-gray-300 rounded-xl py-2.5 px-4 text-sm text-slate-800 focus:border-[#4e1a74] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-2">Primary Decision Maker Met?</label>
                      <div className="flex items-center gap-4 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="decisionMakerMet" value="Yes" checked={formData.prospectiveData.decisionMakerMet === 'Yes'}
                            onChange={(e) => handleInputChange('decisionMakerMet', e.target.value, 'prospectiveData')}
                            className="w-4 h-4 text-[#4e1a74] border-gray-300 focus:ring-[#4e1a74]" />
                          <span className="text-sm font-medium text-slate-700">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="decisionMakerMet" value="No" checked={formData.prospectiveData.decisionMakerMet === 'No'}
                            onChange={(e) => handleInputChange('decisionMakerMet', e.target.value, 'prospectiveData')}
                            className="w-4 h-4 text-[#4e1a74] border-gray-300 focus:ring-[#4e1a74]" />
                          <span className="text-sm font-medium text-slate-700">No</span>
                        </label>
                      </div>
                    </div>

                    {!searchResult && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-2">Past Relationship with SBI?</label>
                      <div className="flex items-center gap-4 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="pastSbiRelationship" value="Yes" checked={formData.prospectiveData.pastSbiRelationship === 'Yes'}
                            onChange={(e) => handleInputChange('pastSbiRelationship', e.target.value, 'prospectiveData')}
                            className="w-4 h-4 text-[#4e1a74] border-gray-300 focus:ring-[#4e1a74]" />
                          <span className="text-sm font-medium text-slate-700">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="pastSbiRelationship" value="No" checked={formData.prospectiveData.pastSbiRelationship === 'No'}
                            onChange={(e) => handleInputChange('pastSbiRelationship', e.target.value, 'prospectiveData')}
                            className="w-4 h-4 text-[#4e1a74] border-gray-300 focus:ring-[#4e1a74]" />
                          <span className="text-sm font-medium text-slate-700">No</span>
                        </label>
                      </div>
                    </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-2">Customer Requirements / Primary Pain Points / Feedback</label>
                    <textarea
                      rows={3} placeholder="Customer requirements, pain points with existing banker, feedback on SBI products..."
                      value={formData.prospectiveData.keyPainPoints} onChange={(e) => handleInputChange('keyPainPoints', e.target.value, 'prospectiveData')}
                      className="w-full bg-white border border-gray-300 rounded-xl p-4 text-sm text-slate-800 focus:border-[#4e1a74] focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* CONTACTS MET LIST */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Users className="h-4 w-4 text-[#4e1a74]" /> Persons Met
                  </h3>
                  <button type="button" onClick={addContactRow} className="text-xs bg-white text-[#4e1a74] px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center gap-1 shadow-sm font-semibold">
                    <PlusCircle className="h-3.5 w-3.5" /> Add Contact
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.contacts.map((contact, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end bg-gray-50/50 p-4 rounded-xl border border-gray-200">
                      <div>
                        <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">Full Name</label>
                        <input type="text" required={index === 0} placeholder="Contact name" value={contact.name} onChange={(e) => handleContactChange(index, 'name', e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg py-2 px-3 text-sm text-slate-800 focus:border-[#4e1a74] focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">Role / Designation</label>
                        <input type="text" placeholder="e.g. Director / Individual" value={contact.role} onChange={(e) => handleContactChange(index, 'role', e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg py-2 px-3 text-sm text-slate-800 focus:border-[#4e1a74] focus:outline-none" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">Mobile Number</label>
                          <input type="tel" placeholder="e.g. 9876543210" value={contact.mobile} onChange={(e) => handleContactChange(index, 'mobile', e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg py-2 px-3 text-sm text-slate-800 focus:border-[#4e1a74] focus:outline-none" />
                        </div>
                        {formData.contacts.length > 1 && (
                          <button type="button" onClick={() => removeContactRow(index)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* DETAILED DISCUSSION */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">Discussion Details & Minutes *</label>
                <textarea required rows={5} placeholder="Document banking requirements discussed, limits reviewed, document collection status..." value={formData.discussionNotes} onChange={(e) => handleInputChange('discussionNotes', e.target.value)} className="w-full bg-white border border-gray-300 rounded-2xl p-4 text-sm text-slate-800 focus:border-[#4e1a74] focus:outline-none" />
              </div>

              {/* ACTION ITEMS SECTION */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-[#4e1a74]" /> Action Items & Deliverables
                  </h3>
                  <button type="button" onClick={addActionItemRow} className="text-xs bg-white text-[#4e1a74] px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center gap-1 shadow-sm font-semibold">
                    <PlusCircle className="h-3.5 w-3.5" /> Add Task
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.actionItems.map((action, index) => (
                    <div key={action.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-gray-50/50 p-4 rounded-xl border border-gray-200">
                      <div className="md:col-span-6">
                        <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">Task Description</label>
                        <input type="text" placeholder="e.g. Collect KYC docs, Draft OD Proposal" value={action.task} onChange={(e) => handleActionItemChange(index, 'task', e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg py-2 px-3 text-sm text-slate-800 focus:border-[#4e1a74] focus:outline-none" />
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">Owner</label>
                        <input type="text" placeholder="Assignee" value={action.owner} onChange={(e) => handleActionItemChange(index, 'owner', e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg py-2 px-3 text-sm text-slate-800 focus:border-[#4e1a74] focus:outline-none" />
                      </div>
                      <div className="md:col-span-3 flex items-center gap-2">
                        <div className="flex-1">
                          <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">Deadline</label>
                          <input type="date" value={action.deadline} onChange={(e) => handleActionItemChange(index, 'deadline', e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg py-2 px-3 text-sm text-slate-800 focus:border-[#4e1a74] focus:outline-none" />
                        </div>
                        {formData.actionItems.length > 1 && (
                          <button type="button" onClick={() => removeActionItemRow(index)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
                <button type="button" onClick={() => { setFormData(initialFormState); setEditingReportId(null); resetSearchState(); setActiveTab('dashboard'); }} className="px-6 py-3 text-sm font-semibold text-slate-600 hover:text-slate-800 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all">Cancel</button>
                <button type="submit" className="px-8 py-3 text-sm font-bold bg-[#4e1a74] hover:bg-[#4e1a74]/90 text-white rounded-xl shadow-md transition-all">
                  {editingReportId ? 'Update Visit Report' : 'Log Visit Report'}

                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className={`${selectedReport ? 'lg:col-span-5' : 'lg:col-span-12'} space-y-6 transition-all duration-300`}>
              
              <div className="bg-white p-4 rounded-2xl border border-gray-200 flex flex-col md:flex-row gap-4 items-center justify-between shadow-md">
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input type="text" placeholder="Search accounts, notes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-gray-300 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-800 focus:outline-none focus:border-[#4e1a74]" />
                  {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-3 text-slate-500"><X className="h-3.5 w-3.5" /></button>}
                </div>
                <div className="flex items-center gap-2 overflow-x-auto">
                  <button onClick={() => setFilterType('all')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${filterType === 'all' ? 'bg-[#4e1a74] text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>All Visits</button>
                  <button onClick={() => setFilterType('prospective')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${filterType === 'prospective' ? 'bg-[#4e1a74] text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>New Prospects</button>
                  <button onClick={() => setFilterType('existing')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${filterType === 'existing' ? 'bg-[#4e1a74] text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>Existing Customers</button>
                  <button onClick={handleDownloadExcel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#107c41] text-white hover:bg-[#107c41]/90 shadow-sm transition-all" title="Download Log Book Register as Excel"><Download className="h-3.5 w-3.5" /> Download Register</button>
                </div>
              </div>

              <div className="space-y-4">
                {filteredReports.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-md">
                    <AlertTriangle className="h-10 w-10 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-sm font-bold text-slate-600">No Visit Reports Found</h3>
                  </div>
                ) : (
                  filteredReports.map((report) => (
                    <div key={report.id} onClick={() => handleSelectReport(report)} className={`group text-left p-5 bg-white hover:bg-gray-50 rounded-2xl border transition-all cursor-pointer relative shadow-sm ${selectedReport?.id === report.id ? 'border-[#4e1a74] ring-1 ring-[#4e1a74]/30' : 'border-gray-200'}`}>
                      <div className="absolute top-4 right-4 flex gap-2">
                        {report.customerCIF ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border bg-blue-50 text-blue-700 border-blue-200">Existing Customers</span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border bg-emerald-50 text-emerald-700 border-emerald-200">New Prospect</span>
                        )}
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5"><Calendar className="h-3 w-3" /> {report.visitDate}</p>
                          <h3 className="text-base font-bold text-slate-800 mt-1 group-hover:text-[#4e1a74]">{report.companyName}</h3>
                        </div>
                        <div className="grid grid-cols-4 gap-3 text-xs text-slate-500 pt-1">
                          <div><span className="text-[10px] uppercase font-bold text-slate-400 block">Visiting Official</span><span className="font-medium text-slate-700 truncate block" title={report.visitorName}>{report.visitorName}</span></div>
                          <div><span className="text-[10px] uppercase font-bold text-slate-400 block">Place</span><span className="font-medium text-slate-700 truncate block" title={report.visitPlace || 'N/A'}>{report.visitPlace || 'N/A'}</span></div>
                          <div><span className="text-[10px] text-slate-400 uppercase font-bold block">Product</span><span className="font-semibold text-slate-700 truncate block" title={report.prospectiveData?.productPitched || 'N/A'}>{report.prospectiveData?.productPitched || 'N/A'}</span></div>
                          <div><span className="text-[10px] text-slate-400 uppercase font-bold block">Value</span><span className="font-bold text-slate-700 flex items-center truncate" title={`₹${Number(report.prospectiveData?.dealSize || 0).toLocaleString('en-IN')}`}><IndianRupee className="h-3 w-3 mr-0.5 flex-shrink-0"/>{Number(report.prospectiveData?.dealSize || 0).toLocaleString('en-IN')}</span></div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {selectedReport && (
              <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden sticky top-28">
                <div className="bg-[#f7f4fb] p-6 border-b border-gray-200 flex justify-between items-start gap-4">
                  <div>
                    <span className="text-[10px] font-bold tracking-wider uppercase text-[#4e1a74]">Detailed Report</span>
                    <h2 className="text-xl font-bold text-slate-800 mt-1">{selectedReport.companyName}</h2>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5"><Calendar className="h-3 w-3" /> Visit Logged: {selectedReport.visitDate}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEditReport(selectedReport)} className="p-2 text-slate-500 hover:text-[#4e1a74] hover:bg-gray-100 rounded-lg transition-all" title="Edit Report"><Edit className="h-4.5 w-4.5" /></button>
                    <button onClick={() => window.print()} className="p-2 text-slate-500 hover:text-[#4e1a74] hover:bg-gray-100 rounded-lg transition-all" title="Print Clean Report"><Printer className="h-4.5 w-4.5" /></button>
                    <button onClick={() => handleCopyReportToClipboard(selectedReport)} className="p-2 text-slate-500 hover:text-[#4e1a74] hover:bg-gray-100 rounded-lg transition-all" title="Copy to Clipboard"><Copy className="h-4.5 w-4.5" /></button>
                    <button onClick={() => handleDeleteReport(selectedReport.id)} className="p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all" title="Delete Report"><Trash2 className="h-4.5 w-4.5" /></button>
                    <button onClick={() => { setSelectedReport(null); setAiOutput(null); }} className="p-2 text-slate-500 hover:text-[#4e1a74] hover:bg-gray-100 rounded-lg transition-all" title="Close"><X className="h-4.5 w-4.5" /></button>
                  </div>
                </div>

                <div className="p-6 md:p-8 space-y-8 max-h-[75vh] overflow-y-auto">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50/50 rounded-xl border border-gray-200">
                    <div><span className="text-[10px] font-bold uppercase text-slate-500 block">Visiting Official</span><span className="text-sm font-semibold text-slate-700">{selectedReport.visitorName}</span></div>
                    <div><span className="text-[10px] font-bold uppercase text-slate-500 block">Place of Visit</span><span className="text-sm font-semibold text-slate-700">{selectedReport.visitPlace || 'N/A'}</span></div>
                    <div><span className="text-[10px] font-bold uppercase text-slate-500 block">CIF</span><span className="text-sm font-semibold text-slate-700">{selectedReport.customerCIF || 'N/A'}</span></div>
                    <div><span className="text-[10px] font-bold uppercase text-slate-500 block">Mobile</span><span className="text-sm font-semibold text-slate-700">{selectedReport.customerMobile || 'N/A'}</span></div>
                  </div>

                  {selectedReport.customerCIF && selectedReport.bankingRelationship && (
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1.5 pb-1 border-b border-gray-200">
                        <Activity className="h-4 w-4" /> Existing Banking Relationship
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-gray-50/50 rounded-xl p-3 border border-gray-200 text-center">
                          <p className="text-[10px] uppercase font-semibold text-blue-600">Deposit Accounts</p>
                          <p className="text-base font-bold text-slate-800">{selectedReport.bankingRelationship.depositCount}</p>
                          <p className="text-xs text-blue-600 font-medium">{formatINR(selectedReport.bankingRelationship.depositTotal)}</p>
                        </div>
                        <div className="bg-gray-50/50 rounded-xl p-3 border border-gray-200 text-center">
                          <p className="text-[10px] uppercase font-semibold text-purple-600">Loan Accounts (TL)</p>
                          <p className="text-base font-bold text-slate-800">{selectedReport.bankingRelationship.loanCount}</p>
                          <p className="text-xs text-purple-600 font-medium">{formatINR(selectedReport.bankingRelationship.loanOutstanding)}</p>
                        </div>
                        <div className="bg-gray-50/50 rounded-xl p-3 border border-gray-200 text-center">
                          <p className="text-[10px] uppercase font-semibold text-emerald-600">CC/OD Accounts</p>
                          <p className="text-base font-bold text-slate-800">{selectedReport.bankingRelationship.ccodCount}</p>
                          <p className="text-xs text-emerald-600 font-medium">{formatINR(selectedReport.bankingRelationship.ccodExposure)}</p>
                        </div>
                        <div className="bg-gray-50/50 rounded-xl p-3 border border-gray-200 text-center">
                          <p className="text-[10px] uppercase font-semibold text-indigo-600">Total Loan Exposure</p>
                          <p className="text-base font-bold text-indigo-700">{formatINR(selectedReport.bankingRelationship.totalExposure)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5 pb-1 border-b border-gray-200"><TrendingUp className="h-4 w-4" /> Prospective Business Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50/50 p-3 rounded-lg border border-gray-200"><span className="text-[10px] uppercase text-slate-500 block">Product Pitched</span><span className="text-base font-bold text-slate-700">{selectedReport.prospectiveData?.productPitched || 'N/A'}</span></div>
                      <div className="bg-gray-50/50 p-3 rounded-lg border border-gray-200"><span className="text-[10px] uppercase text-slate-500 block">Prospective Value (₹)</span><span className="text-base font-bold text-emerald-600">₹{Number(selectedReport.prospectiveData?.dealSize || 0).toLocaleString('en-IN')}</span></div>
                      <div className="bg-gray-50/50 p-3 rounded-lg border border-gray-200"><span className="text-[10px] uppercase text-slate-500 block">Existing Banker</span><span className="text-sm font-medium text-slate-700">{selectedReport.prospectiveData?.existingBanker || 'None'}</span></div>
                      <div className="bg-gray-50/50 p-3 rounded-lg border border-gray-200"><span className="text-[10px] uppercase text-slate-500 block">Decision Maker Met?</span><span className="text-sm font-bold text-slate-700">{selectedReport.prospectiveData?.decisionMakerMet || 'N/A'}</span></div>
                    </div>
                    {selectedReport.prospectiveData?.keyPainPoints && (
                      <div className="bg-gray-50/50 p-4 rounded-lg border border-gray-200"><span className="text-[10px] uppercase text-slate-500 block mb-1">Customer Requirements / Pain Points</span><p className="text-xs text-slate-700 font-mono">{selectedReport.prospectiveData.keyPainPoints}</p></div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1.5 pb-1 border-b border-gray-200"><Users className="h-4 w-4" /> Persons Met</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedReport.contacts.map((contact, idx) => (
                        <div key={idx} className="bg-gray-50/50 p-3.5 rounded-xl border border-gray-200">
                          <p className="text-sm font-bold text-slate-800">{contact.name}</p>
                          <p className="text-xs text-[#4e1a74] font-medium">{contact.role}</p>
                          <p className="text-xs text-slate-500 mt-1.5"><Phone className="h-3 w-3 inline mr-1" /> {contact.mobile || contact.email || 'N/A'}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase text-slate-500 pb-1 border-b border-gray-200">Discussion Minutes</h3>
                    <p className="text-xs text-slate-700 leading-relaxed bg-gray-50/50 p-4 rounded-xl border border-gray-200 font-serif">{selectedReport.discussionNotes}</p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1.5 pb-1 border-b border-gray-200"><CheckSquare className="h-4 w-4" /> Action Items</h3>
                    {selectedReport.actionItems.length > 0 ? (
                      <div className="space-y-2.5">
                        {selectedReport.actionItems.map((action) => (
                          <div key={action.id} onClick={() => toggleActionComplete(selectedReport.id, action.id)} className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer ${action.completed ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50/50 border-gray-200'}`}>
                            <button className={`p-1 rounded-md mt-0.5 border ${action.completed ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-400 border-gray-300'}`}>
                              {action.completed ? <Check className="h-3.5 w-3.5" /> : <div className="h-3.5 w-3.5" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-semibold ${action.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>{action.task}</p>
                              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-500">
                                <span className="bg-gray-100 px-2 py-0.5 rounded">Assignee: {action.owner}</span>
                                {action.deadline && <span className="flex items-center"><Clock className="h-3 w-3 mr-1" /> Due: {action.deadline}</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-xs text-slate-500 italic">No tasks logged.</p>}
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 via-[#f7f4fb] to-white p-5 rounded-2xl border border-[#4e1a74]/15 shadow-lg space-y-4">
                    <div className="flex justify-between items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div className="bg-[#4e1a74] p-1.5 rounded-lg text-white"><Sparkles className="h-4 w-4" /></div>
                        <div><h4 className="text-xs font-bold text-slate-800 uppercase">Gemini Branch Assistant</h4></div>
                      </div>
                      <button onClick={() => generateAIAssistance(selectedReport)} disabled={aiLoading} className="bg-[#4e1a74] hover:bg-[#4e1a74]/90 disabled:bg-[#4e1a74]/55 text-xs font-bold text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm">
                        {aiLoading ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Drafting...</> : <><Zap className="h-3.5 w-3.5" /> Draft Follow-up</>}
                      </button>
                    </div>

                    {aiOutput && (
                      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                        <div className="bg-gray-50 p-2 border-b border-gray-200 flex gap-2">
                          <button onClick={() => setAiOutputTab('email')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg ${aiOutputTab === 'email' ? 'bg-[#4e1a74] text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>Email Draft</button>
                          <button onClick={() => setAiOutputTab('summary')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg ${aiOutputTab === 'summary' ? 'bg-[#4e1a74] text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>Internal Digest</button>
                        </div>
                        <div className="p-4 relative">
                          <button onClick={() => {
                            const el = document.createElement('textarea'); el.value = aiOutputTab === 'email' ? aiOutput.email : aiOutput.summary;
                            document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el); triggerNotification("Copied!");
                          }} className="absolute top-3 right-3 p-1.5 bg-gray-100 text-slate-600 hover:bg-gray-200 rounded"><Copy className="h-3.5 w-3.5" /></button>
                          <pre className="text-xs text-slate-700 font-sans whitespace-pre-wrap max-h-60 overflow-y-auto pr-8">
                            {aiOutputTab === 'email' ? aiOutput.email : aiOutput.summary}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: INSIGHTS & METRICS */}
        {activeTab === 'insights' && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-md">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">Branch Leads Tracker</span>
                <span className="text-3xl font-extrabold text-slate-800 mt-1 block">{walkins.length}</span>
                <span className="text-xs text-slate-500 mt-1 block">{convertedLeads} Converted / {activeLeads} Active</span>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-md">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">Visit Reports Logged</span>
                <span className="text-3xl font-extrabold text-slate-800 mt-1 block">{totalVisits}</span>
                <span className="text-xs text-slate-500 mt-1 block">New {prospectiveCount} / Existing {existingCount}</span>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-md">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">New Business Pipeline</span>
                <span className="text-3xl font-extrabold text-emerald-600 mt-1 block max-w-full truncate overflow-hidden">₹{(totalPipelineValue/100000).toFixed(1)}L</span>
                <span className="text-xs text-slate-500 mt-1 block">Expected business value</span>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-md">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">Cross-sell Pipeline</span>
                <span className="text-3xl font-extrabold text-blue-600 mt-1 block max-w-full truncate overflow-hidden">₹{(upsellPotentialTotal/100000).toFixed(1)}L</span>
                <span className="text-xs text-slate-500 mt-1 block">From existing base</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-md space-y-6">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Branch Portfolio Health</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="text-slate-600 font-semibold">Average Existing Customer Rating</span>
                      <span className="text-amber-500 font-bold">{averageHealthScore} / 5</span>
                    </div>
                    <div className="bg-gray-100 h-2 rounded-full overflow-hidden"><div className="bg-amber-400 h-full" style={{ width: `${averageHealthScore !== "N/A" ? (Number(averageHealthScore)/5)*100 : 0}%` }}/></div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden flex flex-col">
                 <div className="p-6 border-b border-gray-200">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Recent Walk-in Leads Status</h3>
                </div>
                <div className="p-4 flex-1 overflow-y-auto max-h-48">
                  {walkins.slice(0, 5).map(w => (
                    <div key={w.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{w.name} <span className="text-[10px] text-slate-500 font-normal ml-1">({w.purpose})</span></p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${w.status === 'Converted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : w.status === 'New Lead' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>{w.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Pipeline Directory</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-slate-500 uppercase font-semibold border-b border-gray-200">
                    <tr>
                      <th className="p-4">Customer</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">Official</th>
                      <th className="p-4">Date</th>
                      <th className="p-4 text-right">Value Impact (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {reports.map((report) => (
                      <tr key={report.id} className="hover:bg-gray-50/50 transition-all">
                        <td className="p-4 font-bold text-slate-800">{report.companyName}</td>
                        <td className="p-4">{report.customerCIF ? <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border bg-blue-50 text-blue-700 border-blue-200">Existing Customers</span> : <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border bg-emerald-50 text-emerald-700 border-emerald-200">New</span>}</td>
                        <td className="p-4 text-slate-600">{report.visitorName}</td>
                        <td className="p-4 text-slate-500">{report.visitDate}</td>
                        <td className="p-4 text-right font-bold text-slate-800">
                          ₹{Number(report.prospectiveData?.dealSize || 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="print:hidden py-4 px-6 bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-full mx-auto">
          <p className="text-center text-sm" style={{ color: "#666" }}>
            Ideation by <strong>Shivam Kaushik</strong> Developed with AI
          </p>
        </div>
      </footer>

      {/* PRINT ONLY: VISIT REPORT LAYOUT */}
      {selectedReport && (
        <div className="hidden print:block bg-white text-black w-full max-w-4xl mx-auto font-sans leading-relaxed text-sm">
          <style dangerouslySetInnerHTML={{__html: `
            @media print {
              @page {
                size: A4;
                margin: 20mm;
              }
              body {
                background: white !important;
                color: black !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .print-avoid-break {
                page-break-inside: avoid;
                break-inside: avoid;
              }
            }
          `}} />
          
          {/* Official Letterhead Banner */}
          <div className="border-b-4 border-double border-slate-800 pb-3 mb-6 flex justify-between items-end">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 uppercase">
                STATE BANK OF INDIA
              </h1>
              <p className="text-xs font-bold text-slate-700 tracking-wider">
                {branchName ? `${branchName} Branch` : 'Branch Office'} {branchCode ? `(Code: ${branchCode})` : ''}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-extrabold tracking-widest text-slate-500 block uppercase">VISIT LOG REPORT</span>
              <p className="text-xs text-slate-600 font-medium">Ref No: {selectedReport.referenceNo || selectedReport.id.split('-')[1]?.toUpperCase() || 'N/A'}</p>
            </div>
          </div>

          <h2 className="text-lg font-bold tracking-wider text-center text-slate-800 uppercase mb-6 border-b border-gray-200 pb-2">
            Customer Visit Report
          </h2>

          {/* Section 1: Customer Profile & Visit Details */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="border border-gray-300 rounded-xl p-4 bg-gray-50/30">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2.5 pb-1 border-b border-gray-200">Customer Entity</h3>
              <table className="w-full text-xs">
                <tbody>
                  <tr className="align-top">
                    <td className="py-1 text-slate-500 font-medium pr-2 w-20">Name:</td>
                    <td className="py-1 font-bold text-slate-800">{selectedReport.companyName}</td>
                  </tr>
                  <tr className="align-top">
                    <td className="py-1 text-slate-500 font-medium pr-2">CIF:</td>
                    <td className="py-1 font-semibold text-slate-800">{selectedReport.customerCIF || 'N/A'}</td>
                  </tr>
                  <tr className="align-top">
                    <td className="py-1 text-slate-500 font-medium pr-2">Mobile:</td>
                    <td className="py-1 font-semibold text-slate-800">{selectedReport.customerMobile || 'N/A'}</td>
                  </tr>
                  <tr className="align-top">
                    <td className="py-1 text-slate-500 font-medium pr-2">Address:</td>
                    <td className="py-1 text-slate-700">{selectedReport.customerAddress || 'N/A'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="border border-gray-300 rounded-xl p-4 bg-gray-50/30">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2.5 pb-1 border-b border-gray-200">Visit Summary</h3>
              <table className="w-full text-xs">
                <tbody>
                  <tr className="align-top">
                    <td className="py-1 text-slate-500 font-medium pr-2 w-28">Date of Visit:</td>
                    <td className="py-1 font-bold text-slate-800">{selectedReport.visitDate}</td>
                  </tr>
                  <tr className="align-top">
                    <td className="py-1 text-slate-500 font-medium pr-2">Place of Visit:</td>
                    <td className="py-1 font-semibold text-slate-800">{selectedReport.visitPlace || 'N/A'}</td>
                  </tr>
                  <tr className="align-top">
                    <td className="py-1 text-slate-500 font-medium pr-2">Visiting Official:</td>
                    <td className="py-1 font-bold text-slate-800">{selectedReport.visitorName}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Existing Banking Relationship (If applicable) */}
          {selectedReport.customerCIF && selectedReport.bankingRelationship ? (
            <div className="mb-6 print-avoid-break">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2 pb-1 border-b border-gray-200">Existing Banking Relationship</h3>
              <table className="w-full text-xs border border-gray-300 border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-gray-300">
                    <th className="p-2 border-r border-gray-300 text-left">Relationship Type</th>
                    <th className="p-2 border-r border-gray-300 text-center w-24">Accounts Count</th>
                    <th className="p-2 text-right w-44">Total Volume / Exposure</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300 text-slate-800">
                  <tr>
                    <td className="p-2 border-r border-gray-300">Deposit Accounts</td>
                    <td className="p-2 border-r border-gray-300 text-center">{selectedReport.bankingRelationship.depositCount}</td>
                    <td className="p-2 text-right">{formatINR(selectedReport.bankingRelationship.depositTotal)}</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-r border-gray-300">Term Loans</td>
                    <td className="p-2 border-r border-gray-300 text-center">{selectedReport.bankingRelationship.loanCount}</td>
                    <td className="p-2 text-right">{formatINR(selectedReport.bankingRelationship.loanOutstanding)}</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-r border-gray-300">CC/OD Accounts</td>
                    <td className="p-2 border-r border-gray-300 text-center">{selectedReport.bankingRelationship.ccodCount}</td>
                    <td className="p-2 text-right">{formatINR(selectedReport.bankingRelationship.ccodExposure)}</td>
                  </tr>
                  <tr className="bg-slate-50/50 font-bold border-t-2 border-gray-300">
                    <td className="p-2 border-r border-gray-300 text-slate-900">Total Credit Exposure</td>
                    <td className="p-2 border-r border-gray-300 text-center">-</td>
                    <td className="p-2 text-right text-slate-900">{formatINR(selectedReport.bankingRelationship.totalExposure)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : !selectedReport.customerCIF ? (
            <div className="mb-6 print-avoid-break">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2 pb-1 border-b border-gray-200">Existing Banking Relationship</h3>
              <p className="text-sm font-semibold text-slate-700 italic">No existing relationship with our branch.</p>
            </div>
          ) : null}

          {/* Section 3: Prospective Business Details */}
          <div className="mb-6 print-avoid-break">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2 pb-1 border-b border-gray-200">Prospective Business Details</h3>
            <table className="w-full text-xs border border-gray-300 border-collapse">
              <tbody className="divide-y divide-gray-300 text-slate-800">
                <tr>
                  <td className="p-2.5 font-semibold text-slate-500 w-44 bg-gray-50/50 border-r border-gray-300">Product Pitched / Offered</td>
                  <td className="p-2.5 font-bold text-slate-800">{selectedReport.prospectiveData?.productPitched || 'N/A'}</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-semibold text-slate-500 bg-gray-50/50 border-r border-gray-300">Prospective Value</td>
                  <td className="p-2.5 font-bold text-slate-800">{selectedReport.prospectiveData?.dealSize ? formatINR(selectedReport.prospectiveData.dealSize) : 'N/A'}</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-semibold text-slate-500 bg-gray-50/50 border-r border-gray-300">Existing Banker (if any)</td>
                  <td className="p-2.5 text-slate-800">{selectedReport.prospectiveData?.existingBanker || 'N/A'}</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-semibold text-slate-500 bg-gray-50/50 border-r border-gray-300">Decision Maker Met?</td>
                  <td className="p-2.5 font-semibold text-slate-800">{selectedReport.prospectiveData?.decisionMakerMet || 'N/A'}</td>
                </tr>
                {selectedReport.prospectiveData?.keyPainPoints && (
                  <tr>
                    <td className="p-2.5 font-semibold text-slate-500 bg-gray-50/50 border-r border-gray-300">Requirements / Feedback</td>
                    <td className="p-2.5 text-slate-700 leading-relaxed text-justify">{selectedReport.prospectiveData.keyPainPoints}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Section 4: Key Personnel Met */}
          <div className="mb-6 print-avoid-break">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2 pb-1 border-b border-gray-200">Key Personnel Met</h3>
            <table className="w-full text-xs border border-gray-300 border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-gray-300">
                  <th className="p-2 border-r border-gray-300 text-left w-12">S.N.</th>
                  <th className="p-2 border-r border-gray-300 text-left">Name of the Person</th>
                  <th className="p-2 border-r border-gray-300 text-left">Designation / Role</th>
                  <th className="p-2 text-left w-48">Mobile Number</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300 text-slate-800">
                {selectedReport.contacts.map((contact, idx) => (
                  <tr key={idx}>
                    <td className="p-2 border-r border-gray-300 text-center">{idx + 1}</td>
                    <td className="p-2 border-r border-gray-300 font-bold">{contact.name}</td>
                    <td className="p-2 border-r border-gray-300">{contact.role}</td>
                    <td className="p-2">{contact.mobile || contact.email || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 5: Official Discussion Minutes */}
          <div className="mb-6 print-avoid-break">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2 pb-1 border-b border-gray-200">Official Discussion Minutes</h3>
            <div className="p-4 bg-gray-50/20 border border-gray-300 rounded-xl leading-relaxed text-justify text-xs text-slate-800 whitespace-pre-wrap font-serif">
              {selectedReport.discussionNotes}
            </div>
          </div>

          {/* Section 6: Next Steps / Action Items */}
          <div className="mb-8 print-avoid-break">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2.5 pb-1 border-b border-gray-200">Next Steps & Action Items</h3>
            <ul className="space-y-2">
              {selectedReport.actionItems.length > 0 ? selectedReport.actionItems.map((action, idx) => (
                <li key={idx} className="flex gap-2.5 text-xs items-start">
                  <div className="mt-0.5 flex-shrink-0 w-3.5 h-3.5 border border-gray-400 flex items-center justify-center rounded">
                    {action.completed && <span className="font-bold text-[10px] text-slate-800">✓</span>}
                  </div>
                  <div className="flex-1">
                    <span className="font-bold text-slate-800 mr-2">{action.task}</span>
                    <span className="text-slate-500 text-[10px] inline-block font-semibold bg-gray-100 px-1.5 py-0.5 rounded">Owner: {action.owner} | Due: {action.deadline || 'N/A'}</span>
                  </div>
                </li>
              )) : <li className="text-xs text-slate-500 italic">No action items documented.</li>}
            </ul>
          </div>

          {/* Section 7: Signature Block */}
          <div className="flex justify-between mt-12 pt-6 border-t border-gray-400 print-avoid-break">
            <div className="text-center w-48">
              <div className="border-b border-slate-600 h-10 mb-2"></div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Visiting Official's Signature</p>
            </div>
            <div className="text-center w-48">
              <div className="border-b border-slate-600 h-10 mb-2"></div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Branch Manager's Signature</p>
            </div>
          </div>
        </div>
      )}
      {/* Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-100 overflow-hidden transform transition-all duration-300 animate-in fade-in-50 zoom-in-95">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-rose-50 text-rose-600 rounded-full shrink-0">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-slate-800 mb-1">{confirmModal.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{confirmModal.message}</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-700 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-md hover:shadow-lg transition-all"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


