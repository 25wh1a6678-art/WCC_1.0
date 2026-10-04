'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isConfigured: boolean;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = 'fc_local_user';
const LOCAL_STORAGE_USERS_DB_KEY = 'fc_local_users_db';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const isConfigured = isSupabaseConfigured();

  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window === 'undefined' || isConfigured) return null;
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => {
    // If not configured and local user is already checked in state initializer
    if (typeof window !== 'undefined' && !isConfigured) return false;
    return true;
  });

  const mapAndSetUser = useCallback((sbUser: SupabaseUser) => {
    const metaName = sbUser.user_metadata?.name || sbUser.user_metadata?.full_name;
    const name = metaName || sbUser.email?.split('@')[0] || 'Student';
    setUser({
      id: sbUser.id,
      email: sbUser.email || '',
      name,
    });
  }, []);

  useEffect(() => {
    if (isConfigured) {
      const supabase = createClient();

      // Check active session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          mapAndSetUser(session.user);
        } else {
          setUser(null);
        }
        setIsLoading(false);
      });

      // Listen for auth state changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          mapAndSetUser(session.user);
        } else {
          setUser(null);
        }
        setIsLoading(false);
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [isConfigured, mapAndSetUser]);

  const signUp = async (
    email: string,
    password: string,
    name?: string
  ): Promise<{ error: string | null }> => {
    setIsLoading(true);
    try {
      if (isConfigured) {
        const supabase = createClient();
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name || email.split('@')[0],
              full_name: name || email.split('@')[0],
            },
          },
        });

        if (error) {
          setIsLoading(false);
          return { error: error.message };
        }

        if (data.user) {
          mapAndSetUser(data.user);
        }
        setIsLoading(false);
        return { error: null };
      } else {
        // Local mode fallback
        const existingRaw = localStorage.getItem(LOCAL_STORAGE_USERS_DB_KEY);
        const usersDb: Record<string, { id: string; email: string; password: string; name: string }> =
          existingRaw ? JSON.parse(existingRaw) : {};

        if (usersDb[email.toLowerCase()]) {
          setIsLoading(false);
          return { error: 'An account with this email already exists.' };
        }

        const newUser: AuthUser = {
          id: 'demo-usr-' + Date.now(),
          email: email.toLowerCase(),
          name: name || email.split('@')[0],
        };

        usersDb[email.toLowerCase()] = {
          ...newUser,
          password,
        };

        localStorage.setItem(LOCAL_STORAGE_USERS_DB_KEY, JSON.stringify(usersDb));
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(newUser));
        setUser(newUser);
        setIsLoading(false);
        return { error: null };
      }
    } catch (err: unknown) {
      setIsLoading(false);
      const message = err instanceof Error ? err.message : 'Sign up failed';
      return { error: message };
    }
  };

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ error: string | null }> => {
    setIsLoading(true);
    try {
      if (isConfigured) {
        const supabase = createClient();
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setIsLoading(false);
          return { error: error.message };
        }

        if (data.user) {
          mapAndSetUser(data.user);
        }
        setIsLoading(false);
        return { error: null };
      } else {
        // Local mode fallback
        const existingRaw = localStorage.getItem(LOCAL_STORAGE_USERS_DB_KEY);
        const usersDb: Record<string, { id: string; email: string; password: string; name: string }> =
          existingRaw ? JSON.parse(existingRaw) : {};

        const found = usersDb[email.toLowerCase()];
        if (!found || found.password !== password) {
          setIsLoading(false);
          return { error: 'Invalid email or password.' };
        }

        const authUser: AuthUser = {
          id: found.id,
          email: found.email,
          name: found.name,
        };

        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(authUser));
        setUser(authUser);
        setIsLoading(false);
        return { error: null };
      }
    } catch (err: unknown) {
      setIsLoading(false);
      const message = err instanceof Error ? err.message : 'Sign in failed';
      return { error: message };
    }
  };

  const signOut = async (): Promise<void> => {
    setIsLoading(true);
    try {
      if (isConfigured) {
        const supabase = createClient();
        await supabase.auth.signOut();
      } else {
        localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
      }
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isConfigured,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
