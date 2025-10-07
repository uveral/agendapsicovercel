import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Appointment, User, TherapistWorkingHours } from "@shared/schema";

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
    queryKey: ['/api/therapists', therapistId, 'schedule'] 
  });

  const hours = calculateHourRange(schedule || []);

  const formatDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

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

  const weekStart = useMemo(() => getWeekStart(weekOffset), [weekOffset]);

  const weekEnd = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(weekStart.getDate() + 7);
    return end;
  }, [weekStart]);

  // Generate array of 7 days starting from Monday
  const weekDates = useMemo(() => (
    Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      return date;
    })
  ), [weekStart]);

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

  // Find appointment for therapist at a specific time
  const appointmentsBySlot = useMemo(() => {
    const map = new Map<string, Appointment>();

    for (const appointment of appointments) {
      if (appointment.therapistId !== therapistId || appointment.status === "cancelled") {
        continue;
      }

      const appointmentDate = new Date(appointment.date);
      if (appointmentDate < weekStart || appointmentDate >= weekEnd) {
        continue;
      }

      const dateKey = formatDateKey(appointmentDate);
      const [startHour] = appointment.startTime.split(":").map(Number);
      const [endHour] = appointment.endTime.split(":").map(Number);

      for (let hour = startHour; hour < endHour; hour++) {
        map.set(`${dateKey}-${hour}`, appointment);
      }
    }

    return map;
  }, [appointments, therapistId, weekEnd, weekStart]);

  const getAppointment = (date: Date, hour: number): Appointment | undefined => {
    return appointmentsBySlot.get(`${formatDateKey(date)}-${hour}`);
  };

  // Get client name from appointment
  const clientsById = useMemo(() => {
    const map = new Map<string, User>();
    for (const client of clients) {
      map.set(client.id, client);
    }
    return map;
  }, [clients]);

  const getClientName = (appointment: Appointment): string => {
    const client = clientsById.get(appointment.clientId ?? "");
    if (!client) return 'Cliente';
    return `${client.firstName || ''} ${client.lastName || ''}`.trim() || client.email?.split('@')[0] || 'Cliente';
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
            <div 
              className="grid gap-1"
              style={{
                gridTemplateColumns: `auto repeat(7, minmax(100px, 1fr))`
              }}
            >
              {/* Header row */}
              <div className="text-xs font-medium text-muted-foreground uppercase p-2 sticky left-0 bg-card z-10">
                Hora
              </div>
              {weekDates.map((date, i) => {
                const today = isToday(date);
                return (
                  <div 
                    key={`header-${i}`} 
                    className="text-center p-2"
                  >
                    <div className={`text-sm font-medium ${today ? 'text-primary' : ''}`}>
                      {dayNames[i]}
                    </div>
                    <div className={`text-xs ${today ? 'text-primary' : 'text-muted-foreground'}`}>
                      {formatDate(date)}
                    </div>
                  </div>
                );
              })}

              {/* Time rows */}
              {hours.map((hour) => {
                return (
                  <div key={`row-${hour}`} className="contents">
                    <div 
                      className="text-xs text-muted-foreground p-2 flex items-center sticky left-0 bg-card z-10"
                    >
                      {hour}:00
                    </div>
                    {weekDates.map((date, dayIndex) => {
                      const appointment = getAppointment(date, hour);
                      const hasAppointment = !!appointment;
                      
                      return (
                        <button
                          key={`${hour}-${dayIndex}`}
                          className={`p-2 border border-border rounded-sm text-xs min-h-[80px] transition-colors ${
                            hasAppointment
                              ? appointment.status === "confirmed"
                                ? "bg-chart-1/10 border-chart-1/30 hover-elevate cursor-pointer"
                                : "bg-chart-3/10 border-chart-3/30 hover-elevate cursor-pointer"
                              : "bg-card hover-elevate"
                          }`}
                          onClick={() => {
                            if (appointment && onAppointmentClick) {
                              onAppointmentClick(appointment.id);
                            }
                          }}
                          data-testid={`slot-${dayNames[dayIndex]}-${hour}`}
                        >
                          {hasAppointment && (
                            <div className="space-y-1 flex flex-col items-start">
                              <div className="font-medium text-sm truncate w-full">
                                {getClientName(appointment)}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {appointment.startTime} - {appointment.endTime}
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
