'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/queryClient';
import { processPasswordChange } from '@/lib/auth/password-change';

export default function ChangePasswordPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const supabase = useMemo(() => createClient(), []);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const nextPath = searchParams.get('next') || '/dashboard';

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      router.replace('/login');
      return;
    }

    if (!user.mustChangePassword) {
      router.replace(nextPath);
    }
  }, [loading, nextPath, router, user]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    const result = await processPasswordChange(password, confirmPassword, {
      updateUserPassword: async (newPassword) => {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        return { error: error ?? null };
      },
      markPasswordAsChanged: async () => {
        await apiRequest('PATCH', '/api/user/password', { mustChangePassword: false });
      },
    });

    setSubmitting(false);

    if (result.status === 'validation-error') {
      toast({
        title: 'No se pudo actualizar la contraseña',
        description: result.message,
        variant: 'destructive',
      });
      return;
    }

    if (result.status === 'error') {
      toast({
        title: 'No se pudo actualizar la contraseña',
        description: result.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Contraseña actualizada',
      description: 'Tu nueva contraseña se ha guardado correctamente.',
    });

    router.replace(nextPath);
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 to-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-semibold text-primary">Actualiza tu contraseña</CardTitle>
          <CardDescription>
            Para proteger tu cuenta, establece una nueva contraseña distinta a la predeterminada.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nueva contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={submitting}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={submitting}
                required
                minLength={8}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Guardando...' : 'Guardar contraseña'}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              La contraseña inicial para los terapeutas es &quot;orienta&quot;. Debes cambiarla por una personal al iniciar sesión.
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
