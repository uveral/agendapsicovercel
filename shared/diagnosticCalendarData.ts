import { differenceInMinutes, parseISO } from 'date-fns';

import type { Appointment, Therapist, User } from '@/lib/types';
import type { SampleAppointment } from '@/shared/sampleCalendarData';

export type ApiAppointmentRecord = Appointment & {
  therapist?: Partial<Therapist> | null;
  client?: Partial<User> | null;
};

export type NormalizedAppointment = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  startDateTime: Date;
  endDateTime: Date;
  status: 'pending' | 'confirmed' | 'cancelled';
  statusLabel: string;
  therapistId: string;
  therapistName: string;
  therapistColor?: string | null;
  therapistSpecialty?: string | null;
  clientId: string;
  clientName: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  notes?: string | null;
  frequency?: string | null;
  durationMinutes?: number | null;
  pendingReason?: string | null;
  optimizationScore?: number | null;
  modality?: string | null;
  room?: string | null;
  service?: string | null;
  source: 'supabase' | 'sample';
};

export type StatusSummary = {
  total: number;
  confirmed: number;
  pending: number;
  cancelled: number;
};

export type TherapistSummary = {
  therapistId: string;
  therapistName: string;
  color?: string | null;
  specialty?: string | null;
  summary: StatusSummary;
};

export const STATUS_LABELS_ES: Record<NormalizedAppointment['status'], string> = {
  confirmed: 'Confirmada',
  pending: 'Pendiente',
  cancelled: 'Cancelada',
};

const SAMPLE_STATUS_MAP: Record<SampleAppointment['status'], NormalizedAppointment['status']> = {
  confirmada: 'confirmed',
  pendiente: 'pending',
  cancelada: 'cancelled',
};

const STATUS_ORDER: NormalizedAppointment['status'][] = ['confirmed', 'pending', 'cancelled'];

function sanitizeTime(time: string | null | undefined): string {
  if (!time) return '00:00';
  const trimmed = time.trim();
  if (trimmed.length === 5) {
    return `${trimmed}:00`;
  }
  return trimmed;
}

function combineDateAndTime(date: string, time: string): Date {
  const sanitized = sanitizeTime(time);
  const isoCandidate = `${date}T${sanitized}`;
  const parsed = new Date(isoCandidate);
  if (Number.isNaN(parsed.getTime())) {
    const fallback = parseISO(date);
    if (Number.isNaN(fallback.getTime())) {
      return new Date();
    }
    return fallback;
  }
  return parsed;
}

function resolveDurationMinutes(start: Date, end: Date, fallback?: number | null): number | null {
  if (fallback && Number.isFinite(fallback)) {
    return fallback;
  }
  const minutes = differenceInMinutes(end, start);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : null;
}

function buildClientName(client: Partial<User> | null | undefined): string {
  if (!client) return 'Cliente sin nombre';
  const parts = [client.firstName, client.lastName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part && part.length > 0));
  if (parts.length > 0) {
    return parts.join(' ');
  }
  if (client.email) {
    return client.email.split('@')[0] ?? client.email;
  }
  return 'Cliente sin nombre';
}

function buildTherapistName(therapist: Partial<Therapist> | null | undefined): string {
  if (!therapist) return 'Terapeuta sin asignar';
  return therapist.name?.trim() ?? 'Terapeuta sin asignar';
}

function slugifyId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export function normalizeSupabaseAppointments(records: ApiAppointmentRecord[]): NormalizedAppointment[] {
  return records.map((appointment) => {
    const startDateTime = combineDateAndTime(String(appointment.date), appointment.startTime);
    const endDateTime = combineDateAndTime(String(appointment.date), appointment.endTime);
    const therapistName = buildTherapistName(appointment.therapist ?? null);
    const clientName = buildClientName(appointment.client ?? null);
    const durationMinutes = resolveDurationMinutes(startDateTime, endDateTime, appointment.durationMinutes);

    return {
      id: appointment.id,
      date: String(appointment.date),
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      startDateTime,
      endDateTime,
      status: appointment.status,
      statusLabel: STATUS_LABELS_ES[appointment.status],
      therapistId: appointment.therapistId ?? slugifyId(therapistName),
      therapistName,
      therapistColor: appointment.therapist?.color ?? null,
      therapistSpecialty: appointment.therapist?.specialty ?? null,
      clientId: appointment.clientId ?? slugifyId(clientName),
      clientName,
      clientEmail: appointment.client?.email ?? null,
      clientPhone: appointment.client?.phone ?? null,
      notes: appointment.notes ?? null,
      frequency: appointment.frequency ?? null,
      durationMinutes,
      pendingReason: appointment.pendingReason ?? null,
      optimizationScore: appointment.optimizationScore ?? null,
      modality: null,
      room: null,
      service: null,
      source: 'supabase',
    } satisfies NormalizedAppointment;
  });
}

