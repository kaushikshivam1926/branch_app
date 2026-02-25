import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MasterPlanResult {
  surplus: number;
  emgMonths: number;
  targetEmgCorpus: number;
  emgShortfall: number;
  emgStatus: string;
  requiredCover: number;
  monthlyPremium: number;
  retCorpus: number;
  retSip: number;
  unallocated: number;
  status: 'critical' | 'warning' | 'excellent';
  statusMessage: string;
}

interface MasterPlanViewProps {
  // State values
  mpAge: string;
  mpRetAge: string;
  mpDependents: string;
  mpRisk: string;
  mpSmoker: boolean;
  mpIncome: string;
  mpExpenses: string;
  mpEmi: string;
  mpStepUp: string;
  mpSavings: string;
  mpInvestments: string;
  mpLoans: string;
  
  // State setters
  setMpAge: (v: string) => void;
  setMpRetAge: (v: string) => void;
  setMpDependents: (v: string) => void;
  setMpRisk: (v: string) => void;
  setMpSmoker: (v: boolean) => void;
  setMpIncome: (v: string) => void;
  setMpExpenses: (v: string) => void;
  setMpEmi: (v: string) => void;
  setMpStepUp: (v: string) => void;
  setMpSavings: (v: string) => void;
  setMpInvestments: (v: string) => void;
  setMpLoans: (v: string) => void;
  
  // Calculation result
  result: MasterPlanResult;
  
  // Utility functions
  formatINR: (n: number) => string;
  formatShort: (n: number) => string;
  
  // Navigation
  onBack: () => void;
  onExportPDF: () => void;
}

