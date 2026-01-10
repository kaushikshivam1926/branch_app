/**
 * Landing Page for SBI PBB New Market Branch
 * 
 * Design: SBI branded header with gradient banner, 9 app cards in 3x3 grid
 * Colors: Gradient #d4007f to #4e1a74, Background #f7f4fb
 * Font: Effra (using Poppins as fallback since Effra is proprietary)
 */

import { Link } from "wouter";
import { 
  FileText, 
  Mail, 
  Calculator, 
  Users, 
  CreditCard, 
  BarChart3, 
  Shield, 
  Building2, 
  FileSpreadsheet 
} from "lucide-react";

interface AppCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  color: string;
}

const appCards: AppCard[] = [
  {
    id: "dak-number",
    title: "Dak Number Generator",
    description: "Generate and manage Dak numbers for official correspondence",
    icon: <Mail className="w-8 h-8" />,
    path: "/dak-number",
    color: "#d4007f"
  },
  {
    id: "loan-recovery",
    title: "Loan Recovery Notice Generator",
    description: "Generate recovery notices for non-performing loan accounts",
    icon: <FileText className="w-8 h-8" />,
    path: "/loan-recovery",
    color: "#4e1a74"
  },
  {
    id: "emi-calculator",
    title: "EMI Calculator",
    description: "Calculate EMI for various loan products",
    icon: <Calculator className="w-8 h-8" />,
    path: "/emi-calculator",
    color: "#0066b3"
  },
  {
    id: "customer-directory",
    title: "Customer Directory",
    description: "Search and manage customer information",
    icon: <Users className="w-8 h-8" />,
    path: "/customer-directory",
    color: "#00a650"
  },
  {
    id: "account-statement",
    title: "Account Statement Generator",
    description: "Generate account statements for customers",
    icon: <CreditCard className="w-8 h-8" />,
    path: "/account-statement",
    color: "#ff6b00"
  },
  {
    id: "branch-reports",
    title: "Branch Reports",
    description: "View and generate branch performance reports",
    icon: <BarChart3 className="w-8 h-8" />,
    path: "/branch-reports",
    color: "#e91e63"
  },
  {
    id: "security-docs",
    title: "Security Documents",
    description: "Manage loan security and collateral documents",
    icon: <Shield className="w-8 h-8" />,
    path: "/security-docs",
    color: "#673ab7"
  },
  {
    id: "branch-info",
    title: "Branch Information",
    description: "View branch details and contact information",
    icon: <Building2 className="w-8 h-8" />,
    path: "/branch-info",
    color: "#009688"
  },
  {
    id: "misc-reports",
    title: "Miscellaneous Reports",
    description: "Generate various miscellaneous reports",
    icon: <FileSpreadsheet className="w-8 h-8" />,
    path: "/misc-reports",
    color: "#795548"
  }
];

export default function Landing() {
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
        className="w-full py-4 px-6"
        style={{ 
          background: "linear-gradient(to right, #d4007f, #4e1a74)"
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          {/* SBI Logo */}
          <div className="flex-shrink-0">
            <img 
              src="/images/sbi-logo.png" 
              alt="State Bank of India" 
              className="h-14 w-auto"
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
            {appCards.map((card) => (
              <Link key={card.id} href={card.path}>
                <div 
                  className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group border border-gray-100 hover:border-transparent"
                  style={{ 
                    minHeight: "180px"
                  }}
                >
                  {/* Icon */}
                  <div 
                    className="w-14 h-14 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300"
                    style={{ 
                      backgroundColor: `${card.color}15`,
                      color: card.color
                    }}
                  >
                    {card.icon}
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
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Dark horizontal line */}
          <div 
            className="w-full h-px mb-4"
            style={{ backgroundColor: "#333" }}
          />
          
          {/* Credit text */}
          <p 
            className="text-center text-sm"
            style={{ color: "#666" }}
          >
            Ideation by <strong className="font-semibold">Shivam Kaushik</strong> Developed with AI
          </p>
        </div>
      </footer>
    </div>
  );
}
