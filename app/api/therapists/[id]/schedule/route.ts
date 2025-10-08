import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const DEFAULT_ADMIN_EMAILS = ['uveral@gmail.com'];

const ADMIN_EMAILS = new Set(
  DEFAULT_ADMIN_EMAILS.concat(
    (process.env.ADMIN_EMAILS ?? process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  ),
);

function resolveRole(
  profileRole: string | null | undefined,
  fallbackRole: string,
): 'admin' | 'therapist' | string {
  return (profileRole ?? fallbackRole) as 'admin' | 'therapist' | string;
}

function resolveTherapistId(
  profileTherapistId: string | null | undefined,
  metadataTherapistId: string | null,
) {
  return profileTherapistId ?? metadataTherapistId ?? null;
}

function getFallbackRole(
  email: string,
  metadataRole: string | null | undefined,
): 'admin' | 'therapist' {
  if (ADMIN_EMAILS.has(email.toLowerCase())) {
    return 'admin';
  }
  return (metadataRole as 'admin' | 'therapist' | undefined) ?? 'therapist';
}

function getMetadataRole(user: { user_metadata?: Record<string, unknown>; app_metadata?: Record<string, unknown> }) {
  return (
    (user.user_metadata?.role as string | undefined) ??
    (user.app_metadata?.role as string | undefined) ??
    null
  );
}

function getMetadataTherapistId(user: { user_metadata?: Record<string, unknown>; app_metadata?: Record<string, unknown> }) {
  const metaTherapist =
    (user.user_metadata?.therapist_id as string | undefined) ??
    (user.app_metadata?.therapist_id as string | undefined) ??
    null;

  return metaTherapist;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const email = user.email?.toLowerCase() ?? '';
  const fallbackRole = getFallbackRole(email, getMetadataRole(user));
  const metadataTherapistId = getMetadataTherapistId(user);

  const { data: profile } = await supabase
    .from('users')
    .select('role, therapist_id')
    .eq('id', user.id)
    .maybeSingle();

  const resolvedRole = resolveRole(profile?.role, fallbackRole);
  const resolvedTherapistId = resolveTherapistId(profile?.therapist_id, metadataTherapistId);

  const isAdmin = resolvedRole === 'admin';
  const isOwnSchedule = resolvedTherapistId === id;

  if (!isAdmin && !isOwnSchedule) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: schedule, error } = await supabase
    .from('therapist_working_hours')
    .select('*')
    .eq('therapist_id', id)
    .order('day_of_week');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Convert snake_case to camelCase
  const camelCaseSchedule = (schedule ?? []).map((slot: Record<string, unknown>) => ({
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

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const email = user.email?.toLowerCase() ?? '';
  const fallbackRole = getFallbackRole(email, getMetadataRole(user));
  const metadataTherapistId = getMetadataTherapistId(user);

  const { data: profile } = await supabase
    .from('users')
    .select('role, therapist_id')
    .eq('id', user.id)
    .maybeSingle();

  const resolvedRole = resolveRole(profile?.role, fallbackRole);
  const resolvedTherapistId = resolveTherapistId(profile?.therapist_id, metadataTherapistId);

  const isAdmin = resolvedRole === 'admin';
  const isOwnSchedule = resolvedTherapistId === id;

  if (!isAdmin && !isOwnSchedule) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!Array.isArray(slots)) {
    return NextResponse.json({ error: 'Formato de datos inválido' }, { status: 400 });
  }

  // Delete existing schedule
  await supabase
    .from('therapist_working_hours')
    .delete()
    .eq('therapist_id', id);

  // Insert new schedule
  const dbSlots = slots.map((slot: Record<string, unknown>) => ({
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
  const camelCaseSchedule = (newSchedule || []).map((slot: Record<string, unknown>) => ({
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
