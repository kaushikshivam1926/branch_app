/**
 * Portfolio Database - IndexedDB utility for Branch Portfolio Dashboard
 * Handles storage and retrieval of all portfolio data
 */

const PORTFOLIO_DB_NAME = "BranchPortfolioDB";
const PORTFOLIO_DB_VERSION = 2;

// Store names
export const STORES = {
  PRODUCT_MAPPING: "product-category-mapping",
  LOAN_PRODUCT_MAPPING: "loan-product-mapping",
  DEPOSIT_DATA: "deposit-data",
  LOAN_DATA: "loan-data",
  CCOD_DATA: "ccod-data",
  NPA_DATA: "npa-data",
  LOAN_SHADOW: "loan-shadow",
  DEPOSIT_SHADOW: "deposit-shadow",
  CUSTOMER_DIM: "customer-dim",
  UPLOAD_LOG: "upload-log",
  SETTINGS: "portfolio-settings",
} as const;

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PORTFOLIO_DB_NAME, PORTFOLIO_DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Product Category Mapping (Deposits)
      if (!db.objectStoreNames.contains(STORES.PRODUCT_MAPPING)) {
        db.createObjectStore(STORES.PRODUCT_MAPPING, { keyPath: "ProductCode" });
      }

      // Loan Product Mapping
      if (!db.objectStoreNames.contains(STORES.LOAN_PRODUCT_MAPPING)) {
        db.createObjectStore(STORES.LOAN_PRODUCT_MAPPING, { keyPath: "ProductCode" });
      }

      // Deposit Data (processed from shadow)
      if (!db.objectStoreNames.contains(STORES.DEPOSIT_DATA)) {
        const depStore = db.createObjectStore(STORES.DEPOSIT_DATA, { keyPath: "AcNo" });
        depStore.createIndex("CIF", "CIF", { unique: false });
        depStore.createIndex("Category", "Category", { unique: false });
        depStore.createIndex("Dormancy_Flag", "Dormancy_Flag", { unique: false });
      }

      // Loan Data (processed from balance + shadow merge)
      if (!db.objectStoreNames.contains(STORES.LOAN_DATA)) {
        const loanStore = db.createObjectStore(STORES.LOAN_DATA, { keyPath: "LoanKey" });
        loanStore.createIndex("CIF", "CIF", { unique: false });
        loanStore.createIndex("SMA_CLASS", "SMA_CLASS", { unique: false });
        loanStore.createIndex("Exposure_Type", "Exposure_Type", { unique: false });
      }

      // CC/OD Data
      if (!db.objectStoreNames.contains(STORES.CCOD_DATA)) {
        const ccodStore = db.createObjectStore(STORES.CCOD_DATA, { keyPath: "LoanKey" });
        ccodStore.createIndex("CIF", "CIF", { unique: false });
        ccodStore.createIndex("SMA_CLASS", "SMA_CLASS", { unique: false });
      }

      // NPA Data
      if (!db.objectStoreNames.contains(STORES.NPA_DATA)) {
        const npaStore = db.createObjectStore(STORES.NPA_DATA, { keyPath: "ACCOUNT_NO" });
        npaStore.createIndex("NEW_IRAC", "NEW_IRAC", { unique: false });
        npaStore.createIndex("SYS", "SYS", { unique: false });
      }

      // Loan Shadow (raw month-end data)
      if (!db.objectStoreNames.contains(STORES.LOAN_SHADOW)) {
        const lsStore = db.createObjectStore(STORES.LOAN_SHADOW, { keyPath: "AcNo" });
        lsStore.createIndex("CIFNo", "CIFNo", { unique: false });
      }

      // Deposit Shadow (raw month-end data)
      if (!db.objectStoreNames.contains(STORES.DEPOSIT_SHADOW)) {
        const dsStore = db.createObjectStore(STORES.DEPOSIT_SHADOW, { keyPath: "AcNo" });
        dsStore.createIndex("CIFNo", "CIFNo", { unique: false });
      }

      // Customer Dimension
      if (!db.objectStoreNames.contains(STORES.CUSTOMER_DIM)) {
        const custStore = db.createObjectStore(STORES.CUSTOMER_DIM, { keyPath: "CIF" });
        custStore.createIndex("HNI_Category", "HNI_Category", { unique: false });
        custStore.createIndex("CustomerSegment", "CustomerSegment", { unique: false });
      }

      // Upload Log
      if (!db.objectStoreNames.contains(STORES.UPLOAD_LOG)) {
        db.createObjectStore(STORES.UPLOAD_LOG, { keyPath: "id", autoIncrement: true });
      }

      // Settings
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: "key" });
      }
    };
  });
}

// Generic CRUD operations
export async function putRecord(storeName: string, record: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    store.put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function putRecords(storeName: string, records: any[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    for (const record of records) {
      store.put(record);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getRecord(storeName: string, key: string | number): Promise<any> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllRecords(storeName: string): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getRecordsByIndex(storeName: string, indexName: string, value: any): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getRecordCount(storeName: string): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function clearStore(storeName: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteDatabase(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(PORTFOLIO_DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Settings helpers
export async function getSetting(key: string): Promise<any> {
  const record = await getRecord(STORES.SETTINGS, key);
  return record?.value ?? null;
}

export async function setSetting(key: string, value: any): Promise<void> {
  return putRecord(STORES.SETTINGS, { key, value, updatedAt: Date.now() });
}

// Upload log helpers
export async function addUploadLog(entry: {
  fileType: string;
  fileName: string;
  recordCount: number;
  status: string;
  errorMessage?: string;
}): Promise<void> {
  return putRecord(STORES.UPLOAD_LOG, {
    ...entry,
    uploadDate: new Date().toISOString(),
  });
}

export async function getUploadLogs(): Promise<any[]> {
  return getAllRecords(STORES.UPLOAD_LOG);
}

// Data status check
export async function getDataStatus(): Promise<{
  productMapping: number;
  loanProductMapping: number;
  deposits: number;
  loans: number;
  ccod: number;
  npa: number;
  loanShadow: number;
  depositShadow: number;
  customers: number;
  hasData: boolean;
}> {
  const [productMapping, loanProductMapping, deposits, loans, ccod, npa, loanShadow, depositShadow, customers] = await Promise.all([
    getRecordCount(STORES.PRODUCT_MAPPING),
    getRecordCount(STORES.LOAN_PRODUCT_MAPPING),
    getRecordCount(STORES.DEPOSIT_DATA),
    getRecordCount(STORES.LOAN_DATA),
    getRecordCount(STORES.CCOD_DATA),
    getRecordCount(STORES.NPA_DATA),
    getRecordCount(STORES.LOAN_SHADOW),
    getRecordCount(STORES.DEPOSIT_SHADOW),
    getRecordCount(STORES.CUSTOMER_DIM),
  ]);

  return {
    productMapping,
    loanProductMapping,
    deposits,
    loans,
    ccod,
    npa,
    loanShadow,
    depositShadow,
    customers,
    hasData: deposits > 0 || loans > 0,
  };
}
