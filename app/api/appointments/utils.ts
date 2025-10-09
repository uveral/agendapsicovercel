import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

export type RawAppointment = {
  id: string;
  client_id: string;
  therapist_id: string;
  frequency: string | null;
  series_id: string | null;
  date: string;
  start_time: string;
  end_time: string;
};

export function toCamelCase<T = unknown>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase) as T;
  }

  if (obj !== null && typeof obj === 'object') {
    const record = obj as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    Object.keys(record).forEach((key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = toCamelCase(record[key]);
    });

    return result as T;
  }

  return obj;
}

export function toSnakeCase<T = unknown>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(toSnakeCase) as T;
  }

  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const record = obj as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    Object.keys(record).forEach((key) => {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      result[snakeKey] = toSnakeCase(record[key]);
    });

    return result as T;
  }

  return obj;
}

export async function ensureSeriesId(
  supabase: SupabaseClient,
  appointment: RawAppointment,
): Promise<string | null> {
  if (appointment.series_id || appointment.frequency !== 'semanal' && appointment.frequency !== 'quincenal') {
    return appointment.series_id ?? null;
  }

  const seriesId = randomUUID();

  const { data, error } = await supabase
    .from('appointments')
    .update({ series_id: seriesId })
    .eq('client_id', appointment.client_id)
    .eq('therapist_id', appointment.therapist_id)
    .eq('frequency', appointment.frequency)
    .eq('start_time', appointment.start_time)
    .eq('end_time', appointment.end_time)
    .gte('date', appointment.date)
    .is('series_id', null)
    .select('id');

  if (error || !data || data.length === 0) {
    return null;
  }

  return seriesId;
}
