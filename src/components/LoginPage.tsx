import React, { useState } from 'react';

interface LoginPageProps {
  onLogin: (merchantId: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [merchantId, setMerchantId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [lang, setLang] = useState<'EN' | 'HI'>('EN');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      onLogin(merchantId.trim() || 'My Business Khata');
      setIsLoading(false);
    }, 400);
  };

  const handleRegisterClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const storeName = prompt('Enter your Store / Business Name:', 'My Enterprise Khata');
    if (storeName) {
      onLogin(storeName.trim());
    }
  };

  return (
    <div className="bg-[#050507] text-slate-100 flex flex-col min-h-screen pt-safe pb-safe font-sans antialiased selection:bg-[#D4AF37]/30 selection:text-white">
      <main className="flex flex-col relative w-full min-h-screen overflow-hidden bg-[#050507]">
        {/* Ambient Top Glow */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[520px] h-[480px] subtle-glow pointer-events-none" />

        <div className="flex flex-col w-full max-w-md mx-auto min-h-screen px-4 pb-6 pt-1 relative z-10">
          {/* Top Navigation & Language / Region Switcher */}
          <div className="flex items-center justify-between pt-2 pb-2">
            <button
              aria-label="Back"
              className="w-9 h-9 rounded-full bg-zinc-900/80 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700 transition-all active:scale-95 shadow-sm"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            </button>
            <button
              onClick={() => setLang(l => (l === 'EN' ? 'HI' : 'EN'))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:text-white transition-all text-[11.5px] font-medium tracking-wide shadow-sm group cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[15px] text-zinc-400 group-hover:text-white transition-colors">language</span>
              <span>{lang === 'EN' ? 'EN • हिंदी' : 'हिंदी • EN'}</span>
              <span className="material-symbols-outlined text-[14px] text-zinc-500">expand_more</span>
            </button>
          </div>

          {/* Executive Brand Header */}
          <div className="flex flex-col items-center text-center mt-2 mb-6">
            <div className="relative mb-3 flex items-center justify-center">
              <div className="relative w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-700/60 flex items-center justify-center shadow-xl shadow-black/40 ring-1 ring-white/10">
                <span
                  className="material-symbols-outlined text-[28px] text-zinc-100"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  account_balance_wallet
                </span>
              </div>
            </div>
            {/* Tag badge */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-zinc-300 mb-2.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[10.5px] font-semibold tracking-wider uppercase text-zinc-300 font-sans">
                Khata Enterprise
              </span>
            </div>
            <h1 className="text-[24px] font-bold tracking-tight text-white mb-1.5 font-sans">
              Digital Khata
            </h1>
            <p className="text-[13px] text-zinc-400 font-normal tracking-normal max-w-[280px] leading-relaxed">
              Enterprise Business Ledger &amp; Financial Records
            </p>
          </div>

          {/* Executive Glassmorphism Card */}
          <div className="dark-card rounded-2xl p-5 backdrop-blur-2xl space-y-4 mb-4 relative overflow-hidden">
            <form className="space-y-4 relative z-10" onSubmit={handleSubmit}>
              {/* Merchant ID / Username */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11.5px] font-medium tracking-wide text-zinc-300">
                    Merchant ID, Phone or Store Name
                  </label>
                  <span className="text-[10px] text-zinc-500 tracking-wide uppercase font-medium">Encrypted</span>
                </div>
                <div className="relative flex items-center group">
                  <span className="material-symbols-outlined absolute left-3.5 text-[18px] text-zinc-500 group-focus-within:text-zinc-200 transition-colors pointer-events-none">
                    storefront
                  </span>
                  <input
                    autoComplete="username"
                    className="w-full py-3 pl-10 pr-4 rounded-xl bg-zinc-950/80 border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-[13.5px] font-medium focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 transition-all"
                    placeholder="e.g. patel_kirana or 9825012345"
                    required
                    type="text"
                    value={merchantId}
                    onChange={(e) => setMerchantId(e.target.value)}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11.5px] font-medium tracking-wide text-zinc-300">
                    Master Password / PIN
                  </label>
                  <span className="text-[10px] text-zinc-500 tracking-wide">256-bit AES</span>
                </div>
                <div className="relative flex items-center group">
                  <span className="material-symbols-outlined absolute left-3.5 text-[18px] text-zinc-500 group-focus-within:text-zinc-200 transition-colors pointer-events-none">
                    lock
                  </span>
                  <input
                    autoComplete="current-password"
                    className="w-full py-3 pl-10 pr-10 rounded-xl bg-zinc-950/80 border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-[13.5px] font-medium tracking-wider focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 transition-all"
                    id="password-input"
                    placeholder="Enter security password or PIN"
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    aria-label="Toggle password visibility"
                    className="absolute right-3.5 p-1 text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer"
                    id="toggle-password-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between pt-0.5 text-[12.5px]">
                <label className="flex items-center gap-2 cursor-pointer select-none group">
                  <input
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded bg-zinc-900 border border-zinc-700 text-zinc-200 focus:ring-0 cursor-pointer accent-white"
                    type="checkbox"
                  />
                  <span className="text-zinc-400 group-hover:text-zinc-200 transition-colors text-[12px] font-normal">
                    Remember this device
                  </span>
                </label>
                <a
                  className="text-zinc-400 hover:text-white text-[12px] font-medium transition-colors cursor-pointer"
                  href="#info"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('All data is stored securely on your device with 256-bit local encryption.');
                  }}
                >
                  Need help?
                </a>
              </div>

              {/* Primary CTA Button */}
              <div className="pt-2">
                <button
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-[13.5px] tracking-tight flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98] cursor-pointer disabled:opacity-75"
                  type="submit"
                >
                  {isLoading ? (
                    <span className="inline-block w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <span>Sign In to Khata</span>
                      <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Trust Badges & Footer Registration */}
          <div className="flex flex-col items-center space-y-3.5 text-center mt-auto pt-4">
            <div className="flex items-center justify-center flex-wrap gap-2 px-1">
              {/* Security Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/70 border border-zinc-800 text-zinc-400 text-[11px] shadow-sm">
                <span
                  className="material-symbols-outlined text-[13px] text-emerald-400"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  lock
                </span>
                <span>256-bit AES Local Database</span>
              </div>
              {/* Compliance Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/70 border border-zinc-800 text-zinc-400 text-[11px] shadow-sm">
                <span className="material-symbols-outlined text-[13px] text-zinc-400">verified</span>
                <span>Permanent Offline Storage</span>
              </div>
            </div>

            {/* Account creation link */}
            <p className="text-[12.5px] text-zinc-400">
              New business merchant?{' '}
              <a
                className="text-white hover:text-zinc-300 font-semibold hover:underline underline-offset-4 transition-colors ml-1 inline-flex items-center gap-0.5 cursor-pointer"
                href="#register"
                onClick={handleRegisterClick}
              >
                Register New Business Khata
                <span className="material-symbols-outlined text-[13px]">north_east</span>
              </a>
            </p>

            {/* Subtext */}
            <span className="text-[10px] text-zinc-600 tracking-wider uppercase font-medium">
              Private Owner Ledger • Completely Local &amp; Secure
            </span>
          </div>
        </div>
      </main>
    </div>
  );
};
