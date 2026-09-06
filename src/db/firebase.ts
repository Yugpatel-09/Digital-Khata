import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  type Unsubscribe
} from 'firebase/firestore';
import { db, type Customer, type Transaction } from './index';

export const firebaseConfig = {
  apiKey: "AIzaSyBVmumCP0o2281Vkf4cATTKs0y8Zq6Zp0",
  authDomain: "digital-khata-65de3.firebaseapp.com",
  projectId: "digital-khata-65de3",
  storageBucket: "digital-khata-65de3.firebasestorage.app",
  messagingSenderId: "967117797521",
  appId: "1:967117797521:web:b0641d0c90d516cc24a730",
  measurementId: "G-ZJVLJSQJGX"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const firestore = getFirestore(app);

export function getMerchantSlug(merchantId: string): string {
  const cleaned = merchantId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_');
  return cleaned || 'default_enterprise_khata';
}

function cleanData<T extends Record<string, any>>(obj: T): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      clean[k] = v;
    }
  }
  return clean;
}

/**
 * Save / sync customer to cloud Firestore
 */
export async function syncCustomerToCloud(merchantId: string, customer: Customer): Promise<void> {
  if (!merchantId || !customer.id) return;
  try {
    const slug = getMerchantSlug(merchantId);
    const docRef = doc(firestore, 'merchants', slug, 'customers', customer.id.toString());
    const data = cleanData({
      ...customer,
      merchantId,
      syncedAt: new Date().toISOString()
    });
    await setDoc(docRef, data, { merge: true });
  } catch (err) {
    console.warn('Firestore syncCustomerToCloud error:', err);
  }
}

/**
 * Delete customer from cloud Firestore
 */
export async function deleteCustomerFromCloud(merchantId: string, customerId: number): Promise<void> {
  if (!merchantId || !customerId) return;
  try {
    const slug = getMerchantSlug(merchantId);
    const docRef = doc(firestore, 'merchants', slug, 'customers', customerId.toString());
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firestore deleteCustomerFromCloud error:', err);
  }
}

/**
 * Save / sync transaction to cloud Firestore
 */
export async function syncTransactionToCloud(merchantId: string, transaction: Transaction): Promise<void> {
  if (!merchantId || !transaction.id) return;
  try {
    const slug = getMerchantSlug(merchantId);
    const docRef = doc(firestore, 'merchants', slug, 'transactions', transaction.id.toString());
    const data = cleanData({
      ...transaction,
      merchantId,
      syncedAt: new Date().toISOString()
    });
    await setDoc(docRef, data, { merge: true });
  } catch (err) {
    console.warn('Firestore syncTransactionToCloud error:', err);
  }
}

/**
 * Delete transaction from cloud Firestore
 */
export async function deleteTransactionFromCloud(merchantId: string, transactionId: number): Promise<void> {
  if (!merchantId || !transactionId) return;
  try {
    const slug = getMerchantSlug(merchantId);
    const docRef = doc(firestore, 'merchants', slug, 'transactions', transactionId.toString());
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firestore deleteTransactionFromCloud error:', err);
  }
}

/**
 * Force manual bidirectional full sync
 */
export async function forceFullSync(merchantId: string): Promise<{ customers: number; transactions: number }> {
  if (!merchantId) return { customers: 0, transactions: 0 };
  const slug = getMerchantSlug(merchantId);

  // 1. Push all local records to cloud
  const localCustomers = await db.customers.toArray();
  const localTransactions = await db.transactions.toArray();

  for (const c of localCustomers) {
    if (c.id) {
      await syncCustomerToCloud(merchantId, c);
    }
  }

  for (const t of localTransactions) {
    if (t.id) {
      await syncTransactionToCloud(merchantId, t);
    }
  }

  // 2. Fetch all cloud records down to local Dexie
  const custSnap = await getDocs(collection(firestore, 'merchants', slug, 'customers'));
  for (const docSnap of custSnap.docs) {
    const data = docSnap.data() as Customer;
    const id = Number(data.id || docSnap.id);
    const item: Customer = {
      id,
      name: data.name || '',
      phone: data.phone || '',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    };
    if (data.email) item.email = data.email;
    if (data.address) item.address = data.address;
    if (data.notes) item.notes = data.notes;
    await db.customers.put(item);
  }

  const txnSnap = await getDocs(collection(firestore, 'merchants', slug, 'transactions'));
  for (const docSnap of txnSnap.docs) {
    const data = docSnap.data() as Transaction;
    const id = Number(data.id || docSnap.id);
    const item: Transaction = {
      id,
      customerId: Number(data.customerId),
      type: data.type || 'GAVE',
      amount: Number(data.amount) || 0,
      date: data.date || new Date().toISOString().split('T')[0],
      time: data.time || '',
      paymentMode: data.paymentMode || 'UPI',
      createdAt: data.createdAt || new Date().toISOString()
    };
    if (data.notes) item.notes = data.notes;
    if (data.statusNote) item.statusNote = data.statusNote;
    if (data.billImage) item.billImage = data.billImage;
    await db.transactions.put(item);
  }

  return { customers: custSnap.size, transactions: txnSnap.size };
}

