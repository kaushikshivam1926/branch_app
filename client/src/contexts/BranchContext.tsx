import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { loadData } from "@/lib/db";

interface BranchConfig {
  branchCode: string;
  branchName: string;
}

interface BranchContextType {
  branchCode: string;
  branchName: string;
  refreshBranchConfig: () => Promise<void>;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: ReactNode }) {
  const [branchCode, setBranchCode] = useState("13042");
  const [branchName, setBranchName] = useState("PBB New Market Branch");

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

  useEffect(() => {
    loadBranchConfig();
  }, []);

  const refreshBranchConfig = async () => {
    await loadBranchConfig();
  };

  return (
    <BranchContext.Provider value={{ branchCode, branchName, refreshBranchConfig }}>
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
