import Dexie, { type Table } from 'dexie';

export interface Customer {
  id?: number;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType = 'GAVE' | 'GOT';

export interface Transaction {
  id?: number;
  customerId: number;
  type: TransactionType;
  amount: number;
  date: string; // YYYY-MM-DD
  time: string; // e.g. "04:15 PM"
  paymentMode: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Other';
  notes?: string;
  statusNote?: string;
  billImage?: string;
  createdAt: string;
}

export class KhataDatabase extends Dexie {
  customers!: Table<Customer, number>;
  transactions!: Table<Transaction, number>;

  constructor() {
    super('KhataEnterpriseDB_Real');
    this.version(1).stores({
      customers: '++id, name, phone, createdAt',
      transactions: '++id, customerId, type, date, createdAt'
    });
  }
}

export const db = new KhataDatabase();

// Request persistent storage from browser so IndexedDB is never purged
export async function requestPersistentStorage() {
  if (typeof window !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persisted();
      if (!isPersisted) {
        await navigator.storage.persist();
      }
    } catch (e) {
      console.warn('Storage persistence request error:', e);
    }
  }
}

// Start with completely fresh empty database for real data
export async function seedInitialDataIfNeeded() {
  await requestPersistentStorage();
}

// Clear all customer and transaction data
export async function clearAllData() {
  await db.transaction('rw', db.customers, db.transactions, async () => {
    await db.customers.clear();
    await db.transactions.clear();
  });
}

// Restore / Import full backup JSON
export async function restoreDatabaseFromJSON(jsonData: any) {
  if (!jsonData || !Array.isArray(jsonData.customers) || !Array.isArray(jsonData.transactions)) {
    throw new Error('Invalid backup file format.');
  }

  await db.transaction('rw', db.customers, db.transactions, async () => {
    await db.customers.clear();
    await db.transactions.clear();

    for (const c of jsonData.customers) {
      await db.customers.add(c);
    }
    for (const t of jsonData.transactions) {
      await db.transactions.add(t);
    }
  });
}
