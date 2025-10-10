import { NextResponse } from 'next/server';

import { createAdminClient, createClient } from '@/lib/supabase/server';

const DEFAULT_PASSWORD = 'orienta';
const DEFAULT_ADMIN_EMAILS = ['uveral@gmail.com'];
const ADMIN_EMAILS = new Set(
  DEFAULT_ADMIN_EMAILS.concat(
    (process.env.ADMIN_EMAILS ?? process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  ),
);

type TherapistAccountPayload = {
  role?: 'admin' | 'therapist';
  resetPassword?: boolean;
};

function isAdminRole(role: string | null | undefined, email: string | null | undefined): boolean {
  if (role === 'admin') {
    return true;
  }

  if (email) {
    return ADMIN_EMAILS.has(email.toLowerCase());
  }

  return false;
}

async function assertAdminAccess() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { status: 401 as const, supabase, user: null } as const;
  }

  const { data: requesterProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const isAdmin = isAdminRole(requesterProfile?.role ?? null, user.email);

  if (!isAdmin) {
    return { status: 403 as const, supabase, user: null } as const;
  }

  return { status: 200 as const, supabase, user } as const;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { status, supabase } = await assertAdminAccess();

  if (status !== 200) {
    return NextResponse.json({ error: 'No autorizado' }, { status });
  }

  const { id } = await params;

  const { data: account, error } = await supabase
    .from('users')
    .select('id, email, role, must_change_password')
    .eq('therapist_id', id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!account) {
    return NextResponse.json({ error: 'Cuenta de terapeuta no encontrada' }, { status: 404 });
  }

  return NextResponse.json({
    userId: account.id,
    email: account.email,
    role: account.role ?? 'therapist',
    mustChangePassword: Boolean(account.must_change_password),
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { status, supabase } = await assertAdminAccess();

  if (status !== 200) {
    return NextResponse.json({ error: 'No autorizado' }, { status });
  }

  const { id } = await params;

  let payload: TherapistAccountPayload;
  try {
    payload = (await request.json()) as TherapistAccountPayload;
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  }

  const { role, resetPassword } = payload;

  if (role && role !== 'admin' && role !== 'therapist') {
    return NextResponse.json({ error: 'Rol no válido' }, { status: 400 });
  }

  if (!role && !resetPassword) {
    return NextResponse.json({ error: 'No se proporcionaron cambios' }, { status: 400 });
  }

  const { data: account, error } = await supabase
    .from('users')
    .select('id, email, role, must_change_password')
    .eq('therapist_id', id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!account) {
    return NextResponse.json({ error: 'Cuenta de terapeuta no encontrada' }, { status: 404 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      {
        error:
          'Falta configurar SUPABASE_SERVICE_ROLE_KEY para gestionar cuentas de terapeutas.',
      },
      { status: 503 },
    );
  }

  const adminClient = await createAdminClient();

  const {
    data: { user: authUser },
    error: fetchError,
  } = await adminClient.auth.admin.getUserById(account.id);

  if (fetchError || !authUser) {
    return NextResponse.json(
      { error: fetchError?.message ?? 'Usuario de autenticación no encontrado' },
      { status: 404 },
    );
  }

  let mustChangePassword = Boolean(account.must_change_password);
  let metadata: Record<string, unknown> = {
    ...(authUser.user_metadata ?? {}),
    therapist_id: id,
  };

  if (role) {
    metadata = { ...metadata, role };
    const { error: metadataError } = await adminClient.auth.admin.updateUserById(account.id, {
      user_metadata: metadata,
    });

    if (metadataError) {
      return NextResponse.json({ error: metadataError.message }, { status: 500 });
    }

    const { error: roleUpdateError } = await supabase
      .from('users')
      .update({ role })
      .eq('id', account.id);

    if (roleUpdateError) {
      return NextResponse.json({ error: roleUpdateError.message }, { status: 500 });
    }
  }

  if (resetPassword) {
    const resolvedRole = (metadata.role as string | undefined) ?? account.role ?? 'therapist';
    metadata = { ...metadata, role: resolvedRole, must_change_password: true };
    const { error: resetError } = await adminClient.auth.admin.updateUserById(account.id, {
      password: DEFAULT_PASSWORD,
      user_metadata: metadata,
    });

    if (resetError) {
      return NextResponse.json({ error: resetError.message }, { status: 500 });
    }

    const { error: flagUpdateError } = await supabase
      .from('users')
      .update({ must_change_password: true })
      .eq('id', account.id);

    if (flagUpdateError) {
      return NextResponse.json({ error: flagUpdateError.message }, { status: 500 });
    }

    mustChangePassword = true;
  }

  return NextResponse.json({
    role: role ?? (account.role ?? 'therapist'),
    mustChangePassword,
  });
}
