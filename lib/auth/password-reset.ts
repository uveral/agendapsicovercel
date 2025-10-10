export interface PasswordRedirectOptions {
  loading: boolean;
  mustChangePassword: boolean;
  pathname?: string | null;
}

export function determinePasswordRedirect({
  loading,
  mustChangePassword,
  pathname,
}: PasswordRedirectOptions): string | null {
  if (loading || !mustChangePassword) {
    return null;
  }

  if (!pathname || pathname.startsWith('/change-password')) {
    return null;
  }

  const params = new URLSearchParams();
  params.set('next', pathname);
  return `/change-password?${params.toString()}`;
}
