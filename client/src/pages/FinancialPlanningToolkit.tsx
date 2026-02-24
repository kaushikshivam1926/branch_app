/**
 * Financial Planning Toolkit
 * 
 * Comprehensive financial planning suite with 9 integrated calculators:
 * 1. Retirement Corpus Calculator
 * 2. SIP Goal Planner
 * 3. Lumpsum Growth Calculator
 * 4. EMI & Prepayment Calculator
 * 5. Life Insurance Need Calculator
 * 6. Emergency Fund Calculator
 * 7. Home Affordability Calculator
 * 8. Education Planner
 * 9. Integrated Master Plan
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Home, Calculator, TrendingUp, PiggyBank, Shield, GraduationCap, Building, LayoutDashboard, MapPin } from "lucide-react";
import { useBranch } from "@/contexts/BranchContext";

type ViewType = 'dashboard' | 'retirement' | 'sip' | 'lumpsum' | 'emi' | 'insurance' | 'emergency' | 'home' | 'education' | 'masterplan';

export default function FinancialPlanningToolkit() {
  const [, navigate] = useLocation();
  const { branchName } = useBranch();
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');

  // Retirement Calculator State
  const [retCurrentAge, setRetCurrentAge] = useState<string>("30");
  const [retRetirementAge, setRetRetirementAge] = useState<string>("60");
  const [retMonthlyExpense, setRetMonthlyExpense] = useState<string>("50000");
  const [retInflation, setRetInflation] = useState<string>("6");
  const [retReturnRate, setRetReturnRate] = useState<string>("10");
  const [retLifeExpectancy, setRetLifeExpectancy] = useState<string>("80");

  // SIP Calculator State
  const [sipMode, setSipMode] = useState<'forward' | 'reverse'>('forward');
  const [sipAmount, setSipAmount] = useState<string>("10000");
  const [sipTarget, setSipTarget] = useState<string>("5000000");
  const [sipYears, setSipYears] = useState<string>("15");
  const [sipRate, setSipRate] = useState<string>("12");
  const [sipTopup, setSipTopup] = useState<string>("10");

  // Lumpsum Calculator State
  const [lumAmount, setLumAmount] = useState<string>("500000");
  const [lumYears, setLumYears] = useState<string>("10");
  const [lumRate, setLumRate] = useState<string>("12");
  const [lumInflation, setLumInflation] = useState<string>("6");

  // EMI Calculator State
  const [emiLoan, setEmiLoan] = useState<string>("2500000");
  const [emiRate, setEmiRate] = useState<string>("8.5");
  const [emiYears, setEmiYears] = useState<string>("20");
  const [emiPrepayment, setEmiPrepayment] = useState<string>("0");

  // Insurance Calculator State
  const [insAge, setInsAge] = useState<string>("30");
  const [insAnnualIncome, setInsAnnualIncome] = useState<string>("1200000");
  const [insExistingLoans, setInsExistingLoans] = useState<string>("2000000");
  const [insDependents, setInsDependents] = useState<string>("2");
  const [insYearsToSupport, setInsYearsToSupport] = useState<string>("25");

  // Emergency Fund Calculator State
  const [emMonthlyExpense, setEmMonthlyExpense] = useState<string>("50000");
  const [emMonths, setEmMonths] = useState<string>("6");
  const [emExistingSavings, setEmExistingSavings] = useState<string>("100000");

  // Home Affordability Calculator State
  const [homeAnnualIncome, setHomeAnnualIncome] = useState<string>("1200000");
  const [homeDownPayment, setHomeDownPayment] = useState<string>("500000");
  const [homeRate, setHomeRate] = useState<string>("8.5");
  const [homeYears, setHomeYears] = useState<string>("20");
  const [homeEmiRatio, setHomeEmiRatio] = useState<string>("40");

  // Education Planner State
  const [eduCurrentCost, setEduCurrentCost] = useState<string>("1000000");
  const [eduYears, setEduYears] = useState<string>("10");
  const [eduInflation, setEduInflation] = useState<string>("8");
  const [eduReturnRate, setEduReturnRate] = useState<string>("12");
  const [eduExistingSavings, setEduExistingSavings] = useState<string>("200000");

  // Utility Functions
  const formatINR = (num: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num);
  };

  const formatShort = (num: number): string => {
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
    return formatINR(num);
  };

  const parseValue = (str: string): number => {
    return parseFloat(str.replace(/[^0-9.]/g, '')) || 0;
  };

  // Calculation Functions
  const calculateRetirement = () => {
    const currentAge = parseFloat(retCurrentAge);
    const retirementAge = parseFloat(retRetirementAge);
    const monthlyExpense = parseFloat(retMonthlyExpense);
    const inflation = parseFloat(retInflation) / 100;
    const returnRate = parseFloat(retReturnRate) / 100;
    const lifeExpectancy = parseFloat(retLifeExpectancy);

    const yearsToRetirement = retirementAge - currentAge;
    const yearsInRetirement = lifeExpectancy - retirementAge;

    // Future monthly expense at retirement
    const futureMonthlyExpense = monthlyExpense * Math.pow(1 + inflation, yearsToRetirement);
    const futureAnnualExpense = futureMonthlyExpense * 12;

    // Corpus needed at retirement (considering inflation during retirement)
    let corpusNeeded = 0;
    for (let year = 0; year < yearsInRetirement; year++) {
      const yearlyExpense = futureAnnualExpense * Math.pow(1 + inflation, year);
      corpusNeeded += yearlyExpense / Math.pow(1 + returnRate, year + 1);
    }

    // Monthly SIP needed
    const monthlyRate = returnRate / 12;
    const months = yearsToRetirement * 12;
    const sipNeeded = (corpusNeeded * monthlyRate) / (Math.pow(1 + monthlyRate, months) - 1);

    return {
      corpusNeeded,
      futureMonthlyExpense,
      sipNeeded,
      yearsToRetirement
    };
  };

  const calculateSIP = () => {
    const years = parseFloat(sipYears);
    const rate = parseFloat(sipRate) / 100;
    const topup = parseFloat(sipTopup) / 100;
    const monthlyRate = rate / 12;
    const months = years * 12;

    if (sipMode === 'forward') {
      const amount = parseFloat(sipAmount);
      let futureValue = 0;
      let invested = 0;
      let currentSip = amount;

      for (let m = 1; m <= months; m++) {
        futureValue += currentSip;
        futureValue *= (1 + monthlyRate);
        invested += currentSip;
        if (m % 12 === 0) {
          currentSip *= (1 + topup);
        }
      }

      return {
        futureValue,
        invested,
        returns: futureValue - invested
      };
    } else {
      const target = parseFloat(sipTarget);
      let multiplier = 0;
      let currentSipUnit = 1;

      for (let m = 1; m <= months; m++) {
        multiplier += currentSipUnit;
        multiplier *= (1 + monthlyRate);
        if (m % 12 === 0) {
          currentSipUnit *= (1 + topup);
        }
      }

      const initialSip = target / (multiplier || 1);
      return { initialSip, target, years };
    }
  };

  const calculateLumpsum = () => {
    const amount = parseFloat(lumAmount);
    const years = parseFloat(lumYears);
    const rate = parseFloat(lumRate) / 100;
    const inflation = parseFloat(lumInflation) / 100;

    const nominalValue = amount * Math.pow(1 + rate, years);
    const realValue = nominalValue / Math.pow(1 + inflation, years);

    return { nominalValue, realValue, amount };
  };

  const calculateEMI = () => {
    const loan = parseFloat(emiLoan);
    const rate = parseFloat(emiRate) / 100 / 12;
    const months = parseFloat(emiYears) * 12;
    const prepayment = parseFloat(emiPrepayment);

    const emi = (loan * rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1);
    const totalPayment = emi * months;
    const totalInterest = totalPayment - loan;

    // With prepayment
    let balance = loan;
    let totalPaid = 0;
    let monthsPaid = 0;
    const emiWithPrepay = emi + prepayment;

    while (balance > 0 && monthsPaid < months) {
      const interest = balance * rate;
      const principal = emiWithPrepay - interest;
      balance -= principal;
      totalPaid += emiWithPrepay;
      monthsPaid++;
      if (balance < 0) {
        totalPaid += balance;
        balance = 0;
      }
    }

    const savedInterest = totalPayment - totalPaid;
    const savedMonths = months - monthsPaid;

    return {
      emi,
      totalPayment,
      totalInterest,
      savedInterest,
      savedMonths,
      monthsPaid
    };
  };

  const calculateInsurance = () => {
    const annualIncome = parseFloat(insAnnualIncome);
    const existingLoans = parseFloat(insExistingLoans);
    const dependents = parseFloat(insDependents);
    const yearsToSupport = parseFloat(insYearsToSupport);

    // Income replacement (10-15x annual income)
    const incomeReplacement = annualIncome * 12;

    // Future expenses for dependents
    const futureExpenses = (annualIncome * 0.7) * yearsToSupport;

    // Total coverage needed
    const totalCoverage = incomeReplacement + existingLoans + futureExpenses;

    return {
      totalCoverage,
      incomeReplacement,
      existingLoans,
      futureExpenses
    };
  };

  const calculateEmergencyFund = () => {
    const monthlyExpense = parseFloat(emMonthlyExpense);
    const months = parseFloat(emMonths);
    const existingSavings = parseFloat(emExistingSavings);

    const targetFund = monthlyExpense * months;
    const shortfall = Math.max(0, targetFund - existingSavings);

    return {
      targetFund,
      existingSavings,
      shortfall
    };
  };

  const calculateHomeAffordability = () => {
    const annualIncome = parseFloat(homeAnnualIncome);
    const downPayment = parseFloat(homeDownPayment);
    const rate = parseFloat(homeRate) / 100 / 12;
    const months = parseFloat(homeYears) * 12;
    const emiRatio = parseFloat(homeEmiRatio) / 100;

    const maxEmi = (annualIncome / 12) * emiRatio;
    const maxLoan = (maxEmi * (Math.pow(1 + rate, months) - 1)) / (rate * Math.pow(1 + rate, months));
    const maxHomePrice = maxLoan + downPayment;

    return {
      maxHomePrice,
      maxLoan,
      downPayment,
      maxEmi
    };
  };

  const calculateEducation = () => {
    const currentCost = parseFloat(eduCurrentCost);
    const years = parseFloat(eduYears);
    const inflation = parseFloat(eduInflation) / 100;
    const returnRate = parseFloat(eduReturnRate) / 100;
    const existingSavings = parseFloat(eduExistingSavings);

    const futureCost = currentCost * Math.pow(1 + inflation, years);
    const futureValueOfSavings = existingSavings * Math.pow(1 + returnRate, years);

    const shortfall = Math.max(0, futureCost - futureValueOfSavings);

    // Monthly SIP needed
    const monthlyRate = returnRate / 12;
    const months = years * 12;
    const sipNeeded = shortfall > 0 
      ? (shortfall * monthlyRate) / (Math.pow(1 + monthlyRate, months) - 1)
      : 0;

    return {
      futureCost,
      futureValueOfSavings,
      shortfall,
      sipNeeded
    };
  };

  // Render functions for each calculator view
  const renderDashboard = () => (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900">Financial Planning Toolkit</h2>
        <p className="text-slate-600 mt-2">Comprehensive suite of calculators for all your financial planning needs</p>
      </div>

      <div className="space-y-8">
        {/* Foundational Core */}
        <div>
          <h3 className="text-lg font-semibold text-slate-700 mb-4 border-b pb-2">Foundational Core</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 hover:shadow-md transition cursor-pointer" onClick={() => setCurrentView('retirement')}>
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
                <PiggyBank className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800">Retirement Corpus</h4>
              <p className="text-xs text-slate-500 mt-1">Plan your retirement with inflation</p>
            </Card>

            <Card className="p-5 hover:shadow-md transition cursor-pointer" onClick={() => setCurrentView('sip')}>
              <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800">SIP Calculator</h4>
              <p className="text-xs text-slate-500 mt-1">Forward & reverse goal mapping</p>
            </Card>

            <Card className="p-5 hover:shadow-md transition cursor-pointer" onClick={() => setCurrentView('lumpsum')}>
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                <Calculator className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800">Lumpsum Growth</h4>
              <p className="text-xs text-slate-500 mt-1">Real value after inflation</p>
            </Card>

            <Card className="p-5 hover:shadow-md transition cursor-pointer" onClick={() => setCurrentView('emi')}>
              <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
                <Calculator className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800">EMI Calculator</h4>
              <p className="text-xs text-slate-500 mt-1">With prepayment impact</p>
            </Card>
          </div>
        </div>

        {/* Risk & Protection */}
        <div>
          <h3 className="text-lg font-semibold text-slate-700 mb-4 border-b pb-2">Risk & Protection</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-5 hover:shadow-md transition cursor-pointer" onClick={() => setCurrentView('insurance')}>
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center shrink-0">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">Life Insurance Need</h4>
                  <p className="text-xs text-slate-500 mt-1">Calculate adequate coverage</p>
                </div>
              </div>
            </Card>

            <Card className="p-5 hover:shadow-md transition cursor-pointer" onClick={() => setCurrentView('emergency')}>
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">Emergency Fund</h4>
                  <p className="text-xs text-slate-500 mt-1">Build your safety net</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Life-Stage Goals */}
        <div>
          <h3 className="text-lg font-semibold text-slate-700 mb-4 border-b pb-2">Life-Stage Goals</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-5 hover:shadow-md transition cursor-pointer" onClick={() => setCurrentView('home')}>
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                  <Building className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">Home Affordability</h4>
                  <p className="text-xs text-slate-500 mt-1">Calculate your budget</p>
                </div>
              </div>
            </Card>

            <Card className="p-5 hover:shadow-md transition cursor-pointer" onClick={() => setCurrentView('education')}>
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">Education Planner</h4>
                  <p className="text-xs text-slate-500 mt-1">Plan for education costs</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRetirement = () => {
    const result = calculateRetirement();
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => setCurrentView('dashboard')} className="mb-4">
            ← Back to Dashboard
          </Button>
          <h2 className="text-2xl font-bold text-slate-900">Retirement Corpus Calculator</h2>
          <p className="text-slate-600 mt-1">Plan your retirement with inflation-adjusted calculations</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4">Input Parameters</h3>
            <div className="space-y-4">
              <div>
                <Label>Current Age</Label>
                <Input type="number" value={retCurrentAge} onChange={(e) => setRetCurrentAge(e.target.value)} />
              </div>
              <div>
                <Label>Retirement Age</Label>
                <Input type="number" value={retRetirementAge} onChange={(e) => setRetRetirementAge(e.target.value)} />
              </div>
              <div>
                <Label>Current Monthly Expense (₹)</Label>
                <Input type="number" value={retMonthlyExpense} onChange={(e) => setRetMonthlyExpense(e.target.value)} />
              </div>
              <div>
                <Label>Expected Inflation (%)</Label>
                <Input type="number" value={retInflation} onChange={(e) => setRetInflation(e.target.value)} step="0.1" />
              </div>
              <div>
                <Label>Expected Return Rate (%)</Label>
                <Input type="number" value={retReturnRate} onChange={(e) => setRetReturnRate(e.target.value)} step="0.1" />
              </div>
              <div>
                <Label>Life Expectancy</Label>
                <Input type="number" value={retLifeExpectancy} onChange={(e) => setRetLifeExpectancy(e.target.value)} />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
            <h3 className="font-semibold text-lg mb-4">Results</h3>
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-slate-600">Corpus Needed at Retirement</p>
                <p className="text-2xl font-bold text-blue-600">{formatShort(result.corpusNeeded)}</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-slate-600">Future Monthly Expense</p>
                <p className="text-xl font-bold text-slate-800">{formatINR(result.futureMonthlyExpense)}</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-slate-600">Monthly SIP Needed</p>
                <p className="text-xl font-bold text-green-600">{formatINR(result.sipNeeded)}</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-slate-600">Years to Retirement</p>
                <p className="text-xl font-bold text-slate-800">{result.yearsToRetirement} years</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  };

  const renderSIP = () => {
    const result = calculateSIP();
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => setCurrentView('dashboard')} className="mb-4">
            ← Back to Dashboard
          </Button>
          <h2 className="text-2xl font-bold text-slate-900">SIP Goal Planner</h2>
          <p className="text-slate-600 mt-1">Calculate SIP amount or target corpus</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4">Input Parameters</h3>
            
            <div className="mb-4 flex gap-2">
              <Button 
                variant={sipMode === 'forward' ? 'default' : 'outline'}
                onClick={() => setSipMode('forward')}
                className="flex-1"
              >
                Forward (Know SIP)
              </Button>
              <Button 
                variant={sipMode === 'reverse' ? 'default' : 'outline'}
                onClick={() => setSipMode('reverse')}
                className="flex-1"
              >
                Reverse (Know Target)
              </Button>
            </div>

            <div className="space-y-4">
              {sipMode === 'forward' ? (
                <div>
                  <Label>Monthly SIP Amount (₹)</Label>
                  <Input type="number" value={sipAmount} onChange={(e) => setSipAmount(e.target.value)} />
                </div>
              ) : (
                <div>
                  <Label>Target Corpus (₹)</Label>
                  <Input type="number" value={sipTarget} onChange={(e) => setSipTarget(e.target.value)} />
                </div>
              )}
              <div>
                <Label>Investment Period (Years)</Label>
                <Input type="number" value={sipYears} onChange={(e) => setSipYears(e.target.value)} />
              </div>
              <div>
                <Label>Expected Return Rate (%)</Label>
                <Input type="number" value={sipRate} onChange={(e) => setSipRate(e.target.value)} step="0.1" />
              </div>
              <div>
                <Label>Annual Step-up (%)</Label>
                <Input type="number" value={sipTopup} onChange={(e) => setSipTopup(e.target.value)} step="1" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50">
            <h3 className="font-semibold text-lg mb-4">Results</h3>
            {sipMode === 'forward' && 'futureValue' in result ? (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg">
                  <p className="text-sm text-slate-600">Future Value</p>
                  <p className="text-2xl font-bold text-indigo-600">{formatShort(result.futureValue || 0)}</p>
                </div>
                <div className="bg-white p-4 rounded-lg">
                  <p className="text-sm text-slate-600">Total Invested</p>
                  <p className="text-xl font-bold text-slate-800">{formatShort(result.invested || 0)}</p>
                </div>
                <div className="bg-white p-4 rounded-lg">
                  <p className="text-sm text-slate-600">Total Returns</p>
                  <p className="text-xl font-bold text-green-600">{formatShort(result.returns || 0)}</p>
                </div>
              </div>
            ) : 'initialSip' in result ? (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg">
                  <p className="text-sm text-slate-600">Required Monthly SIP</p>
                  <p className="text-2xl font-bold text-indigo-600">{formatINR(result.initialSip || 0)}</p>
                </div>
                <div className="bg-white p-4 rounded-lg">
                  <p className="text-sm text-slate-600">Target Corpus</p>
                  <p className="text-xl font-bold text-slate-800">{formatShort(result.target || 0)}</p>
                </div>
                <div className="bg-white p-4 rounded-lg">
                  <p className="text-sm text-slate-600">Investment Period</p>
                  <p className="text-xl font-bold text-slate-800">{result.years || 0} years</p>
                </div>
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    );
  };

  const renderLumpsum = () => {
    const result = calculateLumpsum();
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => setCurrentView('dashboard')} className="mb-4">
            ← Back to Dashboard
          </Button>
          <h2 className="text-2xl font-bold text-slate-900">Lumpsum Growth Calculator</h2>
          <p className="text-slate-600 mt-1">Calculate real value after inflation</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4">Input Parameters</h3>
            <div className="space-y-4">
              <div>
                <Label>Investment Amount (₹)</Label>
                <Input type="number" value={lumAmount} onChange={(e) => setLumAmount(e.target.value)} />
              </div>
              <div>
                <Label>Investment Period (Years)</Label>
                <Input type="number" value={lumYears} onChange={(e) => setLumYears(e.target.value)} />
              </div>
              <div>
                <Label>Expected Return Rate (%)</Label>
                <Input type="number" value={lumRate} onChange={(e) => setLumRate(e.target.value)} step="0.1" />
              </div>
              <div>
                <Label>Expected Inflation (%)</Label>
                <Input type="number" value={lumInflation} onChange={(e) => setLumInflation(e.target.value)} step="0.1" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50">
            <h3 className="font-semibold text-lg mb-4">Results</h3>
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-slate-600">Investment Amount</p>
                <p className="text-xl font-bold text-slate-800">{formatShort(result.amount)}</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-slate-600">Nominal Future Value</p>
                <p className="text-2xl font-bold text-emerald-600">{formatShort(result.nominalValue)}</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-slate-600">Real Value (After Inflation)</p>
                <p className="text-2xl font-bold text-teal-600">{formatShort(result.realValue)}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  };

  const renderEMI = () => {
    const result = calculateEMI();
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => setCurrentView('dashboard')} className="mb-4">
            ← Back to Dashboard
          </Button>
          <h2 className="text-2xl font-bold text-slate-900">EMI & Prepayment Calculator</h2>
          <p className="text-slate-600 mt-1">Calculate EMI and prepayment impact</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4">Input Parameters</h3>
            <div className="space-y-4">
              <div>
                <Label>Loan Amount (₹)</Label>
                <Input type="number" value={emiLoan} onChange={(e) => setEmiLoan(e.target.value)} />
              </div>
              <div>
                <Label>Interest Rate (% p.a.)</Label>
                <Input type="number" value={emiRate} onChange={(e) => setEmiRate(e.target.value)} step="0.1" />
              </div>
              <div>
                <Label>Loan Tenure (Years)</Label>
                <Input type="number" value={emiYears} onChange={(e) => setEmiYears(e.target.value)} />
              </div>
              <div>
                <Label>Monthly Prepayment (₹)</Label>
                <Input type="number" value={emiPrepayment} onChange={(e) => setEmiPrepayment(e.target.value)} />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-rose-50 to-pink-50">
            <h3 className="font-semibold text-lg mb-4">Results</h3>
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-slate-600">Monthly EMI</p>
                <p className="text-2xl font-bold text-rose-600">{formatINR(result.emi)}</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-slate-600">Total Interest (Without Prepayment)</p>
                <p className="text-xl font-bold text-slate-800">{formatShort(result.totalInterest)}</p>
              </div>
              {parseFloat(emiPrepayment) > 0 && (
                <>
                  <div className="bg-white p-4 rounded-lg">
                    <p className="text-sm text-slate-600">Interest Saved</p>
                    <p className="text-xl font-bold text-green-600">{formatShort(result.savedInterest)}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg">
                    <p className="text-sm text-slate-600">Time Saved</p>
                    <p className="text-xl font-bold text-green-600">{Math.floor(result.savedMonths / 12)} years {Math.floor(result.savedMonths % 12)} months</p>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  };

  const renderInsurance = () => {
    const result = calculateInsurance();
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => setCurrentView('dashboard')} className="mb-4">
            ← Back to Dashboard
          </Button>
          <h2 className="text-2xl font-bold text-slate-900">Life Insurance Need Calculator</h2>
          <p className="text-slate-600 mt-1">Calculate adequate insurance coverage</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4">Input Parameters</h3>
            <div className="space-y-4">
              <div>
                <Label>Your Age</Label>
                <Input type="number" value={insAge} onChange={(e) => setInsAge(e.target.value)} />
              </div>
              <div>
                <Label>Annual Income (₹)</Label>
                <Input type="number" value={insAnnualIncome} onChange={(e) => setInsAnnualIncome(e.target.value)} />
              </div>
              <div>
                <Label>Existing Loans (₹)</Label>
                <Input type="number" value={insExistingLoans} onChange={(e) => setInsExistingLoans(e.target.value)} />
              </div>
              <div>
                <Label>Number of Dependents</Label>
                <Input type="number" value={insDependents} onChange={(e) => setInsDependents(e.target.value)} />
              </div>
              <div>
                <Label>Years to Support Dependents</Label>
                <Input type="number" value={insYearsToSupport} onChange={(e) => setInsYearsToSupport(e.target.value)} />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-cyan-50 to-blue-50">
            <h3 className="font-semibold text-lg mb-4">Results</h3>
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-slate-600">Total Coverage Needed</p>
                <p className="text-2xl font-bold text-cyan-600">{formatShort(result.totalCoverage)}</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-slate-600">Income Replacement</p>
                <p className="text-lg font-bold text-slate-800">{formatShort(result.incomeReplacement)}</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-slate-600">Existing Loans</p>
                <p className="text-lg font-bold text-slate-800">{formatShort(result.existingLoans)}</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-slate-600">Future Expenses</p>
                <p className="text-lg font-bold text-slate-800">{formatShort(result.futureExpenses)}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  };

  const renderEmergencyFund = () => {
    const result = calculateEmergencyFund();
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => setCurrentView('dashboard')} className="mb-4">
            ← Back to Dashboard
          </Button>
          <h2 className="text-2xl font-bold text-slate-900">Emergency Fund Calculator</h2>
          <p className="text-slate-600 mt-1">Build your financial safety net</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4">Input Parameters</h3>
            <div className="space-y-4">
              <div>
                <Label>Monthly Expenses (₹)</Label>
                <Input type="number" value={emMonthlyExpense} onChange={(e) => setEmMonthlyExpense(e.target.value)} />
              </div>
              <div>
                <Label>Months of Coverage</Label>
                <Input type="number" value={emMonths} onChange={(e) => setEmMonths(e.target.value)} />
                <p className="text-xs text-slate-500 mt-1">Recommended: 6-12 months</p>
              </div>
              <div>
                <Label>Existing Savings (₹)</Label>
                <Input type="number" value={emExistingSavings} onChange={(e) => setEmExistingSavings(e.target.value)} />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50">
            <h3 className="font-semibold text-lg mb-4">Results</h3>
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-slate-600">Target Emergency Fund</p>
                <p className="text-2xl font-bold text-amber-600">{formatShort(result.targetFund)}</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-slate-600">Existing Savings</p>
                <p className="text-xl font-bold text-slate-800">{formatShort(result.existingSavings)}</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-slate-600">Shortfall</p>
                <p className="text-xl font-bold text-rose-600">{formatShort(result.shortfall)}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  };

  const renderHomeAffordability = () => {
    const result = calculateHomeAffordability();
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => setCurrentView('dashboard')} className="mb-4">
            ← Back to Dashboard
          </Button>
          <h2 className="text-2xl font-bold text-slate-900">Home Affordability Calculator</h2>
          <p className="text-slate-600 mt-1">Calculate your home buying budget</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4">Input Parameters</h3>
            <div className="space-y-4">
              <div>
                <Label>Annual Income (₹)</Label>
                <Input type="number" value={homeAnnualIncome} onChange={(e) => setHomeAnnualIncome(e.target.value)} />
              </div>
              <div>
                <Label>Down Payment Available (₹)</Label>
                <Input type="number" value={homeDownPayment} onChange={(e) => setHomeDownPayment(e.target.value)} />
              </div>
              <div>
                <Label>Interest Rate (% p.a.)</Label>
                <Input type="number" value={homeRate} onChange={(e) => setHomeRate(e.target.value)} step="0.1" />
              </div>
              <div>
                <Label>Loan Tenure (Years)</Label>
                <Input type="number" value={homeYears} onChange={(e) => setHomeYears(e.target.value)} />
              </div>
              <div>
                <Label>EMI to Income Ratio (%)</Label>
                <Input type="number" value={homeEmiRatio} onChange={(e) => setHomeEmiRatio(e.target.value)} />
                <p className="text-xs text-slate-500 mt-1">Recommended: 30-40%</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50">
            <h3 className="font-semibold text-lg mb-4">Results</h3>
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-slate-600">Maximum Home Price</p>
                <p className="text-2xl font-bold text-purple-600">{formatShort(result.maxHomePrice)}</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-slate-600">Maximum Loan Amount</p>
                <p className="text-xl font-bold text-slate-800">{formatShort(result.maxLoan)}</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-slate-600">Down Payment</p>
                <p className="text-xl font-bold text-slate-800">{formatShort(result.downPayment)}</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-slate-600">Monthly EMI</p>
                <p className="text-xl font-bold text-slate-800">{formatINR(result.maxEmi)}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  };

  const renderEducation = () => {
    const result = calculateEducation();
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => setCurrentView('dashboard')} className="mb-4">
            ← Back to Dashboard
          </Button>
          <h2 className="text-2xl font-bold text-slate-900">Education Planner</h2>
          <p className="text-slate-600 mt-1">Plan for future education costs</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4">Input Parameters</h3>
            <div className="space-y-4">
              <div>
                <Label>Current Education Cost (₹)</Label>
                <Input type="number" value={eduCurrentCost} onChange={(e) => setEduCurrentCost(e.target.value)} />
              </div>
              <div>
                <Label>Years Until Education</Label>
                <Input type="number" value={eduYears} onChange={(e) => setEduYears(e.target.value)} />
              </div>
              <div>
                <Label>Education Inflation (%)</Label>
                <Input type="number" value={eduInflation} onChange={(e) => setEduInflation(e.target.value)} step="0.1" />
              </div>
              <div>
                <Label>Expected Return Rate (%)</Label>
                <Input type="number" value={eduReturnRate} onChange={(e) => setEduReturnRate(e.target.value)} step="0.1" />
              </div>
              <div>
                <Label>Existing Savings (₹)</Label>
                <Input type="number" value={eduExistingSavings} onChange={(e) => setEduExistingSavings(e.target.value)} />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-pink-50 to-rose-50">
            <h3 className="font-semibold text-lg mb-4">Results</h3>
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-slate-600">Future Education Cost</p>
                <p className="text-2xl font-bold text-pink-600">{formatShort(result.futureCost)}</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-slate-600">Future Value of Savings</p>
                <p className="text-xl font-bold text-slate-800">{formatShort(result.futureValueOfSavings)}</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-slate-600">Shortfall</p>
                <p className="text-xl font-bold text-rose-600">{formatShort(result.shortfall)}</p>
              </div>
              {result.sipNeeded > 0 && (
                <div className="bg-white p-4 rounded-lg">
                  <p className="text-sm text-slate-600">Monthly SIP Needed</p>
                  <p className="text-xl font-bold text-green-600">{formatINR(result.sipNeeded)}</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header 
        className="w-full px-6 flex items-center justify-between"
        style={{ 
          background: "linear-gradient(to right, #d4007f, #4e1a74)",
          height: '101px',
          paddingTop: '0px'
        }}
      >
        <div className="flex items-center gap-4">
          <img 
            src="/images/sbi-logo.png" 
            alt="SBI Logo" 
            className="h-28 invert"
          />
          <div className="text-white">
            <h1 className="font-bold" style={{ fontSize: '1.3rem' }}>Financial Planning Toolkit</h1>
            <p className="text-sm opacity-90" style={{ fontSize: '0.85rem' }}>{branchName}</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate("/")}
          className="bg-white/10 border-white/30 text-white hover:bg-white/20"
        >
          <Home className="mr-2 h-4 w-4" />
          Back to Home
        </Button>
      </header>

      {/* Main Content */}
      <div className="container mx-auto p-6">
        {currentView === 'dashboard' && renderDashboard()}
        {currentView === 'retirement' && renderRetirement()}
        {currentView === 'sip' && renderSIP()}
        {currentView === 'lumpsum' && renderLumpsum()}
        {currentView === 'emi' && renderEMI()}
        {currentView === 'insurance' && renderInsurance()}
        {currentView === 'emergency' && renderEmergencyFund()}
        {currentView === 'home' && renderHomeAffordability()}
        {currentView === 'education' && renderEducation()}
      </div>
    </div>
  );
}
