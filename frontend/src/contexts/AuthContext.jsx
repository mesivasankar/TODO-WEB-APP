import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  login as loginApi,
  register as registerApi,
  getCurrentUser,
  logout as logoutApi,
} from '../api/authApi';

const AuthContext = createContext(null);

// Key stored in localStorage to remember that a session exists.
// This lets us skip the /api/auth/me call for guests (instant load)
// and retry gracefully when the backend is waking up (Render cold start).
const SESSION_FLAG = 'actdone_has_session';

const MAX_RETRIES = 4;          // max wake-up retries
const RETRY_DELAY_MS = 6000;   // 6 s between retries (~24 s total)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // true while we are waiting for the backend to wake up
  const [serverWaking, setServerWaking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let retries = 0;

    async function loadUser() {
      // ── Fast-path for guests ──────────────────────────────────────────────
      // If there is no session flag the user was never logged in (or already
      // logged out), so skip the network call entirely.
      if (!localStorage.getItem(SESSION_FLAG)) {
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
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
          // Definitive auth failure (401 / 403) – the session is truly gone
          localStorage.removeItem(SESSION_FLAG);
          setUser(null);
          setServerWaking(false);
          setLoading(false);
        }
      } catch {
        // Network error – the backend is almost certainly still waking up
        if (cancelled) return;

        if (retries < MAX_RETRIES) {
          retries += 1;
          setServerWaking(true);
          setTimeout(loadUser, RETRY_DELAY_MS);
        } else {
          // Gave up waiting – clear session so the user can log in again
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
    // Mark that a session exists so the next page load skips the guest fast-path
    localStorage.setItem(SESSION_FLAG, '1');
    setUser(data.user || data);
  }

  async function logout() {
    await logoutApi();
    localStorage.removeItem(SESSION_FLAG);
    setUser(null);
  }

  // Called by AppLayout after a successful Google OAuth redirect
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
      setUser, // so AppLayout can update the display name
      markGoogleSession,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}