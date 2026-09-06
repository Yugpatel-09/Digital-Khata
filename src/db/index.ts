import Dexie, { type Table } from 'dexie';
import {
  syncCustomerToCloud,
  deleteCustomerFromCloud,
  syncTransactionToCloud,
  deleteTransactionFromCloud,
  forceFullSync
} from './firebase';

export { forceFullSync };

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
    this.version(2).stores({
      customers: 'id, name, phone, createdAt',
      transactions: 'id, customerId, type, date, createdAt'
    });
  }
}

export const db = new KhataDatabase();

// Helper to generate collision-resistant numeric ID across devices
export function generateId(): number {
  return Date.now() + Math.floor(Math.random() * 1000);
}

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

export async function seedInitialDataIfNeeded() {
  await requestPersistentStorage();
}

/**
 * High-level synced customer operations
 */
export async function addCustomerSynced(merchantId: string, data: Omit<Customer, 'id'>): Promise<number> {
  const id = generateId();
  const customer: Customer = {
    ...data,
    id
  };
  await db.customers.put(customer);
  syncCustomerToCloud(merchantId, customer);
  return id;
}

export async function updateCustomerSynced(merchantId: string, id: number, changes: Partial<Customer>): Promise<void> {
  const existing = await db.customers.get(id);
  if (!existing) return;
  const updated: Customer = {
    ...existing,
    ...changes,
    id,
    updatedAt: new Date().toISOString()
  };
  await db.customers.put(updated);
  syncCustomerToCloud(merchantId, updated);
}

export async function deleteCustomerSynced(merchantId: string, id: number): Promise<void> {
  await db.customers.delete(id);
  deleteCustomerFromCloud(merchantId, id);

  // Also delete customer's transactions
  const txns = await db.transactions.where({ customerId: id }).toArray();
  for (const t of txns) {
    if (t.id) {
      await db.transactions.delete(t.id);
      deleteTransactionFromCloud(merchantId, t.id);
    }
  }
}

/**
 * High-level synced transaction operations
 */
export async function addTransactionSynced(merchantId: string, data: Omit<Transaction, 'id'>): Promise<number> {
  const id = generateId();
  const transaction: Transaction = {
    ...data,
    id
  };
  await db.transactions.put(transaction);
  syncTransactionToCloud(merchantId, transaction);
  return id;
}

export async function updateTransactionSynced(merchantId: string, id: number, changes: Partial<Transaction>): Promise<void> {
  const existing = await db.transactions.get(id);
  if (!existing) return;
  const updated: Transaction = {
    ...existing,
    ...changes,
    id
  };
  await db.transactions.put(updated);
  syncTransactionToCloud(merchantId, updated);
}

export async function deleteTransactionSynced(merchantId: string, id: number): Promise<void> {
  await db.transactions.delete(id);
  deleteTransactionFromCloud(merchantId, id);
}

// Clear all customer and transaction data
export async function clearAllData() {
  await db.transaction('rw', db.customers, db.transactions, async () => {
    await db.customers.clear();
    await db.transactions.clear();
  });
}

// Restore / Import full backup JSON
export async function restoreDatabaseFromJSON(merchantId: string, jsonData: any) {
  if (!jsonData || !Array.isArray(jsonData.customers) || !Array.isArray(jsonData.transactions)) {
    throw new Error('Invalid backup file format.');
  }

  await db.transaction('rw', db.customers, db.transactions, async () => {
    await db.customers.clear();
    await db.transactions.clear();

    for (const c of jsonData.customers) {
      const id = c.id || generateId();
      const customer = { ...c, id };
      await db.customers.put(customer);
      syncCustomerToCloud(merchantId, customer);
    }
    for (const t of jsonData.transactions) {
      const id = t.id || generateId();
      const txn = { ...t, id };
      await db.transactions.put(txn);
      syncTransactionToCloud(merchantId, txn);
    }
  });
}
