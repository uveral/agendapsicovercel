'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { SAMPLE_APPOINTMENTS } from '@/shared/sampleCalendarData';
import {
  normalizeSampleAppointments,
  normalizeSupabaseAppointments,
  type ApiAppointmentRecord,
  type NormalizedAppointment,
} from '@/shared/diagnosticCalendarData';

export function useDiagnosticCalendarData(): {
  appointments: NormalizedAppointment[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  source: 'supabase' | 'sample';
} {
  const { data, isPending, isError, error } = useQuery<ApiAppointmentRecord[]>({
    queryKey: ['/api/appointments'],
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const supabaseAppointments = useMemo(
    () => (data && data.length > 0 ? normalizeSupabaseAppointments(data) : []),
    [data],
  );

  const sampleAppointments = useMemo(() => normalizeSampleAppointments(SAMPLE_APPOINTMENTS), []);

  const hasSupabaseData = supabaseAppointments.length > 0;

  return {
    appointments: hasSupabaseData ? supabaseAppointments : sampleAppointments,
    isLoading: isPending,
    isError,
    error,
    source: hasSupabaseData ? 'supabase' : 'sample',
  };
}

