import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TherapistWorkingHours } from "@shared/schema";
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

interface TherapistScheduleDialogProps {
  therapistId: string;
  therapistName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ScheduleSlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
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
}: TherapistScheduleDialogProps) {
  const { toast } = useToast();
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([]);

  // Load existing schedule
  const { data: existingSchedule = [], isLoading } = useQuery<TherapistWorkingHours[]>({
    queryKey: ["/api/therapists", therapistId, "schedule"],
    enabled: open,
  });

  // Initialize schedule slots when dialog opens or when schedule data loads from server
  // The length check prevents overwriting user edits
  useEffect(() => {
    if (open) {
      if (existingSchedule.length > 0) {
        // Convert from DB format (0=Sunday) to UI format (0=Monday)
        const slots = existingSchedule.map((slot) => ({
          dayOfWeek: (slot.dayOfWeek + 6) % 7,
          startTime: slot.startTime,
          endTime: slot.endTime,
        }));
        setScheduleSlots(slots);
      } else {
        setScheduleSlots([]);
      }
    }
  }, [open, existingSchedule]);

  // Save schedule mutation
  const saveMutation = useMutation({
    mutationFn: async (slots: ScheduleSlot[]) => {
      // Convert from UI format (0=Monday) to DB format (0=Sunday)
      const dbSlots = slots.map(slot => ({
        ...slot,
        dayOfWeek: (slot.dayOfWeek + 1) % 7
      }));
      return await apiRequest("PUT", `/api/therapists/${therapistId}/schedule`, dbSlots);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/therapists", therapistId, "schedule"] });
      queryClient.invalidateQueries({ queryKey: ["/api/therapists"] });
      toast({
        title: "Horario guardado",
        description: "El horario del terapeuta ha sido actualizado exitosamente",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar el horario",
        variant: "destructive",
      });
    },
  });

  const addSlot = (dayOfWeek: number) => {
    setScheduleSlots([
      ...scheduleSlots,
      { dayOfWeek, startTime: "09:00", endTime: "10:00" },
    ]);
  };

  const removeSlot = (dayOfWeek: number, index: number) => {
    const daySlots = scheduleSlots.filter((s) => s.dayOfWeek === dayOfWeek);
    const slotToRemove = daySlots[index];
    setScheduleSlots(scheduleSlots.filter((s) => s !== slotToRemove));
  };

  const updateSlot = (
    dayOfWeek: number,
    index: number,
    field: "startTime" | "endTime",
    value: string
  ) => {
    const daySlots = scheduleSlots.filter((s) => s.dayOfWeek === dayOfWeek);
    const slotToUpdate = daySlots[index];
    const slotIndex = scheduleSlots.indexOf(slotToUpdate);

    const newSlots = [...scheduleSlots];
    newSlots[slotIndex] = { ...newSlots[slotIndex], [field]: value };
    setScheduleSlots(newSlots);
  };

  const handleSave = () => {
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
        ) : (
          <ScrollArea className="max-h-[500px] pr-4">
            <div className="space-y-6">
              {dayNames.map((dayName, dayOfWeek) => {
                const daySlots = scheduleSlots.filter(
                  (s) => s.dayOfWeek === dayOfWeek
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
                            key={index}
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
                                      e.target.value
                                    )
                                  }
                                  data-testid={`input-start-time-${dayOfWeek}-${index}`}
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
                                      e.target.value
                                    )
                                  }
                                  data-testid={`input-end-time-${dayOfWeek}-${index}`}
                                />
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => removeSlot(dayOfWeek, index)}
                              data-testid={`button-remove-slot-${dayOfWeek}-${index}`}
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
            disabled={saveMutation.isPending}
            data-testid="button-save-schedule"
          >
            {saveMutation.isPending ? "Guardando..." : "Guardar horario"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
