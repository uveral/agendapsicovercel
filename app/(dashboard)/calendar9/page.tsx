'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { useDiagnosticCalendarData } from '@/hooks/useDiagnosticCalendarData';
import {
  buildDailySummaries,
  computeStatusSummary,
  sortAppointmentsByDateTime,
  STATUS_LABELS_ES,
  type NormalizedAppointment,
} from '@/shared/diagnosticCalendarData';

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatLong(date: Date) {
  return format(date, "EEEE d 'de' MMMM", { locale: es });
}

function formatTimeRange(appointment: NormalizedAppointment) {
  return `${appointment.startTime} – ${appointment.endTime}`;
}

export default function CalendarNinePage() {
  const { appointments, source } = useDiagnosticCalendarData();
  const sortedAppointments = useMemo(() => sortAppointmentsByDateTime(appointments), [appointments]);

  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, NormalizedAppointment[]>();
    sortedAppointments.forEach((appointment) => {
      const key = appointment.date;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(appointment);
    });
    return map;
  }, [sortedAppointments]);

  const busyDates = useMemo(
    () => Array.from(appointmentsByDate.keys()).map((date) => new Date(`${date}T00:00:00`)),
    [appointmentsByDate],
  );

  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  useEffect(() => {
    if (sortedAppointments.length === 0) return;
    if (!selectedDate) {
      setSelectedDate(sortedAppointments[0].startDateTime);
      return;
    }
    const key = toDateKey(selectedDate);
    if (!appointmentsByDate.has(key)) {
      setSelectedDate(sortedAppointments[0].startDateTime);
    }
  }, [sortedAppointments, selectedDate, appointmentsByDate]);

  const selectedKey = selectedDate ? toDateKey(selectedDate) : null;
  const selectedAppointments = useMemo(() => {
    if (!selectedKey) return [] as NormalizedAppointment[];
    return appointmentsByDate.get(selectedKey) ?? [];
  }, [appointmentsByDate, selectedKey]);

  const selectedSummary = useMemo(() => computeStatusSummary(selectedAppointments), [selectedAppointments]);
  const dailySummaries = useMemo(() => buildDailySummaries(sortedAppointments), [sortedAppointments]);

  return (
    <div className="space-y-8 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Calendario 9 — Selección por calendario</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Incorporamos el componente de calendario mensual para seleccionar fechas y revisar el detalle diario. Esta vista
          nos ayuda a detectar si el picker es el origen de los bloqueos.
        </p>
        <Badge variant={source === 'supabase' ? 'default' : 'secondary'}>
          Fuente de datos: {source === 'supabase' ? 'Supabase' : 'Datos de ejemplo'}
        </Badge>
      </header>

      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <Card className="border-border/70">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Selecciona una fecha</CardTitle>
            <CardDescription>Los días con citas se resaltan automáticamente.</CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              locale={es}
              modifiers={{ busy: busyDates }}
              modifiersClassNames={{
                busy: 'bg-primary/20 text-primary-foreground border border-primary',
              }}
            />
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Detalle del día</CardTitle>
            <CardDescription>
              {selectedDate ? formatLong(selectedDate) : 'Selecciona un día con citas para ver el detalle.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay citas registradas para la fecha seleccionada.</p>
            ) : (
              <div className="space-y-3">
                {selectedAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{appointment.clientName}</p>
                        <p className="text-xs text-muted-foreground">{appointment.therapistName}</p>
                      </div>
                      <Badge variant="secondary">{STATUS_LABELS_ES[appointment.status]}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{formatTimeRange(appointment)}</p>
                    {appointment.notes ? (
                      <p className="mt-1 text-xs text-muted-foreground">Notas: {appointment.notes}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <p>Total: {selectedSummary.total}</p>
              <p>Confirmadas: {selectedSummary.confirmed}</p>
              <p>Pendientes: {selectedSummary.pending}</p>
              <p>Canceladas: {selectedSummary.cancelled}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70">
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg">Resumen cronológico</CardTitle>
          <CardDescription>Distribución de citas por día para las próximas jornadas registradas.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {dailySummaries.map(({ date, summary }) => (
            <div key={date} className="rounded-md border border-border/70 bg-background p-4">
              <p className="text-sm font-semibold text-foreground">{formatLong(new Date(`${date}T00:00:00`))}</p>
              <p className="text-xs text-muted-foreground">Total: {summary.total}</p>
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                <p>Confirmadas: {summary.confirmed}</p>
                <p>Pendientes: {summary.pending}</p>
                <p>Canceladas: {summary.cancelled}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

