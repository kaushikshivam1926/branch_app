# Branch Portfolio Dashboard - Database Schema

## IndexedDB Structure

### Database Name: `branch-portfolio-db`
### Version: 1

---

## Object Stores

### 1. **product-category-mapping**
**Purpose**: Store product categorization (uploaded once at initialization)

**Key**: `ProductCode` (string)

**Fields**:
- ProductCode (string) - Primary key (e.g., "1011-1101")
- PROD_TYPE (string) - Product type
- CURRENCY (string) - Currency code
- PROD_DESC (string) - Product description
- Category (string) - Main category (Regular Savings, Wealth, Current, etc.)
- SubCategory (string) - Sub-category (General, Staff, PBB, etc.)
- SalaryFlag (string) - "Yes"/"No"
- WealthFlag (string) - "Yes"/"No"
- SeniorCitizen (string) - "Yes"/"No"
- NRIFlag (string) - "Yes"/"No"

---

### 2. **deposit-shadow**
**Purpose**: Store comprehensive deposit portfolio (month-end data)

**Key**: `AcNo` (string)

**Fields** (62 total):
- AcNo (string) - Account number (leading zeros removed)
- CIF (string) - Customer ID (leading zeros removed)
- CustName (string) - Customer name
- OpenDt (date) - Account opening date
- Maturity_Dt (date) - Maturity date
- AcCloseDt (date) - Account close date
- CurrentBalance (number) - Current balance
- AvailableBalance (number) - Available balance
- Net_Av_Bal_YTD (number) - Net average balance YTD
- UnclearedAmount (number) - Uncleared amount
- FrozenAmount (number) - Frozen amount
- TermValue (number) - Term deposit value
- MaturityValue (number) - Maturity value
- INTRATE (number) - Interest rate
- ActType (string) - Account type
- IntCat (string) - Interest category
- ProductCode (string) - Computed: ActType-IntCat
- Acct_Desc (string) - Account description
- ProductText (string) - Product text
- MAINTBR (string) - Maintaining branch
- MobileNo (string) - Mobile number
- Status (string) - Account status
- VIP_Flag (string) - VIP flag
- ModeOfOperation (string) - Mode of operation
- [Additional fields from shadow file...]

**Computed Fields** (added during processing):
- Category (string) - From mapping
- SubCategory (string) - From mapping
- Salary_Account_Flag (string) - "Salary"/"Non-Salary"
- Wealth_Client_Flag (string) - "Wealth"/"Non-Wealth"
- NRI_Client_Flag (string) - "NRI"/"Resident"
- VIP_Flag_Normalized (string) - "VIP"/"Non-VIP"
- Deposit_Value_Band (string) - "Very High"/"High"/"Medium"/"Low"
- Maturity_Bucket (string) - "0-30 Days"/"31-90 Days"/etc.
- Dormancy_Flag (string) - "Frozen"/"Zero Balance"/"Closed"/"Active"
- HNI_Category (string) - "Ultra HNI"/"HNI"/"Regular"

---

### 3. **loan-shadow**
**Purpose**: Store comprehensive loan portfolio (month-end data)

**Key**: `AcNo` (string)

**Fields** (43 total):
- AcNo (string) - Account number (leading zeros removed)
- CIF (string) - Customer ID (leading zeros removed)
- CustName (string) - Customer name (Name1)
- AcOpenDt (date) - Account opening date
- Sanction_Dt (date) - Sanction date
- Maturity_Dt (date) - Maturity date
- CurrentBalance (number) - Current balance
- AvailableBalance (number) - Available balance
- Loan_Arrears (number) - Loan arrears
- App_Lmt (number) - Approved limit
- EMI_Due (number) - EMIs due
- EMI_Paid (number) - EMIs paid
- EMI_Overdue (number) - EMIs overdue
- Int_Rate (number) - Interest rate
- Period_Loan (number) - Loan period
- New_IRAC (string) - New IRAC classification
- Old_IRAC (string) - Old IRAC classification
- Acct_Type (string) - Account type
- Int_cat (string) - Interest category
- Acct_Code (string) - Account code
- Cat_Type_Name (string) - Category type name
- MAINTBR (string) - Maintaining branch
- MobileNo (string) - Mobile number
- Status (string) - Account status
- [Additional fields from shadow file...]

