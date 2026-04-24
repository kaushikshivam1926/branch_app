# Branch Portfolio Analytics — Ideas Catalogue

> **Purpose:** Reference document for analytics and data-crunching features to be built into the Branch Portfolio Dashboard.
> All ideas are based on data already available in the app (LOAN_DATA, CCOD_DATA, DEPOSIT_DATA, NPA_DATA, CUSTOMER_DIM, DEPOSIT_SHADOW, LOAN_SHADOW).
> Items marked ✅ are already implemented. Items marked 🔴 are high priority. Items marked 🟡 are advanced/predictive.

---

## A. Yield & Cost Analytics

| # | Status | Metric | Description | Granularity |
|---|--------|--------|-------------|-------------|
| 1 | 🔴 | **Weighted Average Yield on Advances (WAYA)** | Σ(Outstanding × RoI) / Total Outstanding | Portfolio, Category, Sub-category, Segment |
| 2 | 🔴 | **Weighted Average Cost of Deposits (WACD)** | Σ(Balance × RoI) / Total Deposits | Portfolio, Category (CASA vs TD), Sub-category |
| 3 | 🔴 | **Net Interest Spread** | WAYA − WACD | Portfolio level |
| 4 | 🔴 | **Current Month-End Interest Income Forecast** | Σ(Prev Month-End Outstanding × RoI / 12) | Category, Product, Account |
| 5 | 🔴 | **Current Month-End Interest Expense Forecast** | Σ(Prev Month-End Deposit Balance × RoI / 12) | Category, Product |
| 6 | 🔴 | **Net Interest Income (NII) Forecast** | Interest Income Forecast − Interest Expense Forecast | Portfolio |
| 7 | 🔴 | **Monthly Principal Repayment Rate** | Σ(EMI − Monthly Interest) / Total Outstanding | Portfolio, Category |
| 8 | 🔴 | **Month-End Projected Portfolio Balance** | Outstanding − Σ(EMI − Monthly Interest) for all accounts, assuming no new disbursements | Category, Product |
| 9 | 🔴 | **EMI Coverage Ratio** | EMI / Monthly Interest — accounts where ratio < 1.05 are at risk of negative amortisation | Per account, flagged list |
| 10 | 🔴 | **Interest Income at Risk (IaR)** | Interest income that would be lost if all SMA-2 accounts slip to NPA (stop accrual) | Portfolio |
| 11 | 🔴 | **Yield Drag from NPA** | Interest not accrued on NPA accounts (NPA Outstanding × RoI / 12) | Portfolio, Category |
| 12 | 🟠 | **Effective Yield vs Contracted Yield** | Compare actual interest collected vs contractual RoI-based forecast | Per account, category |
| 13 | 🟠 | **Repricing Risk Exposure** | Outstanding balance on floating-rate loans due for repricing in next 30/60/90 days | Portfolio |
| 14 | 🟠 | **Fixed vs Floating Rate Mix** | Split of portfolio by rate type | Category, Segment |
| 15 | 🟠 | **Deposit Repricing Calendar** | FDs maturing in next 30/60/90/180 days — amount and contracted rate | Month-wise buckets |

---

## B. Portfolio Health & Stress Analytics

| # | Status | Metric | Description |
|---|--------|--------|-------------|
| 16 | 🔴 | **SMA Migration Matrix** | Accounts that moved between Standard → SMA-0 → SMA-1 → SMA-2 → NPA between two dates |
| 17 | 🔴 | **NPA Vintage Analysis** | Age distribution of NPA accounts: how long each has been in NPA (months) |
| 18 | 🔴 | **Slippage Rate** | Number/value of accounts that slipped from Standard to SMA or NPA in current month |
| 19 | 🔴 | **Recovery Rate** | Accounts that upgraded from NPA/SMA to Standard in current month |
| 20 | ✅ | **Gross NPA Ratio** | NPA Outstanding / Total Advances |
| 21 | 🔴 | **Net NPA Ratio** | (NPA − Provisions) / (Advances − Provisions) |
| 22 | 🔴 | **Provision Coverage Ratio (PCR)** | Total Provisions / Gross NPA |
| 23 | 🔴 | **Required Provision Calculator** | Substandard 15%, D1 25%, D2 40%, D3/Loss 100% — compute required provision per account and total shortfall |
| 24 | 🔴 | **SMA Concentration Risk** | Top 5 SMA accounts as % of total SMA exposure |
| 25 | 🔴 | **NPA Concentration Risk** | Top 5 NPA accounts as % of total NPA exposure |
| 26 | 🔴 | **Stressed Portfolio Ratio** | (SMA-1 + SMA-2 + NPA) / Total Advances |
| 27 | 🟠 | **Watch-List Score** | Composite score per account: DPD × 0.4 + Utilisation × 0.3 + Tenure × 0.3 — ranked list |
| 28 | 🟠 | **Overdue EMI Count Distribution** | Histogram: 1 EMI overdue, 2 EMIs, 3+ EMIs — count and amount |
| 29 | 🟠 | **Restructured Loan Tracker** | RA-flagged accounts — outstanding, category, original sanction, restructuring date |
| 30 | 🟠 | **Write-Off Recovery Pipeline** | Written-off accounts with partial recovery — recovery %, balance write-off |

