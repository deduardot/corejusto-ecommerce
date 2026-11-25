import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const hydrateSession = useCallback(async () => {
    const token = localStorage.getItem('cj_token');
    if (!token) {
      setUser(null);
      setLoadingAuth(false);
      return;
    }

    try {
      const { data } = await api.get('/auth/me');
      setUser(data.data);
    } catch {
      localStorage.removeItem('cj_token');
      setUser(null);
    } finally {
      setLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    hydrateSession();

    const handleUnauthorized = () => setUser(null);
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [hydrateSession]);

  const login = async (credentials) => {
    const { data } = await api.post('/auth/login', credentials);
    localStorage.setItem('cj_token', data.data.token);
    setUser(data.data.usuario);
    return data.data.usuario;
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    localStorage.setItem('cj_token', data.data.token);
    setUser(data.data.usuario);
    return data.data.usuario;
  };

  const logout = () => {
    localStorage.removeItem('cj_token');
    setUser(null);
  };

  const hasPermission = (permiso) => Boolean(user?.permisos?.includes(permiso));
  const isStaff = Boolean(user?.permisos?.length > 0);

  return (
    <AuthContext.Provider
      value={{ user, loadingAuth, login, register, logout, hasPermission, isStaff, hydrateSession }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}