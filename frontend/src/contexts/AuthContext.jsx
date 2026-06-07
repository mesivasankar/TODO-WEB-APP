import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  login as loginApi,
  register as registerApi,
  getCurrentUser,
  logout as logoutApi,
} from '../api/authApi';

const AuthContext = createContext(null);

// Set ONLY when the user explicitly logs out so we can skip the auth
// check on the next page load and go straight to /login instantly.
// For all other cases (cold visit, closed tab, old sessions) we always
// try the /api/auth/me call so returning users are restored properly.
const LOGGED_OUT_FLAG = 'actdone_logged_out';

const MAX_RETRIES = 4;        // max cold-start retries
const RETRY_DELAY_MS = 6000; // 6 s between retries (~24 s total)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // true while we are waiting for the backend to wake up after a cold start
  const [serverWaking, setServerWaking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let retries = 0;

    async function loadUser() {
      // ── Fast-path: user explicitly logged out last time ───────────────────
      // Skip the network call so the login page loads instantly.
      if (localStorage.getItem(LOGGED_OUT_FLAG)) {
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      // ── Try to restore any existing session ───────────────────────────────
      try {
        const res = await getCurrentUser();

        if (cancelled) return;

        if (res.ok) {
          const data = await res.json();
          setUser(data);
          setServerWaking(false);
          setLoading(false);
        } else {
          // Definitive auth failure (401 / 403) – no valid session
          setUser(null);
          setServerWaking(false);
          setLoading(false);
        }
      } catch {
        // Network error – backend is probably still cold-starting
        if (cancelled) return;

        if (retries < MAX_RETRIES) {
          retries += 1;
          setServerWaking(true);
          setTimeout(loadUser, RETRY_DELAY_MS);
        } else {
          // Gave up – let the user try logging in manually
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
    // Clear the logged-out flag so the next page load attempts session restore
    localStorage.removeItem(LOGGED_OUT_FLAG);
    setUser(data.user || data);
  }

  async function logout() {
    await logoutApi();
    // Mark as explicitly logged out so the next visit skips the auth check
    localStorage.setItem(LOGGED_OUT_FLAG, '1');
    setUser(null);
  }

  // Called by GoogleAuthHandler after a successful Google OAuth redirect
  function markGoogleSession() {
    // Clear the logged-out flag so the session is recognised
    localStorage.removeItem(LOGGED_OUT_FLAG);
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