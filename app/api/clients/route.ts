import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Helper function to convert snake_case to camelCase
function toCamelCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = toCamelCase(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
}

// Helper function to convert camelCase to snake_case
function toSnakeCase(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(toSnakeCase);
  } else if (typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.keys(obj).reduce((result, key) => {
      // Convert camelCase to snake_case (firstName -> first_name)
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      result[snakeKey] = toSnakeCase(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
}

export async function GET() {
  const supabase = await createClient();

  const { data: clients, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'client')
    .order('first_name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(toCamelCase(clients));
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();

  // Convert camelCase to snake_case for database
  const dbBody = toSnakeCase({ ...body, role: 'client' });

  const { data: client, error } = await supabase
    .from('users')
    .insert(dbBody)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(toCamelCase(client), { status: 201 });
}
