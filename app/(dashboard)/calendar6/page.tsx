import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import {
  SAMPLE_APPOINTMENTS,
  STATUS_TRANSLATIONS,
  SAMPLE_THERAPISTS,
  type SampleAppointment,
} from '@/shared/sampleCalendarData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function formatDateTime(date: string, time: string) {
  const parsed = new Date(`${date}T${time}:00`);
  return format(parsed, "EEEE d MMMM '·' HH:mm", { locale: es });
}

function buildTherapistMatrix(appointments: SampleAppointment[]) {
  const totals: Record<string, number> = {};
  const statusCount: Record<string, Record<SampleAppointment['status'], number>> = {};

  appointments.forEach((appointment) => {
    totals[appointment.therapist] = (totals[appointment.therapist] ?? 0) + 1;
    if (!statusCount[appointment.therapist]) {
      statusCount[appointment.therapist] = { confirmada: 0, pendiente: 0, cancelada: 0 };
    }
    statusCount[appointment.therapist][appointment.status] += 1;
  });

  const max = Math.max(...Object.values(totals));

  return { totals, statusCount, max };
}

const STATUS_COLORS: Record<SampleAppointment['status'], string> = {
  confirmada: 'bg-emerald-500',
  pendiente: 'bg-amber-500',
  cancelada: 'bg-rose-500',
};

export default function CalendarSixPage() {
  const { totals, statusCount, max } = buildTherapistMatrix(SAMPLE_APPOINTMENTS);
  const sortedAppointments = [...SAMPLE_APPOINTMENTS].sort((a, b) =>
    `${a.date}T${a.start}`.localeCompare(`${b.date}T${b.start}`),
  );

  return (
    <div className="space-y-10 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Calendario 6 — Indicadores visuales suaves</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Añadimos tarjetas y barras de progreso dibujadas con CSS para comprobar si un refuerzo visual ligero
          provoca bloqueos en la barra lateral.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {SAMPLE_THERAPISTS.map((therapist) => {
          const total = totals[therapist] ?? 0;
          const therapistStatus = statusCount[therapist] ?? {
            confirmada: 0,
            pendiente: 0,
            cancelada: 0,
          };
          const percentage = max === 0 ? 0 : Math.round((total / max) * 100);

          return (
            <Card key={therapist} className="border-border/70">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{therapist}</CardTitle>
                <CardDescription>{total} citas totales</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${percentage}%` }}
                    aria-hidden
                  />
                </div>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {(Object.keys(therapistStatus) as SampleAppointment['status'][]).map((status) => (
                    <li key={status} className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${STATUS_COLORS[status]}`} aria-hidden />
                        {STATUS_TRANSLATIONS[status]}
                      </span>
                      <span>{therapistStatus[status]}</span>
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
                  {STATUS_TRANSLATIONS[appointment.status]}
                </p>
                <p className="text-base font-semibold text-foreground">
                  {appointment.client}
                </p>
                <p className="text-sm text-muted-foreground">
                  {appointment.service} · {appointment.modality}
                </p>
                <p className="text-sm font-medium text-foreground">
                  {formatDateTime(appointment.date, appointment.start)}
                </p>
                <p className="text-xs text-muted-foreground">Sala asignada: {appointment.room}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
