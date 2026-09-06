import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
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

/**
 * Save / sync customer to cloud Firestore
 */
export async function syncCustomerToCloud(merchantId: string, customer: Customer): Promise<void> {
  if (!merchantId || !customer.id) return;
  try {
    const slug = getMerchantSlug(merchantId);
    const docRef = doc(firestore, 'merchants', slug, 'customers', customer.id.toString());
    await setDoc(docRef, {
      ...customer,
      merchantId,
      syncedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore syncCustomerToCloud error (offline mode):', err);
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
    await setDoc(docRef, {
      ...transaction,
      merchantId,
      syncedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore syncTransactionToCloud error (offline mode):', err);
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
 * Start real-time 2-way sync with Firestore.
 * Listens to remote changes on all devices logged into the same merchant.
 */
let unsubscribeCustomers: Unsubscribe | null = null;
let unsubscribeTransactions: Unsubscribe | null = null;

export function startRealtimeCloudSync(
  merchantId: string,
  onStatusChange?: (status: 'connected' | 'syncing' | 'offline') => void
): () => void {
  if (!merchantId) return () => {};

  // Clean up previous listeners if any
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

  // Initial one-time sync of any local records that aren't yet in the cloud
  (async () => {
    try {
      const localCustomers = await db.customers.toArray();
      const localTransactions = await db.transactions.toArray();

      for (const c of localCustomers) {
        if (c.id) {
          const docRef = doc(firestore, 'merchants', slug, 'customers', c.id.toString());
          await setDoc(docRef, { ...c, merchantId }, { merge: true });
        }
      }

      for (const t of localTransactions) {
        if (t.id) {
          const docRef = doc(firestore, 'merchants', slug, 'transactions', t.id.toString());
          await setDoc(docRef, { ...t, merchantId }, { merge: true });
        }
      }
    } catch (e) {
      console.warn('Initial local-to-cloud sync warning:', e);
    }
  })();

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
          name: data.name,
          phone: data.phone,
          email: data.email,
          address: data.address,
          notes: data.notes,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString()
        };

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
          type: data.type,
          amount: Number(data.amount),
          date: data.date,
          time: data.time || '',
          paymentMode: data.paymentMode || 'UPI',
          notes: data.notes,
          statusNote: data.statusNote,
          billImage: data.billImage,
          createdAt: data.createdAt || new Date().toISOString()
        };

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