---

### 4. **loan-balance**
**Purpose**: Store daily loan balance snapshots (T+2 data)

**Key**: `ACCTNO` (string)

**Fields** (32 total):
- ACCTNO (string) - Account number
- ACCTDESC (string) - Account description
- CUSTNUMBER (string) - Customer number
- CUSTNAME (string) - Customer name
- LIMIT (number) - Loan limit
- INTRATE (number) - Interest rate
- THEOBAL (number) - Theoretical balance
- OUTSTAND (number) - Outstanding amount
- IRREGAMT (number) - Irregular amount
- SANCTDT (date) - Sanction date
- EMISDue (number) - EMIs due
- EMISPaid (number) - EMIs paid
- EMISOvrdue (number) - EMIs overdue
- NEWIRAC (string) - New IRAC
- OLDIRAC (string) - Old IRAC
- ARRCOND (string) - Arrear condition
- CURRENCY (string) - Currency
- MAINTBR (string) - Maintaining branch
- INSTALAMT (number) - Installment amount
- IRRGDT (date) - Irregularity date
- UNREALINT (number) - Unrealized interest
- ACCRINT (number) - Accrued interest
- STRESS (string) - Stress indicator
- SMA_CODE_INCIPIENT_STRESS (string) - SMA code
- RA (string) - Restructuring flag
- RA_DATE (date) - Restructuring date
- WRITE_OFF_FLAG (string) - Write-off flag
- WRITE_OFF_AMOUNT (number) - Write-off amount
- WRITE_OFF_DATE (date) - Write-off date
- SMA_CLASS (string) - SMA classification
- SMA_DATE (date) - SMA date
- SMA_ARREAR_CONDITION (string) - SMA arrear condition

**Computed Fields** (added during processing):
- Months_To_Maturity (number)
- Total_Loan_Term_Months (number)
- Loan_Age_Months (number)
- Monthly_Interest_Component (number)
- Monthly_Principal_Component (number)
- Risk_Weight (number)
- Loan_Category (string) - Based on ACCTDESC

---

### 5. **ccod-balance**
**Purpose**: Store daily CC/OD balance snapshots (T+2 data)

**Key**: `ACCTNO` (string)

**Fields** (32 total):
- ACCTNO (string) - Account number
- ACCTDESC (string) - Account description
- CUSTNUMBER (string) - Customer number
- CUSTNAME (string) - Customer name
- INTRATE (number) - Interest rate
- LIMIT (number) - Credit limit
- DP (number) - Drawing power
- LMTEXPDT (date) - Limit expiry date
- ACCTBAL (number) - Account balance
- UNCLRBAL (number) - Uncleared balance
- IRREGAMT (number) - Irregular amount
- NEWIRAC (string) - New IRAC
- OLDIRAC (string) - Old IRAC
- SANC_RENDT (date) - Sanction/renewal date
- ARRCOND (string) - Arrear condition
- CURRENCY (string) - Currency
- MAINTBR (string) - Maintaining branch
- IRRGDT (date) - Irregularity date
- UNREALINT (number) - Unrealized interest
- ACCRINT (number) - Accrued interest
- STRESS (string) - Stress indicator
- SMA_CODE (string) - SMA code
- RA (string) - Restructuring flag
- RA_DATE (date) - Restructuring date
- WRITE_OFF_FLAG (string) - Write-off flag
- WRITE_OFF_AMT (number) - Write-off amount
- WRITE_OFF_DATE (date) - Write-off date
- SMA_CLASS (string) - SMA classification
- SMA_DATE (date) - SMA date
- SMA_ARREAR_CONDITION (string) - SMA arrear condition

---

### 6. **npa-report**
**Purpose**: Store daily NPA accounts list (T+2 data)

**Key**: `ACCOUNT_NO` (string)

