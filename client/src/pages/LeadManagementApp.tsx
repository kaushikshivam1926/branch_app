/**
 * Lead Management System (Offline Web App)
 * 
 * Features:
 * - Dashboard with summary cards (Total Leads, Active/Pending, Closed/Converted)
 * - Collapsible data entry form with animation
 * - Auto-generated Lead ID (Lead 001, Lead 002, etc.)
 * - Data table with sorting and filtering
 * - User Mode vs Admin Mode visibility
 * - Edit and Delete actions
 */

import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useBranch } from "@/contexts/BranchContext";
import { ArrowLeft, Plus, X, Edit2, Trash2, ChevronDown, ChevronUp, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { loadData, saveData } from "@/lib/db";

interface Lead {
  id: string;
  name: string;
  contact: string;
  cif: string;
  followUpDate: string;
  status: "Open" | "Pending" | "Converted" | "Closed" | "Rejected" | "Failed";
  details: string;
  createdAt: string;
}

const ADMIN_USERNAME = "Admin";
const ADMIN_PASSWORD = "Sbi@12345";

export default function LeadManagementApp() {
  const { branchName } = useBranch();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [formExpanded, setFormExpanded] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Form state
  const [leadName, setLeadName] = useState("");
  const [contact, setContact] = useState("");
  const [cif, setCif] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [status, setStatus] = useState<Lead["status"]>("Open");
  const [details, setDetails] = useState("");

  // Filter state
  const [filters, setFilters] = useState({
    id: "",
    name: "",
    contact: "",
    cif: "",
    details: "",
    status: "",
    followUpDate: "",
  });

  // Sort state
  const [sortColumn, setSortColumn] = useState<keyof Lead | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Load leads from IndexedDB
  useEffect(() => {
    const loadLeads = async () => {
      try {
        const savedLeads = await loadData("sbi-leads");
        if (savedLeads) {
          setLeads(savedLeads);
        }
      } catch (error) {
        console.error("Failed to load leads:", error);
        // Fallback to localStorage
        const localLeads = localStorage.getItem("sbi-leads");
        if (localLeads) {
          const parsed = JSON.parse(localLeads);
          setLeads(parsed);
          // Migrate to IndexedDB
          saveData("sbi-leads", parsed);
        }
      }
    };
    loadLeads();
  }, []);

  // Save leads to IndexedDB
  useEffect(() => {
    const saveLeads = async () => {
      try {
        await saveData("sbi-leads", leads);
      } catch (error) {
        console.error("Failed to save leads:", error);
        // Fallback to localStorage
        localStorage.setItem("sbi-leads", JSON.stringify(leads));
      }
    };
    if (leads.length >= 0) {
      saveLeads();
    }
  }, [leads]);

  const handleLogin = () => {
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setShowLoginDialog(false);
      setUsername("");
      setPassword("");
      toast.success("Logged in as Admin");
    } else {
      toast.error("Invalid credentials");
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    toast.info("Logged out");
  };

  const generateLeadId = () => {
    const maxId = leads.reduce((max, lead) => {
      const num = parseInt(lead.id.replace("Lead ", ""));
      return num > max ? num : max;
    }, 0);
    return `Lead ${String(maxId + 1).padStart(3, "0")}`;
  };

  const handleSaveLead = () => {
    if (!leadName || !contact || !followUpDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (editingLead) {
      // Update existing lead
      setLeads(leads.map(lead => 
        lead.id === editingLead.id 
          ? { ...lead, name: leadName, contact, cif, followUpDate, status, details }
          : lead
      ));
      toast.success("Lead updated successfully");
    } else {
      // Add new lead
      const newLead: Lead = {
        id: generateLeadId(),
        name: leadName,
        contact,
        cif,
        followUpDate,
        status,
        details,
        createdAt: new Date().toISOString(),
      };
      setLeads([...leads, newLead]);
      toast.success("Lead added successfully");
    }

    resetForm();
    setFormExpanded(false);
  };

  const handleClear = () => {
    resetForm();
  };

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead);
    setLeadName(lead.name);
    setContact(lead.contact);
    setCif(lead.cif);
    setFollowUpDate(lead.followUpDate);
    setStatus(lead.status);
    setDetails(lead.details);
    setFormExpanded(true);
  };

  const handleDelete = (leadId: string) => {
    setLeads(leads.filter(lead => lead.id !== leadId));
    toast.success("Lead deleted");
  };

  const resetForm = () => {
    setLeadName("");
    setContact("");
    setCif("");
    setFollowUpDate("");
    setStatus("Open");
    setDetails("");
    setEditingLead(null);
  };

  const toggleFormExpanded = () => {
    if (formExpanded) {
      resetForm();
    }
    setFormExpanded(!formExpanded);
  };

  const handleSort = (column: keyof Lead) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const getFilteredAndSortedLeads = () => {
    let filtered = leads;

    // Filter by user mode
    if (!isAdmin) {
      filtered = filtered.filter(lead => lead.status === "Open" || lead.status === "Pending");
    }

    // Apply column filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        filtered = filtered.filter(lead => 
          lead[key as keyof Lead]?.toString().toLowerCase().includes(value.toLowerCase())
        );
      }
    });

    // Apply sorting
    if (sortColumn) {
      filtered.sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        
        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  };

  const filteredLeads = getFilteredAndSortedLeads();

  // Dashboard calculations
  const totalLeads = leads.length;
  const activeLeads = leads.filter(l => l.status === "Open" || l.status === "Pending").length;
  const closedLeads = leads.filter(l => ["Converted", "Closed", "Rejected", "Failed"].includes(l.status)).length;
  const followUpToday = leads.filter(l => 
    (l.status === "Open" || l.status === "Pending") && 
    l.followUpDate === new Date().toISOString().split('T')[0]
  ).length;

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{ 
        backgroundColor: "#f7f4fb",
        fontFamily: "'Poppins', 'Effra', sans-serif"
      }}
    >
      {/* Header */}
      <header 
        className="w-full py-2 px-6"
        style={{ 
          background: "linear-gradient(to right, #d4007f, #4e1a74)",
          height: '101px',
          paddingTop: '0px'
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <img 
                src="/images/sbi-logo.png" 
                alt="State Bank of India" 
                className="h-28 w-auto"
                style={{ filter: "brightness(0) invert(1)" }}
              />
            </div>
            <div className="flex flex-col justify-center">
              <h1 
                className="text-white font-semibold leading-tight"
                style={{ fontSize: "1.3rem" }}
              >
                Lead Management System
              </h1>
              <p 
                className="text-white/90"
                style={{ fontSize: "0.85rem" }}
              >
                {branchName}
              </p>
            </div>
          </div>
          
          <div>
            {isAdmin ? (
              <Button
                variant="outline"
                className="bg-green-500 hover:bg-green-600 text-white border-none"
                onClick={handleLogout}
              >
                Logout Admin
              </Button>
            ) : (
              <Button
                variant="outline"
                className="bg-white/20 hover:bg-white/30 text-white border-white/40"
                onClick={() => setShowLoginDialog(true)}
              >
                Admin Login
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-8 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Back to Home */}
          <Link href="/">
            <Button variant="ghost" className="mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>

          {/* Dashboard Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Total Leads */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
              <h3 className="text-lg font-semibold mb-2" style={{ color: "#4e1a74" }}>
                Total Leads
              </h3>
              <p className="text-4xl font-bold" style={{ color: "#d4007f" }}>
                {totalLeads}
              </p>
            </div>

            {/* Active / Pending */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
              <h3 className="text-lg font-semibold mb-2" style={{ color: "#4e1a74" }}>
                Active / Pending
              </h3>
              <p className="text-4xl font-bold mb-2" style={{ color: "#00a650" }}>
                {activeLeads}
              </p>
              <p className="text-sm text-orange-600 font-medium">
                Follow-up Due Today: {followUpToday}
              </p>
            </div>

            {/* Closed / Converted */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
              <h3 className="text-lg font-semibold mb-2" style={{ color: "#4e1a74" }}>
                Closed / Converted
              </h3>
              <p className="text-4xl font-bold" style={{ color: "#666" }}>
                {closedLeads}
              </p>
            </div>
          </div>

          {/* Collapsible Data Entry Form */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 mb-8 overflow-hidden">
            <div className="flex items-center justify-between p-6 cursor-pointer" onClick={toggleFormExpanded}>
              <h3 className="text-xl font-semibold" style={{ color: "#4e1a74" }}>
                Lead Input
              </h3>
              <button
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  formExpanded 
                    ? "bg-red-500 hover:bg-red-600 rotate-45" 
                    : "bg-blue-500 hover:bg-blue-600"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFormExpanded();
                }}
              >
                {formExpanded ? (
                  <X className="w-5 h-5 text-white" />
                ) : (
                  <Plus className="w-5 h-5 text-white" />
                )}
              </button>
            </div>

            {/* Form Content */}
            <div 
              className={`transition-all duration-300 ease-in-out ${
                formExpanded ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
              } overflow-hidden`}
            >
              <div className="p-6 pt-0 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="leadId">Lead ID</Label>
                    <Input
                      id="leadId"
                      value={editingLead ? editingLead.id : generateLeadId()}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={leadName}
                      onChange={(e) => setLeadName(e.target.value)}
                      placeholder="Enter name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact">Contact Number *</Label>
                    <Input
                      id="contact"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="Enter contact number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cif">CIF Number (Optional)</Label>
                    <Input
                      id="cif"
                      value={cif}
                      onChange={(e) => setCif(e.target.value)}
                      placeholder="Enter CIF number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="followUpDate">Follow-up Date *</Label>
                    <Input
                      id="followUpDate"
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">Disposal Status *</Label>
                    <Select value={status} onValueChange={(value: Lead["status"]) => setStatus(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Active</SelectLabel>
                          <SelectItem value="Open">Open</SelectItem>
                          <SelectItem value="Pending">Pending</SelectItem>
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel>Closed/Final</SelectLabel>
                          <SelectItem value="Converted">Converted</SelectItem>
                          <SelectItem value="Closed">Closed</SelectItem>
                          <SelectItem value="Rejected">Rejected</SelectItem>
                          <SelectItem value="Failed">Failed</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="details">Lead Details</Label>
                  <Textarea
                    id="details"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Enter lead details"
                    rows={3}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button
                    className="bg-green-500 hover:bg-green-600 text-white"
                    onClick={handleSaveLead}
                  >
                    {editingLead ? "Update Lead" : "Save Lead"}
                  </Button>
                  <Button
                    variant="outline"
                    className="bg-gray-500 hover:bg-gray-600 text-white border-none"
                    onClick={handleClear}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="text-xl font-semibold" style={{ color: "#4e1a74" }}>
                {isAdmin ? "All Leads (Admin View)" : "Active Leads"}
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer" onClick={() => handleSort("id")}>
                      <div className="flex items-center gap-1">
                        ID
                        {sortColumn === "id" && (sortDirection === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer" onClick={() => handleSort("name")}>
                      <div className="flex items-center gap-1">
                        Name
                        {sortColumn === "name" && (sortDirection === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer" onClick={() => handleSort("contact")}>
                      <div className="flex items-center gap-1">
                        Contact
                        {sortColumn === "contact" && (sortDirection === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer" onClick={() => handleSort("cif")}>
                      <div className="flex items-center gap-1">
                        CIF
                        {sortColumn === "cif" && (sortDirection === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Details</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer" onClick={() => handleSort("status")}>
                      <div className="flex items-center gap-1">
                        Status
                        {sortColumn === "status" && (sortDirection === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer" onClick={() => handleSort("followUpDate")}>
                      <div className="flex items-center gap-1">
                        Follow-up Date
                        {sortColumn === "followUpDate" && (sortDirection === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                  {/* Filter Row */}
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2">
                      <Input
                        placeholder="Search..."
                        value={filters.id}
                        onChange={(e) => setFilters({...filters, id: e.target.value})}
                        className="h-8 text-xs"
                      />
                    </th>
                    <th className="px-4 py-2">
                      <Input
                        placeholder="Search..."
                        value={filters.name}
                        onChange={(e) => setFilters({...filters, name: e.target.value})}
                        className="h-8 text-xs"
                      />
                    </th>
                    <th className="px-4 py-2">
                      <Input
                        placeholder="Search..."
                        value={filters.contact}
                        onChange={(e) => setFilters({...filters, contact: e.target.value})}
                        className="h-8 text-xs"
                      />
                    </th>
                    <th className="px-4 py-2">
                      <Input
                        placeholder="Search..."
                        value={filters.cif}
                        onChange={(e) => setFilters({...filters, cif: e.target.value})}
                        className="h-8 text-xs"
                      />
                    </th>
                    <th className="px-4 py-2">
                      <Input
                        placeholder="Search..."
                        value={filters.details}
                        onChange={(e) => setFilters({...filters, details: e.target.value})}
                        className="h-8 text-xs"
                      />
                    </th>
                    <th className="px-4 py-2">
                      <Input
                        placeholder="Search..."
                        value={filters.status}
                        onChange={(e) => setFilters({...filters, status: e.target.value})}
                        className="h-8 text-xs"
                      />
                    </th>
                    <th className="px-4 py-2">
                      <Input
                        placeholder="Search..."
                        value={filters.followUpDate}
                        onChange={(e) => setFilters({...filters, followUpDate: e.target.value})}
                        className="h-8 text-xs"
                      />
                    </th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        No leads found
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{lead.id}</td>
                        <td className="px-4 py-3 text-sm">{lead.name}</td>
                        <td className="px-4 py-3 text-sm">{lead.contact}</td>
                        <td className="px-4 py-3 text-sm">{lead.cif || "-"}</td>
                        <td className="px-4 py-3 text-sm max-w-xs truncate">{lead.details || "-"}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            lead.status === "Open" || lead.status === "Pending" 
                              ? "bg-green-100 text-green-700" 
                              : "bg-gray-100 text-gray-700"
                          }`}>
                            {lead.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">{new Date(lead.followUpDate).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-yellow-500 hover:bg-yellow-600 text-white border-none h-8 w-8 p-0"
                              onClick={() => handleEdit(lead)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            {isAdmin && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-red-500 hover:bg-red-600 text-white border-none h-8 w-8 p-0"
                                onClick={() => handleDelete(lead.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="w-full h-px mb-4" style={{ backgroundColor: "#333" }} />
          <p className="text-center text-sm" style={{ color: "#666" }}>
            Ideation by <strong>Shivam Kaushik</strong> Developed with AI
          </p>
        </div>
      </footer>

      {/* Admin Login Dialog */}
      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Admin Login</DialogTitle>
            <DialogDescription>
              Enter admin credentials to access all leads and delete functionality
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLoginDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleLogin}>Login</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