---

## C. Deposit Portfolio Analytics

| # | Status | Metric | Description |
|---|--------|--------|-------------|
| 31 | ✅ | **CASA Ratio** | (SB + CA) / Total Deposits |
| 32 | 🔴 | **CASA Trend** | Month-on-month CASA balance change |
| 33 | 🔴 | **Deposit Concentration Risk** | Top 20 depositors as % of total deposits — HHI index |
| 34 | 🔴 | **Bulk Deposit Tracker** | Deposits > ₹2 Cr (single depositor threshold) — maturity calendar |
| 35 | 🔴 | **FD Maturity Ladder** | Deposits maturing in 0–7d, 7–30d, 1–3m, 3–6m, 6–12m, 12m+ — liquidity planning |
| 36 | 🔴 | **Auto-Renewal Risk** | FDs with auto-renewal flag maturing in next 30 days — potential outflow if not renewed |
| 37 | 🟠 | **Dormant Account Ratio** | Dormant accounts / Total accounts — regulatory and fraud risk indicator |
| 38 | 🟠 | **Average Deposit Tenure** | Weighted average maturity of FD portfolio |
| 39 | 🟠 | **Deposit Churn Rate** | FDs closed before maturity as % of total FDs opened in the period |
| 40 | 🟠 | **NRI Deposit Share** | NRE + NRO + FCNB as % of total deposits |
| 41 | 🟠 | **Senior Citizen Deposit Share** | Deposits with senior citizen rate flag — amount and count |
| 42 | 🟠 | **PPF / SSY / Mahila Samman Tracker** | Government scheme deposits — balance, maturity, eligible withdrawal dates |
| 43 | 🟠 | **Sweep-In FD Utilisation** | MOD accounts — how much of the FD has been swept into SB |
| 44 | 🟡 | **Deposit Rate Sensitivity** | If RBI cuts/hikes repo by 25 bps, projected change in interest expense |
| 45 | 🟠 | **Zero-Balance / Near-Zero Account Alert** | SB/CA accounts with balance < ₹500 — potential closure risk |

---

## D. Loan Portfolio Analytics

