
'use client';

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Appointment, User } from "@/lib/types";

interface MonthCalendarProps {
  therapistName: string;
  therapistId: string;
  appointments: Appointment[];
  clients: User[];
  onAppointmentClick?: (appointmentId: string) => void;
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
  
  return days.slice(0, 42);
};

export function MonthCalendar({ 
  therapistName, 
  therapistId, 
  appointments, 
  clients,
  onAppointmentClick 
}: MonthCalendarProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

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

  const getAppointmentsForDay = (date: Date): Appointment[] => {
    return appointments.filter((apt) => {
      if (apt.therapistId !== therapistId || apt.status === "cancelled") return false;
      
      const aptDate = new Date(apt.date);
      return aptDate.toDateString() === date.toDateString();
    }).sort((a, b) => {
      return a.startTime.localeCompare(b.startTime);
    });
  };

  const getClientName = (appointment: Appointment): string => {
    const client = clients.find((c) => c.id === appointment.clientId);
    if (!client) return 'Cliente';
    return `${client.firstName || ''} ${client.lastName || ''}`.trim() || client.email?.split('@')[0] || 'Cliente';
  };

  const isToday = (date: Date): boolean => {
    return date.toDateString() === today.toDateString();
  };

  const calendarDays = getDaysInMonth(currentYear, currentMonth);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-lg">{therapistName}</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={goToPreviousMonth}
              data-testid="button-previous-month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-medium min-w-[140px] text-center">
              {monthNames[currentMonth]} {currentYear}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={goToNextMonth}
              data-testid="button-next-month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToToday}
              data-testid="button-today"
              className="ml-2"
            >
              Hoy
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-px bg-border rounded-md overflow-hidden">
          {dayNames.map((day, index) => (
            <div 
              key={`header-${index}`}
              className="bg-muted p-2 text-center text-xs font-semibold text-muted-foreground uppercase"
              data-testid={`header-${day.toLowerCase()}`}
            >
              {day}
            </div>
          ))}

          {calendarDays.map((calendarDay, index) => {
            const dayAppointments = getAppointmentsForDay(calendarDay.date);
            const isTodayDate = isToday(calendarDay.date);
            const dayNumber = calendarDay.date.getDate();
            const MAX_VISIBLE_APPOINTMENTS = 4;
            const visibleAppointments = dayAppointments.slice(0, MAX_VISIBLE_APPOINTMENTS);
            const remainingCount = dayAppointments.length - MAX_VISIBLE_APPOINTMENTS;

            return (
              <div
                key={`day-${index}`}
                className={`bg-card min-h-24 p-2 flex flex-col ${
                  !calendarDay.isCurrentMonth ? 'opacity-50' : ''
                } ${
                  isTodayDate ? 'bg-primary/10' : ''
                }`}
                data-testid={`day-cell-${dayNumber}`}
              >
                <div 
                  className={`text-sm font-medium mb-1 ${
                    isTodayDate ? 'text-primary' : calendarDay.isCurrentMonth ? '' : 'text-muted-foreground'
                  }`}
                >
                  {dayNumber}
                </div>

                <div className="flex flex-col gap-1 flex-1">
                  {visibleAppointments.map((appointment) => (
                    <button
                      key={appointment.id}
                      onClick={() => onAppointmentClick?.(appointment.id)}
                      className={`text-xs p-1 rounded text-left truncate hover-elevate ${
                        appointment.status === "confirmed"
                          ? "bg-chart-1/20 text-chart-1 border border-chart-1/30"
                          : "bg-chart-3/20 text-chart-3 border border-chart-3/30"
                      }`}
                      data-testid={`appointment-${appointment.id}`}
                    >
                      <div className="font-medium">{appointment.startTime.slice(0, 5)}</div>
                      <div className="truncate">{getClientName(appointment)}</div>
                    </button>
                  ))}
                  
                  {remainingCount > 0 && (
                    <div className="text-xs text-muted-foreground px-1">
                      +{remainingCount} más
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
