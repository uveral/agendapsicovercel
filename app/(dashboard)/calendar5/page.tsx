'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  computeStatusSummary,
  groupAppointmentsByDate,
  sortAppointmentsByDateTime,
  STATUS_LABELS_ES,
  type NormalizedAppointment,
  type StatusSummary,
} from '@/shared/diagnosticCalendarData';
import { useDiagnosticCalendarData } from '@/hooks/useDiagnosticCalendarData';

function formatDateLabel(date: string) {
  const parsed = new Date(date);
  return format(parsed, "EEEE d 'de' MMMM", { locale: es });
}

function formatTimeRange(appointment: NormalizedAppointment) {
  return `${appointment.startTime}–${appointment.endTime}`;
}

function formatDuration(appointment: NormalizedAppointment) {
  if (!appointment.durationMinutes) return 'Sin estimar';
  return `${appointment.durationMinutes} minutos`;
}

function SummaryList({ summary }: { summary: StatusSummary }) {
  return (
    <dl className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <dt className="font-medium text-foreground">Total de citas</dt>
        <dd>{summary.total}</dd>
      </div>
      <div>
        <dt className="font-medium text-foreground">Confirmadas</dt>
        <dd>{summary.confirmed}</dd>
      </div>
      <div>
        <dt className="font-medium text-foreground">Pendientes</dt>
        <dd>{summary.pending}</dd>
      </div>
      <div>
        <dt className="font-medium text-foreground">Canceladas</dt>
        <dd>{summary.cancelled}</dd>
      </div>
    </dl>
  );
}

export default function CalendarFivePage() {
  const { appointments, isLoading, isError, error, source } = useDiagnosticCalendarData();

  const sortedAppointments = useMemo(() => sortAppointmentsByDateTime(appointments), [appointments]);
  const appointmentsByDate = useMemo(
    () => groupAppointmentsByDate(sortedAppointments),
    [sortedAppointments],
  );
  const summary = useMemo(() => computeStatusSummary(sortedAppointments), [sortedAppointments]);

  const errorMessage =
    isError && error instanceof Error
      ? error.message
      : isError
        ? 'No se pudieron obtener los datos de Supabase.'
        : null;

  return (
    <div className="space-y-10 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Calendario 5 — Visión en texto</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Esta versión lista cada cita como bloques de texto simples utilizando los datos en vivo de Supabase. Si la
          conexión falla, se recurre automáticamente al conjunto de muestra para mantener la referencia visual.
        </p>
        <Badge variant={source === 'supabase' ? 'default' : 'secondary'}>
          Fuente de datos: {source === 'supabase' ? 'Supabase' : 'Datos de ejemplo'}
        </Badge>
      </header>

      {isLoading ? (
        <div className="space-y-3 rounded-lg border border-dashed border-muted-foreground/40 p-6 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Cargando agenda textual…</p>
          <p>Estamos preparando la lista completa de citas para mostrarla en formato puramente textual.</p>
        </div>
      ) : null}

      {errorMessage ? (
        <Alert variant="destructive">
          <AlertTitle>Error al recuperar citas</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Resumen textual</h2>
        <SummaryList summary={summary} />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Agenda detallada</h2>
        <div className="space-y-6">
          {Object.entries(appointmentsByDate).map(([date, dayAppointments]) => (
            <article key={date} className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground">
                {formatDateLabel(date)} ({dayAppointments.length} citas)
              </h3>
              <div className="space-y-4 text-sm">
                {dayAppointments.map((appointment) => (
                  <div key={appointment.id} className="space-y-1 rounded-md border border-border p-4">
                    <p>
                      <span className="font-semibold">Horario:</span> {formatTimeRange(appointment)} —{' '}
                      <span className="font-semibold">Duración:</span> {formatDuration(appointment)}
                    </p>
                    <p>
                      <span className="font-semibold">Terapeuta:</span> {appointment.therapistName}
                      {appointment.therapistSpecialty ? ` · ${appointment.therapistSpecialty}` : ''}
                    </p>
                    <p>
                      <span className="font-semibold">Cliente:</span> {appointment.clientName}
                      {appointment.clientEmail ? ` (${appointment.clientEmail})` : ''}
                    </p>
                    <p>
                      <span className="font-semibold">Estado:</span> {STATUS_LABELS_ES[appointment.status]}
                    </p>
                    {appointment.frequency ? (
                      <p>
                        <span className="font-semibold">Frecuencia:</span> {appointment.frequency}
                      </p>
                    ) : null}
                    {appointment.pendingReason ? (
                      <p>
                        <span className="font-semibold">Motivo pendiente:</span> {appointment.pendingReason}
                      </p>
                    ) : null}
                    {appointment.notes ? (
                      <p>
                        <span className="font-semibold">Notas:</span> {appointment.notes}
                      </p>
                    ) : null}
                    {appointment.modality ? (
                      <p>
                        <span className="font-semibold">Modalidad:</span> {appointment.modality}
                      </p>
                    ) : null}
                    {appointment.room ? (
                      <p>
                        <span className="font-semibold">Sala:</span> {appointment.room}
                      </p>
                    ) : null}
                    {appointment.service ? (
                      <p>
                        <span className="font-semibold">Servicio:</span> {appointment.service}
                      </p>
                    ) : null}
                    {appointment.optimizationScore !== null && appointment.optimizationScore !== undefined ? (
                      <p>
                        <span className="font-semibold">Índice de optimización:</span> {appointment.optimizationScore}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Profesionales implicados</h2>
        <p className="text-sm text-muted-foreground">
          Terapeutas que participan en esta selección de citas ordenados por aparición cronológica.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {sortedAppointments.map((appointment) => (
            <li key={`${appointment.date}-${appointment.startTime}-${appointment.id}`}>
              {appointment.therapistName} — {STATUS_LABELS_ES[appointment.status]}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

