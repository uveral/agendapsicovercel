import { NextResponse } from 'next/server';

import { createClient, createAdminClient } from '@/lib/supabase/server';

const DEFAULT_PASSWORD_FLAG_FIELD = 'must_change_password';

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  }

  const mustChangePassword = Boolean((body as { mustChangePassword?: unknown })?.mustChangePassword);

  const { error: updateError } = await supabase
    .from('users')
    .update({ [DEFAULT_PASSWORD_FLAG_FIELD]: mustChangePassword })
    .eq('id', user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Try to mirror the flag in auth metadata when service role credentials are available
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const adminClient = createAdminClient();
      await adminClient.auth.admin.updateUserById(user.id, {
        user_metadata: { [DEFAULT_PASSWORD_FLAG_FIELD]: mustChangePassword },
      });
    } catch {
      // Ignore metadata sync errors – the primary source of truth is the users table
    }
  }

  return NextResponse.json({ mustChangePassword });
}
