import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import {
  SAMPLE_APPOINTMENTS,
  STATUS_TRANSLATIONS,
  SAMPLE_THERAPISTS,
  type SampleAppointment,
} from '@/shared/sampleCalendarData';

function groupByDate(appointments: SampleAppointment[]): Record<string, SampleAppointment[]> {
  return appointments.reduce<Record<string, SampleAppointment[]>>((acc, appointment) => {
    if (!acc[appointment.date]) {
      acc[appointment.date] = [];
    }
    acc[appointment.date].push(appointment);
    return acc;
  }, {});
}

function formatDateLabel(date: string) {
  const parsed = new Date(date);
  return format(parsed, "EEEE d 'de' MMMM", { locale: es });
}

function getStatusSummary(appointments: SampleAppointment[]) {
  return appointments.reduce(
    (acc, appointment) => {
      acc.total += 1;
      acc[appointment.status] += 1;
      return acc;
    },
    { total: 0, confirmada: 0, pendiente: 0, cancelada: 0 },
  );
}

export default function CalendarFivePage() {
  const sortedAppointments = [...SAMPLE_APPOINTMENTS].sort((a, b) => {
    if (a.date === b.date) {
      return a.start.localeCompare(b.start);
    }
    return a.date.localeCompare(b.date);
  });

  const appointmentsByDate = groupByDate(sortedAppointments);
  const summary = getStatusSummary(sortedAppointments);

  return (
    <div className="space-y-10 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Calendario 5 — Visión en texto</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Esta versión lista cada cita como bloques de texto simples. Utiliza los mismos datos de ejemplo que
          las demás vistas y nos permite descartar cualquier componente visual como posible causa de bloqueos.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Resumen textual</h2>
        <dl className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="font-medium text-foreground">Total de citas</dt>
            <dd>{summary.total}</dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Confirmadas</dt>
            <dd>{summary.confirmada}</dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Pendientes</dt>
            <dd>{summary.pendiente}</dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Canceladas</dt>
            <dd>{summary.cancelada}</dd>
          </div>
        </dl>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Agenda detallada</h2>
        <div className="space-y-6">
          {Object.entries(appointmentsByDate).map(([date, appointments]) => (
            <article key={date} className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground">
                {formatDateLabel(date)} ({appointments.length} citas)
              </h3>
              <div className="space-y-4 text-sm">
                {appointments.map((appointment) => (
                  <div key={appointment.id} className="space-y-1 rounded-md border border-border p-4">
                    <p>
                      <span className="font-semibold">Horario:</span> {appointment.start}–{appointment.end} —{' '}
                      <span className="font-semibold">Modalidad:</span> {appointment.modality}
                    </p>
                    <p>
                      <span className="font-semibold">Terapeuta:</span> {appointment.therapist}
                    </p>
                    <p>
                      <span className="font-semibold">Cliente:</span> {appointment.client}
                    </p>
                    <p>
                      <span className="font-semibold">Servicio:</span> {appointment.service}
                    </p>
                    <p>
                      <span className="font-semibold">Sala:</span> {appointment.room}
                    </p>
                    <p>
                      <span className="font-semibold">Estado:</span> {STATUS_TRANSLATIONS[appointment.status]}
                    </p>
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
          Terapeutas que participan en esta selección de citas:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {SAMPLE_THERAPISTS.map((therapist) => (
            <li key={therapist}>{therapist}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
