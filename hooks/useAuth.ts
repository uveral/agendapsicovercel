'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@/lib/types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);
  const renderCount = useRef(0);

  useEffect(() => {
    renderCount.current++;
    console.log('[useAuth] Effect running, render count:', renderCount.current);

    // Get initial user profile
    const fetchUser = async () => {
      console.log('[useAuth] Fetching user...');
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Fetch user profile from our API
      try {
        const res = await fetch('/api/user');
        if (res.ok) {
          const profile = await res.json();
          console.log('[useAuth] User profile fetched:', profile.email);
          setUser(profile);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setUser(null);
      }

      setIsLoading(false);
    };

    fetchUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[useAuth] Auth state changed:', _event);
      if (session?.user) {
        fetchUser();
      } else {
        setUser(null);
      }
    });

    return () => {
      console.log('[useAuth] Cleaning up subscription');
      subscription.unsubscribe();
    };
  }, [supabase]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
