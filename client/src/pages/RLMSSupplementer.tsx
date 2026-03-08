/**
 * RLMS Supplementer
 *
 * Design: SBI branded header matching app catalogue (gradient #d4007f → #4e1a74)
 * Sidebar nav with purple accent, white content cards, slate-50 background
 * All logic ported 1:1 from RLMSSupplementer.html (as-is, where-is basis)
 * Dependencies: pdfjs-dist (PDF text extraction), pdf-lib (PDF overlay writing)
 */

import { useState, useEffect, ChangeEvent } from "react";
import { Link } from "wouter";
import { ArrowLeft, FileText, Lock } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { sbiLogoUrl } from "@/lib/assets";
import { toast } from "sonner";

// Configure PDF.js worker — use local package worker so the build is offline-capable
// pdfjs-dist v5+ ships the worker as an ES module; Vite inlines it via ?url import
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// ─── SVG Graphics for Print Templates ───────────────────────────────────────

const SbiRlmsLogo = () => (
  <svg viewBox="0 0 220 35" className="h-10" xmlns="http://www.w3.org/2000/svg">
    <g transform="matrix(0.8 0 0 0.8 0 3.8)">
      <g transform="translate(-33.915775,-175.709)">
        <g transform="translate(0.13229192,-0.13228808)">
          <path d="m 92.879525,193.22725 c -1.82615,-1.51394 -4.190058,-2.4914 -6.27489,-3.35414 -2.874922,-1.18892 -5.358622,-2.21482 -5.358622,-4.11738 0,-0.83092 0.388666,-1.59418 1.095934,-2.14478 0.745474,-0.5814 1.786634,-0.90088 2.929728,-0.90088 3.594928,0 6.46221,2.54226 6.487692,2.5652 l 0.700854,0.6395 3.18587,-5.97542 -0.36445,-0.38508 c -0.1389,-0.1474 -3.494256,-3.61144 -9.966668,-3.61144 -3.105576,0 -5.961388,0.99264 -8.04495,2.79462 -2.114136,1.82866 -3.281442,4.35322 -3.281442,7.10702 0,2.68498 1.042416,4.85648 3.182042,6.63684 1.799384,1.49478 4.04096,2.46074 6.209902,3.39608 2.95775,1.27436 5.515364,2.3767 5.515364,4.33784 0,1.49354 -1.01183,3.0903 -3.847252,3.0903 -4.066436,0 -7.330036,-3.09666 -7.361896,-3.12852 l -0.611692,-0.59364 -3.960668,5.48856 0.395086,0.44236 c 0.04434,0.0458 1.067904,1.17626 2.990892,2.30142 1.763696,1.02972 4.664108,2.25822 8.457838,2.25822 3.31967,0 6.148724,-1.01822 8.182576,-2.94244 1.912794,-1.8122 2.965404,-4.31502 2.965404,-7.04842 0,-2.81252 -1.055152,-5.05534 -3.22664,-6.85598" fill="#292075"/>
          <path d="m 126.36169,209.58089 h 7.42179 v -33.1445 h -7.42179 z" fill="#292075"/>
          <path d="m 111.85454,203.37355 h -5.64918 v -20.7323 h 4.98142 c 2.23266,0 3.51337,1.24884 3.51337,3.42542 0,2.19952 -1.152,3.31332 -3.42544,3.31332 h -1.71527 v 6.10024 h 2.2951 c 1.25523,0 2.30147,0.3912 3.02402,1.13542 0.75953,0.77996 1.0679,1.55218 1.0679,2.6647 0,2.52576 -1.56744,4.0932 -4.09192,4.0932 m 9.85452,-8.68842 c -0.73402,-1.15462 -1.74075,-2.07216 -2.93864,-2.68636 1.93318,-1.54964 3.02657,-3.92888 3.02657,-6.64572 0,-2.7475 -1.04624,-5.03876 -3.02657,-6.63042 -1.86565,-1.49736 -4.45639,-2.28996 -7.49571,-2.28996 H 99.199003 v 33.1444 h 12.210787 c 3.23939,0 6.04168,-0.8181 8.1023,-2.36898 2.3397,-1.75866 3.57454,-4.3761 3.57454,-7.57216 0,-1.8211 -0.47531,-3.53376 -1.37757,-4.9508" fill="#292075"/>
          <path d="m 50.918349,175.84129 c -9.463306,0 -17.134866,7.68936 -17.134866,17.17438 0,8.89234 6.742566,16.20584 15.381364,17.08514 v -12.47584 c -1.856724,-0.70824 -3.1795,-2.50666 -3.1795,-4.6093 0,-2.72076 2.212264,-4.93432 4.934302,-4.93432 2.719454,0 4.934266,2.21356 4.934266,4.93432 0,2.10264 -1.325316,3.90072 -3.18204,4.6093 v 12.47584 c 8.640066,-0.8793 15.382632,-8.1928 15.382632,-17.08514 0,-9.48502 -7.671564,-17.17438 -17.134858,-17.17438" fill="#00b5ef"/>
        </g>
      </g>
    </g>
    <line x1="88" y1="4" x2="88" y2="31" stroke="#cbd5e1" strokeWidth="1" />
    <text x="96" y="27" fontFamily="Arial, sans-serif" fontSize="24" fill="#00b5ef" letterSpacing="-0.5" fontWeight="normal">RLMS</text>
  </svg>
);

const SbiStandardLogo = () => (
  <svg viewBox="0 0 85 35" className="h-10" xmlns="http://www.w3.org/2000/svg">
    <g transform="matrix(0.8 0 0 0.8 0 3.8)">
      <g transform="translate(-33.915775,-175.709)">
        <g transform="translate(0.13229192,-0.13228808)">
          <path d="m 92.879525,193.22725 c -1.82615,-1.51394 -4.190058,-2.4914 -6.27489,-3.35414 -2.874922,-1.18892 -5.358622,-2.21482 -5.358622,-4.11738 0,-0.83092 0.388666,-1.59418 1.095934,-2.14478 0.745474,-0.5814 1.786634,-0.90088 2.929728,-0.90088 3.594928,0 6.46221,2.54226 6.487692,2.5652 l 0.700854,0.6395 3.18587,-5.97542 -0.36445,-0.38508 c -0.1389,-0.1474 -3.494256,-3.61144 -9.966668,-3.61144 -3.105576,0 -5.961388,0.99264 -8.04495,2.79462 -2.114136,1.82866 -3.281442,4.35322 -3.281442,7.10702 0,2.68498 1.042416,4.85648 3.182042,6.63684 1.799384,1.49478 4.04096,2.46074 6.209902,3.39608 2.95775,1.27436 5.515364,2.3767 5.515364,4.33784 0,1.49354 -1.01183,3.0903 -3.847252,3.0903 -4.066436,0 -7.330036,-3.09666 -7.361896,-3.12852 l -0.611692,-0.59364 -3.960668,5.48856 0.395086,0.44236 c 0.04434,0.0458 1.067904,1.17626 2.990892,2.30142 1.763696,1.02972 4.664108,2.25822 8.457838,2.25822 3.31967,0 6.148724,-1.01822 8.182576,-2.94244 1.912794,-1.8122 2.965404,-4.31502 2.965404,-7.04842 0,-2.81252 -1.055152,-5.05534 -3.22664,-6.85598" fill="#292075"/>
          <path d="m 126.36169,209.58089 h 7.42179 v -33.1445 h -7.42179 z" fill="#292075"/>
          <path d="m 111.85454,203.37355 h -5.64918 v -20.7323 h 4.98142 c 2.23266,0 3.51337,1.24884 3.51337,3.42542 0,2.19952 -1.152,3.31332 -3.42544,3.31332 h -1.71527 v 6.10024 h 2.2951 c 1.25523,0 2.30147,0.3912 3.02402,1.13542 0.75953,0.77996 1.0679,1.55218 1.0679,2.6647 0,2.52576 -1.56744,4.0932 -4.09192,4.0932 m 9.85452,-8.68842 c -0.73402,-1.15462 -1.74075,-2.07216 -2.93864,-2.68636 1.93318,-1.54964 3.02657,-3.92888 3.02657,-6.64572 0,-2.7475 -1.04624,-5.03876 -3.02657,-6.63042 -1.86565,-1.49736 -4.45639,-2.28996 -7.49571,-2.28996 H 99.199003 v 33.1444 h 12.210787 c 3.23939,0 6.04168,-0.8181 8.1023,-2.36898 2.3397,-1.75866 3.57454,-4.3761 3.57454,-7.57216 0,-1.8211 -0.47531,-3.53376 -1.37757,-4.9508" fill="#292075"/>
          <path d="m 50.918349,175.84129 c -9.463306,0 -17.134866,7.68936 -17.134866,17.17438 0,8.89234 6.742566,16.20584 15.381364,17.08514 v -12.47584 c -1.856724,-0.70824 -3.1795,-2.50666 -3.1795,-4.6093 0,-2.72076 2.212264,-4.93432 4.934302,-4.93432 2.719454,0 4.934266,2.21356 4.934266,4.93432 0,2.10264 -1.325316,3.90072 -3.18204,4.6093 v 12.47584 c 8.640066,-0.8793 15.382632,-8.1928 15.382632,-17.08514 0,-9.48502 -7.671564,-17.17438 -17.134858,-17.17438" fill="#00b5ef"/>
        </g>
      </g>
    </g>
  </svg>
);

