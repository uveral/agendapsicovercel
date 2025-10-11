import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';
import { createAppointment as insertAppointment } from '@/lib/appointments';
import { NextResponse } from 'next/server';

function toCamelCase<T = unknown>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase) as T;
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = toCamelCase((obj as Record<string, unknown>)[key]);
      return result;
    }, {} as Record<string, unknown>) as T;
  }
  return obj;
}

function toSnakeCase<T = unknown>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(toSnakeCase) as T;
  } else if (typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      result[snakeKey] = toSnakeCase((obj as Record<string, unknown>)[key]);
      return result;
    }, {} as Record<string, unknown>) as T;
  }
  return obj;
}

export async function GET() {
  const supabase = await createServerSupabaseClient();

  const { data: appointments, error } = await supabase
    .from('appointments')
    .select(`
      *,
      therapist:therapists(*),
      client:clients(*)
    `)
    .order('start_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(toCamelCase(appointments));
}

export async function POST(request: Request) {
  const body = await request.json();

  const dbData = toSnakeCase(body);
  const startAt = (() => {
    if (dbData.start_at) {
      return dbData.start_at as string;
    }

    // TODO: remove fallback once all callers send start_at
    if (dbData.date && dbData.start_time) {
      const date = String(dbData.date);
      const time = String(dbData.start_time);
      return new Date(`${date}T${time}:00Z`).toISOString();
    }

    return undefined;
  })();

  if (!startAt) {
    return NextResponse.json({ error: 'start_at is required' }, { status: 400 });
  }

  try {
    const appointment = await insertAppointment({
      therapist_id: String(dbData.therapist_id),
      client_id: String(dbData.client_id),
      start_at: startAt,
      duration: dbData.duration ? String(dbData.duration) : undefined,
      status: dbData.status ? (String(dbData.status) as 'pending' | 'confirmed' | 'cancelled') : undefined,
      notes: dbData.notes ? String(dbData.notes) : undefined,
    });

    return NextResponse.json(toCamelCase(appointment), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create appointment';
    return NextResponse.json({ error: message }, { status: message === 'OVERLAP' ? 409 : 500 });
  }
}
