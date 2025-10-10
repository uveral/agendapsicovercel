'use client';

import {
  useState,
  useMemo,
  useEffect,
  useCallback,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAppSettingsValue } from '@/hooks/useAppSettings';
import type { TherapistWorkingHours } from '@/lib/types';
import { buildDayOptions, buildHourRange, deriveCenterHourBounds } from '@/lib/time-utils';

interface TherapistScheduleMatrixProps {
  therapistId: string;
  canEdit?: boolean;
}

type DragState = { active: boolean; shouldSelect: boolean } | null;

type NormalizedSlot = {
  dayOfWeek: number;
  startHour: number;
  endHour: number;
};

function serializeCells(cells: Set<string>): string {
  return Array.from(cells).sort().join('|');
}

export function TherapistScheduleMatrix({
  therapistId,
  canEdit = false,
}: TherapistScheduleMatrixProps) {
  const { toast } = useToast();
  const settings = useAppSettingsValue();
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [dragState, setDragState] = useState<DragState>(null);
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);
  const [initialSnapshot, setInitialSnapshot] = useState<string | null>(null);

  const hourBounds = useMemo(
    () => deriveCenterHourBounds(settings.centerOpensAt, settings.centerClosesAt),
    [settings.centerClosesAt, settings.centerOpensAt],
  );

  const { openingHour, therapistClosingExclusive, centerClosingExclusive } = hourBounds;

  const hours = useMemo(
    () => buildHourRange(openingHour, therapistClosingExclusive),
    [openingHour, therapistClosingExclusive],
  );

  const dayOptions = useMemo(
    () => buildDayOptions(settings.openOnSaturday, settings.openOnSunday),
    [settings.openOnSaturday, settings.openOnSunday],
  );

  const allowedDayValues = useMemo(() => new Set(dayOptions.map((day) => day.value)), [dayOptions]);

  const {
    data: scheduleData,
    isLoading,
    error,
    refetch,
  } = useQuery<TherapistWorkingHours[]>({
    queryKey: [`/api/therapists/${therapistId}/schedule`],
    enabled: therapistId.length > 0,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: 'always',
    refetchOnReconnect: 'always',
  });

  const normalizedSchedule = useMemo<NormalizedSlot[]>(() => {
    if (!Array.isArray(scheduleData)) {
      return [];
    }

    return scheduleData
      .map((entry) => {
        const parsedDay = Number.parseInt(String(entry?.dayOfWeek ?? ''), 10);
        if (!Number.isFinite(parsedDay)) {
          return null;
        }

        const extractHour = (value: unknown) => {
          if (typeof value !== 'string') {
            return null;
          }

          const match = value.trim().match(/^(\d{1,2})/);
          if (!match) {
            return null;
          }

          const hour = Number.parseInt(match[1], 10);
          return Number.isFinite(hour) ? hour : null;
        };

        const startHour = extractHour(entry?.startTime);
        const endHour = extractHour(entry?.endTime);

        if (startHour === null || endHour === null) {
          return null;
        }

        return {
          dayOfWeek: ((parsedDay % 7) + 7) % 7,
          startHour,
          endHour,
        } satisfies NormalizedSlot;
      })
      .filter((value): value is NormalizedSlot => value !== null);
  }, [scheduleData]);

  const scheduleKey = useMemo(() => JSON.stringify(normalizedSchedule), [normalizedSchedule]);

  const buildCellsFromSchedule = useCallback(() => {
    const cells = new Set<string>();

    normalizedSchedule.forEach((slot) => {
      if (!allowedDayValues.has(slot.dayOfWeek)) {
        return;
      }

      const safeStart = Math.max(openingHour, slot.startHour);
      const shouldExtendToClosing = slot.endHour >= centerClosingExclusive;
      const cappedEnd = shouldExtendToClosing ? slot.endHour + 1 : slot.endHour;
      const safeEnd = Math.min(therapistClosingExclusive, cappedEnd);

      for (let hour = safeStart; hour < safeEnd; hour++) {
        if (hour >= openingHour && hour < therapistClosingExclusive) {
          cells.add(`${slot.dayOfWeek}-${hour}`);
        }
      }
    });

    return cells;
  }, [allowedDayValues, centerClosingExclusive, normalizedSchedule, openingHour, therapistClosingExclusive]);

  useEffect(() => {
    if (hydratedKey === scheduleKey) {
      return;
    }

    const nextCells = buildCellsFromSchedule();
    setSelectedCells(nextCells);
    const snapshot = serializeCells(nextCells);
    setInitialSnapshot(snapshot);
    setHydratedKey(scheduleKey);
  }, [buildCellsFromSchedule, hydratedKey, scheduleKey]);

  useEffect(() => {
    setSelectedCells((previous) => {
      let changed = false;
      const filtered = new Set<string>();

      previous.forEach((key) => {
        const [dayPart, hourPart] = key.split('-');
        const dayValue = Number.parseInt(dayPart, 10);
        const hourValue = Number.parseInt(hourPart, 10);

        if (
          allowedDayValues.has(dayValue) &&
          Number.isFinite(hourValue) &&
          hourValue >= openingHour &&
          hourValue < therapistClosingExclusive
        ) {
          filtered.add(key);
        } else {
          changed = true;
        }
      });

      if (!changed && filtered.size === previous.size) {
        return previous;
      }

      return filtered;
    });
  }, [allowedDayValues, openingHour, therapistClosingExclusive]);

  const applyCellSelection = useCallback(
    (day: number, hour: number, shouldSelect: boolean) => {
      if (!canEdit) {
        return;
      }

      if (!allowedDayValues.has(day) || hour < openingHour || hour >= therapistClosingExclusive) {
        return;
      }

      const key = `${day}-${hour}`;

      setSelectedCells((previous) => {
        const next = new Set(previous);

        if (shouldSelect) {
          if (next.has(key)) {
            return previous;
          }
          next.add(key);
          return next;
        }

        if (!next.has(key)) {
          return previous;
        }

        next.delete(key);
        return next;
      });
    },
    [allowedDayValues, canEdit, openingHour, therapistClosingExclusive],
  );

  const toggleCell = useCallback(
    (day: number, hour: number) => {
      if (!canEdit) {
        return;
      }

      const key = `${day}-${hour}`;
      const shouldSelect = !selectedCells.has(key);
      applyCellSelection(day, hour, shouldSelect);
    },
    [applyCellSelection, canEdit, selectedCells],
  );

  const handlePointerDown = useCallback(
    (day: number, hour: number) => (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!canEdit || event.button !== 0) {
        return;
      }

      event.preventDefault();

      const key = `${day}-${hour}`;
      const shouldSelect = !selectedCells.has(key);

      setDragState({ active: true, shouldSelect });
      applyCellSelection(day, hour, shouldSelect);
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [applyCellSelection, canEdit, selectedCells],
  );

  const handlePointerEnter = useCallback(
    (day: number, hour: number) => (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!dragState?.active) {
        return;
      }

      event.preventDefault();
      applyCellSelection(day, hour, dragState.shouldSelect);
    },
    [applyCellSelection, dragState],
  );

  const handlePointerUp = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!dragState?.active) {
      return;
    }

    event.preventDefault();
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setDragState(null);
  }, [dragState]);

  useEffect(() => {
    if (!dragState?.active) {
      return;
    }

    const handleWindowPointerUp = () => {
      setDragState(null);
    };

    window.addEventListener('pointerup', handleWindowPointerUp);

    return () => {
      window.removeEventListener('pointerup', handleWindowPointerUp);
    };
  }, [dragState]);

  const saveMutation = useMutation({
    mutationFn: async (data: { dayOfWeek: number; startTime: string; endTime: string }[]) => {
      return await apiRequest('PUT', `/api/therapists/${therapistId}/schedule`, {
        slots: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/therapists/${therapistId}/schedule`] });
      queryClient.invalidateQueries({ queryKey: ['/api/therapists'] });
      queryClient.invalidateQueries({ queryKey: ['/api/therapist-working-hours'] });
      const snapshot = serializeCells(selectedCells);
      setInitialSnapshot(snapshot);
      toast({
        title: 'Horario actualizado',
        description: 'Los bloques de trabajo se guardaron correctamente.',
      });
    },
    onError: (mutationError: Error) => {
      toast({
        title: 'Error al guardar',
        description: mutationError.message || 'No se pudo guardar el horario del terapeuta.',
        variant: 'destructive',
      });
    },
  });

  const handleSave = () => {
    if (!canEdit) {
      return;
    }

    const blocks: { dayOfWeek: number; startTime: string; endTime: string }[] = [];

    dayOptions.forEach((day) => {
      let blockStart: number | null = null;

      for (let hour = openingHour; hour <= therapistClosingExclusive; hour++) {
        const isSelected =
          hour < therapistClosingExclusive && selectedCells.has(`${day.value}-${hour}`);

        if (isSelected && blockStart === null) {
          blockStart = hour;
        } else if (!isSelected && blockStart !== null) {
          const cappedEnd = Math.min(hour, centerClosingExclusive);
          if (cappedEnd > blockStart) {
            blocks.push({
              dayOfWeek: day.value,
              startTime: `${blockStart.toString().padStart(2, '0')}:00`,
              endTime: `${cappedEnd.toString().padStart(2, '0')}:00`,
            });
          }
          blockStart = null;
        }
      }

      if (blockStart !== null) {
        const finalEnd = Math.min(therapistClosingExclusive, centerClosingExclusive);
        if (finalEnd > blockStart) {
          blocks.push({
            dayOfWeek: day.value,
            startTime: `${blockStart.toString().padStart(2, '0')}:00`,
            endTime: `${finalEnd.toString().padStart(2, '0')}:00`,
          });
        }
      }
    });

    saveMutation.mutate(blocks);
  };

  const handleReset = () => {
    const nextCells = buildCellsFromSchedule();
    setSelectedCells(nextCells);
    const snapshot = serializeCells(nextCells);
    setInitialSnapshot(snapshot);
  };

  const currentSnapshot = useMemo(() => serializeCells(selectedCells), [selectedCells]);
  const hasChanges = initialSnapshot !== null && currentSnapshot !== initialSnapshot;
  const isSaving = saveMutation.isPending;

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-destructive/50 p-6 text-center">
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : 'No se pudo cargar el horario del terapeuta.'}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : dayOptions.length === 0 || hours.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          Configura primero los horarios y días de apertura del centro para gestionar los horarios del terapeuta.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              <div
                className="grid gap-px bg-border"
                style={{ gridTemplateColumns: `60px repeat(${dayOptions.length}, 1fr)` }}
              >
                <div className="bg-background p-2" />
                {dayOptions.map((day) => (
                  <div
                    key={day.value}
                    className="bg-background p-2 text-center text-sm font-medium"
                    data-testid={`therapist-day-header-${day.value}`}
                  >
                    {day.name}
                  </div>
                ))}

                {hours.map((hour) => (
                  <div key={hour} className="contents">
                    <div
                      className="bg-background p-2 text-sm text-muted-foreground text-right"
                      data-testid={`therapist-hour-label-${hour}`}
                    >
                      {hour}:00
                    </div>
                    {dayOptions.map((day) => {
                      const isSelected = selectedCells.has(`${day.value}-${hour}`);
                      return (
                        <button
                          key={`${day.value}-${hour}`}
                          type="button"
                          onPointerDown={handlePointerDown(day.value, hour)}
                          onPointerEnter={handlePointerEnter(day.value, hour)}
                          onPointerUp={handlePointerUp}
                          onKeyDown={(event) => {
                            if (!canEdit) {
                              return;
                            }
                            if (event.key === ' ' || event.key === 'Enter') {
                              event.preventDefault();
                              toggleCell(day.value, hour);
                            }
                          }}
                          className={`p-2 min-h-[40px] transition-colors ${
                            canEdit ? 'hover-elevate active-elevate-2' : 'cursor-not-allowed'
                          } ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                          aria-pressed={isSelected}
                          aria-disabled={!canEdit}
                          disabled={!canEdit}
                          data-testid={`therapist-cell-${day.value}-${hour}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={!canEdit || isSaving || !hasChanges}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Descartar cambios
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!canEdit || isSaving || !hasChanges}
              data-testid="button-save-therapist-schedule"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar horario'
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default TherapistScheduleMatrix;
