'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDiagnosticCalendarData } from '@/hooks/useDiagnosticCalendarData';
import {
  computeStatusSummary,
  getStatusOrder,
  getUniqueTherapists,
  STATUS_LABELS_ES,
  type NormalizedAppointment,
} from '@/shared/diagnosticCalendarData';

function formatDate(appointment: NormalizedAppointment) {
  return format(appointment.startDateTime, "d MMM yyyy", { locale: es });
}

function formatTime(appointment: NormalizedAppointment) {
  return `${appointment.startTime} – ${appointment.endTime}`;
}

export default function CalendarEightPage() {
  const { appointments, source } = useDiagnosticCalendarData();
  const therapistOptions = useMemo(() => getUniqueTherapists(appointments), [appointments]);

  const [therapistFilter, setTherapistFilter] = useState<'all' | string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | NormalizedAppointment['status']>('all');

  const filteredAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      const therapistMatches = therapistFilter === 'all' || appointment.therapistId === therapistFilter;
      const statusMatches = statusFilter === 'all' || appointment.status === statusFilter;
      return therapistMatches && statusMatches;
    });
  }, [appointments, statusFilter, therapistFilter]);

  const summary = useMemo(() => computeStatusSummary(filteredAppointments), [filteredAppointments]);

  return (
    <div className="space-y-8 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Calendario 8 — Controles interactivos</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Esta vista introduce filtros por terapeuta y estado sobre una tabla accesible. Permite identificar si los
          selectores o la lógica de filtrado afectan a la barra lateral.
        </p>
        <Badge variant={source === 'supabase' ? 'default' : 'secondary'}>
          Fuente de datos: {source === 'supabase' ? 'Supabase' : 'Datos de ejemplo'}
        </Badge>
      </header>

      <Card className="border-border/70">
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg">Filtros rápidos</CardTitle>
          <CardDescription>Selecciona terapeuta y estado para ajustar la tabla inferior.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-muted-foreground">Terapeuta</label>
            <Select value={therapistFilter} onValueChange={(value) => setTherapistFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los terapeutas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los terapeutas</SelectItem>
                {therapistOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-muted-foreground">Estado</label>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {getStatusOrder().map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_LABELS_ES[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-muted-foreground">Totales filtrados</label>
            <div className="rounded-md border border-dashed border-border/70 bg-muted/30 p-4 text-sm">
              <p>Total: {summary.total}</p>
              <p>Confirmadas: {summary.confirmed}</p>
              <p>Pendientes: {summary.pending}</p>
              <p>Canceladas: {summary.cancelled}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg">Listado de citas</CardTitle>
          <CardDescription>
            Cada fila representa una cita. Revisa cómo responde la tabla al aplicar filtros dinámicos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[480px] rounded-md border border-dashed border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Horario</TableHead>
                  <TableHead>Terapeuta</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAppointments.map((appointment) => (
                  <TableRow key={appointment.id} className="hover:bg-muted/40">
                    <TableCell className="font-medium text-foreground">{formatDate(appointment)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatTime(appointment)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">{appointment.therapistName}</span>
                        {appointment.therapistSpecialty ? (
                          <span className="text-xs text-muted-foreground">{appointment.therapistSpecialty}</span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">{appointment.clientName}</span>
                        {appointment.clientEmail ? (
                          <span className="text-xs text-muted-foreground">{appointment.clientEmail}</span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{STATUS_LABELS_ES[appointment.status]}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate text-muted-foreground">
                      {appointment.notes ?? 'Sin notas'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
          <Separator className="my-4" />
          <p className="text-sm text-muted-foreground">
            Resultados mostrados: {filteredAppointments.length} de {appointments.length} registros totales.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

