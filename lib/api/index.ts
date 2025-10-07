import { createClient } from '@/lib/supabase/client';
import type { Appointment, Therapist, User } from '@/lib/types';

const supabase = createClient();

export async function getAppointments(): Promise<Appointment[]> {
  const { data, error } = await supabase.from('appointments').select('*');
  if (error) {
    console.error('Error fetching appointments:', error);
    return [];
  }
  return data as Appointment[];
}

export async function getTherapists(): Promise<Therapist[]> {
  const { data, error } = await supabase.from('therapists').select('*');
  if (error) {
    console.error('Error fetching therapists:', error);
    return [];
  }
  return data as Therapist[];
}

export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase.from('users').select('*');
  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }
  return data as User[];
}
