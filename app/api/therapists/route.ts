import { createAdminClient, createClient } from '@/lib/supabase/server';
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
const SERVICE_ROLE_AVAILABLE = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

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

export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();

  // Temporarily allow all authenticated users to create therapists
  // TODO: Re-enable admin check once first admin user is created
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!SERVICE_ROLE_AVAILABLE) {
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

  const adminClient = await createAdminClient();

  const sanitizedBody = {
    ...body,
    email: rawEmail,
  };

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

  const { error: upsertError } = await adminClient
    .from('users')
    .upsert(
      {
        id: authUser.id,
        email: authUser.email,
        therapist_id: therapist.id,
        role: 'therapist',
        must_change_password: true,
      },
      { onConflict: 'id' },
    );

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
