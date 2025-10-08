'use client';

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiRequest } from '@/lib/queryClient';

export interface AppSettings {
  showWeekends: boolean;
  therapistCanViewOthers: boolean;
  therapistCanEditOthers: boolean;
}

const SETTINGS_QUERY_KEY = ['/api/app-settings'];

const DEFAULT_SETTINGS: AppSettings = {
  showWeekends: false,
  therapistCanViewOthers: false,
  therapistCanEditOthers: false,
};

function withDefaults(data: Partial<AppSettings> | null | undefined): AppSettings {
  return {
    showWeekends: data?.showWeekends ?? DEFAULT_SETTINGS.showWeekends,
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
    mutationFn: async (updates: Partial<AppSettings>) => {
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
