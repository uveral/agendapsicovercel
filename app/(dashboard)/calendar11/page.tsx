'use client';

import { Fragment, useMemo, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { es } from 'date-fns/locale';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDiagnosticCalendarData } from '@/hooks/useDiagnosticCalendarData';
import {
  groupAppointmentsByDate,
  sortAppointmentsByDateTime,
  type NormalizedAppointment,
} from '@/shared/diagnosticCalendarData';

const WEEKDAY_LABELS = Array.from({ length: 7 }, (_, index) => {
  const reference = startOfWeek(new Date(), { weekStartsOn: 1 });
  const day = reference.getTime() + index * 24 * 60 * 60 * 1000;
  return format(day, 'EEE', { locale: es });
});

const STATUS_COLOR_MAP: Record<NormalizedAppointment['status'], string> = {
  confirmed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  cancelled: 'bg-rose-100 text-rose-700 border-rose-200',
};

export default function MonthlyPatientCalendar() {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const { appointments, isLoading, isError, error, source } = useDiagnosticCalendarData();

  const calendarMatrix = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const intervalStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const intervalEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: intervalStart, end: intervalEnd });

    const rows: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      rows.push(days.slice(i, i + 7));
    }
    return rows;
  }, [currentMonth]);

  const appointmentsByDate = useMemo(() => {
    const grouped = groupAppointmentsByDate(sortAppointmentsByDateTime(appointments));
    return grouped;
  }, [appointments]);

  const monthLabel = useMemo(
    () => format(currentMonth, 'MMMM yyyy', { locale: es }),
    [currentMonth],
  );

  const handlePreviousMonth = () => {
    setCurrentMonth((prev) => startOfMonth(addMonths(prev, -1)));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => startOfMonth(addMonths(prev, 1)));
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Calendario mensual</h1>
          <p className="text-muted-foreground">
            Revisa cada día con el detalle de pacientes y horarios asignados.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePreviousMonth}>
            Mes anterior
          </Button>
          <Card className="shadow-none">
            <CardContent className="px-4 py-2 text-center text-sm font-medium uppercase tracking-wide">
              {monthLabel}
            </CardContent>
          </Card>
          <Button variant="outline" onClick={handleNextMonth}>
            Mes siguiente
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg font-semibold">Agenda por día</CardTitle>
          <Badge variant="secondary">Fuente de datos: {source === 'supabase' ? 'Supabase' : 'Datos de muestra'}</Badge>
        </CardHeader>
        <CardContent className="overflow-hidden">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              Cargando citas...
            </div>
          ) : isError ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-center text-sm text-red-600">
              <span>Ocurrió un error al cargar las citas.</span>
              <pre className="max-w-full overflow-auto rounded bg-red-50 p-2 text-xs text-red-800">
                {String(error)}
              </pre>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-7">
              {WEEKDAY_LABELS.map((weekday) => (
                <div
                  key={weekday}
                  className="hidden items-center justify-center rounded border bg-muted px-2 py-1 text-xs font-medium uppercase text-muted-foreground sm:flex"
                >
                  {weekday}
                </div>
              ))}
              {calendarMatrix.map((week, weekIndex) => (
                <Fragment key={weekIndex}>
                  {week.map((day) => {
                    const isoDate = format(day, 'yyyy-MM-dd');
                    const dayAppointments = appointmentsByDate[isoDate] ?? [];
                    const displayAppointments = dayAppointments.slice(0, 8);
                    const extraAppointments = Math.max(0, dayAppointments.length - displayAppointments.length);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isCurrentDay = isToday(day);

                    return (
                      <Card
                        key={isoDate}
                        className={`flex min-h-[180px] flex-col border ${
                          isCurrentMonth ? 'bg-background' : 'bg-muted'
                        }`}
                      >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b px-3 py-2">
                          <div>
                            <span
                              className={`text-sm font-semibold ${
                                isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
                              }`}
                            >
                              {format(day, 'd', { locale: es })}
                            </span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              {format(day, 'EEE', { locale: es })}
                            </span>
                          </div>
                          {isCurrentDay && (
                            <Badge className="text-xs" variant="default">
                              Hoy
                            </Badge>
                          )}
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden px-2 py-2">
                          {displayAppointments.length === 0 ? (
                            <p className="mt-8 text-center text-xs text-muted-foreground">Sin citas</p>
                          ) : (
                            <ScrollArea className="h-full pr-2">
                              <ul className="space-y-1.5">
                                {displayAppointments.map((appointment) => (
                                  <li
                                    key={appointment.id}
                                    className="rounded border border-muted-foreground/20 bg-muted/30 p-2"
                                  >
                                    <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                                      <span>{format(appointment.startDateTime, 'HH:mm')}</span>
                                      <span
                                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${
                                          STATUS_COLOR_MAP[appointment.status]
                                        }`}
                                      >
                                        {appointment.statusLabel}
                                      </span>
                                    </div>
                                    <div className="mt-0.5 truncate text-xs font-semibold leading-tight">
                                      {appointment.clientName}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                              {extraAppointments > 0 && (
                                <p className="mt-2 text-center text-[11px] text-muted-foreground">
                                  +{extraAppointments} más
                                </p>
                              )}
                            </ScrollArea>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