**Fields** (16 total):
- SR_NO (number) - Serial number
- ACCOUNT_NO (string) - Account number
- CUSTOMER_NAME (string) - Customer name
- URIP (number) - URIP amount
- OLD_IRAC (string) - Old IRAC classification
- NEW_IRAC (string) - New IRAC classification
- NPA_DATE (date) - NPA date
- OUTSTANDING (number) - Outstanding amount
- ARR_COND (string) - Arrear condition
- SYS (string) - System (CC/OD or DL/TL)
- FATHER_NAME (string) - Father's name
- SPOUSE_NAME (string) - Spouse's name
- ADDRESS1 (string) - Address line 1
- ADDRESS2 (string) - Address line 2
- ADDRESS3 (string) - Address line 3
- POSTCODE (string) - Postal code

---

### 7. **customer-dim**
**Purpose**: Store unified customer master (computed from deposits and loans)

**Key**: `CIF` (string)

**Fields**:
- CIF (string) - Customer ID
- CustName (string) - Customer name
- MAINTBR (string) - Home branch
- HNI_Category (string) - "Ultra HNI"/"HNI"/"Regular"
- NRI_Client_Flag (string) - "NRI"/"Resident"
- Wealth_Client_Flag (string) - "Wealth"/"Non-Wealth"
- Salary_Account_Flag (string) - "Salary"/"Non-Salary"
- CustomerSegment (string) - Derived segment
- TotalDeposits (number) - Sum of all deposit balances
- TotalLoans (number) - Sum of all loan outstandings
- NetExposure (number) - TotalDeposits - TotalLoans
- DepositCount (number) - Number of deposit accounts
- LoanCount (number) - Number of loan accounts
- NPACount (number) - Number of NPA accounts
- HasNPA (boolean) - Flag if customer has any NPA

---

### 8. **data-upload-log**
**Purpose**: Track data upload history

**Key**: Auto-increment

**Fields**:
- id (number) - Auto-increment
- uploadDate (date) - Upload timestamp
- fileType (string) - "deposit-shadow"/"loan-shadow"/"loan-balance"/"ccod-balance"/"npa-report"
- fileName (string) - Original file name
- recordCount (number) - Number of records uploaded
- status (string) - "success"/"error"
- errorMessage (string) - Error details if failed

---

## Data Processing Pipeline

### Initialization (One-time)
1. Upload Product Category Mapping CSV (1,956 products)
2. Store in `product-category-mapping` object store

### Monthly Upload (Month-end)
1. Upload Deposit Shadow CSV → Process → Store in `deposit-shadow`
2. Upload Loan Shadow CSV → Process → Store in `loan-shadow`
3. Compute Customer Dimension → Store in `customer-dim`

### Daily Upload (T+2)
1. Upload Loan Balance CSV → Process → Store in `loan-balance`
2. Upload CC/OD Balance CSV → Process → Store in `ccod-balance`
3. Upload NPA Report CSV → Process → Store in `npa-report`
4. Update Customer Dimension with latest data

### Data Transformation Logic (JavaScript)
- Remove leading zeros from Account No and CIF
- Parse dates (DD/MM/YYYY format)
- Parse numbers (remove commas, handle negative values)
- Compute ProductCode = ActType + "-" + IntCat
- Merge with Product Category Mapping
- Calculate derived fields (HNI category, value bands, maturity buckets, etc.)
- Aggregate at CIF level for Customer 360

---

## Indexes

### deposit-shadow
- Primary: `AcNo`
- Index: `CIF` (for Customer 360 queries)
- Index: `Category` (for portfolio breakdown)

### loan-shadow
- Primary: `AcNo`
- Index: `CIF` (for Customer 360 queries)
- Index: `New_IRAC` (for NPA queries)

### loan-balance
- Primary: `ACCTNO`
- Index: `CUSTNUMBER` (for Customer 360 queries)
- Index: `SMA_CLASS` (for asset quality queries)

### ccod-balance
- Primary: `ACCTNO`
- Index: `CUSTNUMBER` (for Customer 360 queries)

### npa-report
- Primary: `ACCOUNT_NO`
- Index: `NEW_IRAC` (for classification queries)

### customer-dim
- Primary: `CIF`
- Index: `HNI_Category` (for segmentation queries)
