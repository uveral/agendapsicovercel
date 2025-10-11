import { supabase } from './supabase';
import type { Database } from '@/types/supabase';

export interface CreateClientInput {
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}

export async function createClient(input: CreateClientInput) {
  const { data, error } = await supabase
    .from('clients')
    .insert<Database['public']['Tables']['clients']['Insert']>(input)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
