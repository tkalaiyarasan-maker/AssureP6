/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Suspense } from 'react';
import { PasswordGate } from './components/PasswordGate';

const Workspace = React.lazy(() => import('./components/Workspace'));

const AUTH_TOKEN_KEY = 'assurep6_auth_token';

export default function App() {
  // Theme state: defaults to 'light'
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('p6_app_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    }
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('p6_app_theme', theme);
    } catch {
      // ignore local storage errors
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const [authStatus, setAuthStatus] = useState<'checking' | 'locked' | 'unlocked'>('checking');

  // Verify existing sessionStorage token on load via server API
  useEffect(() => {
    let cancelled = false;

    const verifyExistingSession = async () => {
      try {
        const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
        if (!token) {
          if (!cancelled) setAuthStatus('locked');
          return;
        }

        const res = await fetch('/api/auth', {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!cancelled) {
          if (res.ok) {
            setAuthStatus('unlocked');
          } else {
            sessionStorage.removeItem(AUTH_TOKEN_KEY);
            setAuthStatus('locked');
          }
        }
      } catch {
        if (!cancelled) {
          setAuthStatus('locked');
        }
      }
    };

    verifyExistingSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAuthenticated = (token: string) => {
    try {
      sessionStorage.setItem(AUTH_TOKEN_KEY, token);
    } catch {
      // ignore storage quota errors
    }
    setAuthStatus('unlocked');
  };

  const handleLockSession = () => {
    try {
      sessionStorage.removeItem(AUTH_TOKEN_KEY);
      sessionStorage.removeItem('p6_uploaded_xer');
      sessionStorage.removeItem('p6_uploaded_name');
      sessionStorage.removeItem('p6_is_user_uploaded');
    } catch {
      // ignore
    }
    document.title = 'Assure P6';
    setAuthStatus('locked');
  };

  if (authStatus === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <img src="/assurep6-logo.png" alt="Assure P6" className="w-12 h-12 object-contain animate-pulse" />
          <span className="text-xs font-medium">Verifying session...</span>
        </div>
      </div>
    );
  }

  if (authStatus === 'locked') {
    return (
      <PasswordGate
        onAuthenticated={handleAuthenticated}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400">
          <div className="flex flex-col items-center gap-3">
            <img src="/assurep6-logo.png" alt="Assure P6" className="w-12 h-12 object-contain animate-pulse" />
            <span className="text-xs font-medium">Loading Assure P6 workspace...</span>
          </div>
        </div>
      }
    >
      <Workspace
        theme={theme}
        onToggleTheme={toggleTheme}
        onLockSession={handleLockSession}
      />
    </Suspense>
  );
}
