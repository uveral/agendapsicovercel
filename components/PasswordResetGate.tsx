'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { determinePasswordRedirect } from '@/lib/auth/password-reset';

export function PasswordResetGate() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const redirectTo = determinePasswordRedirect({
      loading,
      mustChangePassword: Boolean(user?.mustChangePassword),
      pathname,
    });

    if (redirectTo) {
      router.replace(redirectTo);
    }
  }, [loading, pathname, router, user]);

  return null;
}

export default PasswordResetGate;
