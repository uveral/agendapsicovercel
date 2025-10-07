
'use client';

import React, { useCallback, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Therapist, Appointment } from "@/lib/types";

interface OccupancyGridProps {
  therapists: Therapist[];
  appointments: Appointment[];
  onAppointmentClick?: (appointmentId: string) => void;
}

type NormalizedAppointment = {
  appointment: Appointment;
  therapistId: string;
  dateKey: string;
  startHour: number;
  endHour: number;
};

export function OccupancyGrid({ therapists, appointments, onAppointmentClick }: OccupancyGridProps) {
  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const hours = useMemo(() => Array.from({ length: 12 }, (_, i) => 9 + i), []); // 9:00 to 20:00

  const { daysInMonth, monthDates, monthStartTime, monthEndTime } = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    firstDay.setHours(0, 0, 0, 0);
    const lastDay = new Date(currentYear, currentMonth + 1, 1);
    lastDay.setHours(0, 0, 0, 0);

    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const dates = Array.from({ length: totalDays }, (_, i) => {
      const date = new Date(firstDay);
      date.setDate(firstDay.getDate() + i);
      return date;
    });

    return {
      daysInMonth: totalDays,
      monthDates: dates,
      monthStartTime: firstDay.getTime(),
      monthEndTime: lastDay.getTime(),
    };
  }, [currentMonth, currentYear]);

  const formatDateKey = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const appointmentsBySlot = useMemo(() => {
    const map = new Map<string, Appointment>();

    if (!appointments.length) {
      return map;
    }

    const normalized: NormalizedAppointment[] = [];

    for (const appointment of appointments) {
      if (appointment.status === 'cancelled') {
        continue;
      }

      const appointmentDate = new Date(appointment.date);
      appointmentDate.setHours(0, 0, 0, 0);
      const appointmentTime = appointmentDate.getTime();

      if (appointmentTime < monthStartTime || appointmentTime >= monthEndTime) {
        continue;
      }

      const [startHourRaw] = appointment.startTime.split(':');
      const [endHourRaw] = appointment.endTime.split(':');

      const startHour = parseInt(startHourRaw ?? '0', 10) || 0;
      const endHour = parseInt(endHourRaw ?? '0', 10) || 0;

      normalized.push({
        appointment,
        therapistId: appointment.therapistId,
        dateKey: formatDateKey(appointmentDate),
        startHour,
        endHour: Math.max(startHour, endHour),
      });
    }

    for (const item of normalized) {
      for (let hour = item.startHour; hour < item.endHour; hour++) {
        map.set(`${item.therapistId}-${item.dateKey}-${hour}`, item.appointment);
      }
    }

    return map;
  }, [appointments, formatDateKey, monthEndTime, monthStartTime]);

  // Month names in Spanish
  const monthNames = useMemo(() => [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ], []);

  // Navigation functions
  const goToPreviousMonth = useCallback(() => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  }, [currentMonth, currentYear]);

  const goToNextMonth = useCallback(() => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  }, [currentMonth, currentYear]);

  const goToToday = useCallback(() => {
    const now = new Date();
    setCurrentMonth(now.getMonth());
    setCurrentYear(now.getFullYear());
  }, []);

  // Find appointment for a therapist at a specific time
  const getAppointment = useCallback((therapistId: string, date: Date, hour: number): Appointment | undefined => {
    return appointmentsBySlot.get(`${therapistId}-${formatDateKey(date)}-${hour}`);
  }, [appointmentsBySlot, formatDateKey]);

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
