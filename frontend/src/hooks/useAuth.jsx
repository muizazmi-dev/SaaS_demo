import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const [tenant, setTenant] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tenant')); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  function persist(token, userData, tenantData) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('tenant', JSON.stringify(tenantData));
    setUser(userData);
    setTenant(tenantData);
  }

  async function signup(formData) {
    setLoading(true);
    try {
      const { data } = await authApi.signup(formData);
      persist(data.token, data.user, data.tenant);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.response?.data?.error || 'Signup failed' };
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    setLoading(true);
    try {
      const { data } = await authApi.login({ email, password });
      persist(data.token, data.user, data.tenant);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.response?.data?.error || 'Login failed' };
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tenant');
    setUser(null);
    setTenant(null);
  }

  return (
    <AuthContext.Provider value={{ user, tenant, loading, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
