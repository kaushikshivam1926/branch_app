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
import { calculateInsurancePremium } from "@/data/mortalityData";
import MasterPlanView from "@/components/MasterPlanView";

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
  const [emiSolveFor, setEmiSolveFor] = useState<'loan' | 'rate' | 'tenure' | 'emi'>('emi');
  const [emiLoan, setEmiLoan] = useState<string>("2500000");
  const [emiRate, setEmiRate] = useState<string>("8.5");
  const [emiYears, setEmiYears] = useState<string>("20");
  const [emiAmount, setEmiAmount] = useState<string>("21500");
  const [emiPrepayment, setEmiPrepayment] = useState<string>("0");

  // Insurance Calculator State
  const [insAge, setInsAge] = useState<string>("30");
  const [insAnnualIncome, setInsAnnualIncome] = useState<string>("1200000");
  const [insExistingLoans, setInsExistingLoans] = useState<string>("2000000");
  const [insDependents, setInsDependents] = useState<string>("2");
  const [insYearsToSupport, setInsYearsToSupport] = useState<string>("25");
  const [insSmoker, setInsSmoker] = useState<boolean>(false);

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

  // Master Plan State
  const [mpAge, setMpAge] = useState<string>("30");
  const [mpRetAge, setMpRetAge] = useState<string>("60");
  const [mpDependents, setMpDependents] = useState<string>("2");
  const [mpRisk, setMpRisk] = useState<string>("med");
  const [mpSmoker, setMpSmoker] = useState<boolean>(false);
  const [mpIncome, setMpIncome] = useState<string>("150000");
  const [mpExpenses, setMpExpenses] = useState<string>("50000");
  const [mpEmi, setMpEmi] = useState<string>("15000");
  const [mpStepUp, setMpStepUp] = useState<string>("5");
  const [mpSavings, setMpSavings] = useState<string>("300000");
  const [mpInvestments, setMpInvestments] = useState<string>("1000000");
  const [mpLoans, setMpLoans] = useState<string>("2500000");

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
    let loan = parseFloat(emiLoan);
    let rate = parseFloat(emiRate) / 100 / 12;
    let months = parseFloat(emiYears) * 12;
    let emi = parseFloat(emiAmount);
    const prepayment = parseFloat(emiPrepayment);

    // 4-way solver logic
    if (emiSolveFor === 'emi') {
      // Solve for EMI
      emi = (loan * rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1);
    } else if (emiSolveFor === 'loan') {
      // Solve for Loan Amount
      loan = (emi * (Math.pow(1 + rate, months) - 1)) / (rate * Math.pow(1 + rate, months));
    } else if (emiSolveFor === 'rate') {
      // Solve for Interest Rate (using Newton-Raphson method)
      let guess = 0.01 / 12; // Initial guess
      for (let i = 0; i < 100; i++) {
        const f = loan * guess * Math.pow(1 + guess, months) / (Math.pow(1 + guess, months) - 1) - emi;
        const fPrime = (loan * Math.pow(1 + guess, months) * (guess * months + 1) - loan * guess * months * Math.pow(1 + guess, months - 1)) / Math.pow(Math.pow(1 + guess, months) - 1, 2);
        const newGuess = guess - f / fPrime;
        if (Math.abs(newGuess - guess) < 0.000001) break;
        guess = newGuess;
      }
      rate = guess;
    } else if (emiSolveFor === 'tenure') {
      // Solve for Tenure
      months = Math.log(emi / (emi - loan * rate)) / Math.log(1 + rate);
    }

    const totalPayment = emi * months;
    const totalInterest = totalPayment - loan;

    // Generate amortization schedule
    const schedule: Array<{month: number, emi: number, principal: number, interest: number, balance: number}> = [];
    let balance = loan;
    for (let m = 1; m <= months && balance > 0; m++) {
      const interest = balance * rate;
      const principal = Math.min(emi - interest, balance);
      balance -= principal;
      schedule.push({
        month: m,
        emi: principal + interest,
        principal,
        interest,
        balance: Math.max(0, balance)
      });
    }

    // With prepayment
    let balanceWithPrepay = loan;
    let totalPaid = 0;
    let monthsPaid = 0;
    const emiWithPrepay = emi + prepayment;

    while (balanceWithPrepay > 0 && monthsPaid < months) {
      const interest = balanceWithPrepay * rate;
      const principal = emiWithPrepay - interest;
      balanceWithPrepay -= principal;
      totalPaid += emiWithPrepay;
      monthsPaid++;
      if (balanceWithPrepay < 0) {
        totalPaid += balanceWithPrepay;
        balanceWithPrepay = 0;
      }
    }

    const savedInterest = totalPayment - totalPaid;
    const savedMonths = months - monthsPaid;

    return {
      loan,
      rate: rate * 12 * 100, // Convert back to annual percentage
      years: months / 12,
      emi,
      totalPayment,
      totalInterest,
      savedInterest,
      savedMonths,
      monthsPaid,
      schedule
    };
  };

  const calculateInsurance = () => {
    const age = parseFloat(insAge);
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

    // Calculate annual premium using IALM mortality tables
    const annualPremium = calculateInsurancePremium(totalCoverage, age, insSmoker);

    return {
      totalCoverage,
      incomeReplacement,
      existingLoans,
      futureExpenses,
      annualPremium,
      monthlyPremium: annualPremium / 12
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

  const calculateMasterPlan = () => {
    const age = parseFloat(mpAge);
    const retAge = parseFloat(mpRetAge);
    const dependents = parseFloat(mpDependents);
    const risk = mpRisk;
    const income = parseFloat(mpIncome);
    const expenses = parseFloat(mpExpenses);
    const emi = parseFloat(mpEmi);
    const stepUp = parseFloat(mpStepUp) / 100;
    const savings = parseFloat(mpSavings);
    const investments = parseFloat(mpInvestments);
    const loans = parseFloat(mpLoans);

    // Constants
    const inflation = 0.06;
    const preRetRate = 0.12;
    const postRetRate = 0.08;
    const lifeExpectancy = 85;

    // 1. Calculate Surplus
    const surplus = income - (expenses + emi);

    // 2. Emergency Fund
    const baseMonths = risk === 'high' ? 6 : risk === 'med' ? 4 : 3;
    const totalEmgMonths = Math.min(12, baseMonths + dependents);
    const targetEmgCorpus = totalEmgMonths * (expenses + emi);
    const emgShortfall = Math.max(0, targetEmgCorpus - savings);
    const emgStatus = savings >= targetEmgCorpus ? 'funded' : 'needed';

    // 3. Term Insurance
    const yearsToRetire = Math.max(0, retAge - age);
    const incomeReplacement = (income * 12) * yearsToRetire * 0.5;
    const requiredCover = Math.max(0, incomeReplacement + loans - (savings + investments));
    const annualPremium = calculateInsurancePremium(requiredCover, age, mpSmoker);
    const monthlyPremium = annualPremium / 12;

    // 4. Retirement Corpus
    const futureExpMonth = expenses * Math.pow(1 + inflation, yearsToRetire);
    const annualFutureExp = futureExpMonth * 12;
    const yearsInRet = Math.max(0, lifeExpectancy - retAge);
    
    let retCorpus = 0;
    if (yearsInRet > 0) {
      const realRate = (postRetRate - inflation) / (1 + inflation);
      retCorpus = annualFutureExp * (1 - Math.pow(1 + realRate, -yearsInRet)) / realRate;
    }

    const fvInv = investments * Math.pow(1 + preRetRate, yearsToRetire);
    const retShortfall = Math.max(0, retCorpus - fvInv);

    // Calculate SIP with step-up
    let retSip = 0;
    if (yearsToRetire > 0 && retShortfall > 0) {
      const monthlyRate = preRetRate / 12;
      const totalMonths = yearsToRetire * 12;
      
      let multiplier = 0;
      let currentSipUnit = 1;
      for (let m = 1; m <= totalMonths; m++) {
        multiplier += currentSipUnit;
        multiplier *= (1 + monthlyRate);
        if (m % 12 === 0) {
          currentSipUnit *= (1 + stepUp);
        }
      }
      retSip = retShortfall / (multiplier || 1);
    }

    // 5. Waterfall Analysis
    let unallocated = surplus - monthlyPremium - retSip;
    let status: 'critical' | 'warning' | 'excellent';
    let statusMessage: string;

    if (surplus <= 0) {
      status = 'critical';
      statusMessage = 'You have no investable surplus. Focus on increasing income or reducing expenses/EMIs.';
    } else if (unallocated < 0) {
      status = 'warning';
      statusMessage = `Your surplus (${formatINR(surplus)}) is not enough to cover insurance and retirement needs. Consider adjusting your retirement age or increasing surplus.`;
    } else {
      status = 'excellent';
      statusMessage = `You are on track! Unallocated surplus of ${formatINR(unallocated)} can be directed towards education, home loan prepayment, or early retirement.`;
    }

    return {
      surplus,
      emgMonths: totalEmgMonths,
      targetEmgCorpus,
      emgShortfall,
      emgStatus,
      requiredCover,
      monthlyPremium,
      retCorpus,
      retSip,
      unallocated,
      status,
      statusMessage
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
        {/* Master Plan */}
        <div className="mb-6">
          <Card className="p-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg transition cursor-pointer" onClick={() => setCurrentView('masterplan')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                  <LayoutDashboard className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Integrated Master Plan</h3>
                  <p className="text-purple-100 mt-1">Comprehensive financial roadmap with cashflow-based sequencing</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-purple-100">Start Here →</p>
              </div>
            </div>
          </Card>
        </div>

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
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => setCurrentView('dashboard')} className="mb-4">
            ← Back to Dashboard
          </Button>
          <h2 className="text-2xl font-bold text-slate-900">EMI & Prepayment Calculator (4-Way Solver)</h2>
          <p className="text-slate-600 mt-1">Select which variable to solve for, then enter the other three values</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Inputs */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4">Input Parameters</h3>
              <div className="space-y-4">
                {/* Loan Amount */}
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    id="solve-loan"
                    name="solve-for"
                    checked={emiSolveFor === 'loan'}
                    onChange={() => setEmiSolveFor('loan')}
                    className="w-4 h-4 text-purple-600"
                  />
                  <div className="flex-1">
                    <Label htmlFor="solve-loan">Loan Amount (₹)</Label>
                    <Input
                      type="number"
                      value={emiSolveFor === 'loan' ? Math.round(result.loan).toString() : emiLoan}
                      onChange={(e) => setEmiLoan(e.target.value)}
                      disabled={emiSolveFor === 'loan'}
                      className={emiSolveFor === 'loan' ? 'bg-purple-50 text-purple-700 font-semibold' : ''}
                    />
                  </div>
                </div>

                {/* Interest Rate */}
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    id="solve-rate"
                    name="solve-for"
                    checked={emiSolveFor === 'rate'}
                    onChange={() => setEmiSolveFor('rate')}
                    className="w-4 h-4 text-purple-600"
                  />
                  <div className="flex-1">
                    <Label htmlFor="solve-rate">Interest Rate (% p.a.)</Label>
                    <Input
                      type="number"
                      value={emiSolveFor === 'rate' ? result.rate.toFixed(2) : emiRate}
                      onChange={(e) => setEmiRate(e.target.value)}
                      disabled={emiSolveFor === 'rate'}
                      step="0.1"
                      className={emiSolveFor === 'rate' ? 'bg-purple-50 text-purple-700 font-semibold' : ''}
                    />
                  </div>
                </div>

                {/* Tenure */}
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    id="solve-tenure"
                    name="solve-for"
                    checked={emiSolveFor === 'tenure'}
                    onChange={() => setEmiSolveFor('tenure')}
                    className="w-4 h-4 text-purple-600"
                  />
                  <div className="flex-1">
                    <Label htmlFor="solve-tenure">Loan Tenure (Years)</Label>
                    <Input
                      type="number"
                      value={emiSolveFor === 'tenure' ? result.years.toFixed(1) : emiYears}
                      onChange={(e) => setEmiYears(e.target.value)}
                      disabled={emiSolveFor === 'tenure'}
                      className={emiSolveFor === 'tenure' ? 'bg-purple-50 text-purple-700 font-semibold' : ''}
                    />
                  </div>
                </div>

                {/* EMI Amount */}
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    id="solve-emi"
                    name="solve-for"
                    checked={emiSolveFor === 'emi'}
                    onChange={() => setEmiSolveFor('emi')}
                    className="w-4 h-4 text-purple-600"
                  />
                  <div className="flex-1">
                    <Label htmlFor="solve-emi">Monthly EMI (₹)</Label>
                    <Input
                      type="number"
                      value={emiSolveFor === 'emi' ? Math.round(result.emi).toString() : emiAmount}
                      onChange={(e) => setEmiAmount(e.target.value)}
                      disabled={emiSolveFor === 'emi'}
                      className={emiSolveFor === 'emi' ? 'bg-purple-50 text-purple-700 font-semibold' : ''}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Label>Monthly Prepayment (₹)</Label>
                  <Input type="number" value={emiPrepayment} onChange={(e) => setEmiPrepayment(e.target.value)} />
                </div>
              </div>
            </Card>

            {/* Summary Card */}
            <Card className="p-6 bg-gradient-to-br from-rose-50 to-pink-50">
              <h3 className="font-semibold text-lg mb-4">Loan Summary</h3>
              <div className="space-y-3">
                <div className="bg-white p-3 rounded-lg flex justify-between">
                  <span className="text-sm text-slate-600">Total Payment</span>
                  <span className="font-bold text-slate-900">{formatShort(result.totalPayment)}</span>
                </div>
                <div className="bg-white p-3 rounded-lg flex justify-between">
                  <span className="text-sm text-slate-600">Total Interest</span>
                  <span className="font-bold text-rose-600">{formatShort(result.totalInterest)}</span>
                </div>
                {parseFloat(emiPrepayment) > 0 && (
                  <>
                    <div className="bg-white p-3 rounded-lg flex justify-between">
                      <span className="text-sm text-slate-600">Interest Saved</span>
                      <span className="font-bold text-green-600">{formatShort(result.savedInterest)}</span>
                    </div>
                    <div className="bg-white p-3 rounded-lg flex justify-between">
                      <span className="text-sm text-slate-600">Time Saved</span>
                      <span className="font-bold text-green-600">{Math.floor(result.savedMonths / 12)}y {Math.floor(result.savedMonths % 12)}m</span>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>

          {/* Right Panel - Repayment Schedule */}
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4">Repayment Schedule</h3>
            <div className="overflow-auto" style={{ maxHeight: '600px' }}>
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-100 border-b-2 border-slate-300">
                  <tr>
                    <th className="text-left p-2">Month</th>
                    <th className="text-right p-2">EMI</th>
                    <th className="text-right p-2">Principal</th>
                    <th className="text-right p-2">Interest</th>
                    <th className="text-right p-2">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {result.schedule.map((row) => (
                    <tr key={row.month} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="p-2">{row.month}</td>
                      <td className="text-right p-2">{formatINR(row.emi)}</td>
                      <td className="text-right p-2 text-green-600">{formatINR(row.principal)}</td>
                      <td className="text-right p-2 text-rose-600">{formatINR(row.interest)}</td>
                      <td className="text-right p-2 font-semibold">{formatINR(row.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="smoker"
                  checked={insSmoker}
                  onChange={(e) => setInsSmoker(e.target.checked)}
                  className="w-4 h-4 text-cyan-600 rounded"
                />
                <Label htmlFor="smoker" className="cursor-pointer">Smoker (affects premium calculation)</Label>
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
              <div className="bg-white p-4 rounded-lg border-2 border-cyan-200">
                <p className="text-sm text-slate-600">Estimated Annual Premium</p>
                <p className="text-xl font-bold text-cyan-700">{formatINR(result.annualPremium)}</p>
                <p className="text-xs text-slate-500 mt-1">Monthly: {formatINR(result.monthlyPremium)}</p>
                <p className="text-xs text-slate-500 mt-1">Based on IALM (2006-08) mortality tables</p>
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

  const renderMasterPlan = () => {
    const result = calculateMasterPlan();
    
    const handleExportPDF = async () => {
      const { generateMasterPlanPDF } = await import('@/lib/masterPlanPDF');
      
      const data = {
        age: parseFloat(mpAge),
        retAge: parseFloat(mpRetAge),
        dependents: parseFloat(mpDependents),
        risk: mpRisk,
        smoker: mpSmoker,
        income: parseFloat(mpIncome),
        expenses: parseFloat(mpExpenses),
        emi: parseFloat(mpEmi),
        stepUp: parseFloat(mpStepUp),
        savings: parseFloat(mpSavings),
        investments: parseFloat(mpInvestments),
        loans: parseFloat(mpLoans),
        ...result
      };
      
      generateMasterPlanPDF(data, branchName || 'State Bank of India');
    };
    
    return (
      <MasterPlanView
        mpAge={mpAge}
        mpRetAge={mpRetAge}
        mpDependents={mpDependents}
        mpRisk={mpRisk}
        mpSmoker={mpSmoker}
        mpIncome={mpIncome}
        mpExpenses={mpExpenses}
        mpEmi={mpEmi}
        mpStepUp={mpStepUp}
        mpSavings={mpSavings}
        mpInvestments={mpInvestments}
        mpLoans={mpLoans}
        setMpAge={setMpAge}
        setMpRetAge={setMpRetAge}
        setMpDependents={setMpDependents}
        setMpRisk={setMpRisk}
        setMpSmoker={setMpSmoker}
        setMpIncome={setMpIncome}
        setMpExpenses={setMpExpenses}
        setMpEmi={setMpEmi}
        setMpStepUp={setMpStepUp}
        setMpSavings={setMpSavings}
        setMpInvestments={setMpInvestments}
        setMpLoans={setMpLoans}
        result={result}
        formatINR={formatINR}
        formatShort={formatShort}
        onBack={() => setCurrentView('dashboard')}
        onExportPDF={handleExportPDF}
      />
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header 
        className="w-full py-2 px-6"
        style={{ 
          background: "linear-gradient(to right, #d4007f, #4e1a74)",
          height: '101px',
          paddingTop: '0px'
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
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
                Financial Planning Toolkit
              </h1>
              <p 
                className="text-white/90"
                style={{ fontSize: "0.85rem" }}
              >
                {branchName}
              </p>
            </div>
          </div>
          
          <div>
            <Button
              variant="outline"
              className="bg-white/20 hover:bg-white/30 text-white border-white/40"
              onClick={() => navigate("/")}
            >
              <Home className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </div>
        </div>
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
        {currentView === 'masterplan' && renderMasterPlan()}
      </div>
    </div>
  );
}
