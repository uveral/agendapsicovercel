'use client';

import { useMemo } from "react";
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

  const { currentMonth, currentYear, datesByDayOfWeek } = useMemo(() => {
    const now = new Date();
    const currentMonthValue = now.getMonth();
    const currentYearValue = now.getFullYear();
    const daysInMonth = new Date(currentYearValue, currentMonthValue + 1, 0).getDate();

    const dateMap = new Map<number, number[]>();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYearValue, currentMonthValue, day);
      const dayOfWeek = date.getDay();
      if (!dateMap.has(dayOfWeek)) {
        dateMap.set(dayOfWeek, []);
      }
      dateMap.get(dayOfWeek)!.push(day);
    }

    return {
      currentMonth: currentMonthValue,
      currentYear: currentYearValue,
      datesByDayOfWeek: dateMap,
    };
  }, []);

  const therapistAppointments = useMemo(() => {
    if (!appointments.length) {
      return [];
    }

    return appointments.filter((apt) => {
      if (apt.therapistId !== therapistId || apt.status === "cancelled") return false;

      const aptDate = new Date(apt.date);
      return (
        aptDate.getMonth() === currentMonth &&
        aptDate.getFullYear() === currentYear
      );
    });
  }, [appointments, therapistId, currentMonth, currentYear]);

  const appointmentsByDayAndHour = useMemo(() => {
    if (!therapistAppointments.length) {
      return new Map<number, Map<number, Set<number>>>();
    }

    const map = new Map<number, Map<number, Set<number>>>();

    for (const appointment of therapistAppointments) {
      const aptDate = new Date(appointment.date);
      const dayOfWeek = aptDate.getDay();
      const dayOfMonth = aptDate.getDate();
      const hour = parseInt(appointment.startTime.split(':')[0] ?? '0', 10) || 0;

      if (!map.has(dayOfWeek)) {
        map.set(dayOfWeek, new Map());
      }

      const hoursMap = map.get(dayOfWeek)!;
      if (!hoursMap.has(hour)) {
        hoursMap.set(hour, new Set());
      }

      hoursMap.get(hour)!.add(dayOfMonth);
    }

    return map;
  }, [therapistAppointments]);

  const normalizedSchedule = useMemo(() => {
    if (!schedule.length) {
      return [] as Array<TherapistWorkingHours & { startHour: number; endHour: number }>;
    }

    return schedule.map((workBlock) => {
      const [startHourRaw] = workBlock.startTime.split(':');
      const [endHourRaw] = workBlock.endTime.split(':');

      return {
        ...workBlock,
        startHour: parseInt(startHourRaw ?? '0', 10) || 0,
        endHour: parseInt(endHourRaw ?? '0', 10) || 0,
      };
    });
  }, [schedule]);

  const freeSlots = useMemo((): TimeSlot[] => {
    if (!normalizedSchedule.length) {
      return [];
    }

    const slots: TimeSlot[] = [];

    for (const workBlock of normalizedSchedule) {
      const workingDays = datesByDayOfWeek.get(workBlock.dayOfWeek) ?? [];
      const hoursMap = appointmentsByDayAndHour.get(workBlock.dayOfWeek);

      for (let hour = workBlock.startHour; hour < workBlock.endHour; hour++) {
        const occupiedDays = hoursMap?.get(hour);
        const freeDates = workingDays.filter((day) => !(occupiedDays?.has(day)));

        if (!freeDates.length) {
          continue;
        }

        let frequency: 'Semanal' | 'Quincenal' | 'Puntual' = 'Puntual';
        if (freeDates.length >= 4) {
          frequency = 'Semanal';
        } else if (freeDates.length >= 2) {
          frequency = 'Quincenal';
        }

        slots.push({
          day: dayNames[workBlock.dayOfWeek],
          dayOfWeek: workBlock.dayOfWeek,
          hour: `${hour.toString().padStart(2, '0')}:00`,
          isRecurring: freeDates.length > 1,
          frequency,
        });
      }
    }

    slots.sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
      return a.hour.localeCompare(b.hour);
    });

    return slots;
  }, [appointmentsByDayAndHour, datesByDayOfWeek, normalizedSchedule]);

  const groupedArray = useMemo(() => {
    if (!freeSlots.length) {
      return [] as Array<TimeSlot & { hours: string[] }>;
    }

    const groupedSlots = freeSlots.reduce((acc, slot) => {
      const key = `${slot.day}-${slot.frequency}`;
      if (!acc[key]) {
        acc[key] = { ...slot, hours: [] };
      }
      acc[key].hours.push(slot.hour);
      return acc;
    }, {} as Record<string, TimeSlot & { hours: string[] }>);

    return Object.values(groupedSlots);
  }, [freeSlots]);

  if (groupedArray.length === 0) {
    return null;
  }

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
