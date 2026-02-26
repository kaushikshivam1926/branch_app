/**
 * Data Backup and Restore Utility
 * Exports and imports all IndexedDB data as JSON files
 */

interface BackupData {
  version: string;
  timestamp: string;
  databases: {
    [dbName: string]: {
      [storeName: string]: any[];
    };
  };
}

/**
 * Get all data from a specific IndexedDB database
 */
async function exportDatabase(dbName: string): Promise<{ [storeName: string]: any[] }> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const storeData: { [storeName: string]: any[] } = {};
      const storeNames = Array.from(db.objectStoreNames);
      
      if (storeNames.length === 0) {
        resolve(storeData);
        return;
      }
      
      const transaction = db.transaction(storeNames, 'readonly');
      let completedStores = 0;
      
      storeNames.forEach(storeName => {
        const store = transaction.objectStore(storeName);
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => {
          storeData[storeName] = getAllRequest.result;
          completedStores++;
          
          if (completedStores === storeNames.length) {
            db.close();
            resolve(storeData);
          }
        };
        
        getAllRequest.onerror = () => reject(getAllRequest.error);
      });
    };
  });
}

/**
 * Export all IndexedDB data to JSON
 */
export async function exportAllData(): Promise<string> {
  const databases = await indexedDB.databases();
  const backupData: BackupData = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    databases: {}
  };
  
  for (const dbInfo of databases) {
    if (dbInfo.name) {
      try {
        backupData.databases[dbInfo.name] = await exportDatabase(dbInfo.name);
      } catch (error) {
        console.error(`Failed to export database ${dbInfo.name}:`, error);
      }
    }
  }
  
  return JSON.stringify(backupData, null, 2);
}

/**
 * Download data as JSON file
 */
export function downloadBackup(jsonData: string, filename?: string) {
  const blob = new Blob([jsonData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `sbi-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Import data into a specific IndexedDB database
 */
async function importDatabase(dbName: string, storeData: { [storeName: string]: any[] }): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const storeNames = Object.keys(storeData).filter(name => 
        db.objectStoreNames.contains(name)
      );
      
      if (storeNames.length === 0) {
        db.close();
        resolve();
        return;
      }
      
      const transaction = db.transaction(storeNames, 'readwrite');
      
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      
      transaction.onerror = () => reject(transaction.error);
      
      storeNames.forEach(storeName => {
        const store = transaction.objectStore(storeName);
        
        // Clear existing data
        store.clear();
        
        // Add imported data
        const records = storeData[storeName];
        records.forEach(record => {
          store.add(record);
        });
      });
    };
  });
}

/**
 * Import all data from JSON backup
 */
export async function importAllData(jsonData: string): Promise<{ success: boolean; message: string }> {
  try {
    const backupData: BackupData = JSON.parse(jsonData);
    
    if (!backupData.version || !backupData.databases) {
      return {
        success: false,
        message: 'Invalid backup file format'
      };
    }
    
    let importedCount = 0;
    let failedCount = 0;
    
    for (const [dbName, storeData] of Object.entries(backupData.databases)) {
      try {
        await importDatabase(dbName, storeData);
        importedCount++;
      } catch (error) {
        console.error(`Failed to import database ${dbName}:`, error);
        failedCount++;
      }
    }
    
    return {
      success: true,
      message: `Successfully imported ${importedCount} database(s). ${failedCount > 0 ? `Failed: ${failedCount}` : ''}`
    };
  } catch (error) {
    return {
      success: false,
      message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Clear all IndexedDB data
 */
export async function clearAllData(): Promise<{ success: boolean; message: string }> {
  try {
    const databases = await indexedDB.databases();
    let deletedCount = 0;
    
    for (const dbInfo of databases) {
      if (dbInfo.name) {
        const dbName = dbInfo.name;
        await new Promise<void>((resolve, reject) => {
          const request = indexedDB.deleteDatabase(dbName);
          request.onsuccess = () => {
            deletedCount++;
            resolve();
          };
          request.onerror = () => reject(request.error);
        });
      }
    }
    
    return {
      success: true,
      message: `Successfully cleared ${deletedCount} database(s)`
    };
  } catch (error) {
    return {
      success: false,
      message: `Clear failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
