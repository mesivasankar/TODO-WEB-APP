import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  login as loginApi,
  register as registerApi,
  getCurrentUser,
  logout as logoutApi,
} from '../api/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await getCurrentUser();
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
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
      throw new Error(errorData.message || "Login failed");
    }

    const data = await res.json();
    // Ensure we are setting the user object correctly
    // If your backend returns { message: "...", user: {...} }, we usually want data.user
    // If your backend returns just the user object, data is fine.
    // Based on your controller, it returns { user: ... }, so we safeguard here:
    setUser(data.user || data); 
  }

  async function logout() {
    await logoutApi();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      register, 
      logout,
      setUser // <--- ADDED THIS so AppLayout can update the name
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}