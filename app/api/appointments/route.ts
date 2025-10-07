import { createClient } from '@/lib/supabase/server';
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
  const supabase = await createClient();

  const { data: appointments, error } = await supabase
    .from('appointments')
    .select(`
      *,
      therapist:therapists(*),
      client:users(*)
    `)
    .order('date', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(toCamelCase(appointments));
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();

  const dbData = toSnakeCase(body);

  const { data: appointment, error } = await supabase
    .from('appointments')
    .insert(dbData)
    .select(`
      *,
      therapist:therapists(*),
      client:users(*)
    `)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(toCamelCase(appointment), { status: 201 });
}
