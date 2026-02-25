import { jsPDF } from "jspdf";

interface MasterPlanData {
  // Demographics
  age: number;
  retAge: number;
  dependents: number;
  risk: string;
  smoker: boolean;
  
  // Cash Flow
  income: number;
  expenses: number;
  emi: number;
  stepUp: number;
  
  // Assets
  savings: number;
  investments: number;
  loans: number;
  
  // Results
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
  status: string;
  statusMessage: string;
}

export function generateMasterPlanPDF(data: MasterPlanData, branchName: string) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 20;
  
  // Helper functions
  const formatINR = (num: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num);
  };
  
  const addSection = (title: string) => {
    if (yPos > pageHeight - 30) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(75, 0, 130); // Purple
    doc.text(title, 15, yPos);
    yPos += 8;
    doc.setDrawColor(200, 200, 200);
    doc.line(15, yPos, pageWidth - 15, yPos);
    yPos += 8;
  };
  
  const addRow = (label: string, value: string, isBold = false) => {
    if (yPos > pageHeight - 20) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(label, 20, yPos);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(value, pageWidth - 20, yPos, { align: 'right' });
    yPos += 7;
  };
  
  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(128, 0, 128); // Purple
  doc.text('Integrated Financial Master Plan', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`${branchName} | Generated on ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;
  
  // Demographics Section
  addSection('1. Client Profile');
  addRow('Current Age', `${data.age} years`);
  addRow('Retirement Age', `${data.retAge} years`);
  addRow('Dependents', data.dependents.toString());
  addRow('Job Stability', data.risk === 'low' ? 'Stable' : data.risk === 'med' ? 'Average' : 'Risky');
  addRow('Smoker', data.smoker ? 'Yes' : 'No');
  addRow('Annual Step-up', `${data.stepUp}%`);
  yPos += 5;
  
  // Cash Flow Section
  addSection('2. Monthly Cash Flow Analysis');
  addRow('Net Take-Home Income', formatINR(data.income));
  addRow('Mandatory Expenses', formatINR(data.expenses));
  addRow('Existing EMIs', formatINR(data.emi));
  addRow('Monthly Investable Surplus', formatINR(data.surplus), true);
  yPos += 5;
  
  // Assets Section
  addSection('3. Current Financial Position');
  addRow('Liquid Savings (FD/Bank)', formatINR(data.savings));
  addRow('Growth Investments (MF/Stocks)', formatINR(data.investments));
  addRow('Outstanding Loans', formatINR(data.loans));
  yPos += 5;
  
  // Emergency Fund Section
  addSection('4. Emergency Fund Recommendation');
  addRow('Recommended Months', data.emgMonths.toString());
  addRow('Target Emergency Corpus', formatINR(data.targetEmgCorpus));
  addRow('Current Liquid Savings', formatINR(data.savings));
  addRow('Shortfall', formatINR(data.emgShortfall), data.emgShortfall > 0);
  addRow('Status', data.emgStatus === 'funded' ? '✓ Fully Funded' : '⚠ Action Needed', true);
  
  if (data.emgShortfall > 0) {
    yPos += 3;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(180, 83, 9); // Amber
    const recommendation = 'Recommendation: Divert surplus to RDs or Liquid Funds until emergency fund is fully funded.';
    const lines = doc.splitTextToSize(recommendation, pageWidth - 40);
    doc.text(lines, 20, yPos);
    yPos += lines.length * 5 + 5;
  } else {
    yPos += 5;
  }
  
  // Insurance Section
  addSection('5. Term Insurance Requirement');
  addRow('Required Coverage', formatINR(data.requiredCover));
  addRow('Estimated Monthly Premium', formatINR(data.monthlyPremium), true);
  addRow('Basis', 'IALM (2006-08) Mortality Tables');
  yPos += 5;
  
  // Retirement Section
  addSection('6. Retirement Planning');
  addRow('Required Retirement Corpus', formatINR(data.retCorpus));
  addRow('Monthly SIP Needed (with step-up)', formatINR(data.retSip), true);
  addRow('Investment Horizon', `${data.retAge - data.age} years`);
  yPos += 5;
  
  // Waterfall Section
  addSection('7. Surplus Allocation Waterfall');
  addRow('Starting Surplus', formatINR(data.surplus));
  addRow('Less: Term Insurance Premium', `- ${formatINR(data.monthlyPremium)}`);
  addRow('Less: Retirement SIP', `- ${formatINR(data.retSip)}`);
  addRow('Unallocated Surplus', formatINR(data.unallocated), true);
  yPos += 5;
  
  // Final Verdict
  addSection('8. Financial Health Assessment');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  
  if (data.status === 'critical') {
    doc.setTextColor(220, 38, 38); // Red
    doc.text('⚠ CRITICAL WARNING', 20, yPos);
  } else if (data.status === 'warning') {
    doc.setTextColor(180, 83, 9); // Amber
    doc.text('⚠ WARNING', 20, yPos);
  } else {
    doc.setTextColor(5, 150, 105); // Green
    doc.text('✓ EXCELLENT', 20, yPos);
  }
  
  yPos += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  const messageLines = doc.splitTextToSize(data.statusMessage, pageWidth - 40);
  doc.text(messageLines, 20, yPos);
  yPos += messageLines.length * 5 + 10;
  
  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(150, 150, 150);
  doc.text('Prepared by: Chief/Branch Manager', 15, pageHeight - 15);
  doc.text(`Page 1 of ${doc.getNumberOfPages()}`, pageWidth - 15, pageHeight - 15, { align: 'right' });
  
  // Save PDF
  doc.save(`Master_Financial_Plan_${new Date().toISOString().split('T')[0]}.pdf`);
}
