'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: Error | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    console.log('[AuthProvider] Initializing...');
    const supabase = createClient();

    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('[AuthProvider] Fetching initial session...');
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser) {
          console.log('[AuthProvider] No auth user found');
          setUser(null);
          setLoading(false);
          return;
        }

        // Fetch user profile from API
        console.log('[AuthProvider] Fetching user profile...');
        const res = await fetch('/api/user');
        if (res.ok) {
          const profile = await res.json();
          console.log('[AuthProvider] User profile loaded:', profile.email);
          setUser(profile);
        } else {
          console.error('[AuthProvider] Failed to fetch user profile');
          setUser(null);
        }
      } catch (err) {
        console.error('[AuthProvider] Error:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
        console.log('[AuthProvider] Initialization complete');
      }
    };

    getInitialSession();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthProvider] Auth state changed:', event);
        if (session?.user) {
          try {
            const res = await fetch('/api/user');
            if (res.ok) {
              const profile = await res.json();
              setUser(profile);
            } else {
              setUser(null);
            }
          } catch (err) {
            console.error('[AuthProvider] Error fetching user on auth change:', err);
            setUser(null);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => {
      console.log('[AuthProvider] Cleaning up subscription');
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => {
      console.log('[AuthProvider] Memoizing value. user:', user?.email, 'loading:', loading);
      return { user, loading, error };
    },
    [user, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
