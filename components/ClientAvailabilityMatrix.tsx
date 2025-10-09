
'use client';

import { Fragment, useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ClientAvailability } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { useAppSettingsValue } from "@/hooks/useAppSettings";

interface ClientAvailabilityMatrixProps {
  open: boolean;
  clientId: string;
  onClose: () => void;
}

export default function ClientAvailabilityMatrix({ open, clientId, onClose }: ClientAvailabilityMatrixProps) {
  const { toast } = useToast();
  const settings = useAppSettingsValue();
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());

  const { openingHour, closingHourExclusive } = useMemo(() => {
    const parseTime = (value: string, fallback: number) => {
      const [hourPart = "", minutePart = ""] = value.split(":");
      const hours = Number.parseInt(hourPart, 10);
      const minutes = Number.parseInt(minutePart, 10);

      if (!Number.isFinite(hours) || hours < 0 || hours > 23) {
        return { hours: fallback, minutes: 0 };
      }

      if (!Number.isFinite(minutes) || minutes < 0 || minutes > 59) {
        return { hours, minutes: 0 };
      }

      return { hours, minutes };
    };

    const defaultOpen = 9;
    const defaultClose = 21;

    const { hours: opensAt, minutes: opensAtMinutes } = parseTime(
      settings.centerOpensAt,
      defaultOpen,
    );
    const { hours: closesAt, minutes: closesAtMinutes } = parseTime(
      settings.centerClosesAt,
      defaultClose,
    );

    let startHour = opensAt;
    if (opensAtMinutes > 0) {
      startHour += opensAtMinutes / 60;
    }

    let endHour = closesAt;
    if (closesAtMinutes > 0) {
      endHour += 1;
    }

    if (!Number.isFinite(startHour) || !Number.isFinite(endHour) || endHour <= startHour) {
      startHour = defaultOpen;
      endHour = defaultClose;
    }

    return {
      openingHour: Math.floor(startHour),
      closingHourExclusive: Math.ceil(endHour),
    };
  }, [settings.centerClosesAt, settings.centerOpensAt]);

  const hours = useMemo(() => {
    const list: number[] = [];
    for (let hour = openingHour; hour < closingHourExclusive; hour++) {
      list.push(hour);
    }
    return list;
  }, [closingHourExclusive, openingHour]);

  const dayOptions = useMemo(
    () =>
      [
        { name: "Lun", value: 1 },
        { name: "Mar", value: 2 },
        { name: "Mié", value: 3 },
        { name: "Jue", value: 4 },
        { name: "Vie", value: 5 },
        { name: "Sáb", value: 6 },
        { name: "Dom", value: 0 },
      ].filter((day) => {
        if (day.value === 6) {
          return settings.openOnSaturday;
        }
        if (day.value === 0) {
          return settings.openOnSunday;
        }
        return true;
      }),
    [settings.openOnSaturday, settings.openOnSunday],
  );

  const allowedDayValues = useMemo(() => new Set(dayOptions.map((day) => day.value)), [dayOptions]);

  const { data: availability = [], isLoading } = useQuery<ClientAvailability[]>({
    queryKey: [`/api/availability/${clientId}`],
    enabled: open && !!clientId,
  });

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
          hourValue >= openingHour &&
          hourValue < closingHourExclusive
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
  }, [allowedDayValues, closingHourExclusive, openingHour]);

  useEffect(() => {
    if (!open) return;

    const cells = new Set<string>();

    availability.forEach(avail => {
      const startHour = parseInt(avail.startTime.split(':')[0]);
      const endHour = parseInt(avail.endTime.split(':')[0]);

      if (!allowedDayValues.has(avail.dayOfWeek)) {
        return;
      }

      for (let hour = startHour; hour < endHour; hour++) {
        if (hour >= openingHour && hour < closingHourExclusive) {
          cells.add(`${avail.dayOfWeek}-${hour}`);
        }
      }
    });

    setSelectedCells(cells);
  }, [allowedDayValues, availability, closingHourExclusive, open, openingHour]);

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

  const toggleCell = (day: number, hour: number) => {
    const key = `${day}-${hour}`;
    const newSelected = new Set(selectedCells);
    
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    
    setSelectedCells(newSelected);
  };

  const handleSave = () => {
    const blocks: { dayOfWeek: number; startTime: string; endTime: string }[] = [];
    
    dayOptions.forEach(day => {
      let blockStart: number | null = null;

      for (let hour = openingHour; hour <= closingHourExclusive; hour++) {
        const isSelected = hour < closingHourExclusive && selectedCells.has(`${day.value}-${hour}`);

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
          endTime: `${closingHourExclusive.toString().padStart(2, '0')}:00`,
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
                          onClick={() => toggleCell(day.value, hour)}
                          className={`p-2 min-h-[40px] transition-colors hover-elevate active-elevate-2 ${
                            isCellSelected(day.value, hour)
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
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
