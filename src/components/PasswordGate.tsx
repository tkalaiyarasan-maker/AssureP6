import React, { useState, useRef, useEffect } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  Sun,
  Moon,
  GitBranch,
  Clock,
  SlidersHorizontal,
  TrendingUp,
} from 'lucide-react';

interface PasswordGateProps {
  onAuthenticated: (token: string) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

type LeakCategoryKey = 'logic' | 'float' | 'constraints' | 'tilos';

interface LeakCategoryInfo {
  id: LeakCategoryKey;
  label: string;
  headline: string;
  summary: string;
  checks: { title: string; detail: string }[];
}

const LEAK_CATEGORIES: LeakCategoryInfo[] = [
  {
    id: 'logic',
    label: 'Logic Traps',
    headline: 'Uncover Open Ends, Dangling Ties & Broken Loops',
    summary:
      'Every missing predecessor or unclosed Start-to-Start chain hides true schedule risk from management.',
    checks: [
      {
        title: 'Open Ends & Missing Predecessors',
        detail: 'Pinpoints non-milestone tasks lacking FS/SS/FF predecessors or successors.',
      },
      {
        title: 'SS-to-FF Loop Closure Ratio',
        detail: 'Audits open Start-to-Start chains that never tie back with a Finish-to-Finish link.',
      },
      {
        title: 'SF Relationship & High-Lag Audits',
        detail: 'Flags Start-to-Finish links and leads or lags exceeding safe thresholds.',
      },
    ],
  },
  {
    id: 'float',
    label: 'Float & Duration',
    headline: 'Spot Unrealistic Buffers & Hidden Critical Chains',
    summary:
      'Compare P6 Early/Late dates directly against your XER tables to catch inflated float or oversized work packages.',
    checks: [
      {
        title: 'Negative & Zero-Float Exposure',
        detail: 'Separates overdue critical tasks from true Longest Path driving activities.',
      },
      {
        title: 'Long & Very Long Durations',
        detail: 'Flags tasks exceeding 44 or 88 working days that mask mid-activity slippage.',
      },
      {
        title: 'High Positive Float Outliers',
        detail: 'Surfaces activities with >44 days of float indicating disconnected logic branches.',
      },
    ],
  },
  {
    id: 'constraints',
    label: 'Constraints & Resources',
    headline: 'Expose Hard Overrides & Overallocated Crews',
    summary:
      'Manual date pins silence P6 network logic. Reveal constrained milestones, calendar mismatches, and peak resource clashes.',
    checks: [
      {
        title: 'Mandatory vs. Soft Constraints',
        detail: 'Separates hard Mandatory Start/Finish overrides from soft date constraints.',
      },
      {
        title: 'Calendar Integrity Audit',
        detail: 'Counts Project, Global, and Resource calendars and checks task alignment.',
      },
      {
        title: 'RBS Hierarchy & Overallocation',
        detail: 'Traces Labor, Non-Labor, and Material units across the Resource Breakdown Structure.',
      },
    ],
  },
  {
    id: 'tilos',
    label: 'TILOS Alignment',
    headline: 'Visualize Linear Chainage & Trade Collisions',
    summary:
      'Transform Level 3 WBS alignment packages into a monthly Time-Chainage velocity map to catch corridor clashes.',
    checks: [
      {
        title: 'Level 3 WBS Chainage Mapping',
        detail: 'Organizes earthwork, substructure, superstructure, and systems by station corridor.',
      },
      {
        title: 'Monthly Advance Rate (m/month)',
        detail: 'Measures production slope across civil, trackwork, and MEP trades.',
      },
      {
        title: 'Spatial Overlap & Conflict Alerts',
        detail: 'Highlights crossing production vectors competing for the same chainage window.',
      },
    ],
  },
];

export const PasswordGate: React.FC<PasswordGateProps> = ({
  onAuthenticated,
  theme,
  onToggleTheme,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [activeCategory, setActiveCategory] = useState<LeakCategoryKey>('logic');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const currentInfo =
    LEAK_CATEGORIES.find((c) => c.id === activeCategory) || LEAK_CATEGORIES[0];

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
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Minimal Header Bar */}
      <header className="w-full max-w-6xl mx-auto px-6 py-5 flex items-center justify-between gap-8">
        <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
          {!logoFailed ? (
            <img
              src="/assurep6-logo.png"
              alt="Assure P6"
              referrerPolicy="no-referrer"
              onError={() => setLogoFailed(true)}
              className="w-9 h-9 object-contain shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-amber-400 text-slate-950 font-extrabold text-sm flex items-center justify-center shrink-0">
              P6
            </div>
          )}
          <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Assure P6
          </span>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <span className="hidden sm:inline text-xs text-slate-500 dark:text-slate-400">
            Primavera P6 Schedule Analyzer · Client-Side Privacy
          </span>
          <button
            type="button"
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            className="py-1.5 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-600" />
                <span>Dark</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main 2-Column Editorial + Access Workspace */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-6 lg:py-10 flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          {/* Left Column: Engineering Curiosity & Interactive Audit Preview */}
          <section className="lg:col-span-7 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-400">
                <span>Deterministic .XER Diagnostics</span>
                <span aria-hidden="true">·</span>
                <span>54-Parameter Baseline Check</span>
                <span aria-hidden="true">·</span>
                <span>Zero-Upload Architecture</span>
              </div>

              <h1
                className="text-3xl sm:text-4xl lg:text-[2.65rem] font-extrabold tracking-tight text-slate-900 dark:text-slate-100 leading-[1.12]"
                style={{ textWrap: 'balance' }}
              >
                Make Your P6 Programme 100% Leak-Proof Before Submission.
              </h1>

              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
                Hidden open ends, unclosed SS chains, hard date overrides, and silent resource bottlenecks slip past routine reviews. Drop your Oracle Primavera <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">.XER</span> file inside to expose every schedule flaw in seconds—with pure deterministic logic and zero AI guesswork.
              </p>
            </div>

            {/* Interactive Leak-Check Explorer */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  What Assure P6 Inspects Inside Your .XER File
                </h2>
                <div
                  role="tablist"
                  aria-label="Schedule inspection categories"
                  className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800"
                >
                  {LEAK_CATEGORIES.map((cat) => {
                    const isActive = cat.id === activeCategory;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          isActive
                            ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {currentInfo.headline}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {currentInfo.summary}
                </p>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800">
                {currentInfo.checks.map((item, idx) => (
                  <div
                    key={item.title}
                    className="py-3 first:pt-3 last:pb-0 flex items-start gap-3"
                  >
                    <span className="font-mono tabular-nums text-xs font-semibold text-amber-600 dark:text-amber-400 pt-0.5 shrink-0">
                      0{idx + 1}
                    </span>
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {item.title}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {item.detail}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Clean Architectural Metrics / Capabilities Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
                  <GitBranch className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="tabular-nums">54 KPIs</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Baseline Health Audit
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
                  <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>DCMA 14</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Longest Path &amp; Float
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>TILOS View</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Level 3 WBS Chainage
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>5-Tier Gantt</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Day to Year + RBS Tree
                </div>
              </div>
            </div>
          </section>

          {/* Right Column: Password Access Card */}
          <aside className="lg:col-span-5 flex flex-col">
            <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg p-7 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-6">
                {/* Brand Lockup */}
                <div className="text-center space-y-3 pt-2">
                  {!logoFailed ? (
                    <img
                      src="/assurep6-logo.png"
                      alt="Assure P6 Logo"
                      referrerPolicy="no-referrer"
                      onError={() => setLogoFailed(true)}
                      className="w-20 h-20 mx-auto object-contain"
                    />
                  ) : (
                    <div className="w-20 h-20 mx-auto rounded-full bg-amber-400 text-slate-950 font-extrabold text-2xl flex items-center justify-center">
                      P6
                    </div>
                  )}

                  <div className="space-y-1">
                    <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                      Unlock Assure P6
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Enter your workspace passcode to load your `.XER` analyzer
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
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
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
                        className="w-full pl-10 pr-11 py-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        tabIndex={-1}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div
                      role="alert"
                      className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!password.trim() || isSubmitting}
                    className="w-full py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <span>{isSubmitting ? 'Verifying...' : 'Open Analyzer Workspace'}</span>
                    {!isSubmitting && <ArrowRight className="w-4 h-4" />}
                  </button>
                </form>
              </div>

              {/* Client-Side Privacy Assurance Footer */}
              <div className="pt-5 border-t border-slate-100 dark:border-slate-800 space-y-2.5 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong className="text-slate-800 dark:text-slate-200">100% Data Privacy:</strong> Your schedule files stay in browser session memory only—zero server uploads, zero database storage, and wiped the moment you close the tab.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};