export default function MasterPlanView(props: MasterPlanViewProps) {
  const { result, formatINR, formatShort, onBack, onExportPDF } = props;
  
  const statusColors = {
    critical: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', badge: 'bg-red-100' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', badge: 'bg-amber-100' },
    excellent: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', badge: 'bg-emerald-100' }
  };
  
  const colors = statusColors[result.status];
  
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <Button variant="ghost" onClick={onBack} className="mb-4">
            ← Back to Dashboard
          </Button>
          <h2 className="text-3xl font-bold text-purple-900">Integrated Master Plan</h2>
          <p className="text-slate-600 mt-1">Cashflow-based sequencing for comprehensive financial planning</p>
        </div>
        <Button onClick={onExportPDF} className="bg-slate-800 hover:bg-slate-900">
          Save as PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Input Panel */}
        <div className="lg:col-span-4 space-y-6">
          {/* Demographics & Risk */}
          <Card className="p-5 border-t-4 border-slate-800">
            <h3 className="font-bold text-slate-800 mb-4">1. Demographics & Risk</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <Label>Current Age</Label>
                <Input type="number" value={props.mpAge} onChange={(e) => props.setMpAge(e.target.value)} />
              </div>
              <div>
                <Label>Retirement Age</Label>
                <Input type="number" value={props.mpRetAge} onChange={(e) => props.setMpRetAge(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Dependents</Label>
                <Select value={props.mpDependents} onValueChange={props.setMpDependents}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0</SelectItem>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Job Stability</Label>
                <Select value={props.mpRisk} onValueChange={props.setMpRisk}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Stable</SelectItem>
                    <SelectItem value="med">Average</SelectItem>
                    <SelectItem value="high">Risky</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Smoker</Label>
                <div className="flex items-center h-10">
                  <input
                    type="checkbox"
                    checked={props.mpSmoker}
                    onChange={(e) => props.setMpSmoker(e.target.checked)}
                    className="w-4 h-4"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Cash Flow */}
          <Card className="p-5 border-t-4 border-blue-500">
            <h3 className="font-bold text-slate-800 mb-4">2. Cash Flow (Monthly)</h3>
            <div className="space-y-4">
              <div>
                <Label>Net Take-Home Income (₹)</Label>
                <Input type="number" value={props.mpIncome} onChange={(e) => props.setMpIncome(e.target.value)} className="font-bold" />
              </div>
              <div>
                <Label>Mandatory Expenses (₹)</Label>
                <Input type="number" value={props.mpExpenses} onChange={(e) => props.setMpExpenses(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Existing EMIs (₹)</Label>
                  <Input type="number" value={props.mpEmi} onChange={(e) => props.setMpEmi(e.target.value)} />
                </div>
                <div>
                  <Label>Income Growth (%)</Label>
                  <Input type="number" value={props.mpStepUp} onChange={(e) => props.setMpStepUp(e.target.value)} />
                </div>
              </div>
            </div>
          </Card>

          {/* Assets & Liabilities */}
          <Card className="p-5 border-t-4 border-emerald-500">
            <h3 className="font-bold text-slate-800 mb-4">3. Assets & Liabilities</h3>
            <div className="space-y-4">
              <div>
                <Label>Liquid Savings (FD/Bank) (₹)</Label>
                <Input type="number" value={props.mpSavings} onChange={(e) => props.setMpSavings(e.target.value)} />
                <p className="text-xs text-slate-500 mt-1">For emergency buffering</p>
              </div>
              <div>
                <Label>Growth Investments (MF/Stocks) (₹)</Label>
                <Input type="number" value={props.mpInvestments} onChange={(e) => props.setMpInvestments(e.target.value)} />
              </div>
              <div>
                <Label>Outstanding Loans (₹)</Label>
                <Input type="number" value={props.mpLoans} onChange={(e) => props.setMpLoans(e.target.value)} />
              </div>
            </div>
          </Card>
        </div>

        {/* Right: Results Panel */}
        <div className="lg:col-span-8 space-y-6">
          {/* Surplus Summary */}
          <div className="bg-slate-900 rounded-2xl p-6 text-white flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Monthly Investable Surplus</h3>
              <p className="text-xs text-slate-400">Income minus Expenses and EMIs</p>
            </div>
            <p className="text-5xl font-extrabold text-emerald-400">{formatINR(result.surplus)}</p>
          </div>

          {/* Emergency Fund */}
          <Card className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg">Step 1: Emergency Fund</h3>
                <p className="text-sm text-slate-600">Build your financial safety net first</p>
              </div>
              <span className={`px-3 py-1 text-xs font-bold rounded ${result.emgStatus === 'funded' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                {result.emgStatus === 'funded' ? 'Fully Funded' : 'Action Needed'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-slate-50 p-3 rounded">
                <p className="text-xs text-slate-600">Recommended Months</p>
                <p className="text-xl font-bold">{result.emgMonths}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded">
                <p className="text-xs text-slate-600">Target Corpus</p>
                <p className="text-xl font-bold">{formatShort(result.targetEmgCorpus)}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded">
                <p className="text-xs text-slate-600">Shortfall</p>
                <p className="text-xl font-bold text-amber-600">{formatShort(result.emgShortfall)}</p>
              </div>
            </div>
            {result.emgStatus === 'needed' && (
              <p className="text-sm text-amber-700 font-semibold">
                Divert surplus to RDs or Liquid Funds until emergency fund is fully funded.
              </p>
            )}
          </Card>

          {/* Term Insurance */}
          <Card className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg">Step 2: Term Insurance</h3>
                <p className="text-sm text-slate-600">Protect your family's financial future</p>
              </div>
              <span className={`px-3 py-1 text-xs font-bold rounded ${result.requiredCover > 0 ? 'bg-cyan-100 text-cyan-800' : 'bg-emerald-100 text-emerald-800'}`}>
                {result.requiredCover > 0 ? 'Cover Required' : 'Adequately Covered'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded">
                <p className="text-xs text-slate-600">Required Cover</p>
                <p className="text-xl font-bold">{formatShort(result.requiredCover)}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded">
                <p className="text-xs text-slate-600">Monthly Premium</p>
                <p className="text-xl font-bold text-cyan-600">{formatINR(result.monthlyPremium)}</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">Based on IALM (2006-08) mortality tables</p>
          </Card>

          {/* Retirement */}
          <Card className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg">Step 3: Retirement Corpus</h3>
                <p className="text-sm text-slate-600">Secure your golden years</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded">
                <p className="text-xs text-slate-600">Required Corpus</p>
                <p className="text-xl font-bold">{formatShort(result.retCorpus)}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded">
                <p className="text-xs text-slate-600">Monthly SIP Needed</p>
                <p className="text-xl font-bold text-indigo-600">{formatINR(result.retSip)}</p>
              </div>
            </div>
          </Card>

          {/* Waterfall & Verdict */}
          <Card className={`p-6 border-2 ${colors.border} ${colors.bg}`}>
            <h3 className={`font-bold text-lg mb-2 ${colors.text}`}>
              {result.status === 'critical' && 'Critical Warning: Negative Cash Flow'}
              {result.status === 'warning' && 'Warning: Falling Short on Core Goals'}
              {result.status === 'excellent' && 'Excellent: On Track for Financial Freedom'}
            </h3>
            <p className="text-sm mb-4">{result.statusMessage}</p>
            <div className="bg-white p-4 rounded-lg">
              <p className="text-sm text-slate-600 mb-1">Unallocated Monthly Surplus</p>
              <p className={`text-3xl font-extrabold ${colors.text}`}>{formatINR(result.unallocated)}</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
