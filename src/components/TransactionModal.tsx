import React, { useState, useEffect } from 'react';
import {
  addTransactionSynced,
  updateTransactionSynced,
  updateCustomerSynced,
  type Customer,
  type Transaction,
  type TransactionType
} from '../db';

interface TransactionModalProps {
  isOpen: boolean;
  merchantId: string;
  onClose: () => void;
  defaultType?: TransactionType;
  defaultCustomerId?: number | null;
  initialData?: Transaction | null;
  customers: Customer[];
  onOpenAddCustomer: () => void;
  onSuccess: () => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  merchantId,
  onClose,
  defaultType = 'GAVE',
  defaultCustomerId = null,
  initialData = null,
  customers,
  onOpenAddCustomer,
  onSuccess
}) => {
  const [type, setType] = useState<TransactionType>(defaultType);
  const [customerId, setCustomerId] = useState<number | ''>(defaultCustomerId || '');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Other'>('UPI');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setType(initialData.type);
        setCustomerId(initialData.customerId);
        setAmount(initialData.amount.toString());
        setDate(initialData.date);
        setTime(initialData.time || '');
        setPaymentMode((initialData.paymentMode as any) || 'UPI');
        setNotes(initialData.notes || '');
      } else {
        setType(defaultType);
        setCustomerId(defaultCustomerId || (customers[0]?.id ?? ''));
        setAmount('');
        const now = new Date();
        setDate(now.toISOString().split('T')[0]);
        setTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
        setPaymentMode('UPI');
        setNotes('');
      }
    }
  }, [isOpen, defaultType, defaultCustomerId, initialData, customers]);

  if (!isOpen) return null;

  const handleAmountChip = (addVal: number) => {
    const current = parseFloat(amount) || 0;
    setAmount((current + addVal).toString());
  };

  const getDayLabel = (dStr: string) => {
    if (!dStr) return '';
    try {
      const d = new Date(dStr + 'T00:00:00');
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yestStr = yesterday.toISOString().split('T')[0];

      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const formatted = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

      if (dStr === today) return `Today (${dayName})`;
      if (dStr === yestStr) return `Yesterday (${dayName})`;
      return `${dayName}, ${formatted}`;
    } catch {
      return '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!customerId || !numAmount || numAmount <= 0) return;

    setIsSubmitting(true);
    try {
      const now = new Date();
      const statusNote = isGave ? 'Due to you' : (paymentMode === 'UPI' ? 'Verified UPI' : 'Cash in drawer');

      if (initialData?.id) {
        // UPDATE existing transaction synced with cloud
        await updateTransactionSynced(merchantId, initialData.id, {
          customerId: Number(customerId),
          type,
          amount: numAmount,
          date,
          time: time || now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          paymentMode,
          notes: notes.trim(),
          statusNote
        });
      } else {
        // CREATE new transaction synced with cloud
        const createdAt = new Date().toISOString();
        await addTransactionSynced(merchantId, {
          customerId: Number(customerId),
          type,
          amount: numAmount,
          date,
          time: time || now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          paymentMode,
          notes: notes.trim(),
          statusNote,
          createdAt
        });
      }

      // Update customer updated timestamp synced with cloud
      await updateCustomerSynced(merchantId, Number(customerId), {
        updatedAt: new Date().toISOString()
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to save transaction', err);
      alert('Failed to save transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isGave = type === 'GAVE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl p-5 border border-[#27272a] bg-[#111318] text-zinc-100 shadow-2xl relative">
        {/* Header with Type Selector */}
        <div className="flex items-center justify-between pb-3 border-b border-[#27272a] mb-4">
          <div className="flex items-center gap-2">
            {initialData && (
              <span className="text-xs font-bold text-amber-400 bg-amber-950/60 border border-amber-800/40 px-2 py-0.5 rounded-lg flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">edit</span>
                <span>Edit</span>
              </span>
            )}
            <div className="flex gap-1 p-1 bg-black/60 rounded-xl border border-[#27272a]">
              <button
                type="button"
                onClick={() => setType('GAVE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  isGave
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                <span>You Gave</span>
              </button>
              <button
                type="button"
                onClick={() => setType('GOT')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  !isGave
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                <span>You Got</span>
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-900 border border-[#27272a] flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Amount Display */}
          <div className={`p-3.5 rounded-xl border transition-colors ${
            isGave 
              ? 'bg-red-950/20 border-red-900/40 text-red-300' 
              : 'bg-emerald-950/20 border-emerald-900/40 text-emerald-300'
          }`}>
            <label className="block text-[10.5px] uppercase tracking-wider font-semibold opacity-80 mb-1">
              {isGave ? "Amount Given (Udhaar / Debit)" : "Amount Received (Jama / Credit)"}
            </label>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold font-sans">₹</span>
              <input
                required
                type="number"
                step="any"
                min="1"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
                className="w-full bg-transparent text-2xl font-bold text-white placeholder-zinc-600 focus:outline-none font-sans"
              />
            </div>

            {/* Quick Amount Chips */}
            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-white/5 flex-wrap">
              {[100, 500, 1000, 2000, 5000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleAmountChip(val)}
                  className="px-2 py-0.5 rounded-md bg-black/60 border border-[#27272a] text-[11px] font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer"
                >
                  +₹{val}
                </button>
              ))}
            </div>
          </div>

          {/* Customer Selection */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-medium text-zinc-300">
                Customer Profile <span className="text-red-400">*</span>
              </label>
              {!initialData && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenAddCustomer();
                  }}
                  className="text-[11px] text-emerald-400 hover:underline font-semibold flex items-center gap-0.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[13px]">add</span>
                  <span>New Profile</span>
                </button>
              )}
            </div>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-[17px] text-zinc-500 pointer-events-none">
                person
              </span>
              <select
                required
                value={customerId}
                onChange={(e) => setCustomerId(Number(e.target.value))}
                className="w-full py-2.5 pl-9 pr-3 rounded-xl bg-black/60 border border-[#27272a] text-zinc-100 text-xs focus:outline-none focus:border-zinc-500"
              >
                {customers.length === 0 && <option value="">No customers found</option>}
                {customers.map((c) => (
                  <option key={c.id} value={c.id} className="bg-zinc-900 text-white">
                    {c.name} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date & Time with Day Helper */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-medium text-zinc-300">Date</label>
                {date && (
                  <span className="text-[10px] text-emerald-400 font-semibold truncate max-w-[100px]">
                    {getDayLabel(date)}
                  </span>
                )}
              </div>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full py-2 px-2.5 rounded-xl bg-black/60 border border-[#27272a] text-zinc-100 text-xs focus:outline-none focus:border-zinc-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-300 mb-1">Time</label>
              <input
                type="text"
                value={time}
                placeholder="04:15 PM"
                onChange={(e) => setTime(e.target.value)}
                className="w-full py-2 px-2.5 rounded-xl bg-black/60 border border-[#27272a] text-zinc-100 text-xs focus:outline-none focus:border-zinc-500"
              />
            </div>
          </div>

          {/* Payment Mode */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-300 mb-1">Payment Mode</label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['UPI', 'Cash', 'Bank Transfer', 'Cheque'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPaymentMode(mode)}
                  className={`py-1.5 px-1 rounded-lg text-[11px] font-medium border text-center transition-all cursor-pointer ${
                    paymentMode === mode
                      ? 'bg-zinc-100 text-zinc-950 border-white font-bold shadow-sm'
                      : 'bg-black/60 border-[#27272a] text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Description / Notes */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-300 mb-1">
              Description / Items / Notes
            </label>
            <input
              type="text"
              placeholder="e.g. 5 Lakh Udhaar • Cash Loan"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full py-2 px-3 rounded-xl bg-black/60 border border-[#27272a] text-zinc-100 placeholder-zinc-500 text-xs focus:outline-none focus:border-zinc-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-2.5 rounded-xl bg-zinc-900 border border-[#27272a] text-zinc-300 text-xs font-semibold hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !amount || !customerId}
              className={`w-2/3 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer ${
                isGave
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-red-950/50'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-950/50'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">save</span>
              <span>
                {initialData
                  ? 'Update Entry (₹)'
                  : isGave
                  ? 'Save Gave Entry (₹)'
                  : 'Save Got Entry (₹)'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

