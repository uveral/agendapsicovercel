import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import type { ClientAvailability } from "@shared/schema";

interface TimeSlot {
  startTime: string;
  endTime: string;
}

interface DaySchedule {
  dayOfWeek: number;
  dayName: string;
  enabled: boolean;
  slots: TimeSlot[];
}

const dayNames = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

interface AvailabilityFormProps {
  onSave: (data: { dayOfWeek: number; startTime: string; endTime: string }[]) => void;
  existingAvailability?: ClientAvailability[];
  isLoading?: boolean;
}

export function AvailabilityForm({ onSave, existingAvailability = [], isLoading = false }: AvailabilityFormProps) {
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);

  // Initialize schedule when component mounts or when existingAvailability changes
  useEffect(() => {
    const initialSchedule: DaySchedule[] = dayNames.map((dayName, dayOfWeek) => {
      // Find existing slots for this day
      const existingSlots = existingAvailability
        .filter((avail) => avail.dayOfWeek === dayOfWeek)
        .map((avail) => ({
          startTime: avail.startTime,
          endTime: avail.endTime,
        }));

      return {
        dayOfWeek,
        dayName,
        enabled: existingSlots.length > 0,
        slots: existingSlots.length > 0 ? existingSlots : [],
      };
    });

    setSchedule(initialSchedule);
  }, [existingAvailability]);

  const toggleDay = (dayOfWeek: number) => {
    setSchedule((prev) =>
      prev.map((day) => {
        if (day.dayOfWeek === dayOfWeek) {
          const newEnabled = !day.enabled;
          // If enabling a day with no slots, add a default slot
          if (newEnabled && day.slots.length === 0) {
            return {
              ...day,
              enabled: newEnabled,
              slots: [{ startTime: "09:00", endTime: "17:00" }],
            };
          }
          return { ...day, enabled: newEnabled };
        }
        return day;
      })
    );
  };

  const addSlot = (dayOfWeek: number) => {
    setSchedule((prev) =>
      prev.map((day) => {
        if (day.dayOfWeek === dayOfWeek) {
          return {
            ...day,
            slots: [...day.slots, { startTime: "09:00", endTime: "17:00" }],
          };
        }
        return day;
      })
    );
  };

  const removeSlot = (dayOfWeek: number, slotIndex: number) => {
    setSchedule((prev) =>
      prev.map((day) => {
        if (day.dayOfWeek === dayOfWeek) {
          const newSlots = day.slots.filter((_, index) => index !== slotIndex);
          return {
            ...day,
            slots: newSlots,
            // Disable day if no slots remain
            enabled: newSlots.length > 0 ? day.enabled : false,
          };
        }
        return day;
      })
    );
  };

  const updateSlot = (
    dayOfWeek: number,
    slotIndex: number,
    field: "startTime" | "endTime",
    value: string
  ) => {
    setSchedule((prev) =>
      prev.map((day) => {
        if (day.dayOfWeek === dayOfWeek) {
          const newSlots = day.slots.map((slot, index) => {
            if (index === slotIndex) {
              return { ...slot, [field]: value };
            }
            return slot;
          });
          return { ...day, slots: newSlots };
        }
        return day;
      })
    );
  };

  const handleSave = () => {
    // Convert schedule to the format expected by the backend
    const availabilityData = schedule
      .filter((day) => day.enabled && day.slots.length > 0)
      .flatMap((day) =>
        day.slots.map((slot) => ({
          dayOfWeek: day.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
        }))
      );

    onSave(availabilityData);
  };

  const totalSlots = schedule.reduce(
    (total, day) => total + (day.enabled ? day.slots.length : 0),
    0
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            Cargando disponibilidad...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Configurar Disponibilidad</CardTitle>
            <CardDescription>
              Añade tus horarios disponibles para cada día de la semana
            </CardDescription>
          </div>
          <Badge variant="secondary" data-testid="badge-total-slots">
            {totalSlots} {totalSlots === 1 ? "bloque" : "bloques"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {schedule.map((day) => (
          <div key={day.dayOfWeek} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`day-${day.dayOfWeek}`}
                  checked={day.enabled}
                  onCheckedChange={() => toggleDay(day.dayOfWeek)}
                  data-testid={`checkbox-day-${day.dayOfWeek}`}
                />
                <Label
                  htmlFor={`day-${day.dayOfWeek}`}
                  className="text-sm font-medium cursor-pointer"
                >
                  {day.dayName}
                </Label>
              </div>
              {day.enabled && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addSlot(day.dayOfWeek)}
                  data-testid={`button-add-slot-${day.dayOfWeek}`}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Añadir bloque
                </Button>
              )}
            </div>

            {day.enabled && (
              <div className="ml-6 space-y-2">
                {day.slots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Sin horarios definidos
                  </p>
                ) : (
                  day.slots.map((slot, index) => (
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
                                day.dayOfWeek,
                                index,
                                "startTime",
                                e.target.value
                              )
                            }
                            data-testid={`input-start-time-${day.dayOfWeek}-${index}`}
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
                                day.dayOfWeek,
                                index,
                                "endTime",
                                e.target.value
                              )
                            }
                            data-testid={`input-end-time-${day.dayOfWeek}-${index}`}
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeSlot(day.dayOfWeek, index)}
                        data-testid={`button-remove-slot-${day.dayOfWeek}-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}

        <div className="flex gap-2 pt-4 border-t">
          <Button
            className="flex-1"
            onClick={handleSave}
            data-testid="button-save-availability"
          >
            Guardar disponibilidad
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
