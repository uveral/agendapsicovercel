import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Appointment, User } from "@shared/schema";

interface MonthCalendarProps {
  therapistName: string;
  therapistId: string;
  appointments: Appointment[];
  clients: User[];
  onAppointmentClick?: (appointmentId: string) => void;
}

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

  const hours = Array.from({ length: 12 }, (_, i) => 9 + i); // 9:00 to 20:00
  
  // Calculate days in the current month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const monthDates = Array.from({ length: daysInMonth }, (_, i) => {
    return new Date(currentYear, currentMonth, i + 1);
  });

  // Month names in Spanish
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Navigation functions
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

  // Find appointment for therapist at a specific time
  const getAppointment = (date: Date, hour: number): Appointment | undefined => {
    return appointments.find((apt) => {
      if (apt.therapistId !== therapistId || apt.status === "cancelled") return false;
      
      const aptDate = new Date(apt.date);
      const isSameDay = aptDate.toDateString() === date.toDateString();
      
      if (!isSameDay) return false;
      
      // Parse start and end times
      const [startHour] = apt.startTime.split(':').map(Number);
      const [endHour] = apt.endTime.split(':').map(Number);
      
      return hour >= startHour && hour < endHour;
    });
  };

  // Get client name from appointment
  const getClientName = (appointment: Appointment): string => {
    const client = clients.find((c) => c.id === appointment.clientId);
    if (!client) return 'Cliente';
    return `${client.firstName || ''} ${client.lastName || ''}`.trim() || client.email?.split('@')[0] || 'Cliente';
  };

  // Dynamic grid columns: 1 for hour label + daysInMonth for each day
  const gridCols = `grid-cols-[auto_repeat(${daysInMonth},minmax(50px,1fr))]`;

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
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <div className={`grid ${gridCols} gap-0.5`}>
              {/* Header row */}
              <div className="text-[10px] font-medium text-muted-foreground uppercase p-1 sticky left-0 bg-card z-10">
                Hora
              </div>
              {monthDates.map((date, i) => {
                const dayNumber = date.getDate();
                const isToday = date.toDateString() === today.toDateString();
                return (
                  <div 
                    key={`header-${i}`} 
                    className="text-center p-1"
                  >
                    <div className={`text-[11px] font-medium ${isToday ? 'text-primary' : ''}`}>
                      {dayNumber}
                    </div>
                    <div className="text-[9px] text-muted-foreground">
                      {['D', 'L', 'M', 'X', 'J', 'V', 'S'][date.getDay()]}
                    </div>
                  </div>
                );
              })}

              {/* Time rows */}
              {hours.map((hour) => (
                <>
                  <div 
                    key={`hour-${hour}`} 
                    className="text-[10px] text-muted-foreground p-1 flex items-center sticky left-0 bg-card z-10"
                  >
                    {hour}:00
                  </div>
                  {monthDates.map((date, dayIndex) => {
                    const dayNumber = date.getDate();
                    const appointment = getAppointment(date, hour);
                    const hasAppointment = !!appointment;
                    
                    return (
                      <button
                        key={`${hour}-${dayIndex}`}
                        className={`p-0.5 border border-border rounded-sm text-[9px] min-h-[32px] transition-colors ${
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
                        data-testid={`slot-day${dayNumber}-${hour}`}
                      >
                        {hasAppointment && (
                          <div className="truncate font-medium px-0.5">
                            {getClientName(appointment)}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
