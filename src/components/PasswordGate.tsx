import React, { useState, useRef, useEffect } from 'react';
import { Lock, Eye, EyeOff, ArrowRight, AlertCircle, ShieldCheck, Sun, Moon } from 'lucide-react';

interface PasswordGateProps {
  onAuthenticated: (token: string) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const PasswordGate: React.FC<PasswordGateProps> = ({
  onAuthenticated,
  theme,
  onToggleTheme,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || isSubmitting) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.authenticated && typeof data.token === 'string') {
        onAuthenticated(data.token);
        return;
      }

      setError(data.error || 'Incorrect access password.');
      setPassword('');
      inputRef.current?.focus();
    } catch {
      setError('Unable to reach authentication server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-4 transition-colors relative">
      {/* Theme Toggle */}
      <button
        type="button"
        onClick={onToggleTheme}
        title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        className="absolute top-5 right-5 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs flex items-center gap-1.5 text-xs font-medium"
      >
        {theme === 'dark' ? (
          <>
            <Sun className="w-4 h-4 text-amber-400" />
            <span>Light</span>
          </>
        ) : (
          <>
            <Moon className="w-4 h-4 text-slate-600" />
            <span>Dark</span>
          </>
        )}
      </button>

      {/* Main Card */}
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8 space-y-6">
          {/* Logo & Brand */}
          <div className="text-center space-y-3">
            <img
              src="/assurep6-logo.png"
              alt="Assure P6 Logo"
              className="w-20 h-20 mx-auto object-contain drop-shadow-md"
            />
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                Assure P6
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Primavera P6 Schedule Analyzer &amp; TILOS Planner
              </p>
            </div>
          </div>

          {/* Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="assurep6-password"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Access Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  ref={inputRef}
                  id="assurep6-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Enter access password"
                  autoComplete="current-password"
                  className="w-full pl-9 pr-10 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!password.trim() || isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <span>{isSubmitting ? 'Verifying...' : 'Unlock Workspace'}</span>
              {!isSubmitting && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        </div>

        {/* Security Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>Protected session · Automatically locks when browser tab closes</span>
        </div>
      </div>
    </div>
  );
};
