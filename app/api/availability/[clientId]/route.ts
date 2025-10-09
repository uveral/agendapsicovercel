import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createAdminClient, createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

interface AuthContext {
  status: number;
  userId: string | null;
  role: string | null;
}

const availabilityEntrySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
});

const availabilityPayloadSchema = z
  .array(availabilityEntrySchema)
  .or(availabilityEntrySchema.transform((entry) => [entry]));

function normalizeTime(value: string): string {
  const match = value.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    throw new Error('Formato de hora inválido. Usa HH:MM');
  }

  const hours = Math.min(23, Math.max(0, Number.parseInt(match[1], 10)));
  const minutes = Math.min(59, Math.max(0, Number.parseInt(match[2], 10)));

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

async function getAuthContext(): Promise<AuthContext> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { status: 401, userId: null, role: null };
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const role = profile?.role ?? (user.user_metadata?.role as string | null) ?? null;

  return { status: 200, userId: user.id, role };
}

function mapRowsToResponse(rows: Database['public']['Tables']['client_availability']['Row'][] | null) {
  if (!rows) {
    return [];
  }

  return rows
    .map((row) => ({
      id: row.id,
      userId: row.user_id,
      dayOfWeek: row.day_of_week,
      startTime: normalizeTime(String(row.start_time ?? '00:00')),
      endTime: normalizeTime(String(row.end_time ?? '00:00')),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
    .sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) {
        return a.dayOfWeek - b.dayOfWeek;
      }
      return a.startTime.localeCompare(b.startTime);
    });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const { status, userId, role } = await getAuthContext();
  if (status !== 200 || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status });
  }

  const { clientId } = await params;

  const isAdmin = role === 'admin';
  const isTherapist = role === 'therapist';
  const isSelf = userId === clientId;

  if (!isAdmin && !isTherapist && !isSelf) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = isAdmin ? await createAdminClient() : await createClient();
  const { data, error } = await supabase
    .from('client_availability')
    .select('*')
    .eq('user_id', clientId)
    .order('day_of_week')
    .order('start_time');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(mapRowsToResponse(data));
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const { status, userId, role } = await getAuthContext();
  if (status !== 200 || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status });
  }

  const { clientId } = await params;
  const isAdmin = role === 'admin';
  const isSelf = userId === clientId;

  if (!isAdmin && !isSelf) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `JSON inválido: ${error.message}`
            : 'No se pudo interpretar el cuerpo de la petición.',
      },
      { status: 400 },
    );
  }

  let entries: z.infer<typeof availabilityEntrySchema>[];
  try {
    const parsed = availabilityPayloadSchema.parse(payload);
    entries = parsed.map((entry) => ({
      dayOfWeek: entry.dayOfWeek,
      startTime: normalizeTime(entry.startTime),
      endTime: normalizeTime(entry.endTime),
    }));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.flatten() }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Datos inválidos' },
      { status: 400 },
    );
  }

  const adminClient = await createAdminClient();

  const { error: deleteError } = await adminClient
    .from('client_availability')
    .delete()
    .eq('user_id', clientId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  if (entries.length > 0) {
    const insertPayload = entries.map((entry) => ({
      user_id: clientId,
      day_of_week: entry.dayOfWeek,
      start_time: entry.startTime,
      end_time: entry.endTime,
    }));

    const { error: insertError } = await adminClient
      .from('client_availability')
      .insert(insertPayload);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  const { data, error: fetchError } = await adminClient
    .from('client_availability')
    .select('*')
    .eq('user_id', clientId)
    .order('day_of_week')
    .order('start_time');

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  return NextResponse.json(mapRowsToResponse(data));
}
