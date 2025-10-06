import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();

  const { data: workingHours, error } = await supabase
    .from('therapist_working_hours')
    .select('*')
    .order('therapist_id');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Convert snake_case to camelCase
  const camelCaseHours = (workingHours || []).map((slot: any) => ({
    id: slot.id,
    therapistId: slot.therapist_id,
    dayOfWeek: slot.day_of_week,
    startTime: slot.start_time,
    endTime: slot.end_time,
    createdAt: slot.created_at,
    updatedAt: slot.updated_at,
  }));

  return NextResponse.json(camelCaseHours);
}
