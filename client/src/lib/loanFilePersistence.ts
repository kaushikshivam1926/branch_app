/**
 * Loan File Manager Persistence Layer
 * =========================================
 * 
 * Dedicated IndexedDB storage for Loan File Manager data
 * with localStorage fallback for robustness.
 * 
 * Data persists independently of browser cache clearing
 * (as long as IndexedDB is not explicitly purged)
 */

const LOAN_FILE_DB = "LoanFileManagerDB";
const LOAN_FILE_DB_VERSION = 1;
const LOAN_FILE_STORE = "loan-file-data";

interface DataRecord {
  key: string;
  value: any;
  timestamp: number;
  dataType: string;
}

class LoanFilePersistence {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize IndexedDB for Loan File Manager
   */
  private async initDB(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(LOAN_FILE_DB, LOAN_FILE_DB_VERSION);

      request.onerror = () => {
        console.error("Failed to open Loan File DB:", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log("Loan File DB initialized successfully");
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(LOAN_FILE_STORE)) {
          db.createObjectStore(LOAN_FILE_STORE, { keyPath: "key" });
          console.log("Created Loan File data store");
        }
      };
    });

    await this.initPromise;
  }

  /**
   * Save data to IndexedDB with localStorage fallback
   */
  async saveItem(key: string, value: any, dataType: string = "general"): Promise<void> {
    try {
      // Try to save to IndexedDB first
      await this.initDB();

      if (!this.db) {
        throw new Error("IndexedDB initialization failed");
      }

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([LOAN_FILE_STORE], "readwrite");
        const store = transaction.objectStore(LOAN_FILE_STORE);

        const record: DataRecord = {
          key,
          value,
          timestamp: Date.now(),
          dataType,
        };

        const request = store.put(record);

        request.onsuccess = () => {
          console.log(`Saved to IndexedDB: ${key}`);
          // Also save to localStorage as fallback
          this.saveToLocalStorage(key, value);
          resolve();
        };

        request.onerror = () => {
          console.error(`Failed to save ${key} to IndexedDB:`, request.error);
          // Fallback to localStorage
          this.saveToLocalStorage(key, value);
          reject(request.error);
        };

        transaction.onerror = () => {
          console.error("Transaction error:", transaction.error);
          this.saveToLocalStorage(key, value);
          reject(transaction.error);
        };
      });
    } catch (error) {
      console.error("Error in saveItem:", error);
      // Emergency fallback to localStorage
      this.saveToLocalStorage(key, value);
    }
  }

  /**
   * Load data from IndexedDB with localStorage fallback
   */
  async loadItem(key: string): Promise<any> {
    try {
      await this.initDB();

      if (!this.db) {
        console.warn("IndexedDB not available, using localStorage");
        return this.loadFromLocalStorage(key);
      }

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([LOAN_FILE_STORE], "readonly");
        const store = transaction.objectStore(LOAN_FILE_STORE);
        const request = store.get(key);

        request.onsuccess = () => {
          if (request.result) {
            console.log(`Loaded from IndexedDB: ${key}`);
            resolve(request.result.value);
          } else {
            // Try localStorage
            const localValue = this.loadFromLocalStorage(key);
            if (localValue) {
              console.log(`Loaded from localStorage (not in IndexedDB): ${key}`);
              // Sync back to IndexedDB
              this.saveItem(key, localValue, "synced-from-local");
            }
            resolve(localValue);
          }
        };

        request.onerror = () => {
          console.error(`Failed to load ${key} from IndexedDB:`, request.error);
          // Fallback to localStorage
          const localValue = this.loadFromLocalStorage(key);
          resolve(localValue);
        };
      });
    } catch (error) {
      console.error("Error in loadItem:", error);
      // Emergency fallback
      return this.loadFromLocalStorage(key);
    }
  }

  /**
   * Remove data from both IndexedDB and localStorage
   */
  async removeItem(key: string): Promise<void> {
    try {
      await this.initDB();

      if (this.db) {
        return new Promise((resolve, reject) => {
          const transaction = this.db!.transaction([LOAN_FILE_STORE], "readwrite");
          const store = transaction.objectStore(LOAN_FILE_STORE);
          const request = store.delete(key);

          request.onsuccess = () => {
            console.log(`Deleted from IndexedDB: ${key}`);
            localStorage.removeItem(key);
            resolve();
          };

          request.onerror = () => {
            console.error(`Failed to delete ${key}:`, request.error);
            localStorage.removeItem(key);
            reject(request.error);
          };
        });
      }
    } catch (error) {
      console.error("Error in removeItem:", error);
      localStorage.removeItem(key);
    }
  }

  /**
   * Clear all data from both IndexedDB and localStorage
   */
  async clearAll(): Promise<void> {
    try {
      await this.initDB();

      if (this.db) {
        return new Promise((resolve, reject) => {
          const transaction = this.db!.transaction([LOAN_FILE_STORE], "readwrite");
          const store = transaction.objectStore(LOAN_FILE_STORE);
          const request = store.clear();

          request.onsuccess = () => {
            console.log("Cleared IndexedDB");
            // Also clear localStorage entries related to loan files
            const keysToRemove = [
              "lfn-product-list",
              "lfn-accounts",
              "lfn-sync-log",
            ];
            keysToRemove.forEach(k => localStorage.removeItem(k));
            resolve();
          };

          request.onerror = () => {
            console.error("Failed to clear IndexedDB:", request.error);
            reject(request.error);
          };
        });
      }
    } catch (error) {
      console.error("Error in clearAll:", error);
    }
  }

  /**
   * Get all stored keys
   */
  async getAllKeys(): Promise<string[]> {
    try {
      await this.initDB();

      if (!this.db) return [];

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([LOAN_FILE_STORE], "readonly");
        const store = transaction.objectStore(LOAN_FILE_STORE);
        const request = store.getAllKeys();

        request.onsuccess = () => {
          resolve(request.result as string[]);
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (error) {
      console.error("Error in getAllKeys:", error);
      return [];
    }
  }

  /**
   * Export all data for backup
   */
  async exportAllData(): Promise<Record<string, any>> {
    try {
      await this.initDB();

      if (!this.db) {
        return this.exportFromLocalStorage();
      }

      const keys = await this.getAllKeys();
      const data: Record<string, any> = {};

      for (const key of keys) {
        data[key] = await this.loadItem(key);
      }

      return data;
    } catch (error) {
      console.error("Error in exportAllData:", error);
      return this.exportFromLocalStorage();
    }
  }

  /**
   * Import data from backup
   */
  async importAllData(data: Record<string, any>): Promise<void> {
    try {
      for (const [key, value] of Object.entries(data)) {
        await this.saveItem(key, value, "imported");
      }
      console.log("Data import completed successfully");
    } catch (error) {
      console.error("Error importing data:", error);
      throw error;
    }
  }

  /**
   * Get database status/info
   */
  async getStatus(): Promise<{
    isReady: boolean;
    idbAvailable: boolean;
    localStorageAvailable: boolean;
    itemCount: number;
  }> {
    try {
      await this.initDB();
      const keys = await this.getAllKeys();
      return {
        isReady: this.db !== null,
        idbAvailable: true,
        localStorageAvailable: this.isLocalStorageAvailable(),
        itemCount: keys.length,
      };
    } catch (error) {
      return {
        isReady: false,
        idbAvailable: false,
        localStorageAvailable: this.isLocalStorageAvailable(),
        itemCount: 0,
      };
    }
  }

  // ─── Private helper methods ────────────────────────────────────────

  private saveToLocalStorage(key: string, value: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn("LocalStorage save failed:", error);
    }
  }

  private loadFromLocalStorage(key: string): any {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.warn("LocalStorage load failed:", error);
      return null;
    }
  }

  private exportFromLocalStorage(): Record<string, any> {
    const data: Record<string, any> = {};
    const keysToExport = [
      "lfn-product-list",
      "lfn-accounts",
      "lfn-sync-log",
    ];
    keysToExport.forEach(key => {
      try {
        const item = localStorage.getItem(key);
        if (item) {
          data[key] = JSON.parse(item);
        }
      } catch (error) {
        console.warn(`Failed to export ${key}:`, error);
      }
    });
    return data;
  }

  private isLocalStorageAvailable(): boolean {
    try {
      const test = "__localStorage_test__";
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton instance
export const loanFilePersistence = new LoanFilePersistence();
