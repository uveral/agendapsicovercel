import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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

  // Get the user profile from the users table
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (profileError) {
    // If no profile exists, return just the auth user info
    return NextResponse.json(toCamelCase({
      id: authUser.id,
      email: authUser.email,
      role: null,
    }));
  }

  // Merge auth user with profile
  return NextResponse.json(toCamelCase(userProfile));
}
