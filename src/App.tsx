import { useState, useEffect } from 'react';
import { LoginPage } from './components/LoginPage';
import { Dashboard } from './components/Dashboard';
import { CustomerProfileView } from './components/CustomerProfileView';
import { AddCustomerModal } from './components/AddCustomerModal';
import { TransactionModal } from './components/TransactionModal';
import { db, seedInitialDataIfNeeded, type Customer, type Transaction, type TransactionType } from './db';
import { startRealtimeCloudSync } from './db/firebase';
import { useLiveQuery } from 'dexie-react-hooks';

export function App() {
  const [merchantId, setMerchantId] = useState<string | null>(() => {
    return localStorage.getItem('khata_merchant_id');
  });

  const [syncStatus, setSyncStatus] = useState<'connected' | 'syncing' | 'offline'>('connected');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  // Modals state
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);

  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionModalType, setTransactionModalType] = useState<TransactionType>('GAVE');
  const [transactionModalCustomerId, setTransactionModalCustomerId] = useState<number | null>(null);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);

  useEffect(() => {
    seedInitialDataIfNeeded();
  }, []);

  // Multi-device real-time cloud synchronization
  useEffect(() => {
    if (merchantId) {
      const cleanup = startRealtimeCloudSync(merchantId, (status) => {
        setSyncStatus(status);
      });
      return cleanup;
    }
  }, [merchantId]);

  const customers = useLiveQuery(() => db.customers.toArray()) || [];

  const handleLogin = (id: string) => {
    localStorage.setItem('khata_merchant_id', id);
    setMerchantId(id);
  };

  const handleLogout = () => {
    localStorage.removeItem('khata_merchant_id');
    setMerchantId(null);
    setSelectedCustomerId(null);
  };

  const handleOpenTransactionModal = (type: TransactionType, customerId?: number | null) => {
    setTransactionToEdit(null);
    setTransactionModalType(type);
    setTransactionModalCustomerId(customerId ?? selectedCustomerId ?? null);
    setIsTransactionModalOpen(true);
  };

  const handleEditTransaction = (txn: Transaction) => {
    setTransactionToEdit(txn);
    setTransactionModalType(txn.type);
    setTransactionModalCustomerId(txn.customerId);
    setIsTransactionModalOpen(true);
  };

  const handleOpenAddCustomer = () => {
    setCustomerToEdit(null);
    setIsCustomerModalOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setCustomerToEdit(customer);
    setIsCustomerModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#000000] text-white flex justify-center selection:bg-emerald-500/30 selection:text-white">
      {/* Centered Mobile Application Shell */}
      <div className="app-container w-full max-w-[460px] min-h-screen bg-black relative flex flex-col overflow-x-hidden shadow-2xl">
        {!merchantId ? (
          <LoginPage onLogin={handleLogin} />
        ) : selectedCustomerId !== null ? (
          <CustomerProfileView
            customerId={selectedCustomerId}
            merchantId={merchantId}
            onBack={() => setSelectedCustomerId(null)}
            onOpenTransactionModal={handleOpenTransactionModal}
            onEditCustomer={handleEditCustomer}
            onEditTransaction={handleEditTransaction}
          />
        ) : (
          <Dashboard
            merchantId={merchantId}
            syncStatus={syncStatus}
            onLogout={handleLogout}
            onSelectCustomer={(id) => setSelectedCustomerId(id)}
            onOpenAddCustomer={handleOpenAddCustomer}
            onOpenTransactionModal={handleOpenTransactionModal}
            onEditTransaction={handleEditTransaction}
          />
        )}

        {/* Add / Edit Customer Modal */}
        {merchantId && (
          <AddCustomerModal
            isOpen={isCustomerModalOpen}
            merchantId={merchantId}
            initialData={customerToEdit}
            onClose={() => {
              setIsCustomerModalOpen(false);
              setCustomerToEdit(null);
            }}
            onSuccess={(id) => {
              if (!selectedCustomerId && !customerToEdit) {
                setSelectedCustomerId(id);
              }
            }}
          />
        )}

        {/* Record / Edit Transaction Modal (Gave / Got) */}
        {merchantId && (
          <TransactionModal
            isOpen={isTransactionModalOpen}
            merchantId={merchantId}
            defaultType={transactionModalType}
            defaultCustomerId={transactionModalCustomerId}
            initialData={transactionToEdit}
            customers={customers}
            onOpenAddCustomer={() => {
              setIsTransactionModalOpen(false);
              setIsCustomerModalOpen(true);
            }}
            onClose={() => {
              setIsTransactionModalOpen(false);
              setTransactionToEdit(null);
            }}
            onSuccess={() => {}}
          />
        )}
      </div>
    </div>
  );
}

export default App;
