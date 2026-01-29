/**
 * Landing Page for SBI PBB New Market Branch
 * 
 * Design: SBI branded header with gradient banner, 9 app cards in 3x3 grid
 * Colors: Gradient #d4007f to #4e1a74, Background #f7f4fb
 * Font: Effra (using Poppins as fallback since Effra is proprietary)
 * 
 * Admin Features:
 * - Login button in header
 * - iOS-style toggle switches to hide/show apps
 * - Drag-and-drop card reordering
 * - Settings stored in localStorage
 */

import { Link } from "wouter";
import { useState, useEffect } from "react";
import { 
  FileText, 
  Mail, 
  Calculator, 
  CheckSquare, 
  UserPlus, 
  BarChart3, 
  Shield, 
  Building2, 
  FileSpreadsheet,
  Globe,
  LogIn,
  LogOut,
  GripVertical,
  Download,
  Upload,
  Receipt,
  IndianRupee
} from "lucide-react";
import { db, exportAllData, importAllData, loadData, saveData } from "@/lib/db";

type IconName = "Mail" | "FileText" | "Calculator" | "CheckSquare" | "UserPlus" | "Globe" | "Shield" | "Building2" | "FileSpreadsheet" | "Receipt" | "IndianRupee";

interface AppCard {
  id: string;
  title: string;
  description: string;
  iconName: IconName;
  path: string;
  color: string;
  visible: boolean;
  order: number;
  statistics?: string; // For displaying dynamic stats on the card
}

const defaultAppCards: Omit<AppCard, 'visible' | 'order'>[] = [
  {
    id: "dak-number",
    title: "Dak Number Generator",
    description: "Generate and manage Dak numbers for official correspondence",
    iconName: "Mail",
    path: "/dak-number",
    color: "#d4007f"
  },
  {
    id: "loan-recovery",
    title: "Loan Recovery Notice Generator",
    description: "Generate recovery notices for non-performing loan accounts",
    iconName: "FileText",
    path: "/loan-recovery",
    color: "#4e1a74"
  },
  {
    id: "emi-calculator",
    title: "EMI Calculator",
    description: "Calculate EMI for various loan products",
    iconName: "Calculator",
    path: "/emi-calculator",
    color: "#0066b3"
  },
  {
    id: "reminders",
    title: "Reminder & To-Do",
    description: "Manage tasks and reminders for daily operations",
    iconName: "CheckSquare",
    path: "/reminders",
    color: "#00a650"
  },
  {
    id: "lead-management",
    title: "Lead Management System",
    description: "Track and manage customer leads",
    iconName: "UserPlus",
    path: "/lead-management",
    color: "#ff6b00"
  },
  {
    id: "web-resource-hub",
    title: "Web Resource Hub",
    description: "Frequently used websites and resources",
    iconName: "Globe",
    path: "/web-resource-hub",
    color: "#e91e63"
  },
  {
    id: "charges-return",
    title: "Charges Return",
    description: "Prepare charges return report for controlling office",
    iconName: "IndianRupee",
    path: "/charges-return",
    color: "#673ab7"
  },
  {
    id: "branch-info",
    title: "Branch Information",
    description: "View branch details and contact information",
    iconName: "Building2",
    path: "/branch-info",
    color: "#009688"
  },
  {
    id: "misc-reports",
    title: "Miscellaneous Reports",
    description: "Generate various miscellaneous reports",
    iconName: "FileSpreadsheet",
    path: "/misc-reports",
    color: "#795548"
  }
];

// Icon component mapper
const IconComponent = ({ name, className }: { name: IconName; className?: string }) => {
  const iconClass = className || "w-8 h-8";
  
  switch (name) {
    case "Mail":
      return <Mail className={iconClass} />;
    case "FileText":
      return <FileText className={iconClass} />;
    case "Calculator":
      return <Calculator className={iconClass} />;
    case "CheckSquare":
      return <CheckSquare className={iconClass} />;
    case "UserPlus":
      return <UserPlus className={iconClass} />;
    case "Globe":
      return <Globe className={iconClass} />;
    case "Shield":
      return <Shield className={iconClass} />;
    case "Building2":
      return <Building2 className={iconClass} />;
    case "FileSpreadsheet":
      return <FileSpreadsheet className={iconClass} />;
    case "Receipt":
      return <Receipt className={iconClass} />;
    case "IndianRupee":
      return <IndianRupee className={iconClass} />;
    default:
      return <Globe className={iconClass} />;
  }
};

