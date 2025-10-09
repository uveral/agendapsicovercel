'use client';

import { useCallback } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAppSettings, useUpdateAppSettings } from '@/hooks/useAppSettings';

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const { data: settings, isLoading } = useAppSettings();
  const updateMutation = useUpdateAppSettings();

  const isAdmin = user?.role === 'admin';

  const handleToggle = useCallback(
    (key: 'showWeekends' | 'therapistCanViewOthers' | 'therapistCanEditOthers', value: boolean) => {
      updateMutation.mutate(
        { [key]: value },
        {
          onError: () => {
            toast({
              title: 'No se pudo guardar el cambio',
              description: 'Vuelve a intentarlo en unos instantes.',
              variant: 'destructive',
            });
          },
        },
      );
    },
    [toast, updateMutation],
  );

  if (loading || isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-7 w-40 rounded bg-muted animate-pulse" />
          <div className="h-4 w-64 rounded bg-muted animate-pulse mt-2" />
        </div>
        <Card>
          <CardHeader>
            <div className="h-5 w-32 rounded bg-muted animate-pulse" />
            <div className="h-4 w-48 rounded bg-muted animate-pulse mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="h-4 w-40 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-56 rounded bg-muted animate-pulse" />
                </div>
                <div className="h-6 w-11 rounded-full bg-muted animate-pulse" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Configuración</h2>
          <p className="text-muted-foreground">Solo el equipo administrador puede modificar la configuración global.</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Acceso restringido</CardTitle>
            <CardDescription>
              Ponte en contacto con el administrador si necesitas actualizar la configuración del calendario.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Configuración</h2>
        <p className="text-muted-foreground">Ajustes generales del calendario y permisos de los terapeutas.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Calendario del centro</CardTitle>
          <CardDescription>
            Define cómo se comportan las vistas de calendario para terapeutas y administradores.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <section className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Label className="text-base">Mostrar sábados y domingos</Label>
                <p className="text-sm text-muted-foreground">
                  Controla si los fines de semana aparecen en las vistas mensuales de los terapeutas y del calendario global.
                </p>
              </div>
              <Switch
                checked={settings?.showWeekends}
                onCheckedChange={(value) => handleToggle('showWeekends', value)}
                disabled={updateMutation.isPending}
                data-testid="switch-show-weekends"
              />
            </div>

            <Separator />

            <div className="flex items-start justify-between gap-4">
              <div>
                <Label className="text-base">Los terapeutas pueden ver otros calendarios</Label>
                <p className="text-sm text-muted-foreground">
                  Permite que cada terapeuta consulte el calendario mensual de sus compañeros desde la pestaña principal.
                </p>
              </div>
              <Switch
                checked={settings?.therapistCanViewOthers}
                onCheckedChange={(value) => handleToggle('therapistCanViewOthers', value)}
                disabled={updateMutation.isPending}
                data-testid="switch-view-others"
              />
            </div>

            <Separator />

            <div className="flex items-start justify-between gap-4">
              <div>
                <Label className="text-base">Los terapeutas pueden editar citas ajenas</Label>
                <p className="text-sm text-muted-foreground">
                  Habilita que un terapeuta reprograme o cancele citas que pertenecen a otro profesional desde su propia vista.
                </p>
              </div>
              <Switch
                checked={settings?.therapistCanEditOthers}
                onCheckedChange={(value) => handleToggle('therapistCanEditOthers', value)}
                disabled={updateMutation.isPending}
                data-testid="switch-edit-others"
              />
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
