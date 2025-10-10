import { createAdminClient, createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';
import type { User as SupabaseAuthUser } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

type UserAccountSummary = Pick<
  Database['public']['Tables']['users']['Row'],
  'id' | 'therapist_id' | 'role'
>;

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

function toSnakeCase<T = unknown>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(toSnakeCase) as T;
  } else if (typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      result[snakeKey] = toSnakeCase((obj as Record<string, unknown>)[key]);
      return result;
    }, {} as Record<string, unknown>) as T;
  }
  return obj;
}

const DEFAULT_PASSWORD = 'orienta';

async function fetchAuthUserByEmail(email: string): Promise<SupabaseAuthUser | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Falta configurar SUPABASE_SERVICE_ROLE_KEY o NEXT_PUBLIC_SUPABASE_URL para gestionar cuentas de terapeutas.',
    );
  }

  const url = new URL('/auth/v1/admin/users', supabaseUrl);
  url.searchParams.set('email', email);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    cache: 'no-store',
  });

  if (response.status === 404) {
    return null;
  }

  const payloadText = await response.text();

  if (!response.ok) {
    let message = 'No se pudo consultar el estado del usuario en Supabase.';
    try {
      const parsed = payloadText ? (JSON.parse(payloadText) as Record<string, unknown>) : null;
      const errorMessage = parsed?.error_description ?? parsed?.error ?? parsed?.message;
      if (typeof errorMessage === 'string' && errorMessage.trim().length > 0) {
        message = errorMessage;
      }
    } catch {
      // ignore JSON parse errors
    }

    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  if (!payloadText) {
    return null;
  }

  try {
    const payload = JSON.parse(payloadText) as { users?: SupabaseAuthUser[] };
    return payload?.users?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function GET() {
  const supabase = await createClient();

  const { data: therapists, error } = await supabase
    .from('therapists')
    .select('*')
    .order('name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(toCamelCase(therapists));
}

type AdminClient = ReturnType<typeof createAdminClient>;

export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();

  // Temporarily allow all authenticated users to create therapists
  // TODO: Re-enable admin check once first admin user is created
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      {
        error:
          'Falta configurar SUPABASE_SERVICE_ROLE_KEY para crear cuentas de acceso de terapeutas.',
      },
      { status: 503 },
    );
  }

  const rawEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

  if (!rawEmail) {
    return NextResponse.json(
      { error: 'El correo electrónico es obligatorio para crear el acceso del terapeuta.' },
      { status: 400 },
    );
  }

  let adminClient: AdminClient;
  try {
    adminClient = createAdminClient();
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo inicializar el cliente de servicio de Supabase.',
      },
      { status: 503 },
    );
  }

  const sanitizedBody = {
    ...body,
    email: rawEmail,
  };

  let existingAuthUser: SupabaseAuthUser | null = null;

  try {
    existingAuthUser = await fetchAuthUserByEmail(rawEmail);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo comprobar si el correo ya existe en Supabase.',
      },
      { status: 500 },
    );
  }

  let existingAuthUserTherapistId: string | null = null;
  let existingAuthUserRole: string | null = null;

  if (existingAuthUser) {
    const metadata = (existingAuthUser.user_metadata ?? {}) as Record<string, unknown>;
    const therapistId = metadata.therapist_id;
    const role = metadata.role;

    existingAuthUserTherapistId =
      typeof therapistId === 'string' && therapistId.length > 0 ? therapistId : null;
    existingAuthUserRole = typeof role === 'string' && role.length > 0 ? role : null;
  }

  const { data: existingAccountRows, error: existingAccountError } = await adminClient
    .from('users')
    .select('id, therapist_id, role')
    .eq('email', rawEmail)
    .limit(1);

  if (existingAccountError) {
    return NextResponse.json(
      { error: existingAccountError.message ?? 'No se pudo comprobar si el correo ya está en uso.' },
      { status: 500 },
    );
  }

  const existingAccount = (existingAccountRows?.[0] ?? null) as UserAccountSummary | null;

  const therapistIdsToValidate = [
    existingAccount?.therapist_id ?? null,
    existingAuthUserTherapistId,
  ].filter((value): value is string => typeof value === 'string' && value.length > 0);

  let activeTherapistIdSet: Set<string> | null = null;

  if (therapistIdsToValidate.length > 0) {
    const { data: therapistLinkRows, error: therapistLookupError } = await adminClient
      .from('therapists')
      .select('id')
      .in('id', therapistIdsToValidate);

    if (therapistLookupError) {
      return NextResponse.json(
        { error: therapistLookupError.message ?? 'No se pudo validar el estado del terapeuta existente.' },
        { status: 500 },
      );
    }

    const sanitizedTherapistLinks = (therapistLinkRows ?? []) as Array<{ id: string }>;

    activeTherapistIdSet = new Set(sanitizedTherapistLinks.map(link => link.id));
  }

  const authUserHasActiveTherapist = Boolean(
    existingAuthUserTherapistId && activeTherapistIdSet?.has(existingAuthUserTherapistId),
  );

  const accountHasActiveTherapist = Boolean(
    existingAccount?.therapist_id && activeTherapistIdSet?.has(existingAccount.therapist_id),
  );

  if (authUserHasActiveTherapist || accountHasActiveTherapist) {
    return NextResponse.json(
      {
        error:
          'Este correo ya está vinculado a otro terapeuta. Utiliza una dirección diferente o elimina primero la cuenta existente.',
      },
      { status: 409 },
    );
  }

  const authUserRoleIsConflicting = Boolean(
    existingAuthUserRole &&
      existingAuthUserRole !== 'therapist' &&
      existingAuthUserRole !== 'admin',
  );

  if (authUserRoleIsConflicting) {
    return NextResponse.json(
      {
        error:
          'Este correo ya está asignado a otro usuario del sistema. Utiliza una dirección diferente o libera primero la cuenta existente.',
      },
      { status: 409 },
    );
  }

  if (
    existingAccount &&
    !existingAccount.therapist_id &&
    existingAccount.role &&
    existingAccount.role !== 'therapist' &&
    existingAccount.role !== 'admin'
  ) {
    return NextResponse.json(
      {
        error:
          'Este correo ya está asignado a otro usuario del sistema. Utiliza una dirección diferente o libera primero la cuenta existente.',
      },
      { status: 409 },
    );
  }

  const dbData = toSnakeCase(sanitizedBody);

  const { data: therapist, error } = await supabase
    .from('therapists')
    .insert(dbData)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let authUser: SupabaseAuthUser | null = existingAuthUser;
  let createdNewAuthUser = false;

  if (!authUser) {
    const { data: createdUser, error: createUserError } = await adminClient.auth.admin.createUser({
      email: rawEmail,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: {
        role: 'therapist',
        therapist_id: therapist.id,
        must_change_password: true,
      },
    });

    if (createUserError || !createdUser?.user) {
      await supabase.from('therapists').delete().eq('id', therapist.id);
      return NextResponse.json(
        { error: createUserError?.message ?? 'No se pudo crear el usuario del terapeuta.' },
        { status: createUserError?.status === 422 ? 409 : 500 },
      );
    }

    authUser = createdUser.user;
    createdNewAuthUser = true;
  }

  if (!authUser) {
    await supabase.from('therapists').delete().eq('id', therapist.id);
    return NextResponse.json(
      { error: 'No se pudo preparar la cuenta del terapeuta. Inténtalo de nuevo más tarde.' },
      { status: 500 },
    );
  }

  const userRecord: Database['public']['Tables']['users']['Insert'] = {
    id: authUser.id,
    email: authUser.email ?? rawEmail,
    therapist_id: therapist.id,
    role: 'therapist',
    must_change_password: true,
  };

  const adminUsersTable = adminClient.from('users');

  const { error: upsertError } = await (adminUsersTable as unknown as {
    upsert: (
      values:
        | Database['public']['Tables']['users']['Insert']
        | Database['public']['Tables']['users']['Insert'][],
      options?: { onConflict?: string },
    ) => Promise<{ error: { message: string } | null }>;
  }).upsert(userRecord, { onConflict: 'id' });

  if (upsertError) {
    if (createdNewAuthUser) {
      try {
        await adminClient.auth.admin.deleteUser(authUser.id);
      } catch {
        // Ignore cleanup errors
      }
    }

    await supabase.from('therapists').delete().eq('id', therapist.id);

    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  if (!createdNewAuthUser) {
    const currentMetadata = (authUser.user_metadata ?? {}) as Record<string, unknown>;
    const updatedMetadata = {
      ...currentMetadata,
      role: 'therapist',
      therapist_id: therapist.id,
      must_change_password: true,
    };

    const { error: updateError } = await adminClient.auth.admin.updateUserById(authUser.id, {
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: updatedMetadata,
    });

    if (updateError) {
      await supabase.from('therapists').delete().eq('id', therapist.id);
      await (adminUsersTable as unknown as {
        delete: () => {
          eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>;
        };
      })
        .delete()
        .eq('id', authUser.id);

      return NextResponse.json(
        { error: updateError.message ?? 'No se pudo actualizar la cuenta del terapeuta existente.' },
        { status: 500 },
      );
    }
  }

  return NextResponse.json(toCamelCase(therapist), { status: 201 });
}
