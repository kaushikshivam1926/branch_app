/**
 * Placeholder App Component
 * 
 * Displays a "Coming Soon" message for apps that are not yet implemented
 * Maintains consistent SBI branding with the landing page
 */

import { Link } from "wouter";
import { ArrowLeft, Construction } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlaceholderAppProps {
  title: string;
}

export default function PlaceholderApp({ title }: PlaceholderAppProps) {
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
      <main className="flex-1 flex items-center justify-center py-10 px-6">
        <div className="text-center">
          {/* Construction Icon */}
          <div 
            className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center"
            style={{ backgroundColor: "#4e1a7415" }}
          >
            <Construction 
              className="w-12 h-12"
              style={{ color: "#4e1a74" }}
            />
          </div>
          
          {/* Title */}
          <h2 
            className="text-2xl font-semibold mb-3"
            style={{ color: "#4e1a74" }}
          >
            {title}
          </h2>
          
          {/* Message */}
          <p 
            className="text-lg mb-6"
            style={{ color: "#666" }}
          >
            This application is coming soon!
          </p>
          
          {/* Back Button */}
          <Link href="/">
            <Button 
              variant="outline"
              className="gap-2"
              style={{ 
                borderColor: "#4e1a74",
                color: "#4e1a74"
              }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
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
