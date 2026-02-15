/**
 * Branch Portfolio Dashboard
 * 
 * Comprehensive dashboard for branch portfolio management with:
 * - Branch Overview: Key metrics and portfolio summary
 * - Customer 360: Complete customer view with deposits and loans
 * - Deposit Portfolio: Deposit analytics and breakdown
 * - Loans Portfolio: Loan analytics and asset quality
 * - Asset Quality: NPA management and monitoring
 * - Data Upload: CSV file upload and processing
 */

import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useBranch } from "@/contexts/BranchContext";
import {
  ArrowLeft,
  Home,
  Users,
  PiggyBank,
  CreditCard,
  AlertTriangle,
  Upload,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Import sub-components (to be created)
import BranchOverview from "./portfolio/BranchOverview";
import Customer360 from "./portfolio/Customer360";
import DepositPortfolio from "./portfolio/DepositPortfolio";
import LoansPortfolio from "./portfolio/LoansPortfolio";
import AssetQuality from "./portfolio/AssetQuality";
import DataUpload from "./portfolio/DataUpload";

type NavigationItem = {
  id: string;
  label: string;
  icon: React.ElementType;
  component: React.ComponentType;
};

const navigationItems: NavigationItem[] = [
  { id: "overview", label: "Branch Overview", icon: Home, component: BranchOverview },
  { id: "customer360", label: "Customer 360", icon: Users, component: Customer360 },
  { id: "deposits", label: "Deposit Portfolio", icon: PiggyBank, component: DepositPortfolio },
  { id: "loans", label: "Loans Portfolio", icon: CreditCard, component: LoansPortfolio },
  { id: "asset-quality", label: "Asset Quality", icon: AlertTriangle, component: AssetQuality },
  { id: "data-upload", label: "Data Upload", icon: Upload, component: DataUpload },
];

export default function BranchPortfolioDashboard() {
  const { branchName } = useBranch();
  const [activeSection, setActiveSection] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Check if data is loaded
  useEffect(() => {
    // Check IndexedDB for data
    const checkData = async () => {
      // TODO: Implement data check
      setDataLoaded(false);
    };
    checkData();
  }, []);

  const ActiveComponent = navigationItems.find(item => item.id === activeSection)?.component || BranchOverview;

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
        <div className="max-w-full mx-auto flex items-center justify-between">
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
                Branch Portfolio Dashboard
              </h1>
              <p 
                className="text-white/90"
                style={{ fontSize: "0.85rem" }}
              >
                {branchName}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-white/40 lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Sidebar Navigation */}
        <aside
          className={`
            ${sidebarOpen ? 'w-64' : 'w-0'}
            transition-all duration-300 overflow-hidden
            bg-white border-r border-gray-200
            lg:relative absolute lg:translate-x-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            h-full z-10
          `}
        >
          <nav className="p-4 space-y-2">
            {/* Back to Home */}
            <Link href="/">
              <Button 
                variant="ghost" 
                className="w-full justify-start mb-4 text-gray-600 hover:text-purple-700 hover:bg-purple-50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>

            {/* Navigation Items */}
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`
                    w-full flex items-center justify-between px-4 py-3 rounded-lg
                    transition-all duration-200
                    ${isActive 
                      ? 'bg-gradient-to-r from-pink-600 to-purple-700 text-white shadow-md' 
                      : 'text-gray-700 hover:bg-purple-50 hover:text-purple-700'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5" />
                    <span className="font-medium text-sm">{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4" />}
                </button>
              );
            })}
          </nav>

          {/* Data Status Indicator */}
          <div className="p-4 border-t border-gray-200">
            <div className={`
              px-3 py-2 rounded-lg text-xs font-medium
              ${dataLoaded 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-orange-50 text-orange-700 border border-orange-200'
              }
            `}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${dataLoaded ? 'bg-green-500' : 'bg-orange-500'}`} />
                {dataLoaded ? 'Data Loaded' : 'No Data - Upload Required'}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            <ActiveComponent />
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="py-4 px-6 bg-white border-t border-gray-200">
        <div className="max-w-full mx-auto">
          <p className="text-center text-sm" style={{ color: "#666" }}>
            Ideation by <strong>Shivam Kaushik</strong> Developed with AI
          </p>
        </div>
      </footer>
    </div>
  );
}