/**
 * Start real-time 2-way sync with Firestore.
 */
let unsubscribeCustomers: Unsubscribe | null = null;
let unsubscribeTransactions: Unsubscribe | null = null;

export function startRealtimeCloudSync(
  merchantId: string,
  onStatusChange?: (status: 'connected' | 'syncing' | 'offline') => void
): () => void {
  if (!merchantId) return () => {};

  if (unsubscribeCustomers) {
    unsubscribeCustomers();
    unsubscribeCustomers = null;
  }
  if (unsubscribeTransactions) {
    unsubscribeTransactions();
    unsubscribeTransactions = null;
  }

  const slug = getMerchantSlug(merchantId);
  onStatusChange?.('syncing');

  // Trigger initial full sync
  forceFullSync(merchantId)
    .then(() => onStatusChange?.('connected'))
    .catch((err) => {
      console.warn('Initial full sync failed:', err);
      onStatusChange?.('offline');
    });

  // 1. Real-time Customers Listener
  const customersColl = collection(firestore, 'merchants', slug, 'customers');
  unsubscribeCustomers = onSnapshot(
    customersColl,
    (snapshot) => {
      onStatusChange?.('connected');
      snapshot.docChanges().forEach(async (change) => {
        const data = change.doc.data() as Customer & { syncedAt?: string };
        const id = Number(data.id || change.doc.id);
        const item: Customer = {
          id,
          name: data.name || '',
          phone: data.phone || '',
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString()
        };
        if (data.email) item.email = data.email;
        if (data.address) item.address = data.address;
        if (data.notes) item.notes = data.notes;

        if (change.type === 'added' || change.type === 'modified') {
          await db.customers.put(item);
        } else if (change.type === 'removed') {
          await db.customers.delete(id);
        }
      });
    },
    (err) => {
      console.warn('Customers snapshot error:', err);
      onStatusChange?.('offline');
    }
  );

  // 2. Real-time Transactions Listener
  const transactionsColl = collection(firestore, 'merchants', slug, 'transactions');
  unsubscribeTransactions = onSnapshot(
    transactionsColl,
    (snapshot) => {
      onStatusChange?.('connected');
      snapshot.docChanges().forEach(async (change) => {
        const data = change.doc.data() as Transaction & { syncedAt?: string };
        const id = Number(data.id || change.doc.id);
        const item: Transaction = {
          id,
          customerId: Number(data.customerId),
          type: data.type || 'GAVE',
          amount: Number(data.amount) || 0,
          date: data.date || new Date().toISOString().split('T')[0],
          time: data.time || '',
          paymentMode: data.paymentMode || 'UPI',
          createdAt: data.createdAt || new Date().toISOString()
        };
        if (data.notes) item.notes = data.notes;
        if (data.statusNote) item.statusNote = data.statusNote;
        if (data.billImage) item.billImage = data.billImage;

        if (change.type === 'added' || change.type === 'modified') {
          await db.transactions.put(item);
        } else if (change.type === 'removed') {
          await db.transactions.delete(id);
        }
      });
    },
    (err) => {
      console.warn('Transactions snapshot error:', err);
      onStatusChange?.('offline');
    }
  );

  return () => {
    if (unsubscribeCustomers) {
      unsubscribeCustomers();
      unsubscribeCustomers = null;
    }
    if (unsubscribeTransactions) {
      unsubscribeTransactions();
      unsubscribeTransactions = null;
    }
  };
}
