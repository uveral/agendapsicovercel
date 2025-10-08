'use client';

import { useMemo } from 'react';
import { FixedSizeList as List, type ListChildComponentProps } from 'react-window';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useDiagnosticCalendarData } from '@/hooks/useDiagnosticCalendarData';
import {
  buildTherapistSummary,
  computeStatusSummary,
  getStatusOrder,
  sortAppointmentsByDateTime,
  STATUS_LABELS_ES,
  type NormalizedAppointment,
  type TherapistSummary,
} from '@/shared/diagnosticCalendarData';

function formatRowTime(appointment: NormalizedAppointment) {
  return format(appointment.startDateTime, "d MMM yyyy — HH:mm", { locale: es });
}

function VirtualizedRow({
  index,
  style,
  data,
}: ListChildComponentProps<NormalizedAppointment[]>) {
  const appointment = data[index];
  return (
    <div style={style} className="flex h-full items-center border-b border-border/60 bg-background px-4">
      <div className="flex-1 space-y-1">
        <p className="text-sm font-semibold text-foreground">{appointment.clientName}</p>
        <p className="text-xs text-muted-foreground">
          {formatRowTime(appointment)} · {appointment.therapistName}
        </p>
        {appointment.notes ? (
          <p className="text-xs text-muted-foreground">Notas: {appointment.notes}</p>
        ) : null}
      </div>
      <Badge variant="secondary">{STATUS_LABELS_ES[appointment.status]}</Badge>
    </div>
  );
}

export default function CalendarTenPage() {
  const { appointments, source } = useDiagnosticCalendarData();
  const sortedAppointments = useMemo(() => sortAppointmentsByDateTime(appointments), [appointments]);
  const statusSummary = useMemo(() => computeStatusSummary(sortedAppointments), [sortedAppointments]);
  const therapistSummary = useMemo(() => buildTherapistSummary(sortedAppointments), [sortedAppointments]);

  return (
    <div className="space-y-8 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Calendario 10 — Lista virtualizada</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Esta versión utiliza virtualización con react-window para renderizar grandes volúmenes de citas sin afectar al
          rendimiento. Permite comprobar si el motor de listas es responsable del bloqueo lateral.
        </p>
        <Badge variant={source === 'supabase' ? 'default' : 'secondary'}>
          Fuente de datos: {source === 'supabase' ? 'Supabase' : 'Datos de ejemplo'}
        </Badge>
      </header>

      <Card className="border-border/70">
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg">Agenda continua</CardTitle>
          <CardDescription>
            La lista virtualizada mantiene el desplazamiento fluido incluso con decenas de entradas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No se encontraron citas para mostrar.</p>
          ) : (
            <div className="h-[480px] overflow-hidden rounded-lg border border-dashed border-border/70">
              <List
                height={480}
                itemCount={sortedAppointments.length}
                itemSize={96}
                width="100%"
                itemData={sortedAppointments}
              >
                {VirtualizedRow}
              </List>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/70">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Estado general</CardTitle>
            <CardDescription>Recuento total de citas según su estado actual.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {getStatusOrder().map((status) => (
                <div
                  key={status}
                  className="flex min-w-[140px] flex-col gap-1 rounded-md border border-border/60 bg-muted/20 p-3"
                >
                  <span className="text-sm font-semibold text-foreground">{STATUS_LABELS_ES[status]}</span>
                  <span className="text-2xl font-bold text-foreground">{statusSummary[status]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Carga por terapeuta</CardTitle>
            <CardDescription>Comparativa directa usando los datos virtualizados.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {therapistSummary.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin terapeutas registrados para esta muestra.</p>
            ) : (
              therapistSummary.map((summary: TherapistSummary) => (
                <div key={summary.therapistId} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">{summary.therapistName}</p>
                    <span className="text-sm text-muted-foreground">{summary.summary.total} citas</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <span>Conf.: {summary.summary.confirmed}</span>
                    <span>Pen.: {summary.summary.pending}</span>
                    <span>Can.: {summary.summary.cancelled}</span>
                  </div>
                  <Separator className="my-2" />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

