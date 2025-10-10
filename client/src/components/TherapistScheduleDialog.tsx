import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, RotateCcw } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAppSettingsValue } from "@/hooks/useAppSettings";
import { buildDayOptions, buildHourRange, deriveCenterHourBounds } from "@/lib/time-utils";
import type { TherapistWorkingHours } from "@shared/schema";

type DragState = { active: boolean; shouldSelect: boolean } | null;

function serializeCells(cells: Set<string>): string {
  return Array.from(cells).sort().join("|");
}

function parseHour(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const match = value.trim().match(/^(\d{1,2})/);
  if (!match) {
    return null;
  }

  const hour = Number.parseInt(match[1] ?? "", 10);
  return Number.isFinite(hour) ? hour : null;
}

interface TherapistScheduleDialogProps {
  therapistId: string;
  therapistName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TherapistScheduleDialog({
  therapistId,
  therapistName,
  open,
  onOpenChange,
}: TherapistScheduleDialogProps) {
  const { toast } = useToast();
  const settings = useAppSettingsValue();
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [dragState, setDragState] = useState<DragState>(null);
  const [initialSnapshot, setInitialSnapshot] = useState<string>("");

  const hourBounds = useMemo(
    () =>
      deriveCenterHourBounds({
        appointmentOpensAt: settings.appointmentOpensAt,
        appointmentClosesAt: settings.appointmentClosesAt,
        workOpensAt: settings.centerOpensAt,
        workClosesAt: settings.centerClosesAt,
      }),
    [
      settings.appointmentClosesAt,
      settings.appointmentOpensAt,
      settings.centerClosesAt,
      settings.centerOpensAt,
    ],
  );

  const { workOpeningHour, workClosingExclusive } = hourBounds;

  const hours = useMemo(
    () => buildHourRange(workOpeningHour, workClosingExclusive),
    [workClosingExclusive, workOpeningHour],
  );

  const dayOptions = useMemo(
    () => buildDayOptions(settings.openOnSaturday, settings.openOnSunday),
    [settings.openOnSaturday, settings.openOnSunday],
  );

  const allowedDayValues = useMemo(() => new Set(dayOptions.map((day) => day.value)), [dayOptions]);

  const {
    data: existingSchedule = [],
    isLoading,
    error,
    refetch,
  } = useQuery<TherapistWorkingHours[]>({
    queryKey: ["/api/therapists", therapistId, "schedule"],
    enabled: open,
  });

  const rebuildSelectionFromSchedule = useCallback(
    (schedule: TherapistWorkingHours[]) => {
      const cells = new Set<string>();

      schedule.forEach((slot) => {
        if (!allowedDayValues.has(slot.dayOfWeek)) {
          return;
        }

        const startHour = parseHour(slot?.startTime ?? null);
        const endHour = parseHour(slot?.endTime ?? null);

        if (!Number.isFinite(startHour) || !Number.isFinite(endHour)) {
          return;
        }

        const normalizedStart = Math.max(workOpeningHour, startHour as number);
        const normalizedEnd = Math.min(workClosingExclusive, Math.max(normalizedStart, endHour as number));

        for (let hour = normalizedStart; hour < normalizedEnd; hour++) {
          if (hour >= workOpeningHour && hour < workClosingExclusive) {
            cells.add(`${slot.dayOfWeek}-${hour}`);
          }
        }
      });

      setSelectedCells(cells);
      setInitialSnapshot(serializeCells(cells));
    },
    [allowedDayValues, workClosingExclusive, workOpeningHour],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    rebuildSelectionFromSchedule(existingSchedule);
  }, [existingSchedule, open, rebuildSelectionFromSchedule]);

