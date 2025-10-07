'use client';

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Appointment, TherapistWorkingHours } from "@/lib/types";

interface AvailabilitySummaryProps {
  therapistId: string;
  therapistName?: string;
  appointments: Appointment[];
  showTherapistName?: boolean;
}

interface TimeSlot {
  day: string;
  dayOfWeek: number;
  hour: string;
  isRecurring: boolean;
  frequency: 'Semanal' | 'Quincenal' | 'Puntual';
}

const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function AvailabilitySummary({
  therapistId,
  therapistName,
  appointments,
  showTherapistName = false
}: AvailabilitySummaryProps) {
  const { data: schedule = [] } = useQuery<TherapistWorkingHours[]>({
    queryKey: [`/api/therapists/${therapistId}/schedule`],
    enabled: !!therapistId,
  });

  const calculateFreeSlots = (): TimeSlot[] => {
    if (!schedule || schedule.length === 0) return [];

    const freeSlots: TimeSlot[] = [];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    schedule.forEach((workBlock) => {
      const startHour = parseInt(workBlock.startTime.split(':')[0]);
      const endHour = parseInt(workBlock.endTime.split(':')[0]);

      for (let hour = startHour; hour < endHour; hour++) {
        const hourStr = `${hour.toString().padStart(2, '0')}:00`;

        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const datesForDay: number[] = [];

        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(currentYear, currentMonth, day);
          if (date.getDay() === workBlock.dayOfWeek) {
            datesForDay.push(day);
          }
        }

        const occupiedDates = appointments.filter((apt) => {
          if (apt.therapistId !== therapistId || apt.status === "cancelled") return false;

          const aptDate = new Date(apt.date);
          if (aptDate.getMonth() !== currentMonth || aptDate.getFullYear() !== currentYear) return false;
          if (aptDate.getDay() !== workBlock.dayOfWeek) return false;

          const aptStartHour = parseInt(apt.startTime.split(':')[0]);
          return aptStartHour === hour;
        }).map(apt => new Date(apt.date).getDate());

        const freeDates = datesForDay.filter(d => !occupiedDates.includes(d));

        if (freeDates.length > 0) {
          let frequency: 'Semanal' | 'Quincenal' | 'Puntual' = 'Puntual';

          if (freeDates.length >= 4) {
            frequency = 'Semanal';
          } else if (freeDates.length >= 2) {
            frequency = 'Quincenal';
          }

          freeSlots.push({
            day: dayNames[workBlock.dayOfWeek],
            dayOfWeek: workBlock.dayOfWeek,
            hour: hourStr,
            isRecurring: freeDates.length > 1,
            frequency
          });
        }
      }
    });

    freeSlots.sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
      return a.hour.localeCompare(b.hour);
    });

    return freeSlots;
  };

  const freeSlots = calculateFreeSlots();

  if (freeSlots.length === 0) {
    return null;
  }

  const groupedSlots = freeSlots.reduce((acc, slot) => {
    const key = `${slot.day}-${slot.frequency}`;
    if (!acc[key]) {
      acc[key] = { ...slot, hours: [] };
    }
    acc[key].hours.push(slot.hour);
    return acc;
  }, {} as Record<string, TimeSlot & { hours: string[] }>);

  const groupedArray = Object.values(groupedSlots);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">
          {showTherapistName && therapistName ? `${therapistName}: ` : ''}
          Huecos Disponibles
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          {groupedArray.map((slot, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{slot.day}</span>
              <span className="text-muted-foreground">
                {slot.hours.join(', ')}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded ${
                slot.frequency === 'Semanal' ? 'bg-green-500/10 text-green-700 dark:text-green-400' :
                slot.frequency === 'Quincenal' ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400' :
                'bg-muted/50 text-muted-foreground'
              }`}>
                {slot.frequency}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
