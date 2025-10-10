
'use client';

import {
  Fragment,
  useState,
  useEffect,
  useMemo,
  useCallback,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ClientAvailability } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { useAppSettingsValue } from "@/hooks/useAppSettings";
import { buildDayOptions, buildHourRange, deriveCenterHourBounds } from "@/lib/time-utils";

interface ClientAvailabilityMatrixProps {
  open: boolean;
  clientId: string;
  onClose: () => void;
}

export default function ClientAvailabilityMatrix({ open, clientId, onClose }: ClientAvailabilityMatrixProps) {
  const { toast } = useToast();
  const settings = useAppSettingsValue();
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [dragState, setDragState] = useState<{ active: boolean; shouldSelect: boolean } | null>(null);

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

  const { appointmentOpeningHour, appointmentClosingExclusive } = hourBounds;

  const hours = useMemo(
    () => buildHourRange(appointmentOpeningHour, appointmentClosingExclusive),
    [appointmentClosingExclusive, appointmentOpeningHour],
  );

  const dayOptions = useMemo(
    () => buildDayOptions(settings.openOnSaturday, settings.openOnSunday),
    [settings.openOnSaturday, settings.openOnSunday],
  );

  const allowedDayValues = useMemo(() => new Set(dayOptions.map((day) => day.value)), [dayOptions]);

  const {
    data: availabilityData,
    isLoading,
    error,
  } = useQuery<ClientAvailability[]>({
    queryKey: [`/api/availability/${clientId}`],
    enabled: open && !!clientId,
  });

  const availability = useMemo(() => {
    if (!Array.isArray(availabilityData)) {
      return [];
    }

    return availabilityData
      .map((entry) => {
        const { dayOfWeek } = entry ?? {};
        const parsedDay =
          typeof dayOfWeek === "number"
            ? dayOfWeek
            : Number.parseInt(String(dayOfWeek ?? ""), 10);

        if (!Number.isInteger(parsedDay)) {
          return null;
        }

        const extractHour = (value: unknown) => {
          if (typeof value !== "string") {
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

        return { dayOfWeek: parsedDay, startHour, endHour };
      })
      .filter((value): value is { dayOfWeek: number; startHour: number; endHour: number } => value !== null);
  }, [availabilityData]);

  useEffect(() => {
    setSelectedCells(previous => {
      let changed = false;
      const filtered = new Set<string>();

      previous.forEach(key => {
        const [dayPart, hourPart] = key.split('-');
        const dayValue = Number.parseInt(dayPart, 10);
        const hourValue = Number.parseInt(hourPart, 10);

        if (
          allowedDayValues.has(dayValue) &&
          Number.isFinite(hourValue) &&
          hourValue >= appointmentOpeningHour &&
          hourValue < appointmentClosingExclusive
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
  }, [allowedDayValues, appointmentClosingExclusive, appointmentOpeningHour]);

  useEffect(() => {
    if (!open) return;

    const cells = new Set<string>();

    availability.forEach(avail => {
      if (!allowedDayValues.has(avail.dayOfWeek)) {
        return;
      }

      const safeStart = Math.max(appointmentOpeningHour, avail.startHour);
      const safeEnd = Math.min(appointmentClosingExclusive, avail.endHour);

      for (let hour = safeStart; hour < safeEnd; hour++) {
        if (hour >= appointmentOpeningHour && hour < appointmentClosingExclusive) {
          cells.add(`${avail.dayOfWeek}-${hour}`);
        }
      }
    });

    setSelectedCells(cells);
  }, [
    allowedDayValues,
    appointmentClosingExclusive,
    appointmentOpeningHour,
    availability,
    open,
  ]);

  const saveMutation = useMutation({
    mutationFn: async (data: { dayOfWeek: number; startTime: string; endTime: string }[]) => {
      return await apiRequest("PUT", `/api/availability/${clientId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/availability/${clientId}`] });
      toast({
        title: "Disponibilidad actualizada",
        description: "Los horarios se han guardado correctamente",
      });
      onClose();
    },
    onError: (error: Error) => {
      let errorMessage = "No se pudo guardar la disponibilidad";
      
      if (error.message) {
        try {
          const parts = error.message.split(': ');
          if (parts.length > 1) {
            const jsonPart = parts.slice(1).join(': ');
            const parsed = JSON.parse(jsonPart);
            if (parsed.message) {
              errorMessage = parsed.message;
              if (parsed.errors && parsed.errors.length > 0) {
                errorMessage += `: ${parsed.errors[0].message || JSON.stringify(parsed.errors[0])}`;
              }
            }
          }
        } catch {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error al guardar",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const applyCellSelection = useCallback(
    (day: number, hour: number, shouldSelect: boolean) => {
      if (
        !allowedDayValues.has(day) ||
        hour < appointmentOpeningHour ||
        hour >= appointmentClosingExclusive
      ) {
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
    [allowedDayValues, appointmentClosingExclusive, appointmentOpeningHour],
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
    (day: number, hour: number) => (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) {
        return;
      }

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

    window.addEventListener("pointerup", handleWindowPointerUp);

    return () => {
      window.removeEventListener("pointerup", handleWindowPointerUp);
    };
  }, [dragState]);

  const handleSave = () => {
    const blocks: { dayOfWeek: number; startTime: string; endTime: string }[] = [];
    
    dayOptions.forEach(day => {
      let blockStart: number | null = null;

      for (let hour = appointmentOpeningHour; hour <= appointmentClosingExclusive; hour++) {
        const isSelected =
          hour < appointmentClosingExclusive && selectedCells.has(`${day.value}-${hour}`);

        if (isSelected && blockStart === null) {
          blockStart = hour;
        } else if (!isSelected && blockStart !== null) {
          blocks.push({
            dayOfWeek: day.value,
            startTime: `${blockStart.toString().padStart(2, '0')}:00`,
            endTime: `${hour.toString().padStart(2, '0')}:00`,
          });
          blockStart = null;
        }
      }

      if (blockStart !== null) {
        blocks.push({
          dayOfWeek: day.value,
          startTime: `${blockStart.toString().padStart(2, '0')}:00`,
          endTime: `${appointmentClosingExclusive.toString().padStart(2, '0')}:00`,
        });
      }
    });

    saveMutation.mutate(blocks);
  };

  const isCellSelected = (day: number, hour: number) => {
    return selectedCells.has(`${day}-${hour}`);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editor de Disponibilidad</DialogTitle>
          <DialogDescription>
            Marca los horarios en los que el cliente está disponible
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="py-12 text-center text-destructive">
            No se pudo cargar la disponibilidad del cliente.
          </div>
        ) : dayOptions.length === 0 || hours.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            Configura primero los horarios y días de apertura del centro para gestionar la disponibilidad.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                <div className="grid gap-px bg-border" style={{ gridTemplateColumns: `60px repeat(${dayOptions.length}, 1fr)` }}>
                  <div className="bg-background p-2"></div>
                  {dayOptions.map(day => (
                    <div
                      key={day.value}
                      className="bg-background p-2 text-center text-sm font-medium"
                      data-testid={`day-header-${day.value}`}
                    >
                      {day.name}
                    </div>
                  ))}

                  {hours.map(hour => (
                    <Fragment key={hour}>
                      <div
                        className="bg-background p-2 text-sm text-muted-foreground text-right"
                        data-testid={`hour-label-${hour}`}
                      >
                        {hour}:00
                      </div>
                      {dayOptions.map(day => (
                        <button
                          key={`${day.value}-${hour}`}
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
                            isCellSelected(day.value, hour)
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                          aria-pressed={isCellSelected(day.value, hour)}
                          data-testid={`cell-${day.value}-${hour}`}
                        />
                      ))}
                    </Fragment>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={saveMutation.isPending}
                data-testid="button-cancel"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                data-testid="button-save"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar Disponibilidad'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
