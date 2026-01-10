/**
 * EMI Calculator
 * 
 * Features:
 * - 4-quadrant glass-like EMI calculator with distinct colors
 * - Mathematical calculator with glassmorphism
 * - Amortization schedule with loan summary
 */

import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search } from "lucide-react";

interface AmortizationRow {
  month: number;
  date: string;
  emi: number;
  principal: number;
  interest: number;
  balance: number;
}

export default function EMICalculator() {
  // EMI Calculator State
  const [loanAmount, setLoanAmount] = useState<string>("");
  const [interestRate, setInterestRate] = useState<string>("");
  const [loanTenure, setLoanTenure] = useState<string>("");
  const [emiAmount, setEmiAmount] = useState<string>("");
  const [tenureInYears, setTenureInYears] = useState<boolean>(true);
  
  // Loan Summary
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [totalInterest, setTotalInterest] = useState<number>(0);
  const [amortization, setAmortization] = useState<AmortizationRow[]>([]);
  
  // Mathematical Calculator State
  const [calcDisplay, setCalcDisplay] = useState<string>("0");
  const [calcExpression, setCalcExpression] = useState<string>("");
  const [waitingForOperand, setWaitingForOperand] = useState<boolean>(false);

  // EMI Calculation Functions
  const calculateEMI = () => {
    const P = parseFloat(loanAmount);
    const annualRate = parseFloat(interestRate);
    const tenure = parseFloat(loanTenure);
    
    if (isNaN(P) || isNaN(annualRate) || isNaN(tenure) || P <= 0 || annualRate <= 0 || tenure <= 0) {
      return;
    }
    
    const months = tenureInYears ? tenure * 12 : tenure;
    const r = annualRate / 12 / 100;
    
    const emi = (P * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
    setEmiAmount(emi.toFixed(2));
    generateAmortization(P, r, months, emi);
  };

  const calculateLoanAmount = () => {
    const emi = parseFloat(emiAmount);
    const annualRate = parseFloat(interestRate);
    const tenure = parseFloat(loanTenure);
    
    if (isNaN(emi) || isNaN(annualRate) || isNaN(tenure) || emi <= 0 || annualRate <= 0 || tenure <= 0) {
      return;
    }
    
    const months = tenureInYears ? tenure * 12 : tenure;
    const r = annualRate / 12 / 100;
    
    const P = emi * (Math.pow(1 + r, months) - 1) / (r * Math.pow(1 + r, months));
    setLoanAmount(P.toFixed(2));
    generateAmortization(P, r, months, emi);
  };

  const calculateInterestRate = () => {
    const P = parseFloat(loanAmount);
    const emi = parseFloat(emiAmount);
    const tenure = parseFloat(loanTenure);
    
    if (isNaN(P) || isNaN(emi) || isNaN(tenure) || P <= 0 || emi <= 0 || tenure <= 0) {
      return;
    }
    
    const months = tenureInYears ? tenure * 12 : tenure;
    
    // Newton-Raphson method to find interest rate
    let r = 0.01; // Initial guess
    for (let i = 0; i < 100; i++) {
      const f = P * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1) - emi;
      const fPrime = P * (Math.pow(1 + r, months) * (1 + r * months) - r * months * Math.pow(1 + r, months - 1)) / Math.pow(Math.pow(1 + r, months) - 1, 2);
      const newR = r - f / fPrime;
      if (Math.abs(newR - r) < 0.0000001) break;
      r = newR;
    }
    
    const annualRate = r * 12 * 100;
    setInterestRate(annualRate.toFixed(2));
    generateAmortization(P, r, months, emi);
  };

  const calculateTenure = () => {
    const P = parseFloat(loanAmount);
    const emi = parseFloat(emiAmount);
    const annualRate = parseFloat(interestRate);
    
    if (isNaN(P) || isNaN(emi) || isNaN(annualRate) || P <= 0 || emi <= 0 || annualRate <= 0) {
      return;
    }
    
    const r = annualRate / 12 / 100;
    
    // n = log(EMI / (EMI - P*r)) / log(1 + r)
    const months = Math.log(emi / (emi - P * r)) / Math.log(1 + r);
    const tenure = tenureInYears ? months / 12 : months;
    setLoanTenure(tenure.toFixed(2));
    generateAmortization(P, r, Math.ceil(months), emi);
  };

  const generateAmortization = (principal: number, monthlyRate: number, months: number, emi: number) => {
    const schedule: AmortizationRow[] = [];
    let balance = principal;
    const startDate = new Date();
    
    for (let i = 1; i <= months; i++) {
      const interest = balance * monthlyRate;
      const principalPaid = emi - interest;
      balance -= principalPaid;
      
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + i);
      
      schedule.push({
        month: i,
        date: date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
        emi: emi,
        principal: principalPaid,
        interest: interest,
        balance: Math.max(0, balance)
      });
    }
    
    setAmortization(schedule);
    setTotalAmount(emi * months);
    setTotalInterest(emi * months - principal);
  };

  // Mathematical Calculator Functions
  const handleCalcDigit = (digit: string) => {
    if (waitingForOperand) {
      setCalcDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setCalcDisplay(calcDisplay === "0" ? digit : calcDisplay + digit);
    }
  };

  const handleCalcOperator = (operator: string) => {
    setCalcExpression(calcDisplay + " " + operator + " ");
    setWaitingForOperand(true);
  };

  const handleCalcEquals = () => {
    try {
      const expression = calcExpression + calcDisplay;
      // Safe evaluation
      const result = Function('"use strict"; return (' + expression.replace(/×/g, '*').replace(/÷/g, '/') + ')')();
      setCalcDisplay(String(result));
      setCalcExpression("");
    } catch {
      setCalcDisplay("Error");
    }
    setWaitingForOperand(true);
  };

  const handleCalcClear = () => {
    setCalcDisplay("0");
    setCalcExpression("");
    setWaitingForOperand(false);
  };

  const handleCalcClearEntry = () => {
    setCalcDisplay("0");
    setWaitingForOperand(false);
  };

  const handleCalcDecimal = () => {
    if (!calcDisplay.includes(".")) {
      setCalcDisplay(calcDisplay + ".");
    }
  };

  const handleCalcPercent = () => {
    const value = parseFloat(calcDisplay) / 100;
    setCalcDisplay(String(value));
  };

  const handleCalcSqrt = () => {
    const value = Math.sqrt(parseFloat(calcDisplay));
    setCalcDisplay(String(value));
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num);
  };

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
          background: "linear-gradient(to right, #d4007f, #4e1a74)",
          boxShadow: "0 0 14px rgba(212, 0, 127, 0.45)"
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <div className="flex-shrink-0">
            <img 
              src="/images/sbi-logo.png" 
              alt="State Bank of India" 
              className="h-14 w-auto"
              style={{ filter: "brightness(0) invert(1)" }}
            />
          </div>
          <div className="flex flex-col justify-center">
            <h1 
              className="text-white font-semibold leading-tight"
              style={{ fontSize: "1.3rem" }}
            >
              EMI Calculator
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
      <main className="flex-1 py-4 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <Link href="/">
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-2 mb-3 hover:bg-white/50"
              style={{ color: "#4e1a74" }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>

          {/* Main Layout: 2/3 left, 1/3 right */}
          <div className="flex gap-4" style={{ minHeight: "calc(100vh - 200px)" }}>
            
            {/* Left Section (2/3) */}
            <div className="flex flex-col gap-4" style={{ width: "66%" }}>
              
              {/* EMI Calculator - Glass Grid */}
              <div 
                className="relative overflow-hidden"
                style={{ 
                  borderRadius: "24px",
                  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15)"
                }}
              >
                <div className="grid grid-cols-2">
                  {/* Loan Amount - Top Left - Pink */}
                  <div 
                    className="p-6 flex flex-col justify-center items-center"
                    style={{ 
                      backgroundColor: "#d4007f",
                      minHeight: "160px"
                    }}
                  >
                    <label className="text-white/90 text-sm font-medium mb-2">
                      Loan Amount (₹)
                    </label>
                    <div className="flex items-center gap-2 w-full max-w-[200px]">
                      <input
                        type="number"
                        value={loanAmount}
                        onChange={(e) => setLoanAmount(e.target.value)}
                        placeholder="Enter amount"
                        className="flex-1 px-3 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 text-center backdrop-blur-sm"
                        style={{ outline: "none" }}
                      />
                      <button
                        onClick={calculateLoanAmount}
                        className="p-2 rounded-lg bg-white/20 border border-white/30 text-white hover:bg-white/30 transition-colors"
                        title="Calculate Loan Amount"
                      >
                        <Search className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Loan Tenure - Top Right - Purple */}
                  <div 
                    className="p-6 flex flex-col justify-center items-center"
                    style={{ 
                      backgroundColor: "#4e1a74",
                      minHeight: "160px"
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <label className="text-white/90 text-sm font-medium">
                        Loan Tenure
                      </label>
                      <button
                        onClick={() => setTenureInYears(!tenureInYears)}
                        className="px-2 py-1 rounded text-xs bg-white/20 text-white border border-white/30"
                      >
                        {tenureInYears ? "Years" : "Months"}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 w-full max-w-[200px]">
                      <input
                        type="number"
                        value={loanTenure}
                        onChange={(e) => setLoanTenure(e.target.value)}
                        placeholder={tenureInYears ? "Years" : "Months"}
                        className="flex-1 px-3 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 text-center backdrop-blur-sm"
                        style={{ outline: "none" }}
                      />
                      <button
                        onClick={calculateTenure}
                        className="p-2 rounded-lg bg-white/20 border border-white/30 text-white hover:bg-white/30 transition-colors"
                        title="Calculate Tenure"
                      >
                        <Search className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Rate of Interest - Bottom Left - Cyan */}
                  <div 
                    className="p-6 flex flex-col justify-center items-center"
                    style={{ 
                      backgroundColor: "#00B5EF",
                      minHeight: "160px"
                    }}
                  >
                    <label className="text-white/90 text-sm font-medium mb-2">
                      Rate of Interest (%)
                    </label>
                    <div className="flex items-center gap-2 w-full max-w-[200px]">
                      <input
                        type="number"
                        value={interestRate}
                        onChange={(e) => setInterestRate(e.target.value)}
                        placeholder="Annual %"
                        step="0.1"
                        className="flex-1 px-3 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 text-center backdrop-blur-sm"
                        style={{ outline: "none" }}
                      />
                      <button
                        onClick={calculateInterestRate}
                        className="p-2 rounded-lg bg-white/20 border border-white/30 text-white hover:bg-white/30 transition-colors"
                        title="Calculate Interest Rate"
                      >
                        <Search className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* EMI Amount - Bottom Right - Dark Blue */}
                  <div 
                    className="p-6 flex flex-col justify-center items-center"
                    style={{ 
                      backgroundColor: "#292075",
                      minHeight: "160px"
                    }}
                  >
                    <label className="text-white/90 text-sm font-medium mb-2">
                      EMI Amount (₹)
                    </label>
                    <div className="flex items-center gap-2 w-full max-w-[200px]">
                      <input
                        type="number"
                        value={emiAmount}
                        onChange={(e) => setEmiAmount(e.target.value)}
                        placeholder="Monthly EMI"
                        className="flex-1 px-3 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 text-center backdrop-blur-sm"
                        style={{ outline: "none" }}
                      />
                      <button
                        onClick={calculateEMI}
                        className="p-2 rounded-lg bg-white/20 border border-white/30 text-white hover:bg-white/30 transition-colors"
                        title="Calculate EMI"
                      >
                        <Search className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mathematical Calculator */}
              <div 
                className="p-4"
                style={{ 
                  background: "rgba(30, 30, 40, 0.85)",
                  backdropFilter: "blur(20px)",
                  borderRadius: "20px",
                  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)"
                }}
              >
                {/* Display */}
                <div 
                  className="mb-4 p-4 text-right"
                  style={{ 
                    background: "rgba(255, 255, 255, 0.05)",
                    borderRadius: "12px",
                    border: "1px solid rgba(255, 255, 255, 0.1)"
                  }}
                >
                  <div className="text-white/50 text-sm h-5">{calcExpression}</div>
                  <div className="text-white text-3xl font-light">{calcDisplay}</div>
                </div>

                {/* Keypad */}
                <div className="grid grid-cols-6 gap-2">
                  {/* Row 1 */}
                  <CalcButton onClick={handleCalcClearEntry} label="C" variant="gray" />
                  <CalcButton onClick={handleCalcClear} label="AC" variant="gray" />
                  <CalcButton onClick={handleCalcSqrt} label="√" variant="gray" />
                  <CalcButton onClick={handleCalcPercent} label="%" variant="gray" />
                  <CalcButton onClick={() => handleCalcOperator("+")} label="+" variant="pink" />
                  <CalcButton onClick={handleCalcSqrt} label="√" variant="pink" />
                  
                  {/* Row 2 */}
                  <CalcButton onClick={() => handleCalcDigit("7")} label="7" variant="gray" />
                  <CalcButton onClick={() => handleCalcDigit("8")} label="8" variant="gray" />
                  <CalcButton onClick={() => handleCalcDigit("9")} label="9" variant="gray" />
                  <CalcButton onClick={() => handleCalcDigit("0")} label="0" variant="gray" />
                  <CalcButton onClick={() => handleCalcOperator("×")} label="×" variant="purple" />
                  <CalcButton onClick={() => handleCalcOperator("-")} label="−" variant="purple" />
                  
                  {/* Row 3 */}
                  <CalcButton onClick={() => handleCalcDigit("4")} label="4" variant="gray" />
                  <CalcButton onClick={() => handleCalcDigit("5")} label="5" variant="gray" />
                  <CalcButton onClick={() => handleCalcDigit("5")} label="5" variant="gray" />
                  <CalcButton onClick={() => handleCalcDigit("6")} label="6" variant="gray" />
                  <CalcButton onClick={() => handleCalcOperator("×")} label="×" variant="cyan" />
                  <CalcButton onClick={() => handleCalcOperator("÷")} label="÷" variant="purple" />
                  
                  {/* Row 4 */}
                  <CalcButton onClick={() => handleCalcDigit("1")} label="1" variant="gray" />
                  <CalcButton onClick={() => handleCalcDigit("2")} label="2" variant="gray" />
                  <CalcButton onClick={() => handleCalcDigit("3")} label="3" variant="gray" />
                  <CalcButton onClick={() => handleCalcDigit("3")} label="3" variant="gray" />
                  <CalcButton onClick={() => handleCalcOperator("+")} label="+" variant="cyan" />
                  <CalcButton onClick={handleCalcEquals} label="=" variant="blue" />
                  
                  {/* Row 5 */}
                  <CalcButton onClick={() => handleCalcDigit("0")} label="0" variant="gray" wide />
                  <CalcButton onClick={handleCalcDecimal} label="." variant="gray" />
                  <CalcButton onClick={handleCalcPercent} label="%" variant="gray" />
                </div>
              </div>
            </div>

            {/* Right Section (1/3) - Amortization Schedule */}
            <div 
              className="flex flex-col"
              style={{ 
                width: "34%",
                background: "rgba(255, 255, 255, 0.7)",
                backdropFilter: "blur(10px)",
                borderRadius: "16px",
                border: "1px solid rgba(255, 255, 255, 0.5)",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)"
              }}
            >
              {/* Loan Summary */}
              <div 
                className="p-4 border-b"
                style={{ borderColor: "rgba(78, 26, 116, 0.2)" }}
              >
                <h3 
                  className="text-lg font-semibold mb-3"
                  style={{ color: "#4e1a74" }}
                >
                  Loan Summary
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-sm">Principal Amount</span>
                    <span className="font-medium" style={{ color: "#292075" }}>
                      {loanAmount ? formatCurrency(parseFloat(loanAmount)) : "₹0"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-sm">Total Interest</span>
                    <span className="font-medium" style={{ color: "#d4007f" }}>
                      {formatCurrency(totalInterest)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t" style={{ borderColor: "rgba(0,0,0,0.1)" }}>
                    <span className="text-gray-700 font-medium">Total Amount</span>
                    <span className="font-bold" style={{ color: "#4e1a74" }}>
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-sm">Monthly EMI</span>
                    <span className="font-semibold" style={{ color: "#00B5EF" }}>
                      {emiAmount ? formatCurrency(parseFloat(emiAmount)) : "₹0"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Amortization Schedule */}
              <div className="flex-1 overflow-hidden flex flex-col">
                <h3 
                  className="text-lg font-semibold p-4 pb-2"
                  style={{ color: "#4e1a74" }}
                >
                  Repayment Schedule
                </h3>
                <div className="flex-1 overflow-auto px-4 pb-4">
                  {amortization.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      Enter loan details and calculate to see the repayment schedule
                    </div>
                  ) : (
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-white/90">
                        <tr style={{ color: "#4e1a74" }}>
                          <th className="py-2 text-left">#</th>
                          <th className="py-2 text-left">Date</th>
                          <th className="py-2 text-right">EMI</th>
                          <th className="py-2 text-right">Principal</th>
                          <th className="py-2 text-right">Interest</th>
                        </tr>
                      </thead>
                      <tbody>
                        {amortization.map((row) => (
                          <tr 
                            key={row.month} 
                            className="border-t"
                            style={{ borderColor: "rgba(0,0,0,0.05)" }}
                          >
                            <td className="py-1.5 text-gray-600">{row.month}</td>
                            <td className="py-1.5 text-gray-700">{row.date}</td>
                            <td className="py-1.5 text-right font-medium" style={{ color: "#292075" }}>
                              {row.emi.toFixed(0)}
                            </td>
                            <td className="py-1.5 text-right" style={{ color: "#00B5EF" }}>
                              {row.principal.toFixed(0)}
                            </td>
                            <td className="py-1.5 text-right" style={{ color: "#d4007f" }}>
                              {row.interest.toFixed(0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-3 px-6">
        <div className="max-w-7xl mx-auto">
          <div 
            className="w-full h-px mb-3"
            style={{ backgroundColor: "#4e1a74" }}
          />
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

// Calculator Button Component
interface CalcButtonProps {
  onClick: () => void;
  label: string;
  variant: "gray" | "pink" | "purple" | "cyan" | "blue";
  wide?: boolean;
}

function CalcButton({ onClick, label, variant, wide }: CalcButtonProps) {
  const getStyles = () => {
    const base = {
      padding: "12px",
      borderRadius: "10px",
      fontSize: "18px",
      fontWeight: "500",
      transition: "all 0.2s",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      backdropFilter: "blur(10px)",
      cursor: "pointer"
    };
    
    switch (variant) {
      case "pink":
        return { ...base, background: "rgba(212, 0, 127, 0.6)", color: "white" };
      case "purple":
        return { ...base, background: "rgba(78, 26, 116, 0.6)", color: "white" };
      case "cyan":
        return { ...base, background: "rgba(0, 181, 239, 0.6)", color: "white" };
      case "blue":
        return { ...base, background: "rgba(41, 32, 117, 0.8)", color: "white" };
      default:
        return { ...base, background: "rgba(255, 255, 255, 0.1)", color: "white" };
    }
  };

  return (
    <button
      onClick={onClick}
      style={getStyles()}
      className={`hover:opacity-80 active:scale-95 ${wide ? "col-span-2" : ""}`}
    >
      {label}
    </button>
  );
}
