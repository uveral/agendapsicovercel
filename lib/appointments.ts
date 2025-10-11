import { supabase } from './supabase';
import type { Database } from '@/types/supabase';

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled';

export interface CreateAppointmentInput {
  therapist_id: string;
  client_id: string;
  start_at: string | Date;
  duration?: string;
  status?: AppointmentStatus;
  notes?: string;
}

export async function createAppointment(input: CreateAppointmentInput) {
  const payload: Database['public']['Tables']['appointments']['Insert'] = {
    therapist_id: input.therapist_id,
    client_id: input.client_id,
    start_at: input.start_at instanceof Date ? input.start_at.toISOString() : input.start_at,
    duration: input.duration ?? '60 minutes',
    status: input.status ?? 'pending',
    notes: input.notes ?? null,
  };

  const { data, error } = await supabase
    .from('appointments')
    .insert<Database['public']['Tables']['appointments']['Insert']>(payload)
    .select()
    .single();

  if (error) {
    if ((error as { code?: string }).code === '23P01') {
      throw new Error('OVERLAP');
    }

    throw error;
  }

  return data;
}

export async function listTherapistAppointmentsByDay(therapist_id: string, dayISO: string) {
  const start = new Date(`${dayISO}T00:00:00Z`).toISOString();
  const end = new Date(`${dayISO}T23:59:59Z`).toISOString();

  const { data, error } = await supabase
    .from('appointments')
    .select('id, start_at, duration, status, client:clients (id, first_name, last_name)')
    .eq('therapist_id', therapist_id)
    .gte('start_at', start)
    .lte('start_at', end)
    .order('start_at', { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}
