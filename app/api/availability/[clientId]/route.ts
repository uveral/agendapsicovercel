import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface AuthContext {
  status: number;
  userId: string | null;
  role: string | null;
}

const DEFAULT_ADMIN_EMAILS = ['uveral@gmail.com'];

const ADMIN_EMAILS = new Set(
  DEFAULT_ADMIN_EMAILS.concat(
    (process.env.ADMIN_EMAILS ?? process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  ),
);

const availabilityEntrySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
});

const availabilityPayloadSchema = z
  .array(availabilityEntrySchema)
  .or(availabilityEntrySchema.transform((entry) => [entry]));

function getUserMetadataValue<T = unknown>(user: SupabaseUser, key: string): T | null {
  const fromUser = user.user_metadata?.[key];
  const fromApp = user.app_metadata?.[key];
  return (fromUser as T | undefined) ?? (fromApp as T | undefined) ?? null;
}

function getFallbackRole(user: SupabaseUser | null) {
  if (!user) {
    return null as string | null;
  }

  const email = user.email?.toLowerCase() ?? '';
  const metadataRole = getUserMetadataValue<string | null>(user, 'role');
  return ADMIN_EMAILS.has(email) ? 'admin' : metadataRole ?? 'therapist';
}

function normalizeTime(
  value: string,
  { strict = false, fallback = '00:00' }: { strict?: boolean; fallback?: string } = {},
): string {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) {
    if (strict) {
      throw new Error('Formato de hora inválido. Usa HH:MM');
    }
    return fallback;
  }

  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    if (strict) {
      throw new Error('Formato de hora inválido. Usa HH:MM');
    }
    return fallback;
  }

  const clampedHours = Math.min(23, Math.max(0, hours));
  const clampedMinutes = Math.min(59, Math.max(0, minutes));

  return `${clampedHours.toString().padStart(2, '0')}:${clampedMinutes
    .toString()
    .padStart(2, '0')}`;
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

  const fallbackRole = getFallbackRole(user);

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const role = profile?.role ?? fallbackRole;

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

  const supabase = await createClient();
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
      startTime: normalizeTime(entry.startTime, { strict: true }),
      endTime: normalizeTime(entry.endTime, { strict: true }),
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

  const supabase = await createClient();

  const { error: deleteError } = await supabase
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

    const { error: insertError } = await supabase
      .from('client_availability')
      .insert(insertPayload);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  const { data, error: fetchError } = await supabase
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
