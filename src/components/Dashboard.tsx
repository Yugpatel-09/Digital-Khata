import React, { useState, useMemo } from 'react';
import { db, type Customer, type Transaction, type TransactionType } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';

interface DashboardProps {
  merchantId: string;
  onLogout: () => void;
  onSelectCustomer: (customerId: number) => void;
  onOpenAddCustomer: () => void;
  onOpenTransactionModal: (type: TransactionType, customerId?: number | null) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  merchantId,
  onLogout,
  onSelectCustomer,
  onOpenAddCustomer,
  onOpenTransactionModal
}) => {
  const [activeNavTab, setActiveNavTab] = useState<'daily-ledger' | 'customers' | 'reports' | 'settings'>('daily-ledger');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'RECOVERY' | 'SETTLED' | 'PAYABLE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Fetch all customers & transactions reactively
  const customers = useLiveQuery(() => db.customers.toArray()) || [];
  const transactions = useLiveQuery(() => db.transactions.toArray()) || [];

  // Customer map for quick lookup
  const customerMap = useMemo(() => {
    const map = new Map<number, Customer>();
    customers.forEach((c) => {
      if (c.id) map.set(c.id, c);
    });
    return map;
  }, [customers]);

  // Compute Net Balance per customer
  const customerBalances = useMemo(() => {
    const balances = new Map<number, { gave: number; got: number; net: number }>();
    transactions.forEach((t) => {
      const current = balances.get(t.customerId) || { gave: 0, got: 0, net: 0 };
      if (t.type === 'GAVE') {
        current.gave += t.amount;
        current.net += t.amount;
      } else {
        current.got += t.amount;
        current.net -= t.amount;
      }
      balances.set(t.customerId, current);
    });
    return balances;
  }, [transactions]);

  // Overall totals
  const { totalToGet, totalToGive, netTotal, toGetCount, toGiveCount } = useMemo(() => {
    let toGet = 0;
    let toGive = 0;
    let getCnt = 0;
    let giveCnt = 0;
    customerBalances.forEach(({ net }) => {
      if (net > 0) {
        toGet += net;
        getCnt++;
      } else if (net < 0) {
        toGive += Math.abs(net);
        giveCnt++;
      }
    });
    return {
      totalToGet: toGet,
      totalToGive: toGive,
      netTotal: toGet - toGive,
      toGetCount: getCnt,
      toGiveCount: giveCnt
    };
  }, [customerBalances]);

  // Date helpers
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);

  // Format date headers
  const getDateFormatted = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
    const formatted = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    if (dateStr === todayStr) {
      return `Today • ${dayName}, ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
    }
    if (dateStr === yesterdayStr) {
      return `Yesterday • ${dayName}, ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
    }
    return `${dayName}, ${formatted}`;
  };

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const groups: { [date: string]: Transaction[] } = {};
    
    const sorted = [...transactions].sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeB - timeA;
    });

    sorted.forEach((t) => {
      const cust = customerMap.get(t.customerId);
      const custBal = customerBalances.get(t.customerId)?.net || 0;

      if (activeFilter === 'RECOVERY' && custBal <= 0) return;
      if (activeFilter === 'PAYABLE' && custBal >= 0) return;
      if (activeFilter === 'SETTLED' && t.date !== todayStr) return;

      if (
        searchQuery &&
        !cust?.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !t.notes?.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !t.statusNote?.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !t.date.includes(searchQuery)
      ) {
        return;
      }

      if (!groups[t.date]) {
        groups[t.date] = [];
      }
      groups[t.date].push(t);
    });

    return groups;
  }, [transactions, customerMap, customerBalances, activeFilter, searchQuery, todayStr]);

  // Filtered customer list for Customers tab
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (!searchQuery) return true;
      return (
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery) ||
        c.address?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [customers, searchQuery]);

  const handleDownloadDaySheet = () => {
    const backupData = {
      store: 'Digital Khata',
      merchantId,
      exportDate: new Date().toISOString(),
      totalReceivable: totalToGet,
      totalPayable: totalToGive,
      netBalance: netTotal,
      customers,
      transactions
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Khata_Backup_${todayStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="w-full min-h-screen bg-black text-white flex flex-col selection:bg-emerald-500/30 selection:text-white">
      {/* Top Fixed Header */}
      <header className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[460px] z-50 bg-black/95 backdrop-blur-xl border-b border-[#27272a] pt-safe">
        <div className="h-16 px-4 flex items-center justify-between">
          {/* Store Branding */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => setActiveNavTab('daily-ledger')}
              className="flex items-center gap-2 text-left rounded-lg transition-colors cursor-pointer group"
              type="button"
            >
              <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-[#27272a] group-hover:border-zinc-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm transition-colors">
                DK
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold text-zinc-100 truncate max-w-[140px]">
                    {merchantId || 'Digital Khata'}
                  </span>
                  <span className="material-symbols-outlined text-zinc-400 text-[18px]">expand_more</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[11px] text-zinc-400 font-medium">Sync Active</span>
                </div>
              </div>
            </button>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-1 relative">
            <button
              onClick={() => {
                const el = document.getElementById('dashboard-search-input');
                el?.focus();
              }}
              aria-label="Search transactions"
              className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900/80 transition-all cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">search</span>
            </button>

            {/* Profile Menu */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="w-8 h-8 rounded-full bg-zinc-800 border border-[#27272a] hover:border-zinc-500 flex items-center justify-center ml-1 cursor-pointer transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-zinc-200 text-[18px]">person</span>
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-[#18181b] border border-[#27272a] shadow-2xl py-1.5 z-50 animate-fadeIn">
                  <div className="px-3.5 py-2 border-b border-[#27272a]">
                    <p className="text-xs font-bold text-white truncate">{merchantId}</p>
                    <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wide">Enterprise Merchant</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onOpenAddCustomer();
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs text-zinc-200 hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px] text-amber-400">person_add</span>
                    <span>Add Customer Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      handleDownloadDaySheet();
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs text-zinc-200 hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px] text-emerald-400">download</span>
                    <span>Download JSON Backup</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogout();
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs text-rose-400 hover:bg-rose-950/30 flex items-center gap-2 cursor-pointer border-t border-[#27272a] mt-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">logout</span>
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full pt-18 pb-36 px-4">
        <div className="flex flex-col w-full text-zinc-100">
          
          {/* Sub-Header: Date / Quick Add */}
          <div className="py-2.5 flex items-center justify-between">
            <button
              onClick={() => setActiveFilter('ALL')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#18181b] border border-[#27272a] text-zinc-200 text-xs font-semibold shadow-sm active:scale-95 transition-transform cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px] text-zinc-400">calendar_today</span>
              <span>
                Today, {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <span className="material-symbols-outlined text-[16px] text-zinc-400">keyboard_arrow_down</span>
            </button>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onOpenAddCustomer()}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white text-black text-xs font-bold shadow-sm active:scale-95 transition-all hover:bg-zinc-200 cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">person_add</span>
                <span>+ Party</span>
              </button>
            </div>
          </div>

          {/* Executive Net Outstanding Position Card */}
          <div className="mb-3">
            <div className={`p-4 rounded-2xl border text-white shadow-xl relative overflow-hidden transition-all ${
              netTotal > 0
                ? 'bg-gradient-to-b from-[#0f1715] to-[#111318] border-emerald-500/30'
                : netTotal < 0
                ? 'bg-gradient-to-b from-[#191012] to-[#111318] border-red-500/30'
                : 'bg-[#111318] border-[#27272a]'
            }`}>
              <div
                className={`absolute -right-6 -bottom-6 w-36 h-36 rounded-full pointer-events-none blur-3xl ${
                  netTotal >= 0 ? 'bg-emerald-500/15' : 'bg-red-500/15'
                }`}
              ></div>

              {/* Title & Badge */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] tracking-wider text-zinc-400 uppercase font-bold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-zinc-400">account_balance_wallet</span>
                  <span>Net Outstanding Position</span>
                </span>

                <span
                  className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-bold shadow-sm ${
                    netTotal > 0
                      ? 'text-emerald-400 bg-emerald-950/80 border border-emerald-800/60'
                      : netTotal < 0
                      ? 'text-red-400 bg-red-950/80 border border-red-800/60'
                      : 'text-zinc-400 bg-zinc-800 border border-zinc-700'
                  }`}
                >
                  <span className="material-symbols-outlined text-[13px]">
                    {netTotal > 0 ? 'trending_up' : netTotal < 0 ? 'trending_down' : 'check_circle'}
                  </span>
                  <span>
                    {netTotal > 0
                      ? '(+) NET POSITIVE'
                      : netTotal < 0
                      ? '(-) NET NEGATIVE'
                      : 'BALANCED (₹0)'}
                  </span>
                </span>
              </div>

              {/* Amount Display */}
              <div className="flex items-baseline gap-1.5 mb-1">
                <span
                  className={`text-2xl font-bold font-sans ${
                    netTotal > 0 ? 'text-emerald-400' : netTotal < 0 ? 'text-red-400' : 'text-zinc-400'
                  }`}
                >
                  {netTotal > 0 ? '+₹' : netTotal < 0 ? '-₹' : '₹'}
                </span>
                <span
                  className={`text-3xl font-extrabold tracking-tight font-sans ${
                    netTotal > 0 ? 'text-emerald-300' : netTotal < 0 ? 'text-red-300' : 'text-white'
                  }`}
                >
                  {Math.abs(netTotal).toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-zinc-400 ml-1.5 font-medium">
                  {netTotal > 0
                    ? 'Total Positive (Receivable in your favor)'
                    : netTotal < 0
                    ? 'Total Negative (Payable amount you owe)'
                    : 'Accounts Balanced'}
                </span>
              </div>

              {/* Ratio Bar */}
              {(totalToGet > 0 || totalToGive > 0) && (
                <div className="my-2.5">
                  <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden flex">
                    <div
                      style={{
                        width: `${
                          totalToGet + totalToGive > 0
                            ? (totalToGet / (totalToGet + totalToGive)) * 100
                            : 50
                        }%`
                      }}
                      className="bg-emerald-500 transition-all duration-500 rounded-l-full"
                    />
                    <div
                      style={{
                        width: `${
                          totalToGet + totalToGive > 0
                            ? (totalToGive / (totalToGet + totalToGive)) * 100
                            : 50
                        }%`
                      }}
                      className="bg-red-500 transition-all duration-500 rounded-r-full"
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-500 mt-1 font-mono">
                    <span className="text-emerald-400 font-semibold">
                      (+) Got {totalToGet + totalToGive > 0 ? Math.round((totalToGet / (totalToGet + totalToGive)) * 100) : 0}%
                    </span>
                    <span className="text-red-400 font-semibold">
                      (-) Gave {totalToGet + totalToGive > 0 ? Math.round((totalToGive / (totalToGet + totalToGive)) * 100) : 0}%
                    </span>
                  </div>
                </div>
              )}

              {/* Positive vs Negative Grid */}
              <div className="grid grid-cols-2 gap-2 bg-black/70 border border-[#27272a] rounded-xl p-2.5 mt-2">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span className="text-[11px] text-zinc-300 font-semibold">
                      (+) Positive (लेना है)
                    </span>
                  </div>
                  <span className="text-base font-bold text-emerald-400 font-sans tracking-tight">
                    +₹ {totalToGet.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10.5px] text-zinc-500">
                    {toGetCount} {toGetCount === 1 ? 'account owes you' : 'accounts owe you'}
                  </span>
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    <span className="text-[11px] text-zinc-300 font-semibold">
                      (-) Negative (देना है)
                    </span>
                  </div>
                  <span className="text-base font-bold text-red-400 font-sans tracking-tight">
                    -₹ {totalToGive.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10.5px] text-zinc-500">
                    {toGiveCount} {toGiveCount === 1 ? 'vendor to pay' : 'vendors to pay'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Search Box */}
          <div className="mb-2.5">
            <div className="flex items-center gap-2 bg-[#121215] border border-[#27272a] px-3 py-2 rounded-xl shadow-sm focus-within:border-zinc-500 transition-colors">
              <span className="material-symbols-outlined text-[18px] text-zinc-500 pointer-events-none">search</span>
              <input
                id="dashboard-search-input"
                className="w-full bg-transparent text-xs text-white placeholder:text-zinc-500 outline-none"
                placeholder="Search party name, note, invoice..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="w-6 h-6 rounded-lg bg-zinc-800 text-zinc-400 flex items-center justify-center hover:text-white cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[15px]">close</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter Chips */}
          {transactions.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar">
                <button
                  onClick={() => setActiveFilter('ALL')}
                  className={`px-3 py-1 rounded-full text-xs flex-shrink-0 font-bold shadow-sm transition-all cursor-pointer ${
                    activeFilter === 'ALL'
                      ? 'bg-zinc-100 text-black'
                      : 'bg-[#18181b] border border-[#27272a] text-zinc-300 hover:bg-zinc-800'
                  }`}
                  type="button"
                >
                  All ({transactions.length})
                </button>

                <button
                  onClick={() => setActiveFilter('RECOVERY')}
                  className={`px-3 py-1 rounded-full border text-xs flex-shrink-0 transition-colors cursor-pointer ${
                    activeFilter === 'RECOVERY'
                      ? 'bg-zinc-100 text-black border-zinc-100 font-bold'
                      : 'bg-[#18181b] border-[#27272a] text-zinc-300 hover:bg-zinc-800'
                  }`}
                  type="button"
                >
                  Pending Recovery
                </button>

                <button
                  onClick={() => setActiveFilter('PAYABLE')}
                  className={`px-3 py-1 rounded-full border text-xs flex-shrink-0 transition-colors cursor-pointer ${
                    activeFilter === 'PAYABLE'
                      ? 'bg-zinc-100 text-black border-zinc-100 font-bold'
                      : 'bg-[#18181b] border-[#27272a] text-zinc-300 hover:bg-zinc-800'
                  }`}
                  type="button"
                >
                  Vendors Payable
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: DAILY LEDGER FEED */}
          {activeNavTab === 'daily-ledger' && (
            <div className="flex flex-col gap-3">
              {transactions.length === 0 ? (
                /* Premium Empty State */
                <div className="py-8 px-4 text-center border border-[#27272a] rounded-2xl bg-[#111318] shadow-xl relative overflow-hidden">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-700/60 mx-auto flex items-center justify-center text-emerald-400 mb-3 shadow-lg">
                    <span className="material-symbols-outlined text-[30px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      menu_book
                    </span>
                  </div>

                  <h2 className="text-base font-bold text-white mb-1">
                    Your Digital Khata is Ready
                  </h2>
                  <p className="text-xs text-zinc-400 max-w-[280px] mx-auto mb-4 leading-relaxed">
                    Create customer profiles and start recording your daily credit (Udhaar) and payments (Jama).
                  </p>

                  <div className="flex flex-col gap-2 max-w-[260px] mx-auto mb-4">
                    <button
                      onClick={onOpenAddCustomer}
                      className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-transform cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">person_add</span>
                      <span>1. Add First Customer Profile</span>
                    </button>

                    <button
                      onClick={() => onOpenTransactionModal('GAVE')}
                      className="w-full py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-[#27272a] text-zinc-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px] text-red-400">arrow_upward</span>
                      <span>2. Record ₹ GAVE (Udhaar)</span>
                    </button>
                  </div>

                  {/* Highlights */}
                  <div className="grid grid-cols-3 gap-1.5 pt-3 border-t border-[#27272a] text-[10px] text-zinc-400">
                    <div className="flex flex-col items-center">
                      <span className="material-symbols-outlined text-[15px] text-emerald-400 mb-0.5">lock</span>
                      <span>100% Private</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="material-symbols-outlined text-[15px] text-emerald-400 mb-0.5">calculate</span>
                      <span>Auto Balances</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="material-symbols-outlined text-[15px] text-emerald-400 mb-0.5">picture_as_pdf</span>
                      <span>PDF Statements</span>
                    </div>
                  </div>
                </div>
              ) : Object.keys(groupedTransactions).length === 0 ? (
                <div className="py-12 text-center border border-[#27272a] rounded-2xl bg-[#121215]">
                  <span className="material-symbols-outlined text-3xl text-zinc-600 mb-1">event_busy</span>
                  <p className="text-xs text-zinc-400">No transactions match your search.</p>
                  <button
                    onClick={() => {
                      setActiveFilter('ALL');
                      setSearchQuery('');
                    }}
                    className="mt-3 px-3 py-1.5 rounded-full bg-zinc-800 text-xs font-semibold text-zinc-200 cursor-pointer"
                  >
                    Reset Filter
                  </button>
                </div>
              ) : (
                Object.entries(groupedTransactions).map(([dateStr, dayTxns]) => {
                  const dayGave = dayTxns
                    .filter((t) => t.type === 'GAVE')
                    .reduce((s, t) => s + t.amount, 0);
                  const dayGot = dayTxns
                    .filter((t) => t.type === 'GOT')
                    .reduce((s, t) => s + t.amount, 0);
                  const dayNet = dayGot - dayGave;

                  return (
                    <div key={dateStr} className="flex flex-col gap-1.5">
                      {/* Date Header */}
                      <div className="flex items-center justify-between py-1 px-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              dateStr === todayStr ? 'bg-emerald-500' : 'bg-zinc-500'
                            }`}
                          ></span>
                          <span className="text-xs font-bold text-zinc-200">
                            {getDateFormatted(dateStr)}
                          </span>
                        </div>
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                            dayNet >= 0
                              ? 'text-emerald-400 bg-emerald-950/70 border border-emerald-800/40'
                              : 'text-red-400 bg-red-950/70 border border-red-800/40'
                          }`}
                        >
                          Net: {dayNet >= 0 ? `+₹${dayNet.toLocaleString('en-IN')}` : `-₹${Math.abs(dayNet).toLocaleString('en-IN')}`}
                        </span>
                      </div>

                      {/* Transaction Cards */}
                      <div className="flex flex-col gap-1.5">
                        {dayTxns.map((t) => {
                          const cust = customerMap.get(t.customerId);
                          const isGave = t.type === 'GAVE';
                          const initials = getInitials(cust?.name || 'Party');

                          return (
                            <div
                              key={t.id}
                              onClick={() => onSelectCustomer(t.customerId)}
                              className="bg-[#121215] border border-[#27272a] p-3 rounded-2xl shadow-sm flex items-center justify-between active:scale-[0.99] transition-all cursor-pointer hover:border-zinc-700 group"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-10 h-10 rounded-full bg-[#27272a] text-zinc-100 flex items-center justify-center text-xs font-bold flex-shrink-0 group-hover:border group-hover:border-zinc-600 transition-colors">
                                  {initials}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-[#f4f4f5] truncate group-hover:text-white">
                                      {cust?.name || 'Customer'}
                                    </span>
                                    {isGave ? (
                                      <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-red-950/80 border border-red-800/50 text-red-400 text-[10px] font-semibold">
                                        Gave
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-emerald-950/80 border border-emerald-800/50 text-emerald-400 text-[10px] font-semibold">
                                        Got
                                      </span>
                                    )}
                                  </div>

                                  <span className="text-[11px] text-[#a1a1aa] truncate mt-0.5">
                                    {t.notes || (isGave ? 'Credit purchase' : 'Payment received')}
                                  </span>

                                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap text-[10.5px]">
                                    <span className="text-zinc-500">{t.time}</span>
                                    <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                                    {t.statusNote ? (
                                      <span
                                        className={`font-medium ${
                                          isGave ? 'text-zinc-400' : 'text-emerald-400'
                                        }`}
                                      >
                                        {t.statusNote}
                                      </span>
                                    ) : (
                                      <span className="text-zinc-400">
                                        {t.paymentMode}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col items-end flex-shrink-0 pl-2">
                                <span
                                  className={`text-sm font-bold font-sans tracking-tight ${
                                    isGave ? 'text-red-400' : 'text-emerald-400'
                                  }`}
                                >
                                  {isGave ? '₹ ' : '+₹ '}
                                  {t.amount.toLocaleString('en-IN')}
                                </span>
                                <span className="text-[10px] text-zinc-500">
                                  {isGave ? 'Due to you' : 'Received'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: CUSTOMER PROFILES LIST */}
          {activeNavTab === 'customers' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between py-1 mb-1">
                <span className="text-xs font-bold text-zinc-100">
                  All Customer Profiles ({filteredCustomers.length})
                </span>
                <button
                  onClick={onOpenAddCustomer}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-black bg-white px-2.5 py-1 rounded-full hover:bg-zinc-200 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">add</span>
                  <span>New Party</span>
                </button>
              </div>

              {filteredCustomers.length === 0 ? (
                <div className="py-12 px-4 text-center border border-[#27272a] rounded-2xl bg-[#121215]">
                  <span className="material-symbols-outlined text-3xl text-zinc-600 mb-1">person_search</span>
                  <p className="text-xs text-zinc-300 font-bold">No Customer Profiles Yet</p>
                  <p className="text-[11px] text-zinc-500 mt-1 max-w-[240px] mx-auto">
                    Add parties (customers or vendors) to start tracking their balance history.
                  </p>
                  <button
                    onClick={onOpenAddCustomer}
                    className="mt-3 px-3.5 py-1.5 rounded-xl bg-white text-black font-bold text-xs shadow-lg active:scale-95 transition-transform cursor-pointer"
                  >
                    + Add Customer Profile
                  </button>
                </div>
              ) : (
                filteredCustomers.map((cust) => {
                  const bal = customerBalances.get(cust.id!) || { gave: 0, got: 0, net: 0 };
                  const isReceivable = bal.net > 0;
                  const isPayable = bal.net < 0;
                  const initials = getInitials(cust.name);

                  return (
                    <div
                      key={cust.id}
                      onClick={() => onSelectCustomer(cust.id!)}
                      className="bg-[#121215] border border-[#27272a] p-3 rounded-2xl shadow-sm flex items-center justify-between active:scale-[0.99] transition-all cursor-pointer hover:border-zinc-700"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-[#27272a] text-zinc-100 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {initials}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-[#f4f4f5] truncate">
                            {cust.name}
                          </span>
                          <span className="text-[11px] text-[#a1a1aa] truncate mt-0.5">
                            {cust.phone || 'No mobile'} {cust.address ? `• ${cust.address}` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end flex-shrink-0 pl-2">
                        <span
                          className={`text-sm font-bold font-sans tracking-tight ${
                            isReceivable
                              ? 'text-emerald-400'
                              : isPayable
                              ? 'text-red-400'
                              : 'text-zinc-400'
                          }`}
                        >
                          ₹ {Math.abs(bal.net).toLocaleString('en-IN')}
                        </span>
                        <span
                          className={`text-[10px] font-semibold ${
                            isReceivable
                              ? 'text-emerald-400'
                              : isPayable
                              ? 'text-red-400'
                              : 'text-zinc-500'
                          }`}
                        >
                          {isReceivable ? "You'll Get" : isPayable ? "You'll Give" : 'Settled'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 3: REPORTS */}
          {activeNavTab === 'reports' && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-[#111318] border border-[#27272a]">
                <h2 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-400 text-[18px]">monitoring</span>
                  <span>Ledger Analytics Summary</span>
                </h2>
                <div className="grid grid-cols-2 gap-2.5 mt-2.5">
                  <div className="p-3 rounded-xl bg-black/60 border border-[#27272a]">
                    <span className="text-[11px] text-zinc-400">Total Transactions</span>
                    <p className="text-lg font-bold text-white mt-0.5 font-sans">{transactions.length}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-black/60 border border-[#27272a]">
                    <span className="text-[11px] text-zinc-400">Registered Parties</span>
                    <p className="text-lg font-bold text-white mt-0.5 font-sans">{customers.length}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#111318] border border-[#27272a] flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white">Full Database Backup</h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Download offline JSON database archive</p>
                </div>
                <button
                  onClick={handleDownloadDaySheet}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">download</span>
                  <span>Export</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: SETTINGS */}
          {activeNavTab === 'settings' && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-[#111318] border border-[#27272a] space-y-3">
                <div className="flex items-center justify-between pb-2.5 border-b border-[#27272a]">
                  <div>
                    <h3 className="text-xs font-bold text-white">Merchant Account</h3>
                    <p className="text-[11px] text-zinc-400">{merchantId}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 text-[10px] font-semibold border border-emerald-800">
                    Verified Active
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 text-xs">
                  <span className="text-zinc-300">Data Persistence</span>
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Permanent IndexedDB</span>
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 text-xs">
                  <span className="text-zinc-300">Security Encryption</span>
                  <span className="text-emerald-400 font-mono font-semibold">256-bit AES Local</span>
                </div>

                <div className="flex items-center justify-between py-1 text-xs">
                  <span className="text-zinc-300">Total Records Stored</span>
                  <span className="text-white font-mono font-semibold">{customers.length} Parties • {transactions.length} Txns</span>
                </div>

                {/* Backup & Restore Action Buttons */}
                <div className="pt-2 border-t border-[#27272a] space-y-2">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Backup & Restore Database
                  </span>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleDownloadDaySheet}
                      className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-[#27272a] text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px] text-emerald-400">download</span>
                      <span>Export JSON</span>
                    </button>

                    <label className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-[#27272a] text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer">
                      <span className="material-symbols-outlined text-[16px] text-amber-400">upload</span>
                      <span>Restore JSON</span>
                      <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const text = await file.text();
                            const json = JSON.parse(text);
                            if (!Array.isArray(json.customers) || !Array.isArray(json.transactions)) {
                              alert('Invalid backup file format.');
                              return;
                            }
                            if (window.confirm(`Restore backup with ${json.customers.length} parties and ${json.transactions.length} transactions?`)) {
                              await db.transaction('rw', db.customers, db.transactions, async () => {
                                await db.customers.clear();
                                await db.transactions.clear();
                                for (const c of json.customers) await db.customers.add(c);
                                for (const t of json.transactions) await db.transactions.add(t);
                              });
                              alert('Backup restored successfully!');
                            }
                          } catch (err) {
                            console.error('Failed to restore backup', err);
                            alert('Failed to read or restore backup file.');
                          }
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                </div>

                <button
                  onClick={onLogout}
                  className="w-full mt-3 py-2.5 rounded-xl bg-red-950/40 border border-red-800/60 text-red-400 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-red-900/40 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">logout</span>
                  <span>Log Out of Account</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Fixed Bottom Quick Action Bar (₹ GAVE / ₹ GOT) */}
      <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-[460px] z-40 bg-black/90 backdrop-blur-md border-t border-[#27272a] py-2 px-4">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onOpenTransactionModal('GAVE')}
            className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 border border-red-500/30 text-white flex items-center justify-center gap-2 shadow-lg shadow-red-950/50 active:scale-95 transition-transform cursor-pointer font-bold text-xs tracking-wide"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
            <span>₹ GAVE (DEBIT)</span>
          </button>
          <button
            onClick={() => onOpenTransactionModal('GOT')}
            className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 border border-emerald-500/30 text-white flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 active:scale-95 transition-transform cursor-pointer font-bold text-xs tracking-wide"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
            <span>₹ GOT (CREDIT)</span>
          </button>
        </div>
      </div>

      {/* Fixed Bottom Tab Navigation Bar */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[460px] z-50 pb-safe bg-[#09090b] border-t border-[#27272a] shadow-[0_-1px_12px_rgba(0,0,0,0.6)]">
        <div className="flex justify-around items-center h-16 px-2">
          <button
            onClick={() => setActiveNavTab('daily-ledger')}
            className={`flex flex-col items-center justify-center gap-1 min-w-[64px] h-12 transition-colors cursor-pointer ${
              activeNavTab === 'daily-ledger' ? 'text-emerald-400 font-bold' : 'text-[#71717a] hover:text-zinc-200'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">menu_book</span>
            <span className="text-[10.5px]">Daily Ledger</span>
          </button>

          <button
            onClick={() => setActiveNavTab('customers')}
            className={`flex flex-col items-center justify-center gap-1 min-w-[64px] h-12 transition-colors cursor-pointer ${
              activeNavTab === 'customers' ? 'text-emerald-400 font-bold' : 'text-[#71717a] hover:text-zinc-200'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">group</span>
            <span className="text-[10.5px]">Customers</span>
          </button>

          <button
            onClick={() => setActiveNavTab('reports')}
            className={`flex flex-col items-center justify-center gap-1 min-w-[64px] h-12 transition-colors cursor-pointer ${
              activeNavTab === 'reports' ? 'text-emerald-400 font-bold' : 'text-[#71717a] hover:text-zinc-200'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">monitoring</span>
            <span className="text-[10.5px]">Reports</span>
          </button>

          <button
            onClick={() => setActiveNavTab('settings')}
            className={`flex flex-col items-center justify-center gap-1 min-w-[64px] h-12 transition-colors cursor-pointer ${
              activeNavTab === 'settings' ? 'text-emerald-400 font-bold' : 'text-[#71717a] hover:text-zinc-200'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
            <span className="text-[10.5px]">Settings</span>
          </button>
        </div>
      </nav>
    </div>
  );
};
