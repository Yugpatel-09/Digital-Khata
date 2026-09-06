import React, { useState } from 'react';
import { db, type Customer, type TransactionType } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { generateCustomerStatementPDF } from '../utils/pdfGenerator';

interface CustomerProfileViewProps {
  customerId: number;
  onBack: () => void;
  onOpenTransactionModal: (type: TransactionType, customerId: number) => void;
  onEditCustomer: (customer: Customer) => void;
}

export const CustomerProfileView: React.FC<CustomerProfileViewProps> = ({
  customerId,
  onBack,
  onOpenTransactionModal,
  onEditCustomer
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'GAVE' | 'GOT'>('ALL');
  const [copiedReminder, setCopiedReminder] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const customer = useLiveQuery(
    () => db.customers.get(customerId),
    [customerId]
  );

  const transactions = useLiveQuery(
    async () => {
      const list = await db.transactions.where({ customerId }).toArray();
      return list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    },
    [customerId]
  );

  if (!customer) {
    return (
      <div className="p-8 text-center text-zinc-400 w-full">
        <p>Customer profile not found.</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 rounded-xl bg-zinc-900 border border-[#27272a] text-white text-xs cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // Calculate Running Balances and Totals
  let running = 0;
  const enrichedTransactions = (transactions || []).map((t) => {
    if (t.type === 'GAVE') {
      running += t.amount;
    } else {
      running -= t.amount;
    }
    return {
      ...t,
      balanceAfter: running
    };
  });

  const totalGave = (transactions || [])
    .filter((t) => t.type === 'GAVE')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalGot = (transactions || [])
    .filter((t) => t.type === 'GOT')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalGave - totalGot;

  const displayTransactions = [...enrichedTransactions]
    .filter((t) => filterType === 'ALL' || t.type === filterType)
    .reverse();

  const handleCopyReminder = () => {
    const formattedBalance = Math.abs(netBalance).toLocaleString('en-IN');
    let message = '';
    if (netBalance > 0) {
      message = `Dear ${customer.name}, your outstanding balance with Digital Khata is ₹${formattedBalance}. Please settle at your earliest convenience. Thank you!`;
    } else if (netBalance < 0) {
      message = `Dear ${customer.name}, we have an advance balance of ₹${formattedBalance} recorded for you. Thank you!`;
    } else {
      message = `Dear ${customer.name}, your account balance is completely settled (₹0.00). Thank you!`;
    }

    navigator.clipboard.writeText(message);
    setCopiedReminder(true);
    setTimeout(() => setCopiedReminder(false), 3000);
  };

  const handleExportPDF = async () => {
    try {
      setIsExportingPDF(true);
      const res = await generateCustomerStatementPDF(customer, transactions || [], 'Digital Khata');
      if (!res.success && res.message) {
        alert(res.message);
      }
    } catch (err) {
      console.error('Failed to generate PDF statement', err);
      alert('Failed to generate PDF statement. Please try again.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleDeleteTransaction = async (id?: number) => {
    if (!id) return;
    if (window.confirm('Delete this transaction record?')) {
      await db.transactions.delete(id);
    }
  };

  const handleSettleFullBalance = async () => {
    if (netBalance === 0) return;
    const confirmText = netBalance > 0
      ? `Record full settlement of ₹${netBalance.toLocaleString('en-IN')} received from ${customer.name}?`
      : `Record payment of ₹${Math.abs(netBalance).toLocaleString('en-IN')} paid to ${customer.name}?`;
    
    if (window.confirm(confirmText)) {
      const now = new Date();
      await db.transactions.add({
        customerId,
        type: netBalance > 0 ? 'GOT' : 'GAVE',
        amount: Math.abs(netBalance),
        date: now.toISOString().split('T')[0],
        time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        paymentMode: 'UPI',
        notes: 'Full balance settled',
        statusNote: 'Cleared in full',
        createdAt: now.toISOString()
      });
    }
  };

  const initials = customer.name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="w-full min-h-screen bg-black text-white flex flex-col selection:bg-emerald-500/30 selection:text-white">
      {/* Top Header - Sticky so it adapts dynamically to safe-area notch */}
      <header className="sticky top-0 z-30 w-full bg-black/95 backdrop-blur-xl border-b border-[#27272a] pt-safe shadow-md">
        <div className="h-16 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={onBack}
              aria-label="Back to Dashboard"
              className="w-9 h-9 rounded-xl bg-zinc-900 border border-[#27272a] flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-9 h-9 rounded-full bg-[#27272a] text-zinc-100 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {initials}
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm font-bold text-white truncate max-w-[150px]">
                    {customer.name}
                  </h1>
                  <button
                    onClick={() => onEditCustomer(customer)}
                    className="text-zinc-500 hover:text-zinc-300 p-0.5 cursor-pointer"
                    title="Edit Customer"
                  >
                    <span className="material-symbols-outlined text-[15px]">edit</span>
                  </button>
                </div>
                <p className="text-[11px] text-zinc-400 truncate max-w-[160px]">
                  {customer.phone || 'No phone'}
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons on Top */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleExportPDF}
              disabled={isExportingPDF}
              className="px-2.5 py-1 rounded-full bg-[#18181b] border border-[#27272a] hover:border-emerald-500/50 flex items-center gap-1 text-zinc-200 hover:text-white transition-all text-xs font-semibold cursor-pointer active:scale-95 disabled:opacity-50 shadow-sm"
              title="Export Full Ledger Data as PDF"
            >
              <span className="material-symbols-outlined text-[15px] text-emerald-400">picture_as_pdf</span>
              <span>{isExportingPDF ? 'Exporting...' : 'PDF'}</span>
            </button>

            {customer.phone && (
              <a
                href={`tel:${customer.phone}`}
                className="w-8 h-8 rounded-full bg-[#18181b] border border-[#27272a] flex items-center justify-center text-zinc-300 hover:text-emerald-400 transition-colors"
                title="Call"
              >
                <span className="material-symbols-outlined text-[16px]">call</span>
              </a>
            )}

            <button
              onClick={handleCopyReminder}
              className="px-2.5 py-1 rounded-full bg-[#18181b] border border-[#27272a] flex items-center gap-1 text-zinc-300 hover:text-white transition-colors text-xs font-semibold cursor-pointer"
              title="Copy WhatsApp Reminder"
            >
              <span className="material-symbols-outlined text-[15px] text-emerald-400">send</span>
              <span>{copiedReminder ? 'Copied!' : 'Remind'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Profile Body */}
      <main className="flex-1 w-full px-4 pt-3 pb-28 space-y-3">
        {/* Customer Outstanding Balance Card */}
        <div className="p-4 rounded-2xl bg-[#111318] border border-[#27272a] text-white shadow-xl relative overflow-hidden mb-3">
          <div className="flex flex-col justify-between gap-3">
            <div>
              <span className="text-[11px] tracking-wider text-zinc-400 uppercase font-semibold">
                Customer Balance Position
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl text-zinc-400 font-bold">₹</span>
                <span className="text-3xl font-extrabold tracking-tight text-white font-sans">
                  {Math.abs(netBalance).toLocaleString('en-IN')}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ml-1 ${
                    netBalance > 0
                      ? 'bg-emerald-950/80 border border-emerald-800/50 text-emerald-400'
                      : netBalance < 0
                      ? 'bg-red-950/80 border border-red-800/50 text-red-400'
                      : 'bg-zinc-800 border border-[#27272a] text-zinc-400'
                  }`}
                >
                  {netBalance > 0
                    ? "You'll Get (देना बाकी)"
                    : netBalance < 0
                    ? "You'll Give (जमा / Advance)"
                    : 'Account Settled (₹0)'}
                </span>
              </div>
              {customer.address && (
                <p className="text-[11px] text-zinc-400 mt-1">
                  📍 {customer.address}
                </p>
              )}
              {customer.notes && (
                <p className="text-[11.5px] text-zinc-400 mt-2 bg-black/40 px-2.5 py-1 rounded-lg border border-[#27272a] inline-block">
                  📝 {customer.notes}
                </p>
              )}
            </div>

            {/* Sub-totals & Settle */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#27272a]/60">
              <div className="flex items-center gap-2">
                <div className="text-left px-2.5 py-1 rounded-xl bg-black/60 border border-[#27272a]">
                  <div className="text-[10px] text-zinc-500 uppercase font-semibold">Total Given</div>
                  <div className="text-xs font-bold text-red-400 font-sans">₹ {totalGave.toLocaleString('en-IN')}</div>
                </div>
                <div className="text-left px-2.5 py-1 rounded-xl bg-black/60 border border-[#27272a]">
                  <div className="text-[10px] text-zinc-500 uppercase font-semibold">Total Got</div>
                  <div className="text-xs font-bold text-emerald-400 font-sans">₹ {totalGot.toLocaleString('en-IN')}</div>
                </div>
              </div>
              {netBalance !== 0 && (
                <button
                  onClick={handleSettleFullBalance}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-[#27272a] text-xs font-bold text-white transition-colors cursor-pointer"
                >
                  Settle All
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Ledger Filter & PDF Section Bar */}
        <div className="flex items-center justify-between mb-2.5 gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-zinc-400">history_edu</span>
            <span className="text-xs font-bold text-zinc-100">
              Ledger Transactions ({transactions?.length || 0})
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleExportPDF}
              disabled={isExportingPDF}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#18181b] border border-[#27272a] hover:border-emerald-500/40 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-all cursor-pointer"
              title="Download Statement PDF"
            >
              <span className="material-symbols-outlined text-[14px]">picture_as_pdf</span>
              <span>Export PDF</span>
            </button>

            <div className="flex items-center gap-0.5 bg-[#121215] p-0.5 rounded-xl border border-[#27272a]">
              {(['ALL', 'GAVE', 'GOT'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFilterType(mode)}
                  className={`px-2 py-0.5 rounded-lg text-[10.5px] font-semibold transition-all cursor-pointer ${
                    filterType === mode
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {mode === 'ALL' ? 'All' : mode === 'GAVE' ? 'Gave' : 'Got'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Transaction History List */}
        {displayTransactions.length === 0 ? (
          <div className="py-12 px-4 text-center border border-[#27272a] rounded-2xl bg-[#121215]">
            <span className="material-symbols-outlined text-3xl text-zinc-600 mb-1">receipt_long</span>
            <p className="text-xs text-zinc-300 font-bold">No Transactions Recorded</p>
            <p className="text-[11px] text-zinc-500 mt-1 max-w-[240px] mx-auto">
              Use the buttons below to record credit given or payment received from {customer.name}.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {displayTransactions.map((tx) => {
              const isGave = tx.type === 'GAVE';

              return (
                <div
                  key={tx.id}
                  className="bg-[#121215] border border-[#27272a] p-3 rounded-2xl shadow-sm flex items-center justify-between hover:border-zinc-700 transition-colors group"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border mt-0.5 ${
                        isGave
                          ? 'bg-red-950/40 border-red-800/40 text-red-400'
                          : 'bg-emerald-950/40 border-emerald-800/40 text-emerald-400'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[17px]">
                        {isGave ? 'arrow_upward' : 'arrow_downward'}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-zinc-100">
                          {isGave ? 'You Gave (Udhaar)' : 'You Got (Payment)'}
                        </span>
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-zinc-900 border border-[#27272a] text-zinc-400 text-[10px]">
                          {tx.paymentMode}
                        </span>
                      </div>

                      <p className="text-[11px] text-[#a1a1aa] mt-0.5 truncate">
                        {tx.notes || (isGave ? 'Credit purchase' : 'Payment received')}
                      </p>

                      <div className="flex items-center gap-1.5 mt-0.5 text-[10.5px] text-zinc-500 flex-wrap">
                        <span>{tx.date}</span>
                        <span>•</span>
                        <span>{tx.time}</span>
                        <span>•</span>
                        <span className="text-zinc-300 font-mono">
                          Bal: <span
                            className={
                              tx.balanceAfter > 0
                                ? 'text-emerald-400 font-bold'
                                : tx.balanceAfter < 0
                                ? 'text-red-400 font-bold'
                                : 'text-zinc-400'
                            }
                          >
                            ₹{Math.abs(tx.balanceAfter).toLocaleString('en-IN')}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pl-2">
                    <div className="text-right">
                      <span
                        className={`text-sm font-bold font-sans tracking-tight ${
                          isGave ? 'text-red-400' : 'text-emerald-400'
                        }`}
                      >
                        {isGave ? '₹ ' : '+₹ '}
                        {tx.amount.toLocaleString('en-IN')}
                      </span>
                      <p className="text-[10px] text-zinc-500">
                        {isGave ? 'Due to you' : 'Received'}
                      </p>
                    </div>

                    <button
                      onClick={() => handleDeleteTransaction(tx.id)}
                      className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 p-1 transition-opacity cursor-pointer"
                      title="Delete Entry"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Fixed Bottom Quick Action Bar for Profile */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[460px] py-2.5 px-4 bg-black/95 backdrop-blur-md border-t border-[#27272a] z-40 pb-safe">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onOpenTransactionModal('GAVE', customerId)}
            className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 border border-red-500/30 text-white flex items-center justify-center gap-2 shadow-lg shadow-red-950/50 active:scale-95 transition-transform cursor-pointer font-bold text-xs"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
            <span>₹ GAVE (DEBIT)</span>
          </button>
          <button
            onClick={() => onOpenTransactionModal('GOT', customerId)}
            className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 border border-emerald-500/30 text-white flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 active:scale-95 transition-transform cursor-pointer font-bold text-xs"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
            <span>₹ GOT (CREDIT)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
