import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  login as loginApi,
  register as registerApi,
  getCurrentUser,
  logout as logoutApi,
} from '../api/authApi';
import env from '../config/env';


const AuthContext = createContext(null);

// ─────────────────────────────────────────────────────────────────────────────
// SESSION_FLAG strategy
//
//  Set  → when the user successfully logs in (email/password or Google OAuth)
//  Clear → when the user explicitly logs out
//
// On every page load:
//  • Flag absent  → skip /api/auth/me entirely, show /login instantly  ✅
//  • Flag present → call /api/auth/me to restore the session            ✅
//    · If Render is sleeping, retry up to MAX_RETRIES times (cold-start)
//    · If the cookie is invalid (401), clear the flag and go to /login
//
// Brand-new visitors and logged-out users NEVER wake up Render,
// so they see the login page in < 1 second.
// ─────────────────────────────────────────────────────────────────────────────
const SESSION_FLAG   = 'actdone_has_session';
// In production (Render) the server sleeps → retry several times.
// In development the local backend should respond immediately → no retries.
const MAX_RETRIES    = env.isProduction ? 4 : 0;
const RETRY_DELAY_MS = 6000; // 6 s between retries (production only)


export function AuthProvider({ children }) {
  const [user, setUser]                 = useState(null);
  const [loading, setLoading]           = useState(true);
  const [serverWaking, setServerWaking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let retries   = 0;

    async function loadUser() {
      // ── Google OAuth landing ──────────────────────────────────────────────
      // When Google redirects back with ?auth=google the session cookie has
      // just been set. Set the flag HERE, before the fast-path check, so the
      // auth check always runs after a Google OAuth redirect.
      if (new URLSearchParams(window.location.search).get('auth') === 'google') {
        localStorage.setItem(SESSION_FLAG, '1');
      }

      // ── Fast-path: no known session ───────────────────────────────────────
      // Skip the network call entirely → login page loads in < 1 s.
      if (!localStorage.getItem(SESSION_FLAG)) {
        if (!cancelled) { setUser(null); setLoading(false); }
        return;
      }

      // ── Try to restore the session ────────────────────────────────────────
      try {
        const res = await getCurrentUser();
        if (cancelled) return;

        if (res.ok) {
          const data = await res.json();
          setUser(data);
          setServerWaking(false);
          setLoading(false);
        } else {
          // Definitive auth failure (401/403) – cookie is gone or expired
          localStorage.removeItem(SESSION_FLAG);
          setUser(null);
          setServerWaking(false);
          setLoading(false);
        }
      } catch {
        // Network error – Render is almost certainly cold-starting
        if (cancelled) return;

        if (retries < MAX_RETRIES) {
          retries += 1;
          setServerWaking(true);
          setTimeout(loadUser, RETRY_DELAY_MS);
        } else {
          // Gave up – let the user log in again manually
          localStorage.removeItem(SESSION_FLAG);
          setUser(null);
          setServerWaking(false);
          setLoading(false);
        }
      }
    }

    loadUser();

    return () => { cancelled = true; };
  }, []);

  async function register(data) {
    try {
      await registerApi(data);
    } catch (err) {
      throw err;
    }
  }

  async function login(email, password) {
    const res = await loginApi(email, password);
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Login failed');
    }
    const data = await res.json();
    localStorage.setItem(SESSION_FLAG, '1'); // mark that a session exists
    setUser(data.user || data);
  }

  async function logout() {
    await logoutApi();
    localStorage.removeItem(SESSION_FLAG);   // clear so next visit is instant
    setUser(null);
  }

  // Called by GoogleAuthHandler to ensure the flag is set after OAuth redirect
  function markGoogleSession() {
    localStorage.setItem(SESSION_FLAG, '1');
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      serverWaking,
      login,
      register,
      logout,
      setUser,
      markGoogleSession,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}