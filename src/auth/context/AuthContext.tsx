'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';

interface User {
  _id?: string;
  email: string;
  name: string;
  emailVerified?: Date;
  image?: string;
  role?: string;
  isAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  signup: (email: string, password: string, name: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  verifyEmail: (token: string) => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { data: session, status } = useSession();

  const checkJWTAuth = async () => {
    try {
      // Check if there's a JWT token in cookies
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('JWT auth check error:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'loading') return;

    if (session?.user) {
      // For session-based auth, we'll fetch the full user data including admin status via API
      checkAuthStatus();
    } else {
      // Check for JWT token-based auth if no session
      checkJWTAuth();
    }
  }, [session, status]);



  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        setUser(data.user);
      }

      return data;
    } catch (error) {
      return { success: false, message: 'Network error occurred' };
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, message: 'Network error occurred' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      await signOut({ redirect: false });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const verifyEmail = async (token: string) => {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, message: 'Network error occurred' };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      signup,
      logout,
      verifyEmail,
    }}>
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
