import { NextResponse } from 'next/server';

import { createAdminClient, createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

type SettingsRow = Database['public']['Tables']['settings']['Row'];

const SETTINGS_KEYS = {
  centerOpensAt: 'center_open_time',
  centerClosesAt: 'center_close_time',
  openOnSaturday: 'center_open_saturday',
  openOnSunday: 'center_open_sunday',
  therapistCanViewOthers: 'therapist_can_view_others',
  therapistCanEditOthers: 'therapist_can_edit_others',
} as const;

type SettingKey = keyof typeof SETTINGS_KEYS;

interface AppSettings {
  centerOpensAt: string;
  centerClosesAt: string;
  openOnSaturday: boolean;
  openOnSunday: boolean;
  therapistCanViewOthers: boolean;
  therapistCanEditOthers: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  centerOpensAt: '09:00',
  centerClosesAt: '21:00',
  openOnSaturday: false,
  openOnSunday: false,
  therapistCanViewOthers: false,
  therapistCanEditOthers: false,
};

function toBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'si', 'sí'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no'].includes(normalized)) {
      return false;
    }
  }
  return fallback;
}

function toTime(value: unknown, fallback: string): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (match) {
      const hours = Math.min(23, Math.max(0, Number.parseInt(match[1], 10)));
      const minutes = Math.min(59, Math.max(0, Number.parseInt(match[2], 10)));
      return `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}`;
    }
  }

  if (typeof value === 'number') {
    const hours = Math.min(23, Math.max(0, Math.floor(value)));
    return `${hours.toString().padStart(2, '0')}:00`;
  }

  return fallback;
}

function mapRowsToSettings(rows: SettingsRow[] | null): AppSettings {
  const map = new Map<string, SettingsRow>();
  rows?.forEach((row) => {
    map.set(row.key, row);
  });

  return {
    centerOpensAt: toTime(map.get(SETTINGS_KEYS.centerOpensAt)?.value ?? null, DEFAULT_SETTINGS.centerOpensAt),
    centerClosesAt: toTime(map.get(SETTINGS_KEYS.centerClosesAt)?.value ?? null, DEFAULT_SETTINGS.centerClosesAt),
    openOnSaturday: toBoolean(
      map.get(SETTINGS_KEYS.openOnSaturday)?.value ?? null,
      DEFAULT_SETTINGS.openOnSaturday,
    ),
    openOnSunday: toBoolean(
      map.get(SETTINGS_KEYS.openOnSunday)?.value ?? null,
      DEFAULT_SETTINGS.openOnSunday,
    ),
    therapistCanViewOthers: toBoolean(
      map.get(SETTINGS_KEYS.therapistCanViewOthers)?.value ?? null,
      DEFAULT_SETTINGS.therapistCanViewOthers,
    ),
    therapistCanEditOthers: toBoolean(
      map.get(SETTINGS_KEYS.therapistCanEditOthers)?.value ?? null,
      DEFAULT_SETTINGS.therapistCanEditOthers,
    ),
  } satisfies AppSettings;
}

async function getCurrentUserRole() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { status: 401 as const, role: null, therapistId: null };
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('role, therapist_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return { status: 403 as const, role: null, therapistId: null };
  }

  return { status: 200 as const, role: profile.role, therapistId: profile.therapist_id };
}

export async function GET() {
  const { status } = await getCurrentUserRole();

  if (status !== 200) {
    return NextResponse.json({ error: 'Unauthorized' }, { status });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .in('key', Object.values(SETTINGS_KEYS));

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(mapRowsToSettings(data));
}

export async function PUT(request: Request) {
  const { status, role } = await getCurrentUserRole();

  if (status !== 200) {
    return NextResponse.json({ error: 'Unauthorized' }, { status });
  }

  if (role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const payload = (await request.json()) as Partial<Record<SettingKey, unknown>>;

  const entries = Object.entries(payload).filter((entry): entry is [SettingKey, unknown] => {
    const [key] = entry;
    return key in SETTINGS_KEYS;
  });

  if (entries.length === 0) {
    return NextResponse.json({ error: 'No settings to update' }, { status: 400 });
  }

  const adminClient = await createAdminClient();

  const upsertPayload = entries.map(([key, value]) => {
    if (key === 'centerOpensAt' || key === 'centerClosesAt') {
      const normalized = toTime(value, DEFAULT_SETTINGS[key]);
      return { key: SETTINGS_KEYS[key], value: normalized };
    }

    if (key === 'openOnSaturday' || key === 'openOnSunday' || key === 'therapistCanViewOthers' || key === 'therapistCanEditOthers') {
      const normalized = toBoolean(value, DEFAULT_SETTINGS[key]);
      return { key: SETTINGS_KEYS[key], value: normalized };
    }

    return { key: SETTINGS_KEYS[key], value };
  });

  const { error: upsertError } = await adminClient
    .from('settings')
    .upsert(upsertPayload, { onConflict: 'key' });

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  const { data, error } = await adminClient
    .from('settings')
    .select('*')
    .in('key', Object.values(SETTINGS_KEYS));

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(mapRowsToSettings(data));
}