export default function Landing() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [password, setPassword] = useState("");
  const [appCards, setAppCards] = useState<AppCard[]>([]);
  const [draggedCard, setDraggedCard] = useState<string | null>(null);
  const [branchCode, setBranchCode] = useState("13042");
  const [branchName, setBranchName] = useState("PBB New Market Branch");
  const [showBranchConfig, setShowBranchConfig] = useState(false);
  const [tempBranchCode, setTempBranchCode] = useState("");
  const [tempBranchName, setTempBranchName] = useState("");

  // Load app settings from IndexedDB
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await loadData("sbi-app-settings");
        if (savedSettings) {
          // Check if the data has the new iconName field
          if (savedSettings.length > 0 && savedSettings[0].iconName) {
            // Migrate security-docs to charges-return and update icon
            const migratedSettings = savedSettings.map((card: AppCard) => {
              if (card.id === "security-docs") {
                return {
                  ...card,
                  id: "charges-return",
                  title: "Charges Return",
                  description: "Prepare charges return report for controlling office",
                  iconName: "IndianRupee" as IconName,
                  path: "/charges-return"
                };
              }
              // Update existing charges-return cards to use IndianRupee icon
              if (card.id === "charges-return" && card.iconName === "Receipt") {
                return {
                  ...card,
                  iconName: "IndianRupee" as IconName
                };
              }
              return card;
            });
            setAppCards(migratedSettings);
            // Save migrated settings
            await saveData("sbi-app-settings", migratedSettings);
          } else {
            // Old format detected, reinitialize
            initializeDefaultCards();
          }
        } else {
          initializeDefaultCards();
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
        initializeDefaultCards();
      }
    };
    
    loadSettings();
    // Load task statistics for Reminder & To-Do card
    loadTaskStatistics();
    // Load lead statistics for Lead Management card
    loadLeadStatistics();
    // Load branch configuration
    loadBranchConfig();
  }, []);
  
  // Load task statistics from IndexedDB
  const loadTaskStatistics = async () => {
    try {
      const tasks = await loadData("sbi-tasks");
      if (tasks) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let overdue = 0, dueToday = 0, dueTomorrow = 0;
        
        tasks.forEach((task: any) => {
          if (task.completed) return;
          
          const taskDate = new Date(task.dueDate);
          taskDate.setHours(0, 0, 0, 0);
          const diffDays = Math.floor((taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays < 0) overdue++;
          else if (diffDays === 0) dueToday++;
          else if (diffDays === 1) dueTomorrow++;
        });
        
        const totalTasks = tasks.filter((t: any) => !t.completed).length;
        const stats = `Overdue: ${overdue} | Today: ${dueToday} | Total: ${totalTasks}`;
        
        setAppCards(prev => prev.map(card => 
          card.id === "reminders" ? { ...card, statistics: stats } : card
        ));
      } else {
        // No tasks, show 0 counts
        const stats = `Overdue: 0 | Today: 0 | Total: 0`;
        setAppCards(prev => prev.map(card => 
          card.id === "reminders" ? { ...card, statistics: stats } : card
        ));
      }
    } catch (error) {
      console.error("Error loading task statistics:", error);
      // On error, show 0 counts
      const stats = `Overdue: 0 | Today: 0 | Total: 0`;
      setAppCards(prev => prev.map(card => 
        card.id === "reminders" ? { ...card, statistics: stats } : card
      ));
    }
  };

  // Load lead statistics from IndexedDB
  const loadLeadStatistics = async () => {
    try {
      const leads = await loadData("sbi-leads");
      if (leads && leads.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];
        
        // Count active leads (Open or Pending status)
        const activeLeads = leads.filter((lead: any) => 
          lead.status === "Open" || lead.status === "Pending"
        ).length;
        
        // Count overdue follow-ups (active leads with follow-up date before today)
        const overdueFollowUps = leads.filter((lead: any) => {
          if (lead.status !== "Open" && lead.status !== "Pending") return false;
          return lead.followUpDate < todayStr;
        }).length;
        
        // Count follow-ups due today (active leads with follow-up date = today)
        const followUpToday = leads.filter((lead: any) => {
          if (lead.status !== "Open" && lead.status !== "Pending") return false;
          return lead.followUpDate === todayStr;
        }).length;
        
        const stats = `Active: ${activeLeads} | Overdue: ${overdueFollowUps} | Today: ${followUpToday}`;
        
        setAppCards(prev => prev.map(card => 
          card.id === "lead-management" ? { ...card, statistics: stats } : card
        ));
      } else {
        // No leads, show 0 counts
        const stats = `Active: 0 | Overdue: 0 | Today: 0`;
        setAppCards(prev => prev.map(card => 
          card.id === "lead-management" ? { ...card, statistics: stats } : card
        ));
      }
    } catch (error) {
      console.error("Error loading lead statistics:", error);
      // On error, show 0 counts
      const stats = `Active: 0 | Overdue: 0 | Today: 0`;
      setAppCards(prev => prev.map(card => 
        card.id === "lead-management" ? { ...card, statistics: stats } : card
      ));
    }
  };

  const loadBranchConfig = async () => {
    try {
      const config = await loadData("sbi-branch-config");
      if (config) {
        setBranchCode(config.branchCode || "13042");
        setBranchName(config.branchName || "PBB New Market Branch");
      }
    } catch (error) {
      console.error("Failed to load branch config:", error);
    }
  };

  const saveBranchConfig = async () => {
    if (!tempBranchCode || tempBranchCode.length !== 5 || !/^\d{5}$/.test(tempBranchCode)) {
      alert("Branch Code must be exactly 5 digits");
      return;
    }
    if (!tempBranchName || tempBranchName.length > 30) {
      alert("Branch Name must be between 1 and 30 characters");
      return;
    }
    
    const config = {
      branchCode: tempBranchCode,
      branchName: tempBranchName
    };
    
    try {
      await saveData("sbi-branch-config", config);
      setBranchCode(tempBranchCode);
      setBranchName(tempBranchName);
      setShowBranchConfig(false);
      setTempBranchCode("");
      setTempBranchName("");
      alert("Branch configuration saved successfully!");
    } catch (error) {
      console.error("Failed to save branch config:", error);
      alert("Failed to save branch configuration");
    }
  };

  const initializeDefaultCards = async () => {
    const cards = defaultAppCards.map((card, index) => ({
      ...card,
      visible: true,
      order: index
    }));
    setAppCards(cards);
    await saveData("sbi-app-settings", cards);
  };

  // Save settings whenever cards change
  useEffect(() => {
    const saveSettings = async () => {
      try {
        await saveData("sbi-app-settings", appCards);
      } catch (error) {
        console.error("Failed to save app settings:", error);
      }
    };
    if (appCards.length > 0) {
      saveSettings();
    }
  }, [appCards]);

  const handleLogin = () => {
    if (password === "sbi@13042") {
      setIsAdmin(true);
      setShowLoginModal(false);
      setPassword("");
    } else {
      alert("Incorrect password");
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
  };

  const toggleVisibility = (id: string) => {
    setAppCards(cards =>
      cards.map(card =>
        card.id === id ? { ...card, visible: !card.visible } : card
      )
    );
  };

  const handleDragStart = (id: string) => {
    setDraggedCard(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedCard || draggedCard === targetId) return;

    setAppCards(cards => {
      const draggedIndex = cards.findIndex(c => c.id === draggedCard);
      const targetIndex = cards.findIndex(c => c.id === targetId);
      
      const newCards = [...cards];
      const [removed] = newCards.splice(draggedIndex, 1);
      newCards.splice(targetIndex, 0, removed);
      
      return newCards.map((card, index) => ({ ...card, order: index }));
    });
  };

  const handleDragEnd = () => {
    setDraggedCard(null);
  };

  const handleExportAll = async () => {
    try {
      const data = await exportAllData();
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SBI_Branch_Backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert("All data exported successfully!");
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export data. Please try again.");
    }
  };

  const handleImportAll = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        await importAllData(text);
        alert("All data imported successfully! Please refresh the page.");
        window.location.reload();
      } catch (error) {
        console.error("Import failed:", error);
        alert("Failed to import data. Please check the file format.");
      }
    };
    input.click();
  };

  const visibleCards = isAdmin ? appCards : appCards.filter(card => card.visible);

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
        className="w-full py-2 px-6"
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
                {branchName}
              </p>
            </div>
          </div>

          {/* Admin Controls */}
          <div className="flex items-center gap-3">
            {isAdmin && (
              <>
                <button
                  onClick={() => {
                    setTempBranchCode(branchCode);
                    setTempBranchName(branchName);
                    setShowBranchConfig(true);
                  }}
                  className="flex items-center gap-2 bg-purple-600/80 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors border border-white/30"
                  title="Configure branch details"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Branch Config</span>
                </button>
                <button
                  onClick={handleExportAll}
                  className="flex items-center gap-2 bg-green-600/80 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors border border-white/30"
                  title="Export all app data"
                >
                  <Download className="w-4 h-4" />
                  <span>Export All</span>
                </button>
                <button
                  onClick={handleImportAll}
                  className="flex items-center gap-2 bg-blue-600/80 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors border border-white/30"
                  title="Import backup data"
                >
                  <Upload className="w-4 h-4" />
                  <span>Import All</span>
                </button>
              </>
            )}
            {isAdmin ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors border border-white/30"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors border border-white/30"
              >
                <LogIn className="w-4 h-4" />
                <span>Admin Login</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-10 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Page Title */}
          <div className="text-center mb-10">
            <h2 
              className="text-2xl font-semibold mb-2"
              style={{ color: "#4e1a74" }}
            >
              Branch Application Catalogue
            </h2>
            <p className="text-gray-600">
              Select an application to get started
            </p>
          </div>

          {/* Cards Grid - 3x3 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleCards.map((card) => (
              <div
                key={card.id}
                draggable={isAdmin}
                onDragStart={() => handleDragStart(card.id)}
                onDragOver={(e) => handleDragOver(e, card.id)}
                onDragEnd={handleDragEnd}
                className="relative"
              >
                <Link href={card.path}>
                  <div 
                    className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group border border-gray-100 hover:border-transparent"
                    style={{ 
                      minHeight: "200px",
                      height: "200px",
                      opacity: draggedCard === card.id ? 0.5 : 1
                    }}
                  >
                    {/* Drag Handle (Admin Only) */}
                    {isAdmin && (
                      <div className="absolute top-2 left-2 text-gray-400 cursor-move">
                        <GripVertical className="w-5 h-5" />
                      </div>
                    )}

                    {/* Icon */}
                    <div 
                      className="w-14 h-14 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300"
                      style={{ 
                        backgroundColor: `${card.color}15`,
                        color: card.color
                      }}
                    >
                      <IconComponent name={card.iconName} />
                    </div>
                    
                    {/* Title */}
                    <h3 
                      className="text-lg font-semibold mb-2 group-hover:text-opacity-90 transition-colors"
                      style={{ color: "#333" }}
                    >
                      {card.title}
                    </h3>
                    
                    {/* Description */}
                    <p 
                      className="text-sm leading-relaxed"
                      style={{ color: "#666" }}
                    >
                      {card.description}
                    </p>
                    
                    {/* Statistics (if available) */}
                    {card.statistics && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs font-medium" style={{ color: "#333" }}>
                          {card.statistics}
                        </p>
                      </div>
                    )}
                  </div>
                </Link>

                {/* iOS-style Toggle Switch (Admin Only) */}
                {isAdmin && (
                  <div 
                    className="absolute top-2 right-2 z-10"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleVisibility(card.id);
                    }}
                  >
                    <div
                      className="relative inline-block w-12 h-7 cursor-pointer"
                      style={{
                        backgroundColor: card.visible ? "#34c759" : "#e5e5ea",
                        borderRadius: "100px",
                        transition: "background-color 0.3s ease"
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: "2px",
                          left: card.visible ? "26px" : "2px",
                          width: "23px",
                          height: "23px",
                          backgroundColor: "#ffffff",
                          borderRadius: "50%",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                          transition: "left 0.3s ease"
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-gray-300">
        <p className="text-center text-gray-600 text-sm">
          Ideation by <strong>Shivam Kaushik</strong> Developed with AI
        </p>
      </footer>

      {/* Login Modal */}
      {showLoginModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowLoginModal(false)}
        >
          <div 
            className="bg-white rounded-xl p-6 w-96 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold mb-4" style={{ color: "#4e1a74" }}>
              Admin Login
            </h3>
            
            {/* Task Statistics */}
            {(() => {
              const reminderCard = appCards.find(card => card.id === "reminders");
              if (reminderCard?.statistics) {
                return (
                  <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <h4 className="text-sm font-semibold mb-2" style={{ color: "#4e1a74" }}>
                      Reminder & To-Do Statistics
                    </h4>
                    <p className="text-xs font-medium text-gray-700">
                      {reminderCard.statistics}
                    </p>
                  </div>
                );
              }
              return null;
            })()}
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleLogin()}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                placeholder="Enter admin password"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleLogin}
                className="flex-1 bg-gradient-to-r from-pink-600 to-purple-700 text-white py-2 rounded-lg hover:opacity-90 transition-opacity font-medium"
              >
                Login
              </button>
              <button
                onClick={() => {
                  setShowLoginModal(false);
                  setPassword("");
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Branch Configuration Modal */}
      {showBranchConfig && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowBranchConfig(false)}
        >
          <div 
            className="bg-white rounded-xl p-6 w-96 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold mb-4" style={{ color: "#4e1a74" }}>
              Branch Configuration
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Branch Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={tempBranchCode}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^\d{0,5}$/.test(value)) {
                    setTempBranchCode(value);
                  }
                }}
                maxLength={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                placeholder="Enter 5-digit branch code"
              />
              <p className="text-xs text-gray-500 mt-1">Must be exactly 5 digits</p>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Branch Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={tempBranchName}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= 30) {
                    setTempBranchName(value);
                  }
                }}
                maxLength={30}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                placeholder="Enter branch name"
              />
              <p className="text-xs text-gray-500 mt-1">{tempBranchName.length}/30 characters</p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={saveBranchConfig}
                className="flex-1 bg-gradient-to-r from-pink-600 to-purple-700 text-white py-2 rounded-lg hover:opacity-90 transition-opacity font-medium"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowBranchConfig(false);
                  setTempBranchCode("");
                  setTempBranchName("");
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
