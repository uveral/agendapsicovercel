'use client';

import Image from 'next/image';
import { useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDiagnosticCalendarData } from '@/hooks/useDiagnosticCalendarData';
import {
  sortAppointmentsByDateTime,
  STATUS_LABELS_ES,
  type NormalizedAppointment,
} from '@/shared/diagnosticCalendarData';

const MEDIA_CAROUSEL = [
  {
    id: 'media-1',
    title: 'Resumen operativo',
    description: 'Un vistazo visual al volumen de sesiones programadas en la semana.',
  },
  {
    id: 'media-2',
    title: 'Ambiente de trabajo',
    description: 'Ilustración genérica que representa las salas preparadas para las citas.',
  },
];

function formatBlock(appointment: NormalizedAppointment) {
  const startLabel = format(appointment.startDateTime, "EEEE d MMMM, HH:mm", { locale: es });
  const endLabel = format(appointment.endDateTime, 'HH:mm', { locale: es });
  return `${startLabel} – ${endLabel}`;
}

function resolveSubtitle(appointment: NormalizedAppointment) {
  if (appointment.service) return appointment.service;
  if (appointment.notes) return appointment.notes;
  if (appointment.therapistSpecialty) return appointment.therapistSpecialty;
  return 'Sesión programada';
}

function resolveDetail(appointment: NormalizedAppointment) {
  if (appointment.modality) return `Modalidad: ${appointment.modality}`;
  if (appointment.frequency) return `Frecuencia: ${appointment.frequency}`;
  if (appointment.durationMinutes) return `Duración: ${appointment.durationMinutes} minutos`;
  return 'Sin detalles adicionales';
}

export default function CalendarSevenPage() {
  const { appointments, source } = useDiagnosticCalendarData();
  const sorted = useMemo(() => sortAppointmentsByDateTime(appointments), [appointments]);

  return (
    <div className="space-y-10 p-6">
      <header className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">Calendario 7 — Narrativa multimedia</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Esta versión añade un soporte multimedia ligero (imágenes ilustrativas) para validar si la carga de recursos
            externos genera bloqueos en la barra lateral. Toda la información de las citas sigue siendo accesible junto a
            cada pieza visual.
          </p>
          <Badge variant={source === 'supabase' ? 'default' : 'secondary'}>
            Fuente de datos: {source === 'supabase' ? 'Supabase' : 'Datos de ejemplo'}
          </Badge>
        </div>
        <figure className="relative aspect-[5/3] overflow-hidden rounded-xl border border-border/70 bg-muted">
          <Image
            src="/calendar-media-placeholder.svg"
            alt="Ilustración genérica de calendario"
            fill
            className="object-cover"
            priority
          />
        </figure>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        {sorted.map((appointment) => (
          <Card key={appointment.id} className="overflow-hidden border-border/70">
            <CardHeader className="space-y-1 border-b border-border/60 bg-muted/40">
              <CardTitle className="text-lg">{appointment.clientName}</CardTitle>
              <p className="text-sm text-muted-foreground">{resolveSubtitle(appointment)}</p>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="space-y-2 text-sm">
                <p className="font-medium text-foreground">{formatBlock(appointment)}</p>
                <p>
                  Profesional:{' '}
                  <span className="font-medium text-foreground">{appointment.therapistName}</span>
                </p>
                <p>{resolveDetail(appointment)}</p>
                <p>
                  Estado:{' '}
                  <span className="font-medium text-foreground">{STATUS_LABELS_ES[appointment.status]}</span>
                </p>
              </div>
              <figure className="relative aspect-video overflow-hidden rounded-lg border border-border/60 bg-muted">
                <Image
                  src="/calendar-media-placeholder.svg"
                  alt={`Vista previa para ${appointment.therapistName}`}
                  fill
                  className="object-cover"
                />
                <figcaption className="absolute bottom-2 left-2 rounded bg-background/80 px-2 py-1 text-xs font-medium text-foreground shadow">
                  {appointment.therapistName}
                </figcaption>
              </figure>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Galería de contexto</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {MEDIA_CAROUSEL.map((media) => (
            <figure key={media.id} className="space-y-2 rounded-xl border border-border/70 bg-background p-4 shadow-sm">
              <div className="relative aspect-[5/3] overflow-hidden rounded-lg bg-muted">
                <Image src="/calendar-media-placeholder.svg" alt={media.title} fill className="object-cover" />
              </div>
              <figcaption>
                <p className="text-sm font-semibold text-foreground">{media.title}</p>
                <p className="text-xs text-muted-foreground">{media.description}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    </div>
  );
}