const Watermark = () => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 0 }}>
    <svg viewBox="0 0 34.4 34.4" className="w-[450px] h-[450px] opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(-33.783483,-175.8413)">
        <path d="m 50.918349,175.84129 c -9.463306,0 -17.134866,7.68936 -17.134866,17.17438 0,8.89234 6.742566,16.20584 15.381364,17.08514 v -12.47584 c -1.856724,-0.70824 -3.1795,-2.50666 -3.1795,-4.6093 0,-2.72076 2.212264,-4.93432 4.934302,-4.93432 2.719454,0 4.934266,2.21356 4.934266,4.93432 0,2.10264 -1.325316,3.90072 -3.18204,4.6093 v 12.47584 c 8.640066,-0.8793 15.382632,-8.1928 15.382632,-17.08514 0,-9.48502 -7.671564,-17.17438 -17.134858,-17.17438" fill="#00b5ef"/>
      </g>
    </svg>
  </div>
);

const TopRightCurve = () => (
  <div className="absolute top-0 right-0 w-[220px] h-[220px] pointer-events-none" style={{ zIndex: 0 }}>
    <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M 0 0 C 60 0 100 40 100 100 L 100 0 Z" fill="#00A9E0"/>
    </svg>
  </div>
);

// ─── Data Model ──────────────────────────────────────────────────────────────

const initialData = {
  rlmsApplicationNo: '', applicationDate: '', documentExecutionDate: '',
  salutation: '', name: '', gender: '', maritalStatus: '',
  dependents: '', fatherName: '', nationality: 'Indian', category: '',
  disabilityType: '', education: '', dob: '', spouseName: '',
  dependentChildren: '', motherMaidenName: '', residentialStatus: '',
  religion: '', placeOfBirth: '', qualifyingYear: '',
  pan: '', passportNo: '', drivingLicenseNo: '', voterId: '',
  aadhaarNo: '', passportValidUpto: '', dlValidUpto: '',
  houseOwnership: '', addressProofType: '', presentHouseNo: '',
  presentLandmark: '', presentStayDuration: '', addressProofNo: '',
  addressProofDate: '', presentStreet: '', presentDistrict: '',
  presentCity: '', presentPin: '', presentCountry: '',
  presentState: '', primaryMobile: '', landline: '',
  isPermanentSame: false,
  permanentHouseNo: '', permanentLandmark: '', permanentDistrict: '',
  permanentCity: '', permanentPin: '', permanentState: '', permanentCountry: '',
  permanentTel1: '', permanentTel2: '', secondaryMobile: '', personalEmail: '', permanentStreet: '',
  orgName: '', departmentName: '', officeStreet: '', officeCity: '',
  officeCountry: '', officeLandline1: '', officeLandline2: '',
  officeBuilding: '', officeLandmark: '', officeDistrict: '',
  officeState: '', officePin: '', orgEmail: '', officeFax: '',
  ref1Name: '', ref1Address: '', ref1Email: '', ref1Telephone: '', ref1Mobile: '',
  ref2Name: '', ref2Address: '', ref2Email: '', ref2Telephone: '', ref2Mobile: '',
  occupationType: '', orgType: '', employerName: '', empDeptName: '',
  employeeNo: '', ddoDesignation: '', natureOfEmployment: '',
  currentIndustry: '', corporateRating: '', designation: '',
  orgWebsite: '', ddoAddress: '', ddoPin: '',
  prevEmployerName: '', prevContactNo: '', prevEmployerAddress: '', prevPin: '',
  expPrevJob: '', expPresentJobDOJ: '', totalExp: '', retirementDate: '',
  forceNo: '', regimentName: '',
  salaryAcNo: '', bankName: '', acOpenDate: '', xpressCrAcNo: '',
  sanctionedLimit: '', emisPaid: '', cifNo: '', branchName: '',
  salaryPackageName: '', disbursementDate: '', outstandingAmount: '',
  riskGrade: '',
  bankAccountDetails: '', creditCards: '', fixedDeposits: '',
  otherInvestments: '', assetsProperties: '',
  grossIncome: '', netIncome: '',
  loanVariant: '', campaignId: '', netMonthlyIncome: '', proposedEmi: '',
  emiNmiRatio: '', loanAmount: '', repaymentTenure: '',
  corporateTieUps: '', sourcingChannel: '', checkOff: '',
  salaryPackages: '', processingFee: '', concessionPercent: '',
  concessionInProcessingFee: '', interestRate: '', loanPurpose: '',
  optLifeInsurance: '', addLifePremium: '', optGeneralInsurance: '', addGeneralPremium: '',
  place: ''
};

type DataModel = typeof initialData;
type ReadOnlyMap = Partial<Record<keyof DataModel, boolean>>;

// ─── PDF Coordinate Map ───────────────────────────────────────────────────────
// Calibrated from actual SBI RLMS PL-1 Application Form (6 pages, 595x842 pts each)
// Coordinates measured using pdfminer.six from the actual form PDF.
// Each entry: { page: 0-indexed page, x: left-x of VALUE cell, y: baseline-y of VALUE cell,
//              width: cell width, height: cell height }
// Extraction: looks for text items whose baseline y falls within [y, y+height] and x within [x, x+width]
// Overlay: writes manually-entered text at (x + X_OFFSET, y + Y_OFFSET) on the original PDF

// Configurable offsets for text placement on the output PDF (tune if text is misaligned)
const TEXT_X_OFFSET = 2;   // pts to shift right from the field x coordinate
const TEXT_Y_OFFSET = 1;   // pts to shift up from the field baseline y coordinate

