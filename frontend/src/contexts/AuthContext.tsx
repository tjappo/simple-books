import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import api from '../lib/axios';

interface Company {
  id: string;
  userId: string;
  name: string;
  kvk: string;
  btw: string;
  iban: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  auth0Id: string;
  email: string;
  name: string | null;
  picture: string | null;
  createdAt: string;
  updatedAt: string;
}

export { type Company, type User };

interface AuthContextType {
  user: User | null;
  company: Company | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasCompanyDetails: boolean;
  login: () => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  refreshCompany: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const response = await api.get('/api/users/me');
      setUser(response.data);
    } catch (error) {
      setUser(null);
    }
  };

  const fetchCompany = async () => {
    try {
      const response = await api.get('/api/users/me/company');
      setCompany(response.data);
    } catch (error) {
      setCompany(null);
    }
  };

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      await fetchUser();
      await fetchCompany();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const login = () => {
    window.location.href = '/auth/login';
  };

  const logout = () => {
    window.location.href = '/auth/logout';
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  const refreshCompany = async () => {
    await fetchCompany();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        isAuthenticated: !!user,
        isLoading,
        hasCompanyDetails: !!company,
        login,
        logout,
        refreshUser,
        refreshCompany,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
