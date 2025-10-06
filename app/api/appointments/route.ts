import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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

  return NextResponse.json(appointments);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();

  const { data: appointment, error } = await supabase
    .from('appointments')
    .insert(body)
    .select(`
      *,
      therapist:therapists(*),
      client:users(*)
    `)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(appointment, { status: 201 });
}