const PDF_COORDINATES: Record<string, { page: number; x: number; y: number; width: number; height: number }> = {
  // ── PAGE 0: Personal & KYC Details (Section A) ──────────────────────────────
  // Left column (value cells start at x≈163)
  salutation:         { page: 0, x: 163, y: 584, width: 140, height: 10 },
  gender:             { page: 0, x: 163, y: 554, width: 140, height: 10 },
  maritalStatus:      { page: 0, x: 163, y: 539, width: 140, height: 10 },
  dependents:         { page: 0, x: 163, y: 514, width: 140, height: 10 },
  fatherName:         { page: 0, x: 163, y: 499, width: 270, height: 10 },
  nationality:        { page: 0, x: 163, y: 474, width: 140, height: 10 },
  category:           { page: 0, x: 163, y: 459, width: 140, height: 10 },
  disabilityType:     { page: 0, x: 163, y: 444, width: 140, height: 10 },
  education:          { page: 0, x: 163, y: 429, width: 140, height: 10 },
  pan:                { page: 0, x: 163, y: 404, width: 140, height: 10 },
  passportNo:         { page: 0, x: 163, y: 389, width: 140, height: 10 },
  drivingLicenseNo:   { page: 0, x: 163, y: 374, width: 140, height: 10 },
  voterId:            { page: 0, x: 163, y: 359, width: 140, height: 10 },
  // Address (left column)
  houseOwnership:     { page: 0, x: 163, y: 307, width: 140, height: 10 },
  addressProofType:   { page: 0, x: 163, y: 282, width: 140, height: 10 },
  presentHouseNo:     { page: 0, x: 163, y: 252, width: 140, height: 18 },
  presentLandmark:    { page: 0, x: 163, y: 222, width: 140, height: 10 },
  presentDistrict:    { page: 0, x: 163, y: 197, width: 140, height: 10 },
  presentState:       { page: 0, x: 163, y: 182, width: 140, height: 10 },
  primaryMobile:      { page: 0, x: 163, y: 167, width: 140, height: 10 },
  landline:           { page: 0, x: 163, y: 152, width: 140, height: 10 },
  // Permanent address (left, bottom of page 0)
  permanentHouseNo:   { page: 0, x: 163, y: 98,  width: 140, height: 18 },
  permanentLandmark:  { page: 0, x: 163, y: 73,  width: 140, height: 10 },
  permanentDistrict:  { page: 0, x: 163, y: 48,  width: 140, height: 10 },
  // Right column (value cells start at x≈437)
  name:               { page: 0, x: 437, y: 584, width: 130, height: 10 },
  dob:                { page: 0, x: 437, y: 554, width: 130, height: 10 },
  spouseName:         { page: 0, x: 437, y: 539, width: 130, height: 10 },
  dependentChildren:  { page: 0, x: 437, y: 514, width: 130, height: 10 },
  motherMaidenName:   { page: 0, x: 437, y: 499, width: 130, height: 10 },
  residentialStatus:  { page: 0, x: 437, y: 474, width: 130, height: 10 },
  religion:           { page: 0, x: 437, y: 459, width: 130, height: 10 },
  placeOfBirth:       { page: 0, x: 437, y: 444, width: 130, height: 10 },
  qualifyingYear:     { page: 0, x: 437, y: 429, width: 130, height: 10 },
  aadhaarNo:          { page: 0, x: 437, y: 404, width: 130, height: 10 },
  passportValidUpto:  { page: 0, x: 437, y: 389, width: 130, height: 10 },
  dlValidUpto:        { page: 0, x: 437, y: 374, width: 130, height: 10 },
  // Address (right column)
  presentStayDuration:{ page: 0, x: 437, y: 298, width: 130, height: 18 },
  addressProofNo:     { page: 0, x: 437, y: 282, width: 130, height: 10 },
  addressProofDate:   { page: 0, x: 437, y: 267, width: 130, height: 10 },
  presentStreet:      { page: 0, x: 437, y: 243, width: 130, height: 18 },
  presentCity:        { page: 0, x: 437, y: 222, width: 130, height: 10 },
  presentPin:         { page: 0, x: 437, y: 197, width: 130, height: 10 },
  presentCountry:     { page: 0, x: 437, y: 182, width: 130, height: 10 },
  secondaryMobile:    { page: 0, x: 437, y: 167, width: 130, height: 10 },
  personalEmail:      { page: 0, x: 437, y: 152, width: 130, height: 10 },
  // Permanent address (right, bottom of page 0)
  permanentStreet:    { page: 0, x: 437, y: 98,  width: 130, height: 18 },
  permanentCity:      { page: 0, x: 437, y: 73,  width: 130, height: 10 },
  permanentPin:       { page: 0, x: 437, y: 48,  width: 130, height: 10 },

  // ── PAGE 1: Permanent Address (cont.) + Office + References + Employment ─────
  permanentState:     { page: 1, x: 163, y: 758, width: 140, height: 10 },
  permanentTel1:      { page: 1, x: 163, y: 743, width: 140, height: 10 },
  permanentCountry:   { page: 1, x: 437, y: 758, width: 130, height: 10 },
  permanentTel2:      { page: 1, x: 437, y: 743, width: 130, height: 10 },
  // Office address
  orgName:            { page: 1, x: 163, y: 691, width: 140, height: 10 },
  departmentName:     { page: 1, x: 163, y: 682, width: 140, height: 10 },
  officeStreet:       { page: 1, x: 163, y: 661, width: 140, height: 10 },
  officeCity:         { page: 1, x: 163, y: 636, width: 140, height: 10 },
  officeState:        { page: 1, x: 163, y: 606, width: 140, height: 10 },
  officePin:          { page: 1, x: 163, y: 591, width: 140, height: 10 },
  orgEmail:           { page: 1, x: 163, y: 576, width: 140, height: 10 },
  officeBuilding:     { page: 1, x: 437, y: 691, width: 130, height: 18 },
  officeLandmark:     { page: 1, x: 437, y: 661, width: 130, height: 10 },
  officeDistrict:     { page: 1, x: 437, y: 636, width: 130, height: 10 },
  officeCountry:      { page: 1, x: 437, y: 606, width: 130, height: 10 },
  officeLandline1:    { page: 1, x: 437, y: 591, width: 130, height: 10 },
  officeFax:          { page: 1, x: 437, y: 576, width: 130, height: 10 },
  // References
  ref1Name:           { page: 1, x: 163, y: 489, width: 140, height: 10 },
  ref1Address:        { page: 1, x: 163, y: 474, width: 140, height: 18 },
  ref1Email:          { page: 1, x: 163, y: 444, width: 140, height: 10 },
  ref1Telephone:      { page: 1, x: 163, y: 429, width: 140, height: 10 },
  ref1Mobile:         { page: 1, x: 163, y: 414, width: 140, height: 10 },
  ref2Name:           { page: 1, x: 437, y: 489, width: 130, height: 10 },
  ref2Address:        { page: 1, x: 437, y: 474, width: 130, height: 18 },
  ref2Email:          { page: 1, x: 437, y: 444, width: 130, height: 10 },
  ref2Telephone:      { page: 1, x: 437, y: 429, width: 130, height: 10 },
  ref2Mobile:         { page: 1, x: 437, y: 414, width: 130, height: 10 },
  // Employment
  occupationType:     { page: 1, x: 163, y: 344, width: 140, height: 10 },
  orgType:            { page: 1, x: 163, y: 329, width: 140, height: 10 },
  employerName:       { page: 1, x: 163, y: 314, width: 140, height: 10 },
  empDeptName:        { page: 1, x: 163, y: 284, width: 140, height: 10 },
  employeeNo:         { page: 1, x: 163, y: 264, width: 140, height: 10 },
  ddoDesignation:     { page: 1, x: 163, y: 239, width: 140, height: 50 },
  prevEmployerName:   { page: 1, x: 163, y: 159, width: 140, height: 18 },
  prevContactNo:      { page: 1, x: 163, y: 119, width: 140, height: 18 },
  expPresentJobDOJ:   { page: 1, x: 163, y: 79,  width: 140, height: 10 },
  totalExp:           { page: 1, x: 163, y: 64,  width: 140, height: 10 },
  natureOfEmployment: { page: 1, x: 437, y: 344, width: 130, height: 10 },
  currentIndustry:    { page: 1, x: 437, y: 329, width: 130, height: 10 },
  corporateRating:    { page: 1, x: 437, y: 314, width: 130, height: 10 },
  designation:        { page: 1, x: 437, y: 284, width: 130, height: 10 },
  orgWebsite:         { page: 1, x: 437, y: 255, width: 130, height: 18 },
  ddoPin:             { page: 1, x: 437, y: 239, width: 130, height: 10 },
  ddoAddress:         { page: 1, x: 437, y: 224, width: 130, height: 50 },
  prevPin:            { page: 1, x: 437, y: 159, width: 130, height: 10 },
  prevEmployerAddress:{ page: 1, x: 437, y: 144, width: 130, height: 50 },
  expPrevJob:         { page: 1, x: 437, y: 79,  width: 130, height: 10 },
  retirementDate:     { page: 1, x: 437, y: 64,  width: 130, height: 10 },

  // ── PAGE 2: Defence + Bank/SBI Relationship + Income ────────────────────────
  forceNo:            { page: 2, x: 163, y: 714, width: 140, height: 10 },
  regimentName:       { page: 2, x: 437, y: 705, width: 130, height: 10 },
  salaryAcNo:         { page: 2, x: 163, y: 657, width: 140, height: 10 },
  bankName:           { page: 2, x: 163, y: 642, width: 140, height: 10 },
  acOpenDate:         { page: 2, x: 163, y: 627, width: 140, height: 10 },
  xpressCrAcNo:       { page: 2, x: 163, y: 612, width: 140, height: 10 },
  sanctionedLimit:    { page: 2, x: 163, y: 597, width: 140, height: 10 },
  emisPaid:           { page: 2, x: 163, y: 582, width: 140, height: 10 },
  cifNo:              { page: 2, x: 437, y: 657, width: 130, height: 10 },
  branchName:         { page: 2, x: 437, y: 642, width: 130, height: 10 },
  salaryPackageName:  { page: 2, x: 437, y: 627, width: 130, height: 10 },
  disbursementDate:   { page: 2, x: 437, y: 612, width: 130, height: 10 },
  outstandingAmount:  { page: 2, x: 437, y: 597, width: 130, height: 10 },
  riskGrade:          { page: 2, x: 437, y: 582, width: 130, height: 10 },
  grossIncome:        { page: 2, x: 143, y: 497, width: 100, height: 10 },
  netIncome:          { page: 2, x: 247, y: 497, width: 100, height: 10 },

  // ── PAGE 4 (index 4): Loan Information ──────────────────────────────────────
  // (No pre-filled data on this page; all fields are manually entered)
  loanVariant:        { page: 4, x: 163, y: 733, width: 140, height: 10 },
  campaignId:         { page: 4, x: 163, y: 718, width: 140, height: 10 },
  netMonthlyIncome:   { page: 4, x: 163, y: 703, width: 140, height: 10 },
  proposedEmi:        { page: 4, x: 163, y: 688, width: 140, height: 10 },
  emiNmiRatio:        { page: 4, x: 163, y: 673, width: 140, height: 10 },
  loanAmount:         { page: 4, x: 163, y: 658, width: 140, height: 10 },
  repaymentTenure:    { page: 4, x: 163, y: 628, width: 140, height: 10 },
  corporateTieUps:    { page: 4, x: 163, y: 613, width: 140, height: 10 },
  sourcingChannel:    { page: 4, x: 437, y: 733, width: 130, height: 10 },
  checkOff:           { page: 4, x: 437, y: 718, width: 130, height: 10 },
  salaryPackages:     { page: 4, x: 437, y: 703, width: 130, height: 10 },
  processingFee:      { page: 4, x: 437, y: 688, width: 130, height: 10 },
  concessionPercent:  { page: 4, x: 437, y: 673, width: 130, height: 10 },
  concessionInProcessingFee: { page: 4, x: 437, y: 658, width: 130, height: 10 },
  interestRate:       { page: 4, x: 437, y: 643, width: 130, height: 10 },
  loanPurpose:        { page: 4, x: 437, y: 628, width: 130, height: 30 },

  // ── PAGE 5 (index 5): Signature / Place ─────────────────────────────────────
  place:              { page: 5, x: 143, y: 585, width: 420, height: 10 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const extractDataByCoordinates = (pagesItems: Record<number, { str: string; x: number; y: number }[]>) => {
  const extracted: Partial<DataModel> = {};
  for (const [key, box] of Object.entries(PDF_COORDINATES)) {
    const pageItems = pagesItems[box.page] || [];
    // Tolerance: ±12 pts horizontal, ±12 pts vertical to handle font baseline variations
    const tolerance = 12;
    const left   = box.x - tolerance;
    const right  = box.x + box.width + tolerance;
    // box.y is the baseline y of the value cell (bottom of text, origin at bottom-left of page)
    // box.height is how tall the cell is (text may be anywhere from y to y+height)
    const bottom = box.y - tolerance;
    const top    = box.y + box.height + tolerance;
    const matchedItems = pageItems.filter(
      item => item.x >= left && item.x <= right && item.y >= bottom && item.y <= top
    );
    if (matchedItems.length > 0) {
      // Sort top-to-bottom (descending y), then left-to-right
      matchedItems.sort((a, b) => Math.abs(a.y - b.y) > 4 ? b.y - a.y : a.x - b.x);
      const fieldText = matchedItems.map(item => item.str).join(' ').trim().replace(/\s+/g, ' ');
      if (fieldText) (extracted as Record<string, string>)[key] = fieldText;
    }
  }
  const dateFields = ['dob', 'addressProofDate', 'passportValidUpto', 'dlValidUpto', 'expPresentJobDOJ', 'retirementDate', 'acOpenDate', 'disbursementDate'];
  dateFields.forEach(field => {
    const val = (extracted as Record<string, string>)[field];
    if (val) {
      const m = val.match(/(\d{2})[-/](\d{2})[-/](\d{4})/);
      if (m) (extracted as Record<string, string>)[field] = `${m[3]}-${m[2]}-${m[1]}`;
    }
  });
  return extracted;
};

const formatDate = (dateString: string) => {
  if (!dateString) return '.......................';
  const [year, month, day] = dateString.split('-');
  if (year && month && day) return `${day}/${month}/${year}`;
  return dateString;
};

const toProperCase = (str: string) => {
  if (!str) return '';
  return str.split(' ').map(word => {
    if (!word) return '';
    if (word === word.toUpperCase() && /[A-Z]/.test(word)) return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    return word;
  }).join(' ');
};

const numberToWords = (num: string | number) => {
  if (!num) return '';
  const cleanNum = String(num).replace(/,/g, '').split('.')[0];
  if (isNaN(Number(cleanNum)) || cleanNum === '') return '';
  const a = ['','one ','two ','three ','four ','five ','six ','seven ','eight ','nine ','ten ','eleven ','twelve ','thirteen ','fourteen ','fifteen ','sixteen ','seventeen ','eighteen ','nineteen '];
  const b = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
  if (cleanNum.length > 9) return cleanNum;
  let str = '';
  const numArr = ('000000000' + cleanNum).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!numArr) return cleanNum;
  if (Number(numArr[1]) !== 0) str += (a[Number(numArr[1])] || b[Number(numArr[1][0])] + ' ' + a[Number(numArr[1][1])]) + 'crore ';
  if (Number(numArr[2]) !== 0) str += (a[Number(numArr[2])] || b[Number(numArr[2][0])] + ' ' + a[Number(numArr[2][1])]) + 'lakh ';
  if (Number(numArr[3]) !== 0) str += (a[Number(numArr[3])] || b[Number(numArr[3][0])] + ' ' + a[Number(numArr[3][1])]) + 'thousand ';
  if (Number(numArr[4]) !== 0) str += (a[Number(numArr[4])] || b[Number(numArr[4][0])] + ' ' + a[Number(numArr[4][1])]) + 'hundred ';
  if (Number(numArr[5]) !== 0) { if (str) str += 'and '; str += (a[Number(numArr[5])] || b[Number(numArr[5][0])] + ' ' + a[Number(numArr[5][1])]).trim() + ' '; }
  str = str.trim();
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// ─── Form Field Components (themed) ──────────────────────────────────────────

const prefillBadge = (
  <span className="text-xs font-bold flex items-center px-2 py-0.5 rounded" style={{ background: '#f3e8ff', color: '#7c3aed' }}>
    <Lock className="w-3 h-3 mr-1" /> Pre-filled
  </span>
);

const inputBase = "px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-colors text-sm";
const inputActive = `${inputBase} bg-white border-slate-300 focus:ring-purple-400`;
const inputReadOnly = `${inputBase} bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed shadow-inner`;

const InputField = ({ label, name, value, onChange, type = "text", placeholder = "", readOnly = false, max }: {
  label: string; name: string; value: string; onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  type?: string; placeholder?: string; readOnly?: boolean; max?: string | number;
}) => (
  <div className="flex flex-col mb-4">
    <label className="mb-1 text-xs font-semibold text-slate-600 flex justify-between items-center">
      <span>{label}</span>
      {readOnly && prefillBadge}
    </label>
    <input type={type} name={name} value={value} onChange={!readOnly ? onChange : undefined}
      readOnly={readOnly} placeholder={placeholder} max={max as string}
      className={readOnly ? inputReadOnly : inputActive} />
  </div>
);

const TextAreaField = ({ label, name, value, onChange, placeholder = "", readOnly = false }: {
  label: string; name: string; value: string; onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string; readOnly?: boolean;
}) => (
  <div className="flex flex-col mb-4">
    <label className="mb-1 text-xs font-semibold text-slate-600 flex justify-between items-center">
      <span>{label}</span>
      {readOnly && prefillBadge}
    </label>
    <textarea name={name} value={value} onChange={!readOnly ? onChange : undefined}
      readOnly={readOnly} placeholder={placeholder} rows={3}
      className={readOnly ? inputReadOnly : inputActive} />
  </div>
);

const SelectField = ({ label, name, value, onChange, options, readOnly = false }: {
  label: string; name: string; value: string; onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  options: string[]; readOnly?: boolean;
}) => (
  <div className="flex flex-col mb-4">
    <label className="mb-1 text-xs font-semibold text-slate-600 flex justify-between items-center">
      <span>{label}</span>
      {readOnly && prefillBadge}
    </label>
    <select name={name} value={value} onChange={!readOnly ? onChange : undefined} disabled={readOnly}
      className={readOnly ? `${inputReadOnly} appearance-none` : inputActive}>
      <option value="">Select...</option>
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

const CheckboxField = ({ label, name, checked, onChange, readOnly = false }: {
  label: string; name: string; checked: boolean; onChange: (e: ChangeEvent<HTMLInputElement>) => void; readOnly?: boolean;
}) => (
  <div className="flex items-center mb-4 mt-6">
    <input type="checkbox" name={name} checked={checked} onChange={!readOnly ? onChange : undefined}
      disabled={readOnly} className="w-4 h-4 rounded focus:ring-purple-500 disabled:opacity-50"
      style={{ accentColor: '#7c3aed' }} />
    <label className="ml-2 text-sm font-medium text-slate-700">{label}</label>
  </div>
);

// ─── Section Header ───────────────────────────────────────────────────────────

const SectionHeader = ({ title }: { title: string }) => (
  <h3 className="text-base font-bold border-b-2 pb-2 mb-4 text-slate-700" style={{ borderColor: '#d4007f' }}>{title}</h3>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const TABS = ['Application Details', 'Personal', 'Addresses', 'Employment', 'Bank Details', 'References & Assets', 'Loan Info', 'Finalise & Print'];

export default function RLMSSupplementer() {
  const [data, setData] = useState<DataModel>(initialData);
  const [readOnlyFields, setReadOnlyFields] = useState<ReadOnlyMap>({});
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [activeTab, setActiveTab] = useState('Application Details');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFinalised, setIsFinalised] = useState(false);
  const [printDocId, setPrintDocId] = useState<string | null>(null);

  // Persist to localStorage
  useEffect(() => {
    const saved = localStorage.getItem('rlmsDraft');
    const savedRO = localStorage.getItem('rlmsReadOnly');
    if (saved) {
      const parsed = JSON.parse(saved);
      const nameFields: (keyof DataModel)[] = ['name', 'fatherName', 'motherMaidenName', 'spouseName'];
      nameFields.forEach(f => { if (parsed[f]) parsed[f] = toProperCase(parsed[f]); });
      setData(parsed);
    }
    if (savedRO) setReadOnlyFields(JSON.parse(savedRO));
  }, []);

  useEffect(() => {
    localStorage.setItem('rlmsDraft', JSON.stringify(data));
    localStorage.setItem('rlmsReadOnly', JSON.stringify(readOnlyFields));
  }, [data, readOnlyFields]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    let { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    if (name === 'qualifyingYear' && value && parseInt(value, 10) > new Date().getFullYear()) return;
    const nameFields = ['name', 'fatherName', 'motherMaidenName', 'spouseName'];
    if (nameFields.includes(name) && value) value = toProperCase(value);
    setData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleLoadApplication = () => {
    if (!data.rlmsApplicationNo) { toast.error("Please enter an RLMS Application Number to load data."); return; }
    const savedStr = localStorage.getItem(`rlmsApp_${data.rlmsApplicationNo}`);
    if (savedStr) {
      const savedApp = JSON.parse(savedStr);
      const nameFields: (keyof DataModel)[] = ['name', 'fatherName', 'motherMaidenName', 'spouseName'];
      nameFields.forEach(f => { if (savedApp[f]) savedApp[f] = toProperCase(savedApp[f]); });
      setData(prev => {
        const merged = { ...savedApp };
        for (const key in readOnlyFields) { if (readOnlyFields[key as keyof DataModel]) merged[key] = (prev as Record<string, unknown>)[key]; }
        return merged;
      });
      toast.success("Application data loaded successfully! Pre-filled PDF data was preserved.");
    } else {
      toast.error("No saved user data found for this Application Number.");
    }
  };

  const handlePdfUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      setPdfBytes(arrayBuffer);
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const pagesItems: Record<number, { str: string; x: number; y: number }[]> = {};
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        // pdfjs-dist v5 changed getTextContent to use async iteration internally
        // which breaks in some browsers. Use streamTextContent + reader API instead.
        const stream = page.streamTextContent({ includeMarkedContent: false });
        const reader = stream.getReader();
        const allItems: { str: string; transform: number[] }[] = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value?.items) {
            for (const item of value.items as { str: string; transform: number[] }[]) {
              if (item.str !== undefined) allItems.push(item);
            }
          }
        }
        pagesItems[i - 1] = allItems.map(item => ({
          str: item.str, x: item.transform[4], y: item.transform[5]
        }));
      }
      const extracted = extractDataByCoordinates(pagesItems);
      const nameFields: (keyof DataModel)[] = ['name', 'fatherName', 'motherMaidenName', 'spouseName'];
      nameFields.forEach(f => { if ((extracted as Record<string, string>)[f as string]) (extracted as Record<string, string>)[f as string] = toProperCase((extracted as Record<string, string>)[f as string]); });
      setData(prev => ({ ...prev, ...extracted }));
      const roMap: ReadOnlyMap = {};
      Object.keys(extracted).forEach(k => { if ((extracted as Record<string, unknown>)[k]) roMap[k as keyof DataModel] = true; });
      setReadOnlyFields(roMap);
      toast.success("PDF processed successfully! Extracted fields are now locked.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to parse the PDF document.");
    }
    setIsProcessing(false);
  };

  const handleGeneratePDF = async () => {
    if (!pdfBytes) { toast.error("Please upload the original Bank PDF first."); return; }
    setIsProcessing(true);
    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      for (const [key, val] of Object.entries(data)) {
        if (!readOnlyFields[key as keyof DataModel] && PDF_COORDINATES[key] && val) {
          const { page, x, y, width } = PDF_COORDINATES[key];
          if (pages[page]) {
            pages[page].drawText(String(val), { x: x + TEXT_X_OFFSET, y: y + TEXT_Y_OFFSET, size: 8, font, color: rgb(0, 0, 0), maxWidth: width, lineHeight: 12 });
          }
        }
      }
      if (data.rlmsApplicationNo) {
        const userEntered: Record<string, unknown> = {};
        for (const key in data) { if (!readOnlyFields[key as keyof DataModel]) userEntered[key] = (data as Record<string, unknown>)[key]; }
        userEntered.rlmsApplicationNo = data.rlmsApplicationNo;
        localStorage.setItem(`rlmsApp_${data.rlmsApplicationNo}`, JSON.stringify(userEntered));
      }
      const modifiedBytes = await pdfDoc.save();
      const blob = new Blob([modifiedBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'Filled_Application_Form.pdf';
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success("PDF generated and downloaded successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate the final PDF.");
    }
    setIsProcessing(false);
  };

  const handleClearData = () => {
    if (window.confirm("Are you sure you want to clear all data? This will unlock all fields.")) {
      setData(initialData);
      setReadOnlyFields({});
      setPdfBytes(null);
      setIsFinalised(false);
      localStorage.removeItem('rlmsDraft');
      localStorage.removeItem('rlmsReadOnly');
      toast.success("All data cleared.");
    }
  };

  const triggerHTMLPrint = (docId: string) => {
    setPrintDocId(docId);
    setTimeout(() => { window.print(); setPrintDocId(null); }, 500);
  };

  // ─── Print Document Renderer ────────────────────────────────────────────────

  const renderPrintDocument = () => {
    const empAddress = [data.officeBuilding, data.officeStreet, data.officeCity, data.officeState, data.officePin].filter(Boolean).join(', ');
    const ddoFullAddress = [data.ddoAddress].filter(Boolean).join(', ');

    switch (printDocId) {
      case 'pl12':
        return (
          <div className="font-sans text-[10pt] leading-relaxed">
            <div className="flex justify-between items-start mb-6">
              <SbiRlmsLogo />
              <div className="font-bold text-right pt-2">Annexure: XP-12</div>
            </div>
            <h2 className="text-center font-bold mb-6 underline text-[12pt]">Irrevocable Standing Instruction given by the Borrower to the Bank</h2>
            <div className="mb-6">
              <p>To,</p><p>The Branch Manager,</p><p>State Bank of India,</p>
              <p>{data.branchName || '........................................'}</p>
            </div>
            <p className="mb-4">Madam/Dear Sir,</p>
            <p className="font-bold my-4 underline">Irrevocable Letter of Authority/Standing Instruction</p>
            <p className="font-bold my-4 underline">Personal Loan</p>
            <p className="font-bold my-4 underline">Savings Bank/Current Account Number: {data.salaryAcNo ? data.salaryAcNo.replace(/^0+/, '') : '................................'}</p>
            <p className="text-justify mb-4">
              I intend to avail the benefit of the aforesaid scheme, at present I am serving as <strong>{data.designation || '.............................'}</strong> in <strong>{data.empDeptName || '.............................'}</strong> Department at <strong>{empAddress || '...................................................'}</strong>. I undertake to deposit my salary every month for credit to the aforesaid Savings Bank/Current account maintained at your branch till liquidation of the amount advanced to me with up to date interest etc.
            </p>
            <p className="text-justify mb-4">
              2. I further authorise you to deduct a sum of <strong>Rs. {data.proposedEmi || '...........'}</strong> per month beginning from the month following the month in which the loan is disbursed and to credit the same to the loan account as EMI (Equated Monthly Instalment) till the loan is fully repaid.
            </p>
            <p className="text-justify mb-4">3. I further authorise you to debit my Savings Bank/Current Account for the EMI amount even if the balance in the account is insufficient, resulting in a debit balance in the account.</p>
            <p className="text-justify mb-4">4. I undertake to maintain sufficient balance in my Savings Bank/Current Account to meet the EMI obligation every month.</p>
            <p className="text-justify mb-16">5. This letter of authority/standing instruction is irrevocable and shall remain in force until the loan is fully repaid.</p>
            <div className="flex justify-between w-4/5 mt-16">
              <div>
                <p className="mb-8">Signature of Borrower: _______________________</p>
                <p>Name of Borrower: <strong>{data.name || '........................................................'}</strong></p>
                <p>Date: {formatDate(data.documentExecutionDate)}</p>
              </div>
            </div>
          </div>
        );
      case 'sec281':
        return (
          <div className="font-sans text-[10pt] leading-relaxed">
            <div className="mb-8"><SbiStandardLogo /></div>
            <h2 className="text-center font-bold mb-2 text-[12pt]">UNDERTAKING UNDER SECTION 281 OF INCOME TAX ACT, 1961</h2>
            <p className="text-center mb-10 text-[9pt]">(To be stamped as an agreement)</p>
            <p className="mb-6">I/We, <strong>{data.name || '............................................'}</strong>, hereby declare and undertake as follows:</p>
            <p className="text-justify mb-4">1. That I/We have applied for a loan of Rs. <strong>{data.loanAmount || '.................'}</strong> {data.loanAmount ? `(Rupees ${numberToWords(data.loanAmount)} only)` : '(Rupees ........................................................ only)'} from State Bank of India, <strong>{data.branchName || '.......................................'}</strong>.</p>
            <p className="text-justify mb-4">2. That I/We am/are not aware of any pending proceedings for assessment or reassessment of my/our income under the Income Tax Act, 1961 for any assessment year.</p>
            <p className="text-justify mb-4">3. That I/We undertake to inform the Bank immediately in the event of any such proceedings being initiated against me/us.</p>
            <p className="text-justify mb-4">4. That I/We am/are not aware of any demand outstanding against me/us under the Income Tax Act, 1961.</p>
            <p className="text-justify mb-16">5. That I/We undertake that in case any demand is raised against me/us under the Income Tax Act, 1961 in future, I/We shall immediately inform the Bank and shall not create any charge on my/our assets without the prior written consent of the Bank.</p>
            <div className="flex justify-between items-end mt-16">
              <div>
                <p>Place: {data.place || '................................'}</p>
                <p>Date: {formatDate(data.documentExecutionDate)}</p>
              </div>
              <div className="text-right">
                <p className="mb-10">Signature of Borrower(s)</p>
                <p>Name: <strong>{data.name || '........................................................'}</strong></p>
              </div>
            </div>
          </div>
        );
      case 'nesl':
        return (
          <div className="font-sans text-[10pt] leading-relaxed">
            <div className="mb-8"><SbiStandardLogo /></div>
            <h2 className="text-center font-bold mb-2 text-[12pt]">CONSENT TO DISCLOSE INFORMATION TO NeSL</h2>
            <p className="text-center mb-10 text-[9pt]">(National e-Governance Services Limited)</p>
            <p className="mb-6">I/We, <strong>{data.name || '............................................'}</strong>, hereby give my/our consent to State Bank of India to disclose the following information to National e-Governance Services Limited (NeSL) for the purpose of registration of the loan documents:</p>
            <ul className="list-disc ml-6 mb-6 space-y-2">
              <li>Name and address of the borrower(s)</li>
              <li>Loan account number and details</li>
              <li>Details of securities/collaterals</li>
              <li>Any other information as required for registration</li>
            </ul>
            <p className="text-justify mb-4">I/We understand that this information will be used solely for the purpose of registration of loan documents under the applicable laws and regulations.</p>
            <p className="text-justify mb-16">I/We confirm that I/We have read and understood the terms and conditions of this consent and agree to the same.</p>
            <div className="flex justify-between items-end mt-16">
              <div>
                <p>Place: {data.place || '................................'}</p>
                <p>Date: {formatDate(data.documentExecutionDate)}</p>
              </div>
              <div className="text-right">
                <p className="mb-10">Signature of Borrower(s)</p>
                <p>Name: <strong>{data.name || '........................................................'}</strong></p>
              </div>
            </div>
          </div>
        );
      case 'annex2':
        return (
          <div className="font-sans text-[10pt] leading-relaxed max-w-3xl mx-auto">
            <div className="mb-8"><SbiStandardLogo /></div>
            <h2 className="text-center font-bold mb-2 text-[12pt]">Annexure - II</h2>
            <p className="text-center mb-10 text-[9pt]">(Format for obtaining acknowledgment of the borrower that he has received a copy of the loan documents along with its enclosures)</p>
            <div className="mb-8">
              <p>To,</p><p>The Branch Manager</p><p>State Bank of India</p>
              <p>{data.branchName || '.......................................'}</p>
            </div>
            <p className="mb-6">Date: {formatDate(data.documentExecutionDate)}</p>
            <p className="mb-6">Dear Sir,</p>
            <p className="mb-6">My <strong>{data.loanVariant || 'Personal Loan'}</strong> Application Dated: <strong>{formatDate(data.applicationDate)}</strong></p>
            <p className="text-justify mb-6">With reference to above, I/We submit herewith that my/our loan was sanctioned for Rs. <strong>{data.loanAmount || '.........................'}</strong> {data.loanAmount ? `(Rupees ${numberToWords(data.loanAmount)} only)` : '(Rupees ........................................................ only)'}.</p>
            <p className="text-justify mb-16">I/ We confirm that a copy of the loan documents viz. Sanction letter, Arrangement letter, Key fact statement, Pamphlet on IRACP norms as enunciated by RBI has been obtained by me/us.</p>
            <p className="mb-8">Regards,</p>
            <div className="flex justify-between w-4/5">
              <div>
                <p className="mb-8">Name: <strong>{data.name}</strong></p>
                <p>Borrower's Signature: __________________</p>
              </div>
            </div>
          </div>
        );
      case 'annex10':
        return (
          <div className="font-sans text-[10pt] leading-relaxed">
            <div className="flex justify-between items-start mb-6">
              <SbiRlmsLogo />
              <div className="font-bold text-right pt-2">Annexure: XP - 10</div>
            </div>
            <div className="mb-8">
              <p>To,</p>
              <p className="font-bold">{data.ddoDesignation || '................................................'}</p>
              <p className="font-bold max-w-[185pt]">{ddoFullAddress || '.........................................................................'}</p>
              <p className="font-bold">PIN Code: {data.ddoPin || '................'}</p>
            </div>
            <p className="mb-6">Dear Sir/Madam,</p>
            <h2 className="text-left font-bold mb-3 underline">SANCTION OF PERSONAL LOAN</h2>
            <h2 className="text-left font-bold mb-3 underline uppercase">SHRI/SMT {data.name || '.............................................'}</h2>
            <h2 className="text-left font-bold mb-10 underline uppercase">UNDER {data.loanVariant || 'PERSONAL LOAN'} SCHEME</h2>
            <p className="text-justify mb-6 leading-loose">
              Shri / Smt <strong>{data.name || '...................................'}</strong> S/O <strong>{data.fatherName || '...........................'}</strong> Designation <strong>{data.designation || '......................'}</strong> Employee No <strong>{data.employeeNo || '...............'}</strong> of your Department/Institution/Corporate has been sanctioned and disbursed a loan of Rs <strong>{data.loanAmount || '................'}</strong> {data.loanAmount ? `(Rupees ${numberToWords(data.loanAmount)} only)` : '(Rupees ........................................................ only)'} under the Bank's <strong>{data.loanVariant || 'PERSONAL LOAN'}</strong> on date <strong>{formatDate(data.documentExecutionDate)}</strong> as per the terms and conditions agreed to vide the loan application dated <strong>{formatDate(data.applicationDate)}</strong> signed by the borrower.
            </p>
            <p className="text-justify mb-16">2. Please do not hesitate to bring to our notice any issue which would help us to improve / strengthen the good business relationship of our Bank with your esteemed Department/Institution/Corporate.</p>
            <div className="flex justify-between items-end mt-16">
              <div><p>Date: {formatDate(data.documentExecutionDate)}</p></div>
              <div className="text-right">
                <p className="mb-10">From,</p>
                <p>The Branch Manager,</p>
                <p>State Bank of India, {data.branchName || '.........................'}</p>
                <p className="mt-16 border-t border-black pt-2 inline-block">Signature of the loan sanctioning authority</p>
              </div>
            </div>
          </div>
        );
      default: return null;
    }
  };

  // ─── Form Fields Renderer ────────────────────────────────────────────────────

  const renderFormFields = () => {
    switch (activeTab) {
      case 'Application Details':
        return (
          <div className="space-y-6">
            <div className="p-6 rounded-xl border flex flex-col items-center justify-center text-center mb-8"
              style={{ background: 'linear-gradient(135deg, #fdf4ff 0%, #fce7f3 100%)', borderColor: '#e9d5ff' }}>
              <h3 className="text-lg font-bold mb-2" style={{ color: '#4e1a74' }}>Upload RLMS PL Application Form</h3>
              <p className="text-sm mb-4" style={{ color: '#7c3aed' }}>Upload the PDF to automatically extract available information.</p>
              <label className={`text-white font-semibold px-6 py-3 rounded-lg cursor-pointer transition shadow-md flex items-center ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{ background: 'linear-gradient(to right, #d4007f, #4e1a74)' }}>
                <FileText className="w-5 h-5 mr-2" />
                {pdfBytes ? 'Upload different PL1' : 'Upload RLMS PL Application Form'}
                <input type="file" accept=".pdf" onChange={handlePdfUpload} disabled={isProcessing} className="hidden" />
              </label>
              {pdfBytes && <p className="text-xs mt-2 font-medium" style={{ color: '#059669' }}>PDF loaded successfully</p>}
            </div>
            <SectionHeader title="Application Reference" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
              <div className="flex flex-col mb-4">
                <label className="mb-1 text-xs font-semibold text-slate-600">RLMS Application Number</label>
                <div className="flex">
                  <input type="text" name="rlmsApplicationNo" value={data.rlmsApplicationNo} onChange={handleChange}
                    className={`${inputActive} rounded-r-none flex-1`} placeholder="Enter ID..." />
                  <button type="button" onClick={handleLoadApplication}
                    className="text-white px-4 py-2 rounded-r-md transition font-semibold text-sm"
                    style={{ background: '#4e1a74' }}>Load Data</button>
                </div>
                <p className="text-xs text-slate-500 mt-1">Enter number and click Load to fetch saved data.</p>
              </div>
              <InputField label="Date of Application" name="applicationDate" type="date" value={data.applicationDate} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} />
              <InputField label="Date of Document Execution" name="documentExecutionDate" type="date" value={data.documentExecutionDate} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} />
              <InputField label="Place (For Declarations)" name="place" value={data.place} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.place} />
            </div>
          </div>
        );
      case 'Personal':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
            <SelectField label="Salutation" name="salutation" value={data.salutation} onChange={handleChange as (e: ChangeEvent<HTMLSelectElement>) => void} options={['Mr.', 'Mrs.', 'Ms.', 'Dr.']} readOnly={readOnlyFields.salutation} />
            <InputField label="Full Name" name="name" value={data.name} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.name} />
            <SelectField label="Gender" name="gender" value={data.gender} onChange={handleChange as (e: ChangeEvent<HTMLSelectElement>) => void} options={['Male', 'Female', 'Other']} readOnly={readOnlyFields.gender} />
            <InputField label="Date of Birth" name="dob" type="date" value={data.dob} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.dob} />
            <SelectField label="Marital Status" name="maritalStatus" value={data.maritalStatus} onChange={handleChange as (e: ChangeEvent<HTMLSelectElement>) => void} options={['Single', 'Married', 'Divorced', 'Widowed']} readOnly={readOnlyFields.maritalStatus} />
            <InputField label="Place of Birth" name="placeOfBirth" value={data.placeOfBirth} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.placeOfBirth} />
            <InputField label="Father's Name" name="fatherName" value={data.fatherName} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.fatherName} />
            <InputField label="Mother's Maiden Name" name="motherMaidenName" value={data.motherMaidenName} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.motherMaidenName} />
            <InputField label="Name of Spouse" name="spouseName" value={data.spouseName} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.spouseName} />
            <InputField label="Total No. of Dependents" name="dependents" type="number" value={data.dependents} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.dependents} />
            <InputField label="No. of Dependent Children" name="dependentChildren" type="number" value={data.dependentChildren} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.dependentChildren} />
            <InputField label="Nationality" name="nationality" value={data.nationality} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.nationality} />
            <SelectField label="Category" name="category" value={data.category} onChange={handleChange as (e: ChangeEvent<HTMLSelectElement>) => void} options={['General', 'OBC', 'SC', 'ST']} readOnly={readOnlyFields.category} />
            <SelectField label="Residential Status" name="residentialStatus" value={data.residentialStatus} onChange={handleChange as (e: ChangeEvent<HTMLSelectElement>) => void} options={['Resident Indian', 'NRI']} readOnly={readOnlyFields.residentialStatus} />
            <InputField label="Educational Qualification" name="education" value={data.education} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.education} />
            <InputField label="Qualifying Year" name="qualifyingYear" type="number" max={new Date().getFullYear()} value={data.qualifyingYear} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.qualifyingYear} />
            <InputField label="Disability Type" name="disabilityType" value={data.disabilityType} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.disabilityType} />
            <InputField label="PAN" name="pan" value={data.pan} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.pan} />
            <InputField label="Passport No" name="passportNo" value={data.passportNo} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.passportNo} />
            <InputField label="Driving License No" name="drivingLicenseNo" value={data.drivingLicenseNo} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.drivingLicenseNo} />
            <InputField label="Aadhaar No" name="aadhaarNo" value={data.aadhaarNo} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.aadhaarNo} />
            <InputField label="Passport Valid Upto" name="passportValidUpto" type="date" value={data.passportValidUpto} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.passportValidUpto} />
            <InputField label="DL Valid Upto" name="dlValidUpto" type="date" value={data.dlValidUpto} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.dlValidUpto} />
            <InputField label="Voter ID No" name="voterId" value={data.voterId} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.voterId} />
          </div>
        );
      case 'Addresses':
        return (
          <div className="space-y-8">
            <div>
              <SectionHeader title="Present Address" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
                <SelectField label="House Ownership" name="houseOwnership" value={data.houseOwnership} onChange={handleChange as (e: ChangeEvent<HTMLSelectElement>) => void} options={['Owned', 'Rented', 'Company Provided', 'Parental']} readOnly={readOnlyFields.houseOwnership} />
                <InputField label="Type of Address Proof" name="addressProofType" value={data.addressProofType} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.addressProofType} />
                <InputField label="Address Proof No." name="addressProofNo" value={data.addressProofNo} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.addressProofNo} />
                <InputField label="Address Proof Date" name="addressProofDate" type="date" value={data.addressProofDate} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.addressProofDate} />
                <InputField label="House/Flat/Bldg No." name="presentHouseNo" value={data.presentHouseNo} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.presentHouseNo} />
                <InputField label="Street/Area/Location" name="presentStreet" value={data.presentStreet} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.presentStreet} />
                <InputField label="Village/City" name="presentCity" value={data.presentCity} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.presentCity} />
                <InputField label="Landmark" name="presentLandmark" value={data.presentLandmark} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.presentLandmark} />
                <InputField label="District" name="presentDistrict" value={data.presentDistrict} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.presentDistrict} />
                <InputField label="State" name="presentState" value={data.presentState} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.presentState} />
                <InputField label="PIN Code" name="presentPin" value={data.presentPin} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.presentPin} />
                <InputField label="Country" name="presentCountry" value={data.presentCountry} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.presentCountry} />
                <InputField label="Staying for past (Years/Months)" name="presentStayDuration" value={data.presentStayDuration} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.presentStayDuration} />
                <InputField label="Mobile No. (Primary)" name="primaryMobile" type="tel" value={data.primaryMobile} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.primaryMobile} />
                <InputField label="Telephone (Landline)" name="landline" type="tel" value={data.landline} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.landline} />
                <InputField label="Personal Email" name="personalEmail" type="email" value={data.personalEmail} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.personalEmail} />
              </div>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <CheckboxField label="Is Permanent Address same as Present Address?" name="isPermanentSame" checked={data.isPermanentSame} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.isPermanentSame} />
            </div>
            {!data.isPermanentSame && (
              <div>
                <SectionHeader title="Permanent Address" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
                  <InputField label="House/Flat/Bldg No." name="permanentHouseNo" value={data.permanentHouseNo} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.permanentHouseNo} />
                  <InputField label="Street/Area/Location" name="permanentStreet" value={data.permanentStreet} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.permanentStreet} />
                  <InputField label="Landmark" name="permanentLandmark" value={data.permanentLandmark} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.permanentLandmark} />
                  <InputField label="Village/City" name="permanentCity" value={data.permanentCity} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.permanentCity} />
                  <InputField label="District" name="permanentDistrict" value={data.permanentDistrict} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.permanentDistrict} />
                  <InputField label="State" name="permanentState" value={data.permanentState} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.permanentState} />
                  <InputField label="PIN Code" name="permanentPin" value={data.permanentPin} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.permanentPin} />
                  <InputField label="Country" name="permanentCountry" value={data.permanentCountry} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.permanentCountry} />
                  <InputField label="Secondary Mobile" name="secondaryMobile" type="tel" value={data.secondaryMobile} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.secondaryMobile} />
                  <InputField label="Telephone (Landline 1)" name="permanentTel1" type="tel" value={data.permanentTel1} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.permanentTel1} />
                  <InputField label="Telephone (Landline 2)" name="permanentTel2" type="tel" value={data.permanentTel2} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.permanentTel2} />
                </div>
              </div>
            )}
            <div>
              <SectionHeader title="Office/Business Address" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
                <InputField label="Name of Organisation/Dept" name="orgName" value={data.orgName} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.orgName} />
                <InputField label="Floor & Building Name" name="officeBuilding" value={data.officeBuilding} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.officeBuilding} />
                <InputField label="Street/Area/Location" name="officeStreet" value={data.officeStreet} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.officeStreet} />
                <InputField label="Landmark" name="officeLandmark" value={data.officeLandmark} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.officeLandmark} />
                <InputField label="Village/City" name="officeCity" value={data.officeCity} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.officeCity} />
                <InputField label="District" name="officeDistrict" value={data.officeDistrict} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.officeDistrict} />
                <InputField label="State" name="officeState" value={data.officeState} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.officeState} />
                <InputField label="Country" name="officeCountry" value={data.officeCountry} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.officeCountry} />
                <InputField label="PIN Code" name="officePin" value={data.officePin} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.officePin} />
                <InputField label="Organisational Email" name="orgEmail" type="email" value={data.orgEmail} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.orgEmail} />
                <InputField label="Telephone (Landline 1)" name="officeLandline1" type="tel" value={data.officeLandline1} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.officeLandline1} />
                <InputField label="Telephone (Landline 2)" name="officeLandline2" type="tel" value={data.officeLandline2} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.officeLandline2} />
                <InputField label="Office Fax" name="officeFax" type="tel" value={data.officeFax} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.officeFax} />
              </div>
            </div>
          </div>
        );
      case 'Employment':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
              <SelectField label="Occupation Type" name="occupationType" value={data.occupationType} onChange={handleChange as (e: ChangeEvent<HTMLSelectElement>) => void}
                options={['Service in Private Sector', 'Service in Public Sector', 'Service in Government Sector', 'Others - Professional', 'Others - Self-employed', 'Others - Retired', 'Others - House Wife', 'Others - Student', 'Business', 'Not Categorised']}
                readOnly={readOnlyFields.occupationType} />
              <InputField label="Organization Type" name="orgType" value={data.orgType} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.orgType} />
              <InputField label="Employer Name" name="employerName" value={data.employerName} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.employerName} />
              <InputField label="Department Name" name="empDeptName" value={data.empDeptName} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.empDeptName} />
              <InputField label="Employee No" name="employeeNo" value={data.employeeNo} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.employeeNo} />
              <InputField label="DDO's Designation" name="ddoDesignation" value={data.ddoDesignation} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.ddoDesignation} />
              <InputField label="Nature of Employment" name="natureOfEmployment" value={data.natureOfEmployment} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.natureOfEmployment} />
              <InputField label="Current Industry" name="currentIndustry" value={data.currentIndustry} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.currentIndustry} />
              <InputField label="Corporate Rating" name="corporateRating" value={data.corporateRating} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.corporateRating} />
              <InputField label="Designation" name="designation" value={data.designation} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.designation} />
              <InputField label="Organisation's Website" name="orgWebsite" value={data.orgWebsite} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.orgWebsite} />
              <InputField label="DDO's Address" name="ddoAddress" value={data.ddoAddress} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.ddoAddress} />
              <InputField label="DDO PIN Code" name="ddoPin" value={data.ddoPin} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.ddoPin} />
              <InputField label="Experience in Present Job (DOJ)" name="expPresentJobDOJ" type="date" value={data.expPresentJobDOJ} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.expPresentJobDOJ} />
              <InputField label="Total Experience" name="totalExp" value={data.totalExp} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.totalExp} />
              <InputField label="Remaining Service (Retirement)" name="retirementDate" type="date" value={data.retirementDate} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.retirementDate} />
            </div>
            <div>
              <SectionHeader title="Previous Employment Details" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
                <InputField label="Previous Employer's Name" name="prevEmployerName" value={data.prevEmployerName} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.prevEmployerName} />
                <InputField label="Contact No. of Prev Employer" name="prevContactNo" value={data.prevContactNo} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.prevContactNo} />
                <InputField label="Previous Employer's Address" name="prevEmployerAddress" value={data.prevEmployerAddress} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.prevEmployerAddress} />
                <InputField label="PIN Code" name="prevPin" value={data.prevPin} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.prevPin} />
                <InputField label="Experience in Prev Job(s)" name="expPrevJob" value={data.expPrevJob} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.expPrevJob} />
              </div>
            </div>
            <div>
              <SectionHeader title="For Defence Personnel Only" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                <InputField label="Personal/Force No." name="forceNo" value={data.forceNo} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.forceNo} />
                <InputField label="Regiment Name" name="regimentName" value={data.regimentName} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.regimentName} />
              </div>
            </div>
          </div>
        );
      case 'Bank Details':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
            <InputField label="Salary Account No." name="salaryAcNo" value={data.salaryAcNo} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.salaryAcNo} />
            <InputField label="Name of Bank" name="bankName" value={data.bankName} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.bankName} />
            <InputField label="Date of Account Opening" name="acOpenDate" type="date" value={data.acOpenDate} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.acOpenDate} />
            <InputField label="Existing Xpress Cr. A/c No." name="xpressCrAcNo" value={data.xpressCrAcNo} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.xpressCrAcNo} />
            <InputField label="Sanctioned Limit" name="sanctionedLimit" value={data.sanctionedLimit} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.sanctionedLimit} />
            <InputField label="No. of EMIs Paid" name="emisPaid" type="number" value={data.emisPaid} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.emisPaid} />
            <InputField label="CIF No." name="cifNo" value={data.cifNo} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.cifNo} />
            <InputField label="Name of Branch" name="branchName" value={data.branchName} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.branchName} />
            <InputField label="Name of Salary Package" name="salaryPackageName" value={data.salaryPackageName} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.salaryPackageName} />
            <InputField label="Date of Disbursement" name="disbursementDate" type="date" value={data.disbursementDate} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.disbursementDate} />
            <InputField label="Outstanding Amount" name="outstandingAmount" value={data.outstandingAmount} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.outstandingAmount} />
            <InputField label="Risk Grade" name="riskGrade" value={data.riskGrade} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.riskGrade} />
          </div>
        );
      case 'References & Assets':
        return (
          <div className="space-y-6">
            <div>
              <SectionHeader title="References (Not related to you)" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg">
                  <h4 className="font-semibold mb-3 text-slate-600 text-sm">Reference 1</h4>
                  <InputField label="Name" name="ref1Name" value={data.ref1Name} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.ref1Name} />
                  <InputField label="Address" name="ref1Address" value={data.ref1Address} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.ref1Address} />
                  <InputField label="Email" name="ref1Email" value={data.ref1Email} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.ref1Email} />
                  <InputField label="Telephone" name="ref1Telephone" value={data.ref1Telephone} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.ref1Telephone} />
                  <InputField label="Mobile" name="ref1Mobile" value={data.ref1Mobile} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.ref1Mobile} />
                </div>
                <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg">
                  <h4 className="font-semibold mb-3 text-slate-600 text-sm">Reference 2</h4>
                  <InputField label="Name" name="ref2Name" value={data.ref2Name} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.ref2Name} />
                  <InputField label="Address" name="ref2Address" value={data.ref2Address} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.ref2Address} />
                  <InputField label="Email" name="ref2Email" value={data.ref2Email} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.ref2Email} />
                  <InputField label="Telephone" name="ref2Telephone" value={data.ref2Telephone} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.ref2Telephone} />
                  <InputField label="Mobile" name="ref2Mobile" value={data.ref2Mobile} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.ref2Mobile} />
                </div>
              </div>
            </div>
            <div>
              <SectionHeader title="Assets & Liabilities" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                <TextAreaField label="Bank Account Details" name="bankAccountDetails" value={data.bankAccountDetails} onChange={handleChange as (e: ChangeEvent<HTMLTextAreaElement>) => void} readOnly={readOnlyFields.bankAccountDetails} />
                <TextAreaField label="Credit Cards" name="creditCards" value={data.creditCards} onChange={handleChange as (e: ChangeEvent<HTMLTextAreaElement>) => void} readOnly={readOnlyFields.creditCards} />
                <TextAreaField label="Fixed Deposits" name="fixedDeposits" value={data.fixedDeposits} onChange={handleChange as (e: ChangeEvent<HTMLTextAreaElement>) => void} readOnly={readOnlyFields.fixedDeposits} />
                <TextAreaField label="Bonds, Shares, Mutual Fund, Other Investments" name="otherInvestments" value={data.otherInvestments} onChange={handleChange as (e: ChangeEvent<HTMLTextAreaElement>) => void} readOnly={readOnlyFields.otherInvestments} />
                <TextAreaField label="Precious metals/Gold/Jewellery/Vehicle/Property etc." name="assetsProperties" value={data.assetsProperties} onChange={handleChange as (e: ChangeEvent<HTMLTextAreaElement>) => void} readOnly={readOnlyFields.assetsProperties} />
              </div>
            </div>
          </div>
        );
      case 'Loan Info':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
              <InputField label="Gross Income" name="grossIncome" value={data.grossIncome} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.grossIncome} />
              <InputField label="Net Income" name="netIncome" value={data.netIncome} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.netIncome} />
              <InputField label="Net Monthly Income" name="netMonthlyIncome" value={data.netMonthlyIncome} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.netMonthlyIncome} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
              <InputField label="Product variant & Scheme Name" name="loanVariant" value={data.loanVariant} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.loanVariant} />
              <InputField label="Campaign ID" name="campaignId" value={data.campaignId} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.campaignId} />
              <InputField label="Loan Amount" name="loanAmount" value={data.loanAmount} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.loanAmount} />
              <InputField label="Tenure (Months)" name="repaymentTenure" type="number" value={data.repaymentTenure} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.repaymentTenure} />
              <InputField label="Proposed EMI" name="proposedEmi" value={data.proposedEmi} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.proposedEmi} />
              <InputField label="EMI/NMI Ratio" name="emiNmiRatio" value={data.emiNmiRatio} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.emiNmiRatio} />
              <InputField label="Rate of interest (%)" name="interestRate" value={data.interestRate} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.interestRate} />
              <InputField label="Processing Fee Rs" name="processingFee" value={data.processingFee} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.processingFee} />
              <InputField label="Sourcing Channel" name="sourcingChannel" value={data.sourcingChannel} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.sourcingChannel} />
              <InputField label="Salary Packages" name="salaryPackages" value={data.salaryPackages} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.salaryPackages} />
              <InputField label="Corporate & Institutional Tie-ups" name="corporateTieUps" value={data.corporateTieUps} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.corporateTieUps} />
              <InputField label="Check-off" name="checkOff" value={data.checkOff} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.checkOff} />
              <InputField label="Concessions if any %" name="concessionPercent" value={data.concessionPercent} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.concessionPercent} />
              <InputField label="Concession In Processing fee" name="concessionInProcessingFee" value={data.concessionInProcessingFee} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.concessionInProcessingFee} />
              <div className="col-span-full">
                <InputField label="Loan Purpose" name="loanPurpose" value={data.loanPurpose} onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void} readOnly={readOnlyFields.loanPurpose} />
              </div>
            </div>
            <div className="p-4 rounded-lg border" style={{ background: '#fdf4ff', borderColor: '#e9d5ff' }}>
              <h4 className="font-semibold mb-4 pb-2 border-b text-sm" style={{ color: '#4e1a74', borderColor: '#d8b4fe' }}>Insurance Options</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                <SelectField label="Do you wish to be covered by SBI Life cover?" name="optLifeInsurance" value={data.optLifeInsurance} onChange={handleChange as (e: ChangeEvent<HTMLSelectElement>) => void} options={['Yes', 'No']} readOnly={readOnlyFields.optLifeInsurance} />
                <SelectField label="If Yes, want to add the premium in Personal Loan?" name="addLifePremium" value={data.addLifePremium} onChange={handleChange as (e: ChangeEvent<HTMLSelectElement>) => void} options={['Yes', 'No']} readOnly={readOnlyFields.addLifePremium} />
                <SelectField label="Do you wish to be covered by SBI General Loan Insurance?" name="optGeneralInsurance" value={data.optGeneralInsurance} onChange={handleChange as (e: ChangeEvent<HTMLSelectElement>) => void} options={['Yes', 'No']} readOnly={readOnlyFields.optGeneralInsurance} />
                <SelectField label="If Yes, want to add the premium in Personal Loan?" name="addGeneralPremium" value={data.addGeneralPremium} onChange={handleChange as (e: ChangeEvent<HTMLSelectElement>) => void} options={['Yes', 'No']} readOnly={readOnlyFields.addGeneralPremium} />
              </div>
            </div>
          </div>
        );
      case 'Finalise & Print':
        return (
          <div className="space-y-6">
            {!isFinalised ? (
              <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 shadow-sm mt-4">
                <h3 className="text-2xl font-bold mb-4 text-slate-800">Finalise Application</h3>
                <p className="text-slate-600 mb-8 text-center max-w-lg">Please ensure all required fields are filled out in the previous tabs. Once finalised, you will be able to print the main application and all supporting annexures.</p>
                <button onClick={() => setIsFinalised(true)}
                  className="text-white font-bold py-3 px-8 rounded-lg shadow-lg transition"
                  style={{ background: 'linear-gradient(to right, #059669, #047857)' }}>
                  Finalise Data
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="p-4 border rounded-md font-semibold flex items-center" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Application Finalised. You can now generate the forms below.
                </div>
                <SectionHeader title="Main Application" />
                <div className="p-4 border rounded-lg shadow-sm bg-white flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-slate-800 block">1. Main PL Application Form (PL-1)</span>
                    <span className="text-xs text-slate-500">Requires original PDF to be uploaded</span>
                  </div>
                  <button onClick={handleGeneratePDF} disabled={isProcessing || !pdfBytes}
                    className={`text-white font-semibold px-4 py-2 rounded transition shadow-md ${(!pdfBytes || isProcessing) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={{ background: 'linear-gradient(to right, #d4007f, #4e1a74)' }}>
                    Print / Save PDF
                  </button>
                </div>
                <SectionHeader title="Supplementary Formats & Annexures" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { id: 'pl12', label: '2. Irrevocable Authority (PL-12)' },
                    { id: 'sec281', label: '3. IT Undertaking Sec 281' },
                    { id: 'nesl', label: '4. Consent to Disclose to NeSL' },
                    { id: 'annex2', label: '5. Annexure II' },
                    { id: 'annex10', label: '6. Annexure 10' },
                  ].map(({ id, label }) => (
                    <div key={id} className="p-4 border rounded-lg shadow-sm bg-white flex justify-between items-center">
                      <span className="font-semibold text-slate-800 text-sm">{label}</span>
                      <button onClick={() => triggerHTMLPrint(id)}
                        className="text-white font-semibold px-4 py-2 rounded transition shadow-md text-sm"
                        style={{ background: '#4e1a74' }}>
                        Print Form
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      default: return null;
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  // Print mode: show only the document
  if (printDocId) {
    return (
      <div className="bg-white w-full max-w-[210mm] min-h-[297mm] mx-auto p-10 text-black relative overflow-hidden shadow-xl print:shadow-none print:p-[15mm] print:m-0">
        <TopRightCurve />
        {(printDocId === 'pl12' || printDocId === 'annex10') && <Watermark />}
        <div className="relative z-10">{renderPrintDocument()}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50 print:hidden">
      {/* Header — matches app catalogue style */}
      <header className="w-full flex items-center justify-between px-6"
        style={{
          background: 'linear-gradient(to right, #d4007f, #4e1a74)',
          height: '101px',
          paddingTop: '0px'
        }}>
        <div className="flex items-center gap-4">
          <Link href="/">
            <button className="text-white/80 hover:text-white transition p-1 rounded-full hover:bg-white/10">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <img src={sbiLogoUrl} alt="SBI Logo" className="h-12 object-contain
" />
          <div>
            <h1 className="text-white font-bold text-xl leading-tight">RLMS Supplementer</h1>
            <p className="text-white/70 text-xs">Personal Loan Application Assistant</p>
          </div>
        </div>
        <button onClick={handleClearData}
          className="text-white/70 hover:text-white px-3 py-2 rounded transition font-semibold text-sm hover:bg-white/10">
          Clear Data
        </button>
      </header>

      {/* Processing overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-white/70 z-50 flex items-center justify-center">
          <div className="text-white px-6 py-3 rounded-full font-bold shadow-xl animate-pulse"
            style={{ background: 'linear-gradient(to right, #d4007f, #4e1a74)' }}>
            Processing Document...
          </div>
        </div>
      )}

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-60 bg-white border-r border-slate-200 shadow-sm flex flex-col">
          {!pdfBytes && (
            <div className="p-3 text-xs border-b" style={{ background: '#fffbeb', borderColor: '#fde68a', color: '#92400e' }}>
              <strong>Step 1:</strong> Go to "Application Details" to upload the Bank's PDF form and auto-fill your details.
            </div>
          )}
          <nav className="flex-1 overflow-y-auto py-3">
            <ul>
              {TABS.map(tab => (
                <li key={tab}>
                  <button
                    onClick={() => setActiveTab(tab)}
                    className={`w-full text-left px-5 py-2.5 text-sm font-medium transition-colors duration-150 ${
                      activeTab === tab
                        ? 'border-r-4 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                    style={activeTab === tab ? {
                      background: '#fdf4ff',
                      color: '#7c3aed',
                      borderRightColor: '#d4007f'
                    } : {}}
                  >
                    {tab}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50">
          <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <h2 className="text-xl font-bold text-slate-800 mb-6 pb-2 border-b-2" style={{ borderColor: '#d4007f' }}>
              {activeTab}
            </h2>
            <form onSubmit={(e) => e.preventDefault()}>
              {renderFormFields()}
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
