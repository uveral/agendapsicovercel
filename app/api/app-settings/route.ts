import { NextResponse } from 'next/server';

import { createAdminClient, createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

type SettingsRow = Database['public']['Tables']['settings']['Row'];

const SETTINGS_KEYS = {
  showWeekends: 'calendar_show_weekends',
  therapistCanViewOthers: 'therapist_can_view_others',
  therapistCanEditOthers: 'therapist_can_edit_others',
} as const;

type SettingKey = keyof typeof SETTINGS_KEYS;

interface AppSettings {
  showWeekends: boolean;
  therapistCanViewOthers: boolean;
  therapistCanEditOthers: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  showWeekends: false,
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

function mapRowsToSettings(rows: SettingsRow[] | null): AppSettings {
  const map = new Map<string, SettingsRow>();
  rows?.forEach((row) => {
    map.set(row.key, row);
  });

  return {
    showWeekends: toBoolean(map.get(SETTINGS_KEYS.showWeekends)?.value ?? null, DEFAULT_SETTINGS.showWeekends),
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

  const payload = (await request.json()) as Partial<Record<SettingKey, boolean>>;

  const entries = Object.entries(payload).filter((entry): entry is [SettingKey, boolean] => {
    const [key, value] = entry;
    return key in SETTINGS_KEYS && typeof value === 'boolean';
  });

  if (entries.length === 0) {
    return NextResponse.json({ error: 'No settings to update' }, { status: 400 });
  }

  const adminClient = await createAdminClient();

  const upsertPayload = entries.map(([key, value]) => ({
    key: SETTINGS_KEYS[key],
    value,
  }));

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
