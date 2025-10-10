import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const DEFAULT_ADMIN_EMAILS = ['uveral@gmail.com'];

const ADMIN_EMAILS = Array.from(
  new Set(
    DEFAULT_ADMIN_EMAILS.concat(
      (process.env.ADMIN_EMAILS ?? process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
        .split(',')
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  ),
);

type PublicUserProfile = Record<string, unknown> & {
  role?: string | null;
  therapist_id?: string | null;
  must_change_password?: boolean | null;
};

function toCamelCase<T = unknown>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase) as T;
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = toCamelCase((obj as Record<string, unknown>)[key]);
      return result;
    }, {} as Record<string, unknown>) as T;
  }
  return obj;
}

export async function GET() {
  const supabase = await createClient();

  // Get the authenticated user
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const email = authUser.email?.toLowerCase() ?? '';
  const metaRole =
    (authUser.user_metadata?.role as string | undefined) ||
    (authUser.app_metadata?.role as string | undefined);
  const therapistIdMeta =
    (authUser.user_metadata?.therapist_id as string | undefined) ||
    (authUser.app_metadata?.therapist_id as string | undefined) ||
    null;
  const fallbackRole = ADMIN_EMAILS.includes(email) ? 'admin' : metaRole ?? 'therapist';

  // Get the user profile from the users table
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (profileError || !userProfile) {
    const { data: createdProfile, error: upsertError } = await supabase
      .from('users')
      .upsert(
        {
          id: authUser.id,
          email: authUser.email,
          first_name: authUser.user_metadata?.first_name ?? null,
          last_name: authUser.user_metadata?.last_name ?? null,
          role: fallbackRole,
          therapist_id: therapistIdMeta,
        },
        { onConflict: 'id' },
      )
      .select('*')
      .single();

    if (!upsertError && createdProfile) {
      return NextResponse.json(toCamelCase(createdProfile as PublicUserProfile));
    }

    return NextResponse.json(
      toCamelCase({
        id: authUser.id,
        email: authUser.email,
        role: fallbackRole,
        therapistId: therapistIdMeta,
        mustChangePassword: null,
      }),
    );
  }

  const mergedProfile: PublicUserProfile = {
    ...(userProfile as PublicUserProfile),
  };

  if (!mergedProfile.role) {
    mergedProfile.role = fallbackRole;
  }

  if (!mergedProfile.therapist_id && therapistIdMeta) {
    mergedProfile.therapist_id = therapistIdMeta;
  }

  if (!('must_change_password' in mergedProfile)) {
    mergedProfile.must_change_password = null;
  }

  // Merge auth user with profile
  return NextResponse.json(toCamelCase(mergedProfile));
}
