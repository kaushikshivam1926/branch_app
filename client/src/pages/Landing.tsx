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
  GripVertical
} from "lucide-react";

type IconName = "Mail" | "FileText" | "Calculator" | "CheckSquare" | "UserPlus" | "Globe" | "Shield" | "Building2" | "FileSpreadsheet";

interface AppCard {
  id: string;
  title: string;
  description: string;
  iconName: IconName;
  path: string;
  color: string;
  visible: boolean;
  order: number;
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
    id: "security-docs",
    title: "Security Documents",
    description: "Manage loan security and collateral documents",
    iconName: "Shield",
    path: "/security-docs",
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

  // Load app settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem("sbi-app-settings");
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        // Check if the data has the new iconName field
        if (settings.length > 0 && settings[0].iconName) {
          setAppCards(settings);
        } else {
          // Old format detected, reinitialize
          initializeDefaultCards();
        }
      } catch {
        initializeDefaultCards();
      }
    } else {
      initializeDefaultCards();
    }
  }, []);

  const initializeDefaultCards = () => {
    const cards = defaultAppCards.map((card, index) => ({
      ...card,
      visible: true,
      order: index
    }));
    setAppCards(cards);
    localStorage.setItem("sbi-app-settings", JSON.stringify(cards));
  };

  // Save settings whenever cards change
  useEffect(() => {
    if (appCards.length > 0) {
      localStorage.setItem("sbi-app-settings", JSON.stringify(appCards));
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
          background: "linear-gradient(to right, #d4007f, #4e1a74)"
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
                PBB New Market Branch
              </p>
            </div>
          </div>

          {/* Admin Login/Logout Button */}
          <div>
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
    </div>
  );
}
