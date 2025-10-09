import { NextResponse } from 'next/server';

import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';

import { ensureSeriesId, toCamelCase, toSnakeCase } from '../../utils';
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

  const seriesId = await ensureSeriesId(supabase, appointment);

  if (!seriesId) {
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

  appointment.series_id = seriesId;

  const { data: futureAppointments, error: fetchFutureError } = await supabase
    .from('appointments')
    .select('*')
    .eq('series_id', seriesId)
    .gte('date', appointment.date)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });

  if (fetchFutureError) {
    return NextResponse.json({ error: fetchFutureError.message }, { status: 500 });
  }

  if (!futureAppointments || futureAppointments.length === 0) {
    return NextResponse.json([]);
  }

  const updateRecord = { ...(updates as Record<string, unknown>) };
  delete updateRecord.series_id;
  delete updateRecord.seriesId;

  const requestedDate = updateRecord.date;
  const requestedStartTime = updateRecord.start_time;
  const requestedEndTime = updateRecord.end_time;

  const hasDateUpdate = typeof requestedDate === 'string';
  const hasStartUpdate = typeof requestedStartTime === 'string';
  const hasEndUpdate = typeof requestedEndTime === 'string';

  let dateDelta = 0;
  if (hasDateUpdate) {
    const targetDate = parseISO(String(requestedDate));
    const baseDate = parseISO(appointment.date);
    if (!Number.isNaN(targetDate.getTime()) && !Number.isNaN(baseDate.getTime())) {
      dateDelta = differenceInCalendarDays(targetDate, baseDate);
    }
  }

  const timeToMinutes = (time: string | null | undefined): number | null => {
    if (!time) return null;
    const [hourPart = '0', minutePart = '0'] = time.split(':');
    const hour = Number.parseInt(hourPart, 10);
    const minute = Number.parseInt(minutePart, 10);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
      return null;
    }
    return hour * 60 + minute;
  };

  const minutesToTime = (totalMinutes: number): string => {
    const minutesInDay = 24 * 60;
    const normalized = ((totalMinutes % minutesInDay) + minutesInDay) % minutesInDay;
    const hours = Math.floor(normalized / 60)
      .toString()
      .padStart(2, '0');
    const minutes = (normalized % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const originalStartMinutes = timeToMinutes(appointment.start_time);
  const originalEndMinutes = timeToMinutes(appointment.end_time);
  const targetStartMinutes = timeToMinutes(typeof requestedStartTime === 'string' ? requestedStartTime : null);
  const targetEndMinutes = timeToMinutes(typeof requestedEndTime === 'string' ? requestedEndTime : null);

  const startDelta =
    hasStartUpdate && originalStartMinutes !== null && targetStartMinutes !== null
      ? targetStartMinutes - originalStartMinutes
      : null;
  const endDelta =
    hasEndUpdate && originalEndMinutes !== null && targetEndMinutes !== null
      ? targetEndMinutes - originalEndMinutes
      : null;

  const scalarUpdates: Record<string, unknown> = { ...updateRecord };
  delete scalarUpdates.date;
  delete scalarUpdates.start_time;
  delete scalarUpdates.end_time;

  const updatedAppointments = [] as Record<string, unknown>[];

  for (const future of futureAppointments) {
    const nextUpdate: Record<string, unknown> = { ...scalarUpdates, updated_at: timestamp };

    if (hasDateUpdate) {
      const base = parseISO(future.date);
      if (!Number.isNaN(base.getTime())) {
        const shifted = addDays(base, dateDelta);
        nextUpdate.date = format(shifted, 'yyyy-MM-dd');
      } else {
        nextUpdate.date = requestedDate;
      }
    }

    if (hasStartUpdate) {
      const futureStartMinutes = timeToMinutes(future.start_time);
      if (startDelta !== null && futureStartMinutes !== null) {
        nextUpdate.start_time = minutesToTime(futureStartMinutes + startDelta);
      } else if (typeof requestedStartTime === 'string') {
        nextUpdate.start_time = requestedStartTime;
      }
    }

    if (hasEndUpdate) {
      const futureEndMinutes = timeToMinutes(future.end_time);
      if (endDelta !== null && futureEndMinutes !== null) {
        nextUpdate.end_time = minutesToTime(futureEndMinutes + endDelta);
      } else if (typeof requestedEndTime === 'string') {
        nextUpdate.end_time = requestedEndTime;
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from('appointments')
      .update(nextUpdate)
      .eq('id', future.id)
      .select('*')
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    updatedAppointments.push(updated);
  }

  return NextResponse.json(toCamelCase(updatedAppointments));
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
