import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest, setAuthToken, removeAuthToken, getAuthToken } from '../lib/api';

export interface User {
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  username: string;
  department: string;
  job_title: string;
  role_id: string;
  role_name: string;
  status: string;
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchDemoUser: (username: string) => Promise<void>;
  hasPermission: (permissionId: string) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const data = await apiRequest<{ user: User }>('/auth/me');
      setUser(data.user);
    } catch (err) {
      console.warn('Session expired or invalid:', err);
      removeAuthToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (username: string, password: string) => {
    const res = await apiRequest<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    setAuthToken(res.token);
    setUser(res.user);
  };

  const logout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignore
    }
    removeAuthToken();
    setUser(null);
  };

  const switchDemoUser = async (username: string) => {
    setLoading(true);
    try {
      const res = await apiRequest<{ token: string; user: User }>('/auth/switch-demo-user', {
        method: 'POST',
        body: JSON.stringify({ username })
      });
      setAuthToken(res.token);
      setUser(res.user);
    } catch (err: any) {
      alert(`Error switching demo user: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permissionId: string): boolean => {
    if (!user) return false;
    return user.permissions.includes(permissionId);
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, switchDemoUser, hasPermission, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
