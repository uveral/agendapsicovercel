import { admin } from './supabase';
import type { CreateAdminInput, CreateTherapistInput, UserRole } from './types';

function assertTherapistColor(color?: string) {
  return color && color.trim().length > 0 ? color : '#3b82f6';
}

export async function createTherapistAccount(input: CreateTherapistInput) {
  const { data: therapistRow, error: therapistError } = await admin
    .from('therapists')
    .insert({
      name: input.therapist.name,
      specialty: input.therapist.specialty,
      email: input.therapist.email ?? null,
      phone: input.therapist.phone ?? null,
      color: assertTherapistColor(input.therapist.color),
    })
    .select('id')
    .single();

  if (therapistError) {
    throw therapistError;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: input.account.email,
    password: input.account.password,
    email_confirm: true,
    user_metadata: {
      role: 'therapist',
      must_change_password: true,
    },
  });

  if (error) {
    throw error;
  }

  const user = data.user;

  if (!user) {
    throw new Error('No user returned from Supabase Auth');
  }

  const { error: upsertError } = await admin.from('users').insert({
    id: user.id,
    email: input.account.email,
    first_name: input.account.first_name ?? null,
    last_name: input.account.last_name ?? null,
    phone: null,
    role: 'therapist',
    therapist_id: therapistRow.id,
  });

  if (upsertError) {
    throw upsertError;
  }

  return { authUser: user, therapist_id: therapistRow.id };
}

export async function createAdminAccount(input: CreateAdminInput) {
  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      role: 'admin',
      must_change_password: true,
    },
  });

  if (error) {
    throw error;
  }

  const user = data.user;

  if (!user) {
    throw new Error('No user returned from Supabase Auth');
  }

  const { error: profileError } = await admin.from('users').insert({
    id: user.id,
    email: input.email,
    first_name: input.first_name ?? null,
    last_name: input.last_name ?? null,
    phone: null,
    role: 'admin',
    therapist_id: null,
  });

  if (profileError) {
    throw profileError;
  }

  return { authUser: user };
}

export async function setUserRole(userId: string, role: UserRole) {
  const { error } = await admin.from('users').update({ role }).eq('id', userId);

  if (error) {
    throw error;
  }

  await admin.auth.admin.updateUserById(userId, {
    user_metadata: { role },
  });
}

export async function changePasswordAndClearFlag(userId: string, newPassword: string) {
  await admin.auth.admin.updateUserById(userId, {
    password: newPassword,
    user_metadata: { must_change_password: false },
  });
}
