import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

export type UserRole = 'admin' | 'member';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  is_active: boolean;
  initials: string;
  color: string;
  status: 'online' | 'offline' | 'busy';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  requirePasswordChange: boolean;
  setRequirePasswordChange: (val: boolean) => void;
  login: (token: string, userData: User, requirePassChange?: boolean) => void;
  logout: () => void;
  updateAvatar: (newUrl: string) => void;
  updateProfileInfo: (name: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requirePasswordChange, setRequirePasswordChange] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await api.get('/auth/me');
        const userData = response.data.data.user;
        
        // Tính toán các trường ảo cho UI
        userData.initials = userData.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
        userData.color = 'bg-green-600';
        userData.status = 'online';
        
        setUser(userData);
      } catch (error) {
        console.error('Lỗi xác thực:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('requirePasswordChange');
        setRequirePasswordChange(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  const login = (token: string, userData: User, requirePassChange = false) => {
    localStorage.setItem('token', token);
    if (requirePassChange) {
      localStorage.setItem('requirePasswordChange', 'true');
      setRequirePasswordChange(true);
    } else {
      localStorage.removeItem('requirePasswordChange');
      setRequirePasswordChange(false);
    }
    
    // Tính toán các trường ảo cho UI
    if (!userData.initials) {
      userData.initials = userData.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
      userData.color = 'bg-green-600';
      userData.status = 'online';
    }
    
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('requirePasswordChange');
    setRequirePasswordChange(false);
    setUser(null);
  };

  // Cập nhật state requirePasswordChange từ localStorage khi load
  useEffect(() => {
    if (localStorage.getItem('requirePasswordChange') === 'true') {
      setRequirePasswordChange(true);
    }
  }, []);

  const updateAvatar = (newUrl: string) => {
    setUser(prev => prev ? { ...prev, avatar: newUrl } : null);
  };

  const updateProfileInfo = (name: string) => {
    setUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        name,
        initials: name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
      };
    });
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, requirePasswordChange, setRequirePasswordChange, login, logout, updateAvatar, updateProfileInfo }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
