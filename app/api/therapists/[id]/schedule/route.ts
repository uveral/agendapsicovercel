import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: schedule, error } = await supabase
    .from('therapist_working_hours')
    .select('*')
    .eq('therapist_id', id)
    .order('day_of_week');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Convert snake_case to camelCase
  const camelCaseSchedule = schedule.map((slot: any) => ({
    id: slot.id,
    therapistId: slot.therapist_id,
    dayOfWeek: slot.day_of_week,
    startTime: slot.start_time,
    endTime: slot.end_time,
    createdAt: slot.created_at,
    updatedAt: slot.updated_at,
  }));

  return NextResponse.json(camelCaseSchedule);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const slots = await request.json();

  // Delete existing schedule
  await supabase
    .from('therapist_working_hours')
    .delete()
    .eq('therapist_id', id);

  // Insert new schedule
  const dbSlots = slots.map((slot: any) => ({
    therapist_id: id,
    day_of_week: slot.dayOfWeek,
    start_time: slot.startTime,
    end_time: slot.endTime,
  }));

  const { data: newSchedule, error } = await supabase
    .from('therapist_working_hours')
    .insert(dbSlots)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Convert snake_case to camelCase
  const camelCaseSchedule = (newSchedule || []).map((slot: any) => ({
    id: slot.id,
    therapistId: slot.therapist_id,
    dayOfWeek: slot.day_of_week,
    startTime: slot.start_time,
    endTime: slot.end_time,
    createdAt: slot.created_at,
    updatedAt: slot.updated_at,
  }));

  return NextResponse.json(camelCaseSchedule);
}
