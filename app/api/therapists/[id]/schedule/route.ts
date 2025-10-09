import { createAdminClient, createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { sanitizeWorkingHoursCollection } from '@/lib/therapistSchedule';
import { randomUUID } from 'node:crypto';

const DEFAULT_ADMIN_EMAILS = ['uveral@gmail.com'];

const ADMIN_EMAILS = new Set(
  DEFAULT_ADMIN_EMAILS.concat(
    (process.env.ADMIN_EMAILS ?? process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  ),
);

const SERVICE_ROLE_AVAILABLE =
  typeof process.env.SUPABASE_SERVICE_ROLE_KEY === 'string' &&
  process.env.SUPABASE_SERVICE_ROLE_KEY.trim().length > 0;

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

  const sanitizedSchedule = sanitizeWorkingHoursCollection(schedule ?? []);

  // Convert snake_case to camelCase
  const camelCaseSchedule = sanitizedSchedule.map((slot) => ({
    id: slot.id,
    therapistId: slot.therapistId,
    dayOfWeek: slot.dayOfWeek,
    startTime: slot.startTime,
    endTime: slot.endTime,
    createdAt: slot.createdAt,
    updatedAt: slot.updatedAt,
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

  const sanitizedInput = sanitizeWorkingHoursCollection(
    slots.map((slot: Record<string, unknown>) => ({
      therapist_id: id,
      day_of_week: (slot as Record<string, unknown>).dayOfWeek,
      start_time: (slot as Record<string, unknown>).startTime,
      end_time: (slot as Record<string, unknown>).endTime,
    })),
  );

  const canEscalateWithServiceRole = isAdmin && SERVICE_ROLE_AVAILABLE;

  if (isAdmin && !isOwnSchedule && !canEscalateWithServiceRole) {
    return NextResponse.json(
      {
        error:
          'Falta configurar SUPABASE_SERVICE_ROLE_KEY para que los administradores gestionen horarios de otros terapeutas.',
      },
      { status: 503 },
    );
  }

  const writeClient = canEscalateWithServiceRole ? await createAdminClient() : supabase;

  // Delete existing schedule
  const { error: deleteError } = await writeClient
    .from('therapist_working_hours')
    .delete()
    .eq('therapist_id', id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  if (sanitizedInput.length > 0) {
    const dbSlots = sanitizedInput.map((slot) => ({
      id: randomUUID(),
      therapist_id: slot.therapistId,
      day_of_week: slot.dayOfWeek,
      start_time: slot.startTime,
      end_time: slot.endTime,
    }));

    const response = await writeClient
      .from('therapist_working_hours')
      .insert(dbSlots)
      .select();

    if (response.error) {
      return NextResponse.json({ error: response.error.message }, { status: 500 });
    }
  }

  const { data: persistedSchedule, error: fetchError } = await writeClient
    .from('therapist_working_hours')
    .select('*')
    .eq('therapist_id', id)
    .order('day_of_week');

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const sanitizedResponse = sanitizeWorkingHoursCollection(persistedSchedule ?? []);

  // Convert snake_case to camelCase
  const camelCaseSchedule = sanitizedResponse.map((slot) => ({
    id: slot.id,
    therapistId: slot.therapistId,
    dayOfWeek: slot.dayOfWeek,
    startTime: slot.startTime,
    endTime: slot.endTime,
    createdAt: slot.createdAt,
    updatedAt: slot.updatedAt,
  }));

  return NextResponse.json(camelCaseSchedule);
}
