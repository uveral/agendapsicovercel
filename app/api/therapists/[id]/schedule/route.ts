import { createAdminClient, createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { sanitizeWorkingHoursCollection } from '@/lib/therapistSchedule';
import type { TherapistWorkingHours } from '@/lib/types';
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

  const { data: therapistRecord, error: therapistLookupError } = await supabase
    .from('therapists')
    .select('id')
    .eq('id', id)
    .maybeSingle();

  if (therapistLookupError) {
    return NextResponse.json({ error: therapistLookupError.message }, { status: 500 });
  }

  if (!therapistRecord) {
    return NextResponse.json(
      {
        error:
          'No se encontró un terapeuta con ese identificador. Crea primero la ficha del terapeuta antes de configurar su horario.',
      },
      { status: 404 },
    );
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

function extractSlots(payload: unknown): unknown[] | null {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    const container = payload as Record<string, unknown>;
    const candidateKeys = ['slots', 'data', 'workingHours', 'hours'];

    for (const key of candidateKeys) {
      const maybeSlots = container[key];
      if (Array.isArray(maybeSlots)) {
        return maybeSlots;
      }
    }
  }

  return null;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  let payload: unknown;

  try {
    payload = await request.json();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'No se pudo interpretar el cuerpo de la petición.';

    return NextResponse.json(
      { error: `JSON inválido: ${message}` },
      { status: 400 },
    );
  }

  const slots = extractSlots(payload);

  if (!slots) {
    return NextResponse.json(
      {
        error:
          'Formato de datos inválido. Envía un arreglo con los bloques de horario a guardar.',
      },
      { status: 400 },
    );
  }

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

  const sanitizedInput: TherapistWorkingHours[] = sanitizeWorkingHoursCollection(
    slots.map((slot) => {
      const record = (slot ?? {}) as Record<string, unknown>;

      return {
        therapist_id: id,
        day_of_week: record.dayOfWeek ?? record.day_of_week ?? null,
        start_time: record.startTime ?? record.start_time ?? null,
        end_time: record.endTime ?? record.end_time ?? null,
      };
    }),
  ).map((slot) => ({
    ...slot,
    therapistId: id,
  }));

  if (sanitizedInput.length === 0 && slots.length > 0) {
    return NextResponse.json(
      {
        error:
          'Ninguno de los bloques recibidos tiene un día y horas válidos. Revisa los valores introducidos.',
      },
      { status: 422 },
    );
  }

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

  let insertedCount = 0;

  if (sanitizedInput.length > 0) {
    const dbSlots = sanitizedInput.map((slot) => ({
      id: randomUUID(),
      therapist_id: id,
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

    insertedCount = response.data?.length ?? 0;

    if (insertedCount !== sanitizedInput.length) {
      return NextResponse.json(
        {
          error: `Se recibieron ${sanitizedInput.length} bloques de horario pero solo se guardaron ${insertedCount}. Verifica la tabla therapist_working_hours en Supabase.`,
        },
        { status: 500 },
      );
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

  const meta = {
    requestedSlots: slots.length,
    sanitizedSlots: sanitizedInput.length,
    insertedSlots: insertedCount,
    persistedSlots: sanitizedResponse.length,
  };

  if (process.env.NODE_ENV !== 'production') {
    console.info(`[therapist-schedule:${id}]`, meta);
  }

  const response = NextResponse.json(camelCaseSchedule);
  response.headers.set('x-therapist-schedule-meta', encodeURIComponent(JSON.stringify(meta)));

  return response;
}