  useEffect(() => {
    setSelectedCells((previous) => {
      let changed = false;
      const filtered = new Set<string>();

      previous.forEach((key) => {
        const [dayPart, hourPart] = key.split("-");
        const dayValue = Number.parseInt(dayPart, 10);
        const hourValue = Number.parseInt(hourPart, 10);

        if (
          allowedDayValues.has(dayValue) &&
          Number.isFinite(hourValue) &&
          hourValue >= workOpeningHour &&
          hourValue < workClosingExclusive
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
  }, [allowedDayValues, workClosingExclusive, workOpeningHour]);

  useEffect(() => {
    if (!dragState?.active) {
      return;
    }

    const handlePointerUp = () => {
      setDragState(null);
    };

    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragState]);

  const applyCellSelection = useCallback(
    (day: number, hour: number, shouldSelect: boolean) => {
      if (!allowedDayValues.has(day) || hour < workOpeningHour || hour >= workClosingExclusive) {
        return;
      }

      setSelectedCells((previous) => {
        const next = new Set(previous);
        const key = `${day}-${hour}`;

        if (shouldSelect) {
          next.add(key);
        } else {
          next.delete(key);
        }

        return next;
      });
    },
    [allowedDayValues, workClosingExclusive, workOpeningHour],
  );

  const toggleCell = useCallback(
    (day: number, hour: number) => {
      const key = `${day}-${hour}`;
      const shouldSelect = !selectedCells.has(key);
      applyCellSelection(day, hour, shouldSelect);
    },
    [applyCellSelection, selectedCells],
  );

  const handlePointerDown = useCallback(
    (day: number, hour: number) => (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      const key = `${day}-${hour}`;
      const shouldSelect = !selectedCells.has(key);

      setDragState({ active: true, shouldSelect });
      applyCellSelection(day, hour, shouldSelect);
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [applyCellSelection, selectedCells],
  );

  const handlePointerEnter = useCallback(
    (day: number, hour: number) => (event: React.PointerEvent<HTMLButtonElement>) => {
      if (!dragState?.active) {
        return;
      }

      event.preventDefault();
      applyCellSelection(day, hour, dragState.shouldSelect);
    },
    [applyCellSelection, dragState],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (!dragState?.active) {
        return;
      }

      event.preventDefault();
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      setDragState(null);
    },
    [dragState],
  );

  const resetSelection = useCallback(() => {
    rebuildSelectionFromSchedule(existingSchedule);
  }, [existingSchedule, rebuildSelectionFromSchedule]);

  const saveMutation = useMutation({
    mutationFn: async (data: { dayOfWeek: number; startTime: string; endTime: string }[]) => {
      return await apiRequest("PUT", `/api/therapists/${therapistId}/schedule`, { slots: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/therapists", therapistId, "schedule"] });
      queryClient.invalidateQueries({ queryKey: ["/api/therapists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/therapist-working-hours"] });
      setInitialSnapshot(serializeCells(selectedCells));
      toast({
        title: "Horario actualizado",
        description: "Los bloques de trabajo se guardaron correctamente.",
      });
      onOpenChange(false);
    },
    onError: (mutationError: Error) => {
      toast({
        title: "Error al guardar",
        description: mutationError.message || "No se pudo guardar el horario del terapeuta.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const blocks: { dayOfWeek: number; startTime: string; endTime: string }[] = [];

    dayOptions.forEach((day) => {
      let blockStart: number | null = null;

      for (let hour = workOpeningHour; hour <= workClosingExclusive; hour++) {
        const isSelected =
          hour < workClosingExclusive && selectedCells.has(`${day.value}-${hour}`);

        if (isSelected && blockStart === null) {
          blockStart = hour;
        } else if (!isSelected && blockStart !== null) {
          const cappedEnd = Math.min(hour, workClosingExclusive);
          if (cappedEnd > blockStart) {
            blocks.push({
              dayOfWeek: day.value,
              startTime: `${blockStart.toString().padStart(2, "0")}:00`,
              endTime: `${cappedEnd.toString().padStart(2, "0")}:00`,
            });
          }
          blockStart = null;
        }
      }

      if (blockStart !== null) {
        const finalEnd = workClosingExclusive;
        if (finalEnd > blockStart) {
          blocks.push({
            dayOfWeek: day.value,
            startTime: `${blockStart.toString().padStart(2, "0")}:00`,
            endTime: `${finalEnd.toString().padStart(2, "0")}:00`,
          });
        }
      }
    });

    saveMutation.mutate(blocks);
  };

  const isSaving = saveMutation.isPending;
  const hasChanges = useMemo(() => serializeCells(selectedCells) !== initialSnapshot, [selectedCells, initialSnapshot]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestionar horario de {therapistName}</DialogTitle>
          <DialogDescription>
            Pinta los bloques en los que el terapeuta trabajará. Los horarios se ajustan automáticamente a la
            configuración del centro.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="space-y-4">
            <p className="text-sm text-destructive">
              {error instanceof Error ? error.message : "No se pudo cargar el horario del terapeuta."}
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
              Reintentar
            </Button>
          </div>
        ) : dayOptions.length === 0 || hours.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            Configura primero los horarios y días de apertura del centro para gestionar los horarios.
          </div>
        ) : (
          <div className="space-y-4">
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
                        const key = `${day.value}-${hour}`;
                        const isSelected = selectedCells.has(key);
                        return (
                          <button
                            key={key}
                            type="button"
                            onPointerDown={handlePointerDown(day.value, hour)}
                            onPointerEnter={handlePointerEnter(day.value, hour)}
                            onPointerUp={handlePointerUp}
                            onKeyDown={(event) => {
                              if (event.key === " " || event.key === "Enter") {
                                event.preventDefault();
                                toggleCell(day.value, hour);
                              }
                            }}
                            className={`p-2 min-h-[40px] transition-colors hover-elevate active-elevate-2 ${
                              isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                            }`}
                            aria-pressed={isSelected}
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
                onClick={resetSelection}
                disabled={isSaving || !hasChanges}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Descartar cambios
              </Button>
              <Button type="button" onClick={handleSave} disabled={isSaving || !hasChanges}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar horario"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
