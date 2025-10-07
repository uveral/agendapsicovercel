
'use client';

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Appointment, User, TherapistWorkingHours } from "@/lib/types";

interface WeekCalendarProps {
  therapistName: string;
  therapistId: string;
  appointments: Appointment[];
  clients: User[];
  onAppointmentClick?: (appointmentId: string) => void;
}

const calculateHourRange = (schedule: TherapistWorkingHours[]): number[] => {
  if (!schedule || schedule.length === 0) {
    return Array.from({ length: 12 }, (_, i) => 9 + i);
  }
  
  let minHour = 24;
  let maxHour = 0;
  
  for (const block of schedule) {
    const startHour = parseInt(block.startTime.split(':')[0]);
    const endHour = parseInt(block.endTime.split(':')[0]);
    minHour = Math.min(minHour, startHour);
    maxHour = Math.max(maxHour, endHour);
  }
  
  const hourCount = maxHour - minHour;
  return Array.from({ length: hourCount }, (_, i) => minHour + i);
};

export function WeekCalendar({ 
  therapistName, 
  therapistId, 
  appointments, 
  clients,
  onAppointmentClick 
}: WeekCalendarProps) {
  const [weekOffset, setWeekOffset] = useState(0);

  const { data: schedule } = useQuery<TherapistWorkingHours[]>({
    queryKey: [`/api/therapists/${therapistId}/schedule`],
    enabled: !!therapistId,
  });

  const hours = calculateHourRange(schedule || []);
  
  // Calculate the Monday of the current week based on offset
  const getWeekStart = (offset: number): Date => {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Adjust to Monday
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff + (offset * 7));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const weekStart = getWeekStart(weekOffset);
  
  // Generate array of 7 days starting from Monday
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    return date;
  });

  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  // Navigation functions
  const goToPreviousWeek = () => {
    setWeekOffset(weekOffset - 1);
  };

  const goToNextWeek = () => {
    setWeekOffset(weekOffset + 1);
  };

  const goToCurrentWeek = () => {
    setWeekOffset(0);
  };

  // Format date as "DD/MM"
  const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month}`;
  };

  // Get week range as string
  const getWeekRangeString = (): string => {
    const start = weekDates[0];
    const end = weekDates[6];
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  // Create a fast lookup map for appointments: "dateString-hour" -> Appointment
  const appointmentMap = useMemo(() => {
    const map = new Map<string, Appointment>();

    appointments.forEach((apt) => {
      if (apt.therapistId !== therapistId || apt.status === "cancelled") return;

      const aptDate = new Date(apt.date);
      const dateString = aptDate.toDateString();
      const [startHour] = apt.startTime.split(':').map(Number);
      const [endHour] = apt.endTime.split(':').map(Number);

      // Store appointment for each hour it spans
      for (let hour = startHour; hour < endHour; hour++) {
        const key = `${dateString}-${hour}`;
        map.set(key, apt);
      }
    });

    return map;
  }, [appointments, therapistId]);

  // Create a fast lookup map for client names
  const clientNames = useMemo(() => {
    const map = new Map<string, string>();
    clients.forEach((client) => {
      const name = `${client.firstName || ''} ${client.lastName || ''}`.trim() || client.email?.split('@')[0] || 'Cliente';
      map.set(client.id, name);
    });
    return map;
  }, [clients]);

  // Fast appointment lookup using the map
  const getAppointment = (date: Date, hour: number): Appointment | undefined => {
    const key = `${date.toDateString()}-${hour}`;
    return appointmentMap.get(key);
  };

  // Get client name from appointment
  const getClientName = (appointment: Appointment): string => {
    return clientNames.get(appointment.clientId) || 'Cliente';
  };

  // Check if a date is today
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-lg">{therapistName}</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={goToPreviousWeek}
              data-testid="button-prev-week"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-medium min-w-[180px] text-center">
              {getWeekRangeString()}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={goToNextWeek}
              data-testid="button-next-week"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToCurrentWeek}
              data-testid="button-current-week"
              className="ml-2"
            >
              Hoy
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <p>Week Calendar Grid Placeholder</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
