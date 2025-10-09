'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDiagnosticCalendarData } from '@/hooks/useDiagnosticCalendarData';
import {
  buildTherapistSummary,
  computeStatusSummary,
  getStatusOrder,
  sortAppointmentsByDateTime,
  STATUS_LABELS_ES,
  type NormalizedAppointment,
} from '@/shared/diagnosticCalendarData';

function formatDateTime(appointment: NormalizedAppointment) {
  return format(appointment.startDateTime, "EEEE d MMMM '·' HH:mm", { locale: es });
}

const STATUS_COLORS: Record<NormalizedAppointment['status'], string> = {
  confirmed: 'bg-emerald-500',
  pending: 'bg-amber-500',
  cancelled: 'bg-rose-500',
};

export default function CalendarSixPage() {
  const { appointments, source } = useDiagnosticCalendarData();

  const sortedAppointments = useMemo(() => sortAppointmentsByDateTime(appointments), [appointments]);
  const therapistSummaries = useMemo(() => buildTherapistSummary(sortedAppointments), [sortedAppointments]);
  const globalSummary = useMemo(() => computeStatusSummary(sortedAppointments), [sortedAppointments]);
  const maxAppointments = useMemo(
    () => therapistSummaries.reduce((max, item) => Math.max(max, item.summary.total), 0),
    [therapistSummaries],
  );

  return (
    <div className="space-y-10 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Calendario 6 — Indicadores visuales suaves</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Añadimos tarjetas y barras de progreso dibujadas con CSS para comprobar si un refuerzo visual ligero provoca
          bloqueos en la barra lateral.
        </p>
        <Badge variant={source === 'supabase' ? 'default' : 'secondary'}>
          Fuente de datos: {source === 'supabase' ? 'Supabase' : 'Datos de ejemplo'}
        </Badge>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {therapistSummaries.map((summary) => {
          const percentage = maxAppointments === 0 ? 0 : Math.round((summary.summary.total / maxAppointments) * 100);
          return (
            <Card key={summary.therapistId} className="border-border/70">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{summary.therapistName}</CardTitle>
                <CardDescription>
                  {summary.summary.total} citas totales{summary.specialty ? ` · ${summary.specialty}` : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-2 w-full rounded-full bg-muted" role="presentation">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${percentage}%` }}
                    aria-hidden
                  />
                </div>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {getStatusOrder().map((status) => (
                    <li key={status} className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${STATUS_COLORS[status]}`} aria-hidden />
                        {STATUS_LABELS_ES[status]}
                      </span>
                      <span>{summary.summary[status]}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="space-y-4">
        <header className="space-y-1">
          <h2 className="text-xl font-semibold">Cronología compacta</h2>
          <p className="text-sm text-muted-foreground">
            Presentamos la misma información de agenda en una tira temporal con marcas visuales mínimas.
          </p>
        </header>
        <div className="relative overflow-hidden rounded-lg border border-dashed border-border/70 bg-muted/30 p-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sortedAppointments.map((appointment) => (
              <div key={appointment.id} className="space-y-2 rounded-md bg-background p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {STATUS_LABELS_ES[appointment.status]}
                </p>
                <p className="text-base font-semibold text-foreground">{appointment.clientName}</p>
                <p className="text-sm text-muted-foreground">
                  {appointment.therapistName}
                  {appointment.therapistSpecialty ? ` · ${appointment.therapistSpecialty}` : ''}
                </p>
                <p className="text-sm font-medium text-foreground">{formatDateTime(appointment)}</p>
                <p className="text-xs text-muted-foreground">
                  Duración estimada: {appointment.durationMinutes ? `${appointment.durationMinutes} min` : 'Sin estimar'}
                </p>
                {appointment.notes ? (
                  <p className="text-xs text-muted-foreground">Notas: {appointment.notes}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Resumen global</h2>
        <p className="text-sm text-muted-foreground">
          Este bloque resume la distribución total de estados con la misma lógica que las tarjetas por terapeuta.
        </p>
        <div className="flex flex-wrap gap-4">
          {getStatusOrder().map((status) => (
            <div key={status} className="flex items-center gap-3 rounded-md border border-border/70 bg-background px-4 py-3">
              <span className={`h-3 w-3 rounded-full ${STATUS_COLORS[status]}`} aria-hidden />
              <span className="text-sm font-medium text-foreground">{STATUS_LABELS_ES[status]}</span>
              <span className="text-sm text-muted-foreground">{globalSummary[status]}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

