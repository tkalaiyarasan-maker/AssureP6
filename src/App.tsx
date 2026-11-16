/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { PasswordGate } from './components/PasswordGate';

const Workspace = React.lazy(() => import('./components/Workspace'));

const AUTH_TOKEN_KEY = 'assurep6_auth_token';
const LAST_ACTIVITY_KEY = 'assurep6_last_activity';
const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const ACTIVITY_THROTTLE_MS = 5 * 1000; // Update activity timestamp at most once every 5s

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
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const clearAuthStorage = useCallback(() => {
    try {
      sessionStorage.removeItem(AUTH_TOKEN_KEY);
      sessionStorage.removeItem(LAST_ACTIVITY_KEY);
      sessionStorage.removeItem('p6_uploaded_xer');
      sessionStorage.removeItem('p6_uploaded_name');
      sessionStorage.removeItem('p6_is_user_uploaded');
    } catch {
      // ignore storage errors
    }
  }, []);

  const handleLogout = useCallback(
    (notice?: string) => {
      clearAuthStorage();
      document.title = 'Assure P6';
      setSessionNotice(notice ?? null);
      setAuthStatus('locked');
    },
    [clearAuthStorage]
  );

  // Verify existing sessionStorage token and inactivity limit on load
  useEffect(() => {
    let cancelled = false;

    const verifyExistingSession = async () => {
      try {
        const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
        if (!token) {
          if (!cancelled) setAuthStatus('locked');
          return;
        }

        const storedLastActive = Number(sessionStorage.getItem(LAST_ACTIVITY_KEY) || '0');
        if (storedLastActive > 0 && Date.now() - storedLastActive >= INACTIVITY_TIMEOUT_MS) {
          clearAuthStorage();
          if (!cancelled) {
            setSessionNotice('You were logged out after 10 minutes of inactivity.');
            setAuthStatus('locked');
          }
          return;
        }

        const res = await fetch('/api/auth', {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!cancelled) {
          if (res.ok) {
            const now = Date.now();
            lastActivityRef.current = now;
            try {
              sessionStorage.setItem(LAST_ACTIVITY_KEY, String(now));
            } catch {
              // ignore
            }
            setAuthStatus('unlocked');
          } else {
            clearAuthStorage();
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
  }, [clearAuthStorage]);

  // Monitor user activity & enforce 10-minute idle timeout across active & backgrounded tabs
  useEffect(() => {
    if (authStatus !== 'unlocked') return;

    const now = Date.now();
    lastActivityRef.current = now;
    try {
      sessionStorage.setItem(LAST_ACTIVITY_KEY, String(now));
    } catch {
      // ignore
    }

    const recordActivity = () => {
      const current = Date.now();
      // Check if already expired before updating activity timestamp (e.g. waking a sleeping tab)
      if (current - lastActivityRef.current >= INACTIVITY_TIMEOUT_MS) {
        handleLogout('You were logged out after 10 minutes of inactivity.');
        return;
      }
      if (current - lastActivityRef.current >= ACTIVITY_THROTTLE_MS) {
        lastActivityRef.current = current;
        try {
          sessionStorage.setItem(LAST_ACTIVITY_KEY, String(current));
        } catch {
          // ignore
        }
      }
    };

    const checkInactivity = () => {
      if (Date.now() - lastActivityRef.current >= INACTIVITY_TIMEOUT_MS) {
        handleLogout('You were logged out after 10 minutes of inactivity.');
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkInactivity();
      }
    };

    const events: (keyof WindowEventMap)[] = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'wheel',
      'click',
    ];

    events.forEach((evt) => window.addEventListener(evt, recordActivity, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibilityChange);
    const intervalId = window.setInterval(checkInactivity, 10 * 1000);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, recordActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [authStatus, handleLogout]);

  const handleAuthenticated = (token: string) => {
    const now = Date.now();
    lastActivityRef.current = now;
    try {
      sessionStorage.setItem(AUTH_TOKEN_KEY, token);
      sessionStorage.setItem(LAST_ACTIVITY_KEY, String(now));
    } catch {
      // ignore storage quota errors
    }
    setSessionNotice(null);
    setAuthStatus('unlocked');
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
        sessionNotice={sessionNotice}
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
        onLogout={() => handleLogout()}
      />
    </Suspense>
  );
}
