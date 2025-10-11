'use client';

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiRequest } from '@/lib/queryClient';
import { normalizeScheduleConfig } from '@/lib/time-utils';

export interface AppSettings {
  centerOpensAt: string;
  centerClosesAt: string;
  appointmentOpensAt: string;
  appointmentClosesAt: string;
  openOnSaturday: boolean;
  openOnSunday: boolean;
  therapistCanViewOthers: boolean;
  therapistCanEditOthers: boolean;
}

type AppSettingsUpdate = Partial<AppSettings>;

const SETTINGS_QUERY_KEY = ['/api/app-settings'];

const DEFAULT_SETTINGS: AppSettings = {
  centerOpensAt: '09:00',
  centerClosesAt: '21:00',
  appointmentOpensAt: '09:00',
  appointmentClosesAt: '20:00',
  openOnSaturday: false,
  openOnSunday: false,
  therapistCanViewOthers: false,
  therapistCanEditOthers: false,
};

function normalizeTime(value: unknown, fallback: string): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      const hours = Math.min(23, Math.max(0, Number.parseInt(match[1], 10)));
      const minutes = Math.min(59, Math.max(0, Number.parseInt(match[2], 10)));
      return `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}`;
    }
  }

  return fallback;
}

function withDefaults(data: Partial<AppSettings> | null | undefined): AppSettings {
  const normalizedSchedule = normalizeScheduleConfig({
    workOpensAt: normalizeTime(data?.centerOpensAt, DEFAULT_SETTINGS.centerOpensAt),
    workClosesAt: normalizeTime(data?.centerClosesAt, DEFAULT_SETTINGS.centerClosesAt),
    appointmentOpensAt: normalizeTime(
      data?.appointmentOpensAt,
      data?.centerOpensAt ?? DEFAULT_SETTINGS.appointmentOpensAt,
    ),
    appointmentClosesAt: normalizeTime(
      data?.appointmentClosesAt,
      data?.centerClosesAt ?? DEFAULT_SETTINGS.appointmentClosesAt,
    ),
  });

  return {
    centerOpensAt: normalizedSchedule.workOpensAt,
    centerClosesAt: normalizedSchedule.workClosesAt,
    appointmentOpensAt: normalizedSchedule.appointmentOpensAt,
    appointmentClosesAt: normalizedSchedule.appointmentClosesAt,
    openOnSaturday: data?.openOnSaturday ?? DEFAULT_SETTINGS.openOnSaturday,
    openOnSunday: data?.openOnSunday ?? DEFAULT_SETTINGS.openOnSunday,
    therapistCanViewOthers: data?.therapistCanViewOthers ?? DEFAULT_SETTINGS.therapistCanViewOthers,
    therapistCanEditOthers: data?.therapistCanEditOthers ?? DEFAULT_SETTINGS.therapistCanEditOthers,
  };
}

export function useAppSettings() {
  return useQuery<AppSettings>({
    queryKey: SETTINGS_QUERY_KEY,
    initialData: DEFAULT_SETTINGS,
    select: (data) => withDefaults(data),
  });
}

export function useUpdateAppSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: AppSettingsUpdate) => {
      const result = await apiRequest('PUT', '/api/app-settings', updates);
      return withDefaults(result as Partial<AppSettings>);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(SETTINGS_QUERY_KEY, data);
    },
  });
}

export function useAppSettingsValue() {
  const { data } = useAppSettings();
  return useMemo(() => withDefaults(data), [data]);
}
