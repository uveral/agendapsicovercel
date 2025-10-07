
'use client';

import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Appointment, User } from "@/lib/types";

interface TherapistMonthViewProps {
  therapistName: string;
  therapistId: string;
  appointments: Appointment[];
  clients: User[];
  onAppointmentClick?: (appointmentId: string) => void;
  onDayClick?: (therapistId: string, date: string) => void;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
}

const getDaysInMonth = (year: number, month: number): CalendarDay[] => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const firstDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  
  const startPadding = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  
  const days: CalendarDay[] = [];
  
  for (let i = startPadding - 1; i >= 0; i--) {
    const prevMonthDay = new Date(year, month, -i);
    days.push({ date: prevMonthDay, isCurrentMonth: false });
  }
  
  for (let day = 1; day <= daysInMonth; day++) {
    days.push({ date: new Date(year, month, day), isCurrentMonth: true });
  }
  
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
  }
  
  return days;
};

function TherapistMonthViewComponent({ 
  therapistName, 
  therapistId, 
  appointments, 
  clients,
  onAppointmentClick,
  onDayClick
}: TherapistMonthViewProps) {  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const monthNames = [
    'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
    'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
  ];

  const dayNames = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES'];

  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentMonth(now.getMonth());
    setCurrentYear(now.getFullYear());
  };

  // Create a fast lookup map for appointments by date
  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();

    appointments.forEach((apt) => {
      if (apt.therapistId !== therapistId || apt.status === "cancelled") return;

      const aptDate = new Date(apt.date);
      const dateString = aptDate.toDateString();

      const dayAppointments = map.get(dateString) || [];
      dayAppointments.push(apt);
      map.set(dateString, dayAppointments);
    });

    // Sort appointments by time for each day
    map.forEach((appointments, date) => {
      appointments.sort((a, b) => a.startTime.localeCompare(b.startTime));
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

  const getAppointmentsForDay = (date: Date): Appointment[] => {
    return appointmentsByDate.get(date.toDateString()) || [];
  };

  const getClientName = (appointment: Appointment): string => {
    return clientNames.get(appointment.clientId) || 'Cliente';
  };

  const isToday = (date: Date): boolean => {
    return date.toDateString() === today.toDateString();
  };

  const { allDays, weekdaysOnly, weeks } = useMemo(() => {
    const allDays = getDaysInMonth(currentYear, currentMonth);
    const weekdaysOnly = allDays.filter(day => {
      const dayOfWeek = day.date.getDay();
      return dayOfWeek !== 0 && dayOfWeek !== 6;
    });
    const weeks: CalendarDay[][] = [];
    for (let i = 0; i < weekdaysOnly.length; i += 5) {
      weeks.push(weekdaysOnly.slice(i, i + 5));
    }
    return { allDays, weekdaysOnly, weeks };
  }, [currentYear, currentMonth]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/30 border-b">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">
              {monthNames[currentMonth]} {currentYear}
            </h2>
            <p className="text-xl font-semibold text-muted-foreground">
              {therapistName.toUpperCase()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={goToPreviousMonth}
              data-testid="button-previous-month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToToday}
              data-testid="button-today"
              className="min-w-[80px]"
            >
              Hoy
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={goToNextMonth}
              data-testid="button-next-month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="border-b bg-muted/20">
          <div className="grid grid-cols-5">
            {dayNames.map((day, index) => (
              <div 
                key={`header-${index}`}
                className="border-r last:border-r-0 p-3 text-center text-sm font-bold text-muted-foreground"
                data-testid={`header-${day.toLowerCase()}`}
              >
                {day}
              </div>
            ))}
          </div>
        </div>

        <div className="divide-y">
          {weeks.map((week, weekIndex) => (
            <div key={`week-${weekIndex}`} className="grid grid-cols-5 divide-x" style={{ minHeight: '180px' }}>
              {week.map((calendarDay, dayIndex) => {
                const dayAppointments = getAppointmentsForDay(calendarDay.date);
                const isTodayDate = isToday(calendarDay.date);
                const dayNumber = calendarDay.date.getDate();

                return (
                  <div
                    key={`day-${weekIndex}-${dayIndex}`}
                    className={`relative p-3 ${
                      !calendarDay.isCurrentMonth ? 'bg-muted/20' : 'bg-background'
                    } ${
                      isTodayDate ? 'bg-primary/5' : ''
                    } ${
                      calendarDay.isCurrentMonth && onDayClick ? 'cursor-pointer hover:bg-muted/50' : ''
                    }`}
                    data-testid={`day-${dayNumber}`}
                    onClick={() => {
                      if (calendarDay.isCurrentMonth && onDayClick) {
                        onDayClick(therapistId, format(calendarDay.date, 'yyyy-MM-dd'));
                      }
                    }}
                  >
                    <div className="flex justify-end mb-2">
                      <span className={`text-2xl font-bold ${
                        !calendarDay.isCurrentMonth ? 'text-muted-foreground/40' : 
                        isTodayDate ? 'text-primary' : 'text-foreground'
                      }`}>
                        {dayNumber}
                      </span>
                    </div>

                    <div className="space-y-1 overflow-y-auto" style={{ maxHeight: '140px' }}>
                      {dayAppointments.map((apt) => {
                        const isSpecial = apt.notes?.toLowerCase().includes('viaje') || 
                                        apt.notes?.toLowerCase().includes('importante');
                        
                        return (
                          <button
                            key={apt.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onAppointmentClick?.(apt.id);
                            }}
                            className={`w-full text-left text-xs px-1.5 py-0.5 rounded hover-elevate transition-colors ${
                              isSpecial ? 'text-destructive' : 'text-foreground'
                            }`}
                            data-testid={`appointment-${apt.id}`}
                          >
                            <div className="flex items-start gap-1">
                              <span className="font-medium">{apt.startTime}</span>
                              <span className="truncate">{getClientName(apt)}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export const TherapistMonthView = React.memo(TherapistMonthViewComponent);
