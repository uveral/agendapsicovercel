import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

interface TimeSlot {
  id: string;
  time: string;
  selected: boolean;
}

interface DayAvailability {
  day: string;
  enabled: boolean;
  timeSlots: TimeSlot[];
}

const initialTimeSlots: TimeSlot[] = [
  { id: "0", time: "08:00-10:00", selected: false },
  { id: "1", time: "10:00-12:00", selected: false },
  { id: "2", time: "12:00-14:00", selected: false },
  { id: "3", time: "14:00-16:00", selected: false },
  { id: "4", time: "16:00-18:00", selected: false },
  { id: "5", time: "18:00-20:00", selected: false },
];

const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export function AvailabilityForm({ onSave }: { onSave: (data: DayAvailability[]) => void }) {
  const [availability, setAvailability] = useState<DayAvailability[]>(
    days.map((day) => ({
      day,
      enabled: false,
      timeSlots: JSON.parse(JSON.stringify(initialTimeSlots)),
    }))
  );

  const toggleDay = (index: number) => {
    const newAvailability = [...availability];
    newAvailability[index].enabled = !newAvailability[index].enabled;
    setAvailability(newAvailability);
  };

  const toggleTimeSlot = (dayIndex: number, slotId: string) => {
    const newAvailability = [...availability];
    const slot = newAvailability[dayIndex].timeSlots.find((s) => s.id === slotId);
    if (slot) {
      slot.selected = !slot.selected;
    }
    setAvailability(newAvailability);
  };

  const selectedSlotsCount = availability.reduce(
    (total, day) => total + day.timeSlots.filter((s) => s.selected && day.enabled).length,
    0
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Mi Disponibilidad</CardTitle>
            <CardDescription>
              Selecciona los días y horarios en los que estás disponible
            </CardDescription>
          </div>
          <Badge variant="secondary" data-testid="badge-selected-count">
            {selectedSlotsCount} franjas
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {availability.map((dayAvail, dayIndex) => (
          <div key={dayAvail.day} className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id={`day-${dayIndex}`}
                checked={dayAvail.enabled}
                onCheckedChange={() => toggleDay(dayIndex)}
                data-testid={`checkbox-day-${dayIndex}`}
              />
              <Label
                htmlFor={`day-${dayIndex}`}
                className="text-sm font-medium cursor-pointer"
              >
                {dayAvail.day}
              </Label>
            </div>
            {dayAvail.enabled && (
              <div className="ml-6 grid grid-cols-2 md:grid-cols-3 gap-2">
                {dayAvail.timeSlots.map((slot) => (
                  <Button
                    key={slot.id}
                    variant={slot.selected ? "default" : "outline"}
                    size="sm"
                    className="justify-start"
                    onClick={() => toggleTimeSlot(dayIndex, slot.id)}
                    data-testid={`button-slot-${dayIndex}-${slot.id}`}
                  >
                    {slot.time}
                  </Button>
                ))}
              </div>
            )}
          </div>
        ))}
        <div className="flex gap-2 pt-4">
          <Button
            className="flex-1"
            onClick={() => onSave(availability)}
            data-testid="button-save-availability"
          >
            Guardar disponibilidad
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
