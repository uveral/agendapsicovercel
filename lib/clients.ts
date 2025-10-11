import { supabase } from './supabase';

export interface CreateClientInput {
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}

export async function createClient(input: CreateClientInput) {
  const { data, error } = await supabase.from('clients').insert(input).select().single();

  if (error) {
    throw error;
  }

  return data;
}
