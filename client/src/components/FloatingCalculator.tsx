/**
 * Floating Calculator Component
 * 
 * A beautifully designed calculator that floats as a FAB in the bottom-right corner.
 * Available globally across all apps with state persistence and keyboard support.
 */

import { useState, useEffect, useRef } from "react";
import { Calculator, X, Delete } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FloatingCalculator() {
  const [isOpen, setIsOpen] = useState(false);
  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const calculatorRef = useRef<HTMLDivElement>(null);

  // Handle keyboard input
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      
      // Numbers
      if (/^[0-9]$/.test(e.key)) {
        handleDigit(e.key);
      }
      // Decimal point
      else if (e.key === "." || e.key === ",") {
        handleDecimal();
      }
      // Operations
      else if (["+", "-", "*", "/"].includes(e.key)) {
        handleOperation(e.key);
      }
      // Equals
      else if (e.key === "Enter" || e.key === "=") {
        handleEquals();
      }
      // Clear
      else if (e.key === "Escape" || e.key === "c" || e.key === "C") {
        handleClear();
      }
      // Backspace
      else if (e.key === "Backspace") {
        handleBackspace();
      }
      // Percentage
      else if (e.key === "%") {
        handlePercent();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, display, previousValue, operation, waitingForOperand]);

  const handleDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === "0" ? digit : display + digit);
    }
  };

  const handleDecimal = () => {
    if (waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
    } else if (display.indexOf(".") === -1) {
      setDisplay(display + ".");
    }
  };

  const handleOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      const newValue = performOperation(currentValue, inputValue, operation);
      setDisplay(String(newValue));
      setPreviousValue(newValue);
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  };

  const performOperation = (firstValue: number, secondValue: number, op: string): number => {
    switch (op) {
      case "+":
        return firstValue + secondValue;
      case "-":
        return firstValue - secondValue;
      case "*":
        return firstValue * secondValue;
      case "/":
        return firstValue / secondValue;
      default:
        return secondValue;
    }
  };

  const handleEquals = () => {
    const inputValue = parseFloat(display);

    if (previousValue !== null && operation) {
      const newValue = performOperation(previousValue, inputValue, operation);
      setDisplay(String(newValue));
      setPreviousValue(null);
      setOperation(null);
      setWaitingForOperand(true);
    }
  };

  const handleClear = () => {
    setDisplay("0");
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const handleBackspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay("0");
    }
  };

  const handlePercent = () => {
    const value = parseFloat(display);
    setDisplay(String(value / 100));
  };

  const handleToggleSign = () => {
    const value = parseFloat(display);
    setDisplay(String(value * -1));
  };

  return (
    <>
      {/* Floating Action Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="print:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all z-50"
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        }}
        aria-label="Toggle Calculator"
      >
        {isOpen ? <X className="h-6 w-6 text-white" /> : <Calculator className="h-6 w-6 text-white" />}
      </Button>

      {/* Calculator Panel */}
      <div
        ref={calculatorRef}
        className={`print:hidden fixed bottom-24 right-6 w-80 bg-white rounded-2xl shadow-2xl transition-all duration-300 z-40 ${
          isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
        style={{
          border: "1px solid rgba(0,0,0,0.1)",
        }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 rounded-t-2xl flex items-center justify-between"
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          }}
        >
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-white" />
            <span className="text-white font-semibold">Calculator</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 p-0 text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Display */}
        <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-100">
          <div className="text-right">
            {operation && previousValue !== null && (
              <div className="text-sm text-slate-500 mb-1">
                {previousValue} {operation}
              </div>
            )}
            <div className="text-4xl font-bold text-slate-900 break-all">
              {display}
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="p-4 grid grid-cols-4 gap-2">
          {/* Row 1 */}
          <CalcButton onClick={handleClear} variant="secondary" className="bg-red-100 hover:bg-red-200 text-red-700">
            C
          </CalcButton>
          <CalcButton onClick={handleToggleSign} variant="secondary">
            +/-
          </CalcButton>
          <CalcButton onClick={handlePercent} variant="secondary">
            %
          </CalcButton>
          <CalcButton onClick={() => handleOperation("/")} variant="operation">
            ÷
          </CalcButton>

          {/* Row 2 */}
          <CalcButton onClick={() => handleDigit("7")}>7</CalcButton>
          <CalcButton onClick={() => handleDigit("8")}>8</CalcButton>
          <CalcButton onClick={() => handleDigit("9")}>9</CalcButton>
          <CalcButton onClick={() => handleOperation("*")} variant="operation">
            ×
          </CalcButton>

          {/* Row 3 */}
          <CalcButton onClick={() => handleDigit("4")}>4</CalcButton>
          <CalcButton onClick={() => handleDigit("5")}>5</CalcButton>
          <CalcButton onClick={() => handleDigit("6")}>6</CalcButton>
          <CalcButton onClick={() => handleOperation("-")} variant="operation">
            −
          </CalcButton>

          {/* Row 4 */}
          <CalcButton onClick={() => handleDigit("1")}>1</CalcButton>
          <CalcButton onClick={() => handleDigit("2")}>2</CalcButton>
          <CalcButton onClick={() => handleDigit("3")}>3</CalcButton>
          <CalcButton onClick={() => handleOperation("+")} variant="operation">
            +
          </CalcButton>

          {/* Row 5 */}
          <CalcButton onClick={() => handleDigit("0")} className="col-span-2">
            0
          </CalcButton>
          <CalcButton onClick={handleDecimal}>.</CalcButton>
          <CalcButton onClick={handleEquals} variant="equals">
            =
          </CalcButton>
        </div>

        {/* Keyboard Hint */}
        <div className="px-4 pb-3 text-xs text-slate-500 text-center">
          Keyboard shortcuts: 0-9, +, -, *, /, Enter, Esc, Backspace
        </div>
      </div>
    </>
  );
}

interface CalcButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: "default" | "operation" | "equals" | "secondary";
  className?: string;
}

function CalcButton({ onClick, children, variant = "default", className = "" }: CalcButtonProps) {
  const baseClasses = "h-14 rounded-xl font-semibold text-lg transition-all active:scale-95";
  
  const variantClasses = {
    default: "bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 shadow-sm",
    operation: "bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-md",
    equals: "bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-md",
    secondary: "bg-slate-200 hover:bg-slate-300 text-slate-700",
  };

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
