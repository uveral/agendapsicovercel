import { createAdminClient, createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';
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

  if (existingAccount) {
    const message = existingAccount.therapist_id
      ? 'Este correo ya está vinculado a otro terapeuta. Utiliza una dirección diferente.'
      : 'Este correo ya pertenece a otro usuario. Utiliza una dirección diferente.';

    return NextResponse.json({ error: message }, { status: 409 });
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

  const authUser = createdUser.user;

  const userRecord: Database['public']['Tables']['users']['Insert'] = {
    id: authUser.id,
    email: authUser.email,
    therapist_id: therapist.id,
    role: 'therapist',
    must_change_password: true,
  };

  const { error: upsertError } = await (adminClient as unknown as {
    from: (table: 'users') => {
      upsert: (
        values: Database['public']['Tables']['users']['Insert'],
        options: { onConflict: string },
      ) => Promise<{ error: { message: string } | null }>;
    };
  })
    .from('users')
    .upsert(userRecord, { onConflict: 'id' });

  if (upsertError) {
    try {
      await adminClient.auth.admin.deleteUser(authUser.id);
    } catch {
      // Ignore cleanup errors
    }

    await supabase.from('therapists').delete().eq('id', therapist.id);

    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json(toCamelCase(therapist), { status: 201 });
}