export function normalizeSampleAppointments(records: SampleAppointment[]): NormalizedAppointment[] {
  return records.map((appointment) => {
    const startDateTime = combineDateAndTime(appointment.date, appointment.start);
    const endDateTime = combineDateAndTime(appointment.date, appointment.end);
    const durationMinutes = resolveDurationMinutes(startDateTime, endDateTime, null);
    const status = SAMPLE_STATUS_MAP[appointment.status];
    const therapistId = slugifyId(appointment.therapist);
    const clientId = slugifyId(appointment.client);

    return {
      id: appointment.id,
      date: appointment.date,
      startTime: appointment.start,
      endTime: appointment.end,
      startDateTime,
      endDateTime,
      status,
      statusLabel: STATUS_LABELS_ES[status],
      therapistId,
      therapistName: appointment.therapist,
      therapistColor: null,
      therapistSpecialty: null,
      clientId,
      clientName: appointment.client,
      clientEmail: null,
      clientPhone: null,
      notes: null,
      frequency: null,
      durationMinutes,
      pendingReason: null,
      optimizationScore: null,
      modality: appointment.modality,
      room: appointment.room,
      service: appointment.service,
      source: 'sample',
    } satisfies NormalizedAppointment;
  });
}

export function computeStatusSummary(appointments: NormalizedAppointment[]): StatusSummary {
  return appointments.reduce<StatusSummary>(
    (acc, appointment) => {
      acc.total += 1;
      acc[appointment.status] += 1;
      return acc;
    },
    { total: 0, confirmed: 0, pending: 0, cancelled: 0 },
  );
}

export function buildTherapistSummary(appointments: NormalizedAppointment[]): TherapistSummary[] {
  const map = new Map<string, TherapistSummary>();

  appointments.forEach((appointment) => {
    const existing = map.get(appointment.therapistId);
    if (!existing) {
      map.set(appointment.therapistId, {
        therapistId: appointment.therapistId,
        therapistName: appointment.therapistName,
        color: appointment.therapistColor ?? null,
        specialty: appointment.therapistSpecialty ?? null,
        summary: { total: 0, confirmed: 0, pending: 0, cancelled: 0 },
      });
    }

    const entry = map.get(appointment.therapistId)!;
    entry.summary.total += 1;
    entry.summary[appointment.status] += 1;
  });

  return Array.from(map.values()).sort((a, b) => b.summary.total - a.summary.total);
}

export function groupAppointmentsByDate(
  appointments: NormalizedAppointment[],
): Record<string, NormalizedAppointment[]> {
  return appointments.reduce<Record<string, NormalizedAppointment[]>>((acc, appointment) => {
    if (!acc[appointment.date]) {
      acc[appointment.date] = [];
    }
    acc[appointment.date].push(appointment);
    return acc;
  }, {});
}

export function sortAppointmentsByDateTime(
  appointments: NormalizedAppointment[],
): NormalizedAppointment[] {
  return [...appointments].sort((a, b) => {
    if (a.date === b.date) {
      return a.startTime.localeCompare(b.startTime);
    }
    return a.date.localeCompare(b.date);
  });
}

export function buildDailySummaries(
  appointments: NormalizedAppointment[],
): Array<{ date: string; summary: StatusSummary }> {
  const grouped = groupAppointmentsByDate(appointments);
  return Object.entries(grouped)
    .map(([date, group]) => ({ date, summary: computeStatusSummary(group) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getUniqueTherapists(
  appointments: NormalizedAppointment[],
): Array<{ id: string; name: string }> {
  const map = new Map<string, string>();
  appointments.forEach((appointment) => {
    if (!map.has(appointment.therapistId)) {
      map.set(appointment.therapistId, appointment.therapistName);
    }
  });
  return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
}

export function getStatusOrder(): NormalizedAppointment['status'][] {
  return [...STATUS_ORDER];
}

