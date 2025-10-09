import { NextResponse } from 'next/server';

import { toCamelCase, toSnakeCase } from '../../utils';
import { createClient } from '@/lib/supabase/server';

type Scope = 'this_only' | 'this_and_future';

function resolveScope(url: URL): Scope | null {
  const scope = url.searchParams.get('scope');
  if (scope === 'this_only' || scope === 'this_and_future') {
    return scope;
  }
  return null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  const scope = resolveScope(url);

  if (!scope) {
    return NextResponse.json({ error: "Invalid scope. Must be 'this_only' or 'this_and_future'" }, { status: 400 });
  }

  const supabase = await createClient();
  const body = await request.json();
  const updates = toSnakeCase(body as Record<string, unknown>);

  const { data: appointment, error: fetchError } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!appointment) {
    return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
  }

  const timestamp = new Date().toISOString();

  if (scope === 'this_only') {
    const { data: updated, error: updateError } = await supabase
      .from('appointments')
      .update({ ...updates, series_id: null, frequency: 'puntual', updated_at: timestamp })
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json(toCamelCase([updated]));
  }

  if (!appointment.series_id) {
    const { data: updated, error: updateError } = await supabase
      .from('appointments')
      .update({ ...updates, updated_at: timestamp })
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json(toCamelCase([updated]));
  }

  const { data: updatedAppointments, error: seriesUpdateError } = await supabase
    .from('appointments')
    .update({ ...updates, updated_at: timestamp })
    .eq('series_id', appointment.series_id)
    .gte('date', appointment.date)
    .select('*');

  if (seriesUpdateError) {
    return NextResponse.json({ error: seriesUpdateError.message }, { status: 500 });
  }

  return NextResponse.json(toCamelCase(updatedAppointments ?? []));
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  const scope = resolveScope(url);

  if (!scope) {
    return NextResponse.json({ error: "Invalid scope. Must be 'this_only' or 'this_and_future'" }, { status: 400 });
  }

  const supabase = await createClient();

  if (scope === 'this_only') {
    const { error } = await supabase.from('appointments').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  }

  const { data: appointment, error: fetchError } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!appointment) {
    return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
  }

  if (!appointment.series_id) {
    const { error } = await supabase.from('appointments').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  }

  const { error: deleteError } = await supabase
    .from('appointments')
    .delete()
    .eq('series_id', appointment.series_id)
    .gte('date', appointment.date);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
