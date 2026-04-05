import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { loadData } from "@/lib/db";

interface BranchConfig {
  branchCode: string;
  branchName: string;
  address1?: string;
  address2?: string;
  state?: string;
  pinCode?: string;
}

interface BranchContextType {
  branchCode: string;
  branchName: string;
  address1?: string;
  address2?: string;
  state?: string;
  pinCode?: string;
  refreshBranchConfig: () => Promise<void>;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: ReactNode }) {
  const [branchCode, setBranchCode] = useState("99999");
  const [branchName, setBranchName] = useState("Enter Branch in Admin portal");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [state, setState] = useState("");
  const [pinCode, setPinCode] = useState("");

  const loadBranchConfig = async () => {
    try {
      const config = await loadData("sbi-branch-config");
      if (config) {
        setBranchCode(config.branchCode || "99999");
        setBranchName(config.branchName || "Enter Branch in Admin portal");
        setAddress1(config.address1 || "");
        setAddress2(config.address2 || "");
        setState(config.state || "");
        setPinCode(config.pinCode || "");
      }
    } catch (error) {
      console.error("Failed to load branch config:", error);
    }
  };

  useEffect(() => {
    loadBranchConfig();
  }, []);

  const refreshBranchConfig = async () => {
    await loadBranchConfig();
  };

  return (
    <BranchContext.Provider value={{ branchCode, branchName, address1, address2, state, pinCode, refreshBranchConfig }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const context = useContext(BranchContext);
  if (context === undefined) {
    throw new Error("useBranch must be used within a BranchProvider");
  }
  return context;
}
