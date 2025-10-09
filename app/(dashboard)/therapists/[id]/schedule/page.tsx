'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';
import type { Therapist, TherapistWorkingHours } from '@/lib/types';
import { workingHoursToUiSlots } from '@/lib/therapistSchedule';

const DAY_NAMES = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];

export default function TherapistSchedulePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: therapist } = useQuery<Therapist>({
    queryKey: [`/api/therapists/${id}`],
  });

  const {
    data: schedule = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<TherapistWorkingHours[]>({
    queryKey: [`/api/therapists/${id}/schedule`],
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: 'always',
    refetchOnReconnect: 'always',
  });

  const normalizedSchedule = useMemo(
    () => workingHoursToUiSlots(schedule),
    [schedule],
  );

  const groupedByDay = useMemo(() => {
    return DAY_NAMES.map((label, index) => ({
      label,
      slots: normalizedSchedule.filter((slot) => slot.dayOfWeek === index),
    }));
  }, [normalizedSchedule]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Cargando horarios...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Gestionar horarios</h1>
          <p className="text-muted-foreground">{therapist?.name}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Horarios de trabajo</CardTitle>
          <CardDescription>
            Consulta los bloques configurados para cada día laborable. Utiliza la vista principal de terapeutas para editar los horarios.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isError ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-destructive/50 p-6 text-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <div className="text-sm text-destructive">
                {error instanceof Error ? error.message : 'No se pudieron cargar los horarios.'}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reintentar
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              {groupedByDay.map(({ label, slots }) => (
                <div key={label} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{label}</span>
                    <span className="text-xs text-muted-foreground">
                      {slots.length === 0
                        ? 'Sin horarios configurados'
                        : `${slots.length} bloque${slots.length > 1 ? 's' : ''}`}
                    </span>
                  </div>
                  {slots.length > 0 && (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {slots.map((slot, index) => (
                        <div
                          key={`${label}-${index}-${slot.startTime}-${slot.endTime}`}
                          className="rounded-md border bg-muted/30 p-3 text-sm"
                        >
                          <div className="font-medium">{slot.startTime} - {slot.endTime}</div>
                          <div className="text-xs text-muted-foreground">Bloque #{index + 1}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {normalizedSchedule.length === 0 && !isError && (
                <div className="text-center py-8 text-muted-foreground">
                  No hay horarios configurados para este terapeuta.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
