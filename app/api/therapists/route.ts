import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();

  const { data: therapists, error } = await supabase
    .from('therapists')
    .select('*')
    .order('name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(therapists);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();

  // Temporarily allow all authenticated users to create therapists
  // TODO: Re-enable admin check once first admin user is created
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: therapist, error } = await supabase
    .from('therapists')
    .insert(body)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(therapist, { status: 201 });
}
