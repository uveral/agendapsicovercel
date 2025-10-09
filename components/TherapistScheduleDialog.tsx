'use client';

import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TherapistWorkingHours } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DEFAULT_END_TIME,
  DEFAULT_START_TIME,
  UiScheduleSlot,
  uiSlotsToPersistable,
  workingHoursToUiSlots,
} from "@/lib/therapistSchedule";

interface TherapistScheduleDialogProps {
  therapistId: string;
  therapistName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit?: boolean;
}

const dayNames = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

export function TherapistScheduleDialog({
  therapistId,
  therapistName,
  open,
  onOpenChange,
  canEdit = true,
}: TherapistScheduleDialogProps) {
  const { toast } = useToast();
  const [scheduleSlots, setScheduleSlots] = useState<UiScheduleSlot[]>([]);
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);

  // Load existing schedule
  const {
    data: existingSchedule = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<TherapistWorkingHours[]>({
    queryKey: ["/api/therapists", therapistId, "schedule"],
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      void refetch();
    }
  }, [open, refetch]);

  const normalizedSchedule = useMemo(
    () => workingHoursToUiSlots(existingSchedule),
    [existingSchedule],
  );

  const normalizedScheduleKey = useMemo(
    () => JSON.stringify(normalizedSchedule),
    [normalizedSchedule],
  );

  // Initialize schedule slots when dialog opens or when schedule data loads from server
  useEffect(() => {
    if (!open) {
      setHydratedKey(null);
      return;
    }

    if (hydratedKey === normalizedScheduleKey) {
      return;
    }

    setScheduleSlots(normalizedSchedule);
    setHydratedKey(normalizedScheduleKey);
  }, [open, normalizedSchedule, normalizedScheduleKey, hydratedKey]);

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  // Save schedule mutation
  const saveMutation = useMutation({
    mutationFn: async (slots: UiScheduleSlot[]) => {
      const payload = {
        therapistId,
        slots: uiSlotsToPersistable(slots),
      };
      return await apiRequest(
        "PUT",
        `/api/therapists/${therapistId}/schedule`,
        payload,
      );
    },
    onSuccess: (data) => {
      const persistedSchedule = Array.isArray(data)
        ? (data as TherapistWorkingHours[])
        : [];

      queryClient.setQueryData(
        ["/api/therapists", therapistId, "schedule"],
        persistedSchedule,
      );
      queryClient.invalidateQueries({ queryKey: ["/api/therapists", therapistId, "schedule"] });
      queryClient.invalidateQueries({ queryKey: ["/api/therapists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/therapist-working-hours"] });
      toast({
        title: "Horario guardado",
        description: "El horario del terapeuta ha sido actualizado exitosamente",
      });
      onOpenChange(false);
    },
    onError: (mutationError: Error) => {
      toast({
        title: "Error",
        description: mutationError.message || "No se pudo guardar el horario",
        variant: "destructive",
      });
    },
  });

  const addSlot = (dayOfWeek: number) => {
    if (!canEdit) return;
    setScheduleSlots((previous) => [
      ...previous,
      { dayOfWeek, startTime: DEFAULT_START_TIME, endTime: DEFAULT_END_TIME },
    ]);
  };

  const removeSlot = (dayOfWeek: number, index: number) => {
    if (!canEdit) return;
    setScheduleSlots((previous) => {
      const daySlots = previous.filter((slot) => slot.dayOfWeek === dayOfWeek);
      const slotToRemove = daySlots[index];
      if (!slotToRemove) {
        return previous;
      }

      return previous.filter((slot) => slot !== slotToRemove);
    });
  };

  const updateSlot = (
    dayOfWeek: number,
    index: number,
    field: "startTime" | "endTime",
    value: string,
  ) => {
    if (!canEdit) return;
    setScheduleSlots((previous) => {
      const daySlots = previous.filter((slot) => slot.dayOfWeek === dayOfWeek);
      const slotToUpdate = daySlots[index];
      if (!slotToUpdate) {
        return previous;
      }

      const slotIndex = previous.indexOf(slotToUpdate);
      if (slotIndex === -1) {
        return previous;
      }

      const next = [...previous];
      next[slotIndex] = { ...next[slotIndex], [field]: value };
      return next;
    });
  };

  const handleSave = () => {
    if (!canEdit) return;
    saveMutation.mutate(scheduleSlots);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="dialog-manage-schedule">
        <DialogHeader>
          <DialogTitle>Gestionar Horario - {therapistName}</DialogTitle>
          <DialogDescription>
            Define los horarios de trabajo para cada día de la semana
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            Cargando horarios...
          </div>
        ) : isError ? (
          <div className="py-8 text-center text-destructive space-y-2">
            <div>
              {error instanceof Error
                ? error.message
                : "No se pudieron cargar los horarios"}
            </div>
            <Button type="button" variant="ghost" onClick={handleRetry}>
              Reintentar
            </Button>
          </div>
        ) : (
          <ScrollArea className="max-h-[500px] pr-4">
            <div className="space-y-6">
              {dayNames.map((dayName, dayOfWeek) => {
                const daySlots = scheduleSlots.filter(
                  (slot) => slot.dayOfWeek === dayOfWeek,
                );

                return (
                  <div key={dayOfWeek} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">{dayName}</Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => addSlot(dayOfWeek)}
                        data-testid={`button-add-slot-${dayOfWeek}`}
                        disabled={!canEdit}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Añadir bloque
                      </Button>
                    </div>

                    {daySlots.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Sin horarios definidos
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {daySlots.map((slot, index) => (
                          <div
                            key={`${slot.dayOfWeek}-${index}-${slot.startTime}-${slot.endTime}`}
                            className="flex items-center gap-3 p-3 rounded-md border bg-card"
                          >
                            <div className="flex-1 grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Hora inicio
                                </Label>
                                <Input
                                  type="time"
                                  value={slot.startTime}
                                  onChange={(e) =>
                                    updateSlot(
                                      dayOfWeek,
                                      index,
                                      "startTime",
                                      e.target.value,
                                    )
                                  }
                                  data-testid={`input-start-time-${dayOfWeek}-${index}`}
                                  disabled={!canEdit}
                                  readOnly={!canEdit}
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Hora fin
                                </Label>
                                <Input
                                  type="time"
                                  value={slot.endTime}
                                  onChange={(e) =>
                                    updateSlot(
                                      dayOfWeek,
                                      index,
                                      "endTime",
                                      e.target.value,
                                    )
                                  }
                                  data-testid={`input-end-time-${dayOfWeek}-${index}`}
                                  disabled={!canEdit}
                                  readOnly={!canEdit}
                                />
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => removeSlot(dayOfWeek, index)}
                              data-testid={`button-remove-slot-${dayOfWeek}-${index}`}
                              disabled={!canEdit}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saveMutation.isPending || !canEdit}
            data-testid="button-save-schedule"
          >
            {saveMutation.isPending ? "Guardando..." : "Guardar horario"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
