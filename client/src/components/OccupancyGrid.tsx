import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Therapist, Appointment } from "@shared/schema";

interface OccupancyGridProps {
  therapists: Therapist[];
  appointments: Appointment[];
  onAppointmentClick?: (appointmentId: string) => void;
}

export function OccupancyGrid({ therapists, appointments, onAppointmentClick }: OccupancyGridProps) {
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

  // Find appointment for a therapist at a specific time
  const getAppointment = (therapistId: string, date: Date, hour: number): Appointment | undefined => {
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="text-xl">Vista General - Ocupación de Terapeutas</CardTitle>
            <p className="text-sm text-muted-foreground">
              Cada cuadrado representa un terapeuta. Coloreado = ocupado, gris = disponible
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
            <div 
              className="grid gap-1"
              style={{
                gridTemplateColumns: `auto repeat(${daysInMonth}, minmax(40px, 1fr))`
              }}
            >
              {/* Header row */}
              <div className="text-xs font-medium text-muted-foreground uppercase p-2 sticky left-0 bg-card z-10">
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
                    <div className={`text-xs font-medium ${isToday ? 'text-primary' : ''}`}>
                      {dayNumber}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {['D', 'L', 'M', 'X', 'J', 'V', 'S'][date.getDay()]}
                    </div>
                  </div>
                );
              })}

              {/* Time rows */}
              {hours.map((hour) => (
                <React.Fragment key={`hour-row-${hour}`}>
                  <div 
                    className="text-xs text-muted-foreground p-2 flex items-center sticky left-0 bg-card z-10"
                  >
                    {hour}:00
                  </div>
                  {monthDates.map((date, dayIndex) => {
                    const dayNumber = date.getDate();
                    return (
                      <div
                        key={`${hour}-${dayIndex}`}
                        className="p-1 border border-border rounded-sm bg-card min-h-[40px] flex flex-wrap gap-0.5 items-center justify-center"
                        data-testid={`occupancy-day${dayNumber}-${hour}`}
                      >
                        {therapists.map((therapist) => {
                          const appointment = getAppointment(therapist.id, date, hour);
                          const isOccupied = !!appointment;
                          return (
                            <div key={therapist.id}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className={`w-2 h-2 rounded-sm transition-transform hover:scale-150 ${isOccupied ? 'cursor-pointer' : 'cursor-default'}`}
                                    style={{
                                      backgroundColor: isOccupied ? therapist.color : '#d1d5db',
                                    }}
                                    onClick={() => {
                                      if (appointment && onAppointmentClick) {
                                        onAppointmentClick(appointment.id);
                                      }
                                    }}
                                    data-testid={`square-${therapist.id}-day${dayNumber}-${hour}`}
                                  />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="font-medium">{therapist.name}</p>
                                  <p className="text-xs">{isOccupied ? 'Ocupado - Click para editar' : 'Disponible'}</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