| # | Status | Metric | Description |
|---|--------|--------|-------------|
| 46 | 🔴 | **Loan Maturity Ladder** | Loans maturing in 0–30d, 1–3m, 3–6m, 6–12m, 12m+ — principal repayment forecast |
| 47 | 🔴 | **Bullet Repayment Calendar** | Loans with bullet/balloon payments — date and amount |
| 48 | 🔴 | **Gold Loan LTV Distribution** | Loan-to-Value ratio distribution for gold loans — accounts above 75% LTV flagged |
| 49 | ✅ | **Gold Loan Maturity Alert** | Gold loans matured or maturing in next 15 days |
| 50 | 🟠 | **Personal Loan Half-Repaid Tracker** | PL accounts where ≥50% of principal repaid — cross-sell opportunity |
| 51 | 🟠 | **Home Loan Tenure Remaining** | Distribution: <5y, 5–10y, 10–20y, 20y+ |
| 52 | 🟠 | **Home Loan LTV at Origination vs Current** | Current outstanding / Original property value — rising LTV flags |
| 53 | 🟠 | **Education Loan Moratorium Tracker** | Accounts in moratorium — when moratorium ends, EMI start date, projected first EMI |
| 54 | 🟡 | **Vehicle Loan Depreciation Gap** | Outstanding vs estimated current vehicle value — negative equity accounts |
| 55 | 🔴 | **Loan Utilisation Rate (CC/OD)** | Average utilisation across CC/OD portfolio — low utilisation = idle limit |
| 56 | ✅ | **CC/OD Out-of-Order Ageing** | Days since out-of-order date — distribution: <30d, 30–60d, 60–90d, 90d+ |
| 57 | 🟠 | **Sanction vs Disbursement Gap** | Loans sanctioned but not fully disbursed — undisbursed amount |
| 58 | 🔴 | **Loan Renewal Pipeline** | CC/OD accounts with renewal due in next 30/60/90 days |
| 59 | 🟠 | **Overdraft Limit Adequacy** | CC/OD accounts where utilisation > 90% of limit for 3+ consecutive months |
| 60 | 🟠 | **Prepayment Rate** | Loans closed before maturity — principal prepaid / total outstanding |

---

## E. Customer & Relationship Analytics

| # | Status | Metric | Description |
|---|--------|--------|-------------|
| 61 | 🔴 | **Customer Profitability Score** | (Interest income from loans + fee income) − (Interest cost of deposits) per CIF |
| 62 | 🔴 | **Wallet Share Analysis** | Total relationship value (deposits + loans) per customer — ranked list |
| 63 | 🔴 | **Single-Product Customers** | Customers with only 1 product — cross-sell opportunity list |
| 64 | 🟠 | **HNI / Ultra-HNI Relationship Summary** | Total deposits, loans, NRI status, product count per HNI customer |
| 65 | 🔴 | **Liability-Only Customers** | Customers with deposits but no loans — lending opportunity |
| 66 | 🔴 | **Asset-Only Customers** | Customers with loans but no deposits — liability deepening opportunity |
| 67 | 🟠 | **Customer Vintage Analysis** | Distribution of customers by account opening year — loyalty segmentation |
| 68 | 🟠 | **Dormancy Risk Score** | Customers with no debit transaction in 12+ months across all accounts |
| 69 | 🟡 | **NRI Customer Repatriation Tracker** | NRE accounts with large outward remittances — potential deposit outflow |
| 70 | 🟠 | **Joint Account Holder Analysis** | Accounts with joint holders — identify primary vs secondary holder contribution |

---

## F. Regulatory & Compliance Analytics

| # | Status | Metric | Description |
|---|--------|--------|-------------|
| 71 | 🔴 | **Priority Sector Lending (PSL) Tracker** | PSL-eligible outstanding as % of ANBC — gap to 40% target |
| 72 | 🔴 | **PSL Sub-Category Compliance** | Agriculture 18%, Weaker Section 10%, Micro 7.5% — individual gaps |
| 73 | 🔴 | **MSME Loan Tracker** | MSME outstanding, count, SMA distribution |
| 74 | 🟠 | **KCC (Kisan Credit Card) Utilisation** | KCC accounts — limit, utilisation, seasonal pattern |
| 75 | 🟠 | **SHG / JLG Loan Portfolio** | Self-Help Group and Joint Liability Group loans — count, outstanding, NPA |
| 76 | 🔴 | **Loan Against Property (LAP) LTV Monitor** | LAP accounts with LTV > 60% — regulatory threshold watch |
| 77 | 🟠 | **CERSAI Registration Tracker** | Home/LAP loans — CERSAI registration date, pending registrations |
| 78 | 🔴 | **SARFAESI Eligible NPA List** | NPA accounts with outstanding > ₹1 lakh — SARFAESI action eligibility |
| 79 | 🟠 | **Section 138 (NI Act) Eligible List** | Accounts with bounced cheques — legal action pipeline |
| 80 | 🟠 | **Wilful Defaulter Flag Tracker** | Accounts flagged as wilful defaulters — outstanding and legal status |

---

## G. Predictive & Stress Testing (Advanced)

