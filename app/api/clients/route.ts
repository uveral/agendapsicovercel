import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();

  const { data: clients, error } = await supabase
    .from('users')
    .select('*')
    .order('first_name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(clients);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();

  const { data: client, error } = await supabase
    .from('users')
    .insert({ ...body, role: 'client' })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(client, { status: 201 });
}
