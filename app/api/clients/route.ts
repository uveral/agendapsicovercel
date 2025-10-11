import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient as insertClient } from '@/lib/clients';
import { NextResponse } from 'next/server';

// Helper function to convert snake_case to camelCase
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

// Helper function to convert camelCase to snake_case
function toSnakeCase<T = unknown>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(toSnakeCase) as T;
  } else if (typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.keys(obj).reduce((result, key) => {
      // Convert camelCase to snake_case (firstName -> first_name)
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      result[snakeKey] = toSnakeCase((obj as Record<string, unknown>)[key]);
      return result;
    }, {} as Record<string, unknown>) as T;
  }
  return obj;
}

export async function GET() {
  const supabase = await createServerSupabaseClient();

  const { data: clients, error } = await supabase
    .from('clients')
    .select('*')
    .order('first_name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(toCamelCase(clients));
}

export async function POST(request: Request) {
  const body = await request.json();

  const dbBody = toSnakeCase(body);

  try {
    const client = await insertClient(dbBody);
    return NextResponse.json(toCamelCase(client), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create client';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