| # | Status | Metric | Description |
|---|--------|--------|-------------|
| 81 | 🟡 | **NPA Probability Score** | Composite score: DPD trend + utilisation + tenure + sector → probability of slipping to NPA in 90 days |
| 82 | 🟡 | **Portfolio Stress Test: Rate Shock** | If RoI rises 200 bps, how many floating-rate borrowers breach 50% DSCR? |
| 83 | 🟡 | **Portfolio Stress Test: Income Shock** | If 20% of salary-account borrowers lose jobs, projected NPA increase |
| 84 | 🟡 | **Deposit Run Scenario** | If top 10 depositors withdraw simultaneously, what % of CASA is lost? |
| 85 | 🟡 | **Liquidity Coverage Ratio (LCR) Proxy** | Liquid assets (SLR + CRR) vs 30-day deposit outflow estimate |
| 86 | 🔴 | **Sector Concentration Risk** | Outstanding by industry/sector — flag sectors > 10% of portfolio |
| 87 | 🟠 | **Geographic Concentration** | Outstanding by PIN code / locality — identify over-concentration |
| 88 | 🟡 | **Vintage Default Curve** | For each loan cohort (year of sanction), plot % that became NPA by month 6/12/24/36 |
| 89 | 🟡 | **Survival Analysis** | Probability that a current SMA-1 account survives to Standard vs slips to NPA — based on historical patterns |
| 90 | 🟡 | **Revenue Leakage Detector** | Accounts where interest collected < interest charged — identify waivers, system errors |
| 91 | 🔴 | **EMI Bounce Rate** | % of EMI due dates with bounce in last 3 months — early warning |
| 92 | 🟡 | **Seasonal Portfolio Stress** | Month-wise NPA slippage pattern — identify high-risk months (e.g., post-harvest for agri) |
| 93 | 🟠 | **Collateral Coverage Ratio** | Outstanding / Collateral value — accounts with coverage < 100% |
| 94 | 🔴 | **Cross-Default Risk** | Customers with multiple loans where one is SMA — flag all their other loans |
| 95 | 🟡 | **Portfolio Duration** | Weighted average remaining tenure of loan portfolio — interest rate sensitivity |
| 96 | 🟡 | **Deposit Beta** | How much of a repo rate change passes through to deposit rates — cost sensitivity |
| 97 | 🟡 | **Loan Yield Beta** | How much of a repo rate change passes through to loan yields — income sensitivity |
| 98 | 🟡 | **Break-Even Yield** | Minimum yield needed on advances to cover cost of deposits + operating cost |
| 99 | 🟡 | **Franchise Value Score** | CASA ratio × Customer count × Avg relationship tenure — branch stickiness index |
| 100 | 🟠 | **Digital Adoption Score** | % of customers using net banking / mobile banking — future attrition risk proxy |

---

## H. Operational & Efficiency Analytics

| # | Status | Metric | Description |
|---|--------|--------|-------------|
| 101 | 🟠 | **Loan File Pending Closure** | Loans fully repaid but file not closed — operational backlog |
| 102 | 🟠 | **NOC Issuance TAT** | Days between loan closure and NOC issuance — service quality metric |
| 103 | 🟠 | **Dak Volume Trend** | Letters/notices issued per month — workload trend |
| 104 | 🟠 | **Notice-to-Recovery Ratio** | NPA notices issued vs accounts that regularised within 90 days |
| 105 | ✅ | **Staff Loan Compliance** | Staff loans — EMI regularity, outstanding vs salary, NPA flag (exempt from NPA) |
| 106 | 🟠 | **Locker Utilisation** | Locker count vs occupied — revenue opportunity |
| 107 | 🟠 | **Average Loan Processing Time** | Days from application to disbursement — efficiency metric |
| 108 | 🔴 | **Renewal Compliance Rate** | CC/OD accounts renewed on time vs overdue for renewal |
| 109 | 🟠 | **Insurance Coverage on Loans** | Loans with insurance cover vs without — risk mitigation |
| 110 | 🟠 | **Nominee Registration Rate** | Deposit accounts with nominee vs without — compliance metric |

---

## Priority Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Already implemented in the app |
| 🔴 | High priority — data available, high business value |
| 🟠 | Medium priority — data partially available or moderate complexity |
| 🟡 | Advanced / predictive — requires additional data or modelling |

---

*Total: 110 analytics ideas across 8 categories.*
*Last updated: April 2026*
