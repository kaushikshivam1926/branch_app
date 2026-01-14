/**
 * IndexedDB utility for robust data persistence
 * Data persists even when browser history/cookies are cleared
 */

const DB_NAME = "SBI_Branch_App_DB";
const DB_VERSION = 1;
const STORE_NAME = "app_data";

interface DBData {
  key: string;
  value: any;
  timestamp: number;
}

class IndexedDBManager {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "key" });
        }
      };
    });
  }

  async set(key: string, value: any): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const data: DBData = {
        key,
        value,
        timestamp: Date.now()
      };

      const request = store.put(data);
      request.onsuccess = () => {
        // Also save to localStorage as fallback
        try {
          localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
          console.warn("localStorage save failed:", e);
        }
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async get(key: string): Promise<any> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result.value);
        } else {
          // Fallback to localStorage
          try {
            const localData = localStorage.getItem(key);
            if (localData) {
              const parsed = JSON.parse(localData);
              // Sync back to IndexedDB
              this.set(key, parsed);
              resolve(parsed);
            } else {
              resolve(null);
            }
          } catch (e) {
            resolve(null);
          }
        }
      };
      request.onerror = () => {
        // Fallback to localStorage on error
        try {
          const localData = localStorage.getItem(key);
          resolve(localData ? JSON.parse(localData) : null);
        } catch (e) {
          reject(request.error);
        }
      };
    });
  }

  async remove(key: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);

      request.onsuccess = () => {
        // Also remove from localStorage
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.warn("localStorage remove failed:", e);
        }
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllKeys(): Promise<string[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAllKeys();

      request.onsuccess = () => resolve(request.result as string[]);
      request.onerror = () => reject(request.error);
    });
  }

  async exportAll(): Promise<Record<string, any>> {
    const keys = await this.getAllKeys();
    const data: Record<string, any> = {};

    for (const key of keys) {
      data[key] = await this.get(key);
    }

    return data;
  }

  async importAll(data: Record<string, any>): Promise<void> {
    for (const [key, value] of Object.entries(data)) {
      await this.set(key, value);
    }
  }

  async clear(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Singleton instance
export const db = new IndexedDBManager();

// Helper functions for common operations
export async function saveData(key: string, value: any): Promise<void> {
  return db.set(key, value);
}

export async function loadData(key: string): Promise<any> {
  return db.get(key);
}

export async function removeData(key: string): Promise<void> {
  return db.remove(key);
}

export async function exportAllData(): Promise<string> {
  const data = await db.exportAll();
  return JSON.stringify(data, null, 2);
}

export async function importAllData(jsonString: string): Promise<void> {
  try {
    const data = JSON.parse(jsonString);
    await db.importAll(data);
  } catch (error) {
    throw new Error("Invalid backup file format");
  }
}

// Initialize on module load
db.init().catch(console.error);
