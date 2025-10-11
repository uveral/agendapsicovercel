
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAppSettings, useUpdateAppSettings } from '@/hooks/useAppSettings';

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const { data: settings, isLoading } = useAppSettings();
  const updateMutation = useUpdateAppSettings();

  const isAdmin = user?.role === 'admin';

  const [openingTime, setOpeningTime] = useState(settings?.centerOpensAt ?? '09:00');
  const [closingTime, setClosingTime] = useState(settings?.centerClosesAt ?? '21:00');
  const [appointmentOpeningTime, setAppointmentOpeningTime] = useState(
    settings?.appointmentOpensAt ?? '09:00',
  );
  const [appointmentClosingTime, setAppointmentClosingTime] = useState(
    settings?.appointmentClosesAt ?? '20:00',
  );

  useEffect(() => {
    setOpeningTime(settings?.centerOpensAt ?? '09:00');
  }, [settings?.centerOpensAt]);

  useEffect(() => {
    setClosingTime(settings?.centerClosesAt ?? '21:00');
  }, [settings?.centerClosesAt]);

  useEffect(() => {
    setAppointmentOpeningTime(settings?.appointmentOpensAt ?? '09:00');
  }, [settings?.appointmentOpensAt]);

  useEffect(() => {
    setAppointmentClosingTime(settings?.appointmentClosesAt ?? '20:00');
  }, [settings?.appointmentClosesAt]);

  useEffect(() => {
    if (!loading && user && user.role !== 'admin') {
      router.replace('/dashboard');
    }
  }, [loading, router, user]);

  const handleToggle = useCallback(
    (
      key:
        | 'openOnSaturday'
        | 'openOnSunday'
        | 'therapistCanViewOthers'
        | 'therapistCanEditOthers',
      value: boolean,
    ) => {
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

  const sanitizeTime = useCallback((value: string) => {
    if (!value) return null;
    const trimmed = value.trim();
    const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) {
      return null;
    }

    const hours = Math.min(23, Math.max(0, Number.parseInt(match[1], 10)));
    const minutes = Math.min(59, Math.max(0, Number.parseInt(match[2], 10)));

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }, []);

  const handleTimeUpdate = useCallback(
    (
      key: 'centerOpensAt' | 'centerClosesAt' | 'appointmentOpensAt' | 'appointmentClosesAt',
      value: string,
    ) => {
      const sanitized = sanitizeTime(value);

      if (!sanitized) {
        toast({
          title: 'Formato de hora inválido',
          description: 'Utiliza el formato HH:MM (por ejemplo 09:00).',
          variant: 'destructive',
        });
        if (key === 'centerOpensAt') {
          setOpeningTime(settings?.centerOpensAt ?? '09:00');
        } else if (key === 'centerClosesAt') {
          setClosingTime(settings?.centerClosesAt ?? '21:00');
        } else if (key === 'appointmentOpensAt') {
          setAppointmentOpeningTime(settings?.appointmentOpensAt ?? '09:00');
        } else {
          setAppointmentClosingTime(settings?.appointmentClosesAt ?? '20:00');
        }
        return;
      }

      if (key === 'centerOpensAt' && sanitized === (settings?.centerOpensAt ?? '09:00')) {
        return;
      }

      if (key === 'centerClosesAt' && sanitized === (settings?.centerClosesAt ?? '21:00')) {
        return;
      }

      if (key === 'appointmentOpensAt' && sanitized === (settings?.appointmentOpensAt ?? '09:00')) {
        return;
      }

      if (
        key === 'appointmentClosesAt' &&
        sanitized === (settings?.appointmentClosesAt ?? '20:00')
      ) {
        return;
      }

      updateMutation.mutate(
        { [key]: sanitized },
        {
          onError: () => {
            toast({
              title: 'No se pudo guardar el cambio',
              description: 'Vuelve a intentarlo en unos instantes.',
              variant: 'destructive',
            });
            if (key === 'centerOpensAt') {
              setOpeningTime(settings?.centerOpensAt ?? '09:00');
            } else if (key === 'centerClosesAt') {
              setClosingTime(settings?.centerClosesAt ?? '21:00');
            } else if (key === 'appointmentOpensAt') {
              setAppointmentOpeningTime(settings?.appointmentOpensAt ?? '09:00');
            } else {
              setAppointmentClosingTime(settings?.appointmentClosesAt ?? '20:00');
            }
          },
        },
      );
    },
    [
      sanitizeTime,
      settings?.appointmentClosesAt,
      settings?.appointmentOpensAt,
      settings?.centerClosesAt,
      settings?.centerOpensAt,
      toast,
      updateMutation,
    ],
  );

  const isSaving = updateMutation.isPending;

  const dayVisibilitySummary = useMemo(() => {
    if (settings?.openOnSaturday && settings?.openOnSunday) {
      return 'Abierto de lunes a domingo';
    }
    if (settings?.openOnSaturday) {
      return 'Abierto de lunes a sábado';
    }
    if (settings?.openOnSunday) {
      return 'Abierto de domingo a viernes';
    }
    return 'Abierto de lunes a viernes';
  }, [settings?.openOnSaturday, settings?.openOnSunday]);

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
    return null;
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
            Define los horarios visibles y los permisos para los terapeutas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <section className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <Label className="text-base">Horario de apertura del centro</Label>
                <p className="text-sm text-muted-foreground">
                  Determina el rango horario en el que se mostrarán huecos disponibles en los calendarios.
                </p>
              </div>
              <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-end">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="opening-time" className="text-xs uppercase text-muted-foreground">
                    Apertura
                  </Label>
                  <Input
                    id="opening-time"
                    type="time"
                    step={300}
                    value={openingTime}
                    onChange={(event) => setOpeningTime(event.target.value)}
                    onBlur={() => handleTimeUpdate('centerOpensAt', openingTime)}
                    disabled={isSaving}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="closing-time" className="text-xs uppercase text-muted-foreground">
                    Cierre
                  </Label>
                  <Input
                    id="closing-time"
                    type="time"
                    step={300}
                    value={closingTime}
                    onChange={(event) => setClosingTime(event.target.value)}
                    onBlur={() => handleTimeUpdate('centerClosesAt', closingTime)}
                    disabled={isSaving}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <Label className="text-base">Horario de citas</Label>
                <p className="text-sm text-muted-foreground">
                  Los pacientes solo podrán reservar dentro de este rango. El último turno disponible termina una hora antes del cierre laboral.
                </p>
              </div>
              <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-end">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="appointment-opening-time" className="text-xs uppercase text-muted-foreground">
                    Inicio de citas
                  </Label>
                  <Input
                    id="appointment-opening-time"
                    type="time"
                    step={300}
                    value={appointmentOpeningTime}
                    onChange={(event) => setAppointmentOpeningTime(event.target.value)}
                    onBlur={() => handleTimeUpdate('appointmentOpensAt', appointmentOpeningTime)}
                    disabled={isSaving}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="appointment-closing-time" className="text-xs uppercase text-muted-foreground">
                    Fin de citas
                  </Label>
                  <Input
                    id="appointment-closing-time"
                    type="time"
                    step={300}
                    value={appointmentClosingTime}
                    onChange={(event) => setAppointmentClosingTime(event.target.value)}
                    onBlur={() => handleTimeUpdate('appointmentClosesAt', appointmentClosingTime)}
                    disabled={isSaving}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex items-start justify-between gap-4">
              <div>
                <Label className="text-base">Abrir los sábados</Label>
                <p className="text-sm text-muted-foreground">
                  Activa la visualización de huecos disponibles los sábados en los calendarios.
                </p>
              </div>
              <Switch
                checked={settings?.openOnSaturday ?? false}
                onCheckedChange={(value) => handleToggle('openOnSaturday', value)}
                disabled={isSaving}
                data-testid="switch-open-saturday"
              />
            </div>

            <Separator />

            <div className="flex items-start justify-between gap-4">
              <div>
                <Label className="text-base">Abrir los domingos</Label>
                <p className="text-sm text-muted-foreground">
                  Controla si se muestran huecos en domingo en las vistas mensual y global.
                </p>
              </div>
              <Switch
                checked={settings?.openOnSunday ?? false}
                onCheckedChange={(value) => handleToggle('openOnSunday', value)}
                disabled={isSaving}
                data-testid="switch-open-sunday"
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
                checked={settings?.therapistCanViewOthers ?? false}
                onCheckedChange={(value) => handleToggle('therapistCanViewOthers', value)}
                disabled={isSaving}
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
                checked={settings?.therapistCanEditOthers ?? false}
                onCheckedChange={(value) => handleToggle('therapistCanEditOthers', value)}
                disabled={isSaving}
                data-testid="switch-edit-others"
              />
            </div>
          </section>

          <Separator />

          <div className="rounded-md bg-muted/40 p-4 text-sm text-muted-foreground">
            {dayVisibilitySummary}. Los cambios de horario afectan inmediatamente a las vistas de calendario.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
