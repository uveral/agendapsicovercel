import { NextResponse } from 'next/server';

import { ensureSeriesId, toCamelCase } from '../../utils';
import { createClient } from '@/lib/supabase/server';

type Frequency = 'semanal' | 'quincenal';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();
  const frequency = body?.frequency as Frequency | undefined;

  if (frequency !== 'semanal' && frequency !== 'quincenal') {
    return NextResponse.json({ error: "Invalid frequency. Must be 'semanal' or 'quincenal'" }, { status: 400 });
  }

  const { data: appointment, error: fetchError } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const seriesId = appointment ? await ensureSeriesId(supabase, appointment) : null;

  if (!appointment || !seriesId) {
    return NextResponse.json({ error: 'Appointment not found or not part of a series' }, { status: 404 });
  }

  appointment.series_id = seriesId;

  const { data: futureAppointments, error: futureError } = await supabase
    .from('appointments')
    .select('*')
    .eq('series_id', seriesId)
    .gte('date', appointment.date)
    .order('date', { ascending: true });

  if (futureError) {
    return NextResponse.json({ error: futureError.message }, { status: 500 });
  }

  if (!futureAppointments || futureAppointments.length === 0) {
    return NextResponse.json([]);
  }

  const baseDate = new Date(appointment.date);
  if (Number.isNaN(baseDate.getTime())) {
    return NextResponse.json({ error: 'Invalid appointment date' }, { status: 500 });
  }

  const intervalDays = frequency === 'semanal' ? 7 : 14;
  const dayInMs = 24 * 60 * 60 * 1000;
  const baseTime = baseDate.getTime();
  const timestamp = new Date().toISOString();

  const updatedAppointments: Record<string, unknown>[] = [];

  for (let index = 0; index < futureAppointments.length; index += 1) {
    const targetTime = baseTime + index * intervalDays * dayInMs;
    const targetDate = new Date(targetTime);
    const formattedDate = targetDate.toISOString().slice(0, 10);

    const { data: updated, error: updateError } = await supabase
      .from('appointments')
      .update({ date: formattedDate, frequency, updated_at: timestamp })
      .eq('id', futureAppointments[index].id)
      .select('*')
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    updatedAppointments.push(updated);
  }

  return NextResponse.json(toCamelCase(updatedAppointments));
}
