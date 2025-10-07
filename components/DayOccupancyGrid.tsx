
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Therapist, Appointment } from '@/lib/types';

interface DayOccupancyGridProps {
  therapists: Therapist[];
  appointments: Appointment[];
  selectedDate: Date;
  onAppointmentClick?: (appointmentId: string) => void;
}

export function DayOccupancyGrid({ therapists, appointments, selectedDate, onAppointmentClick }: DayOccupancyGridProps) {
  const hours = Array.from({ length: 12 }, (_, i) => 9 + i); // 9:00 to 20:00

  const appointmentMap = new Map<string, Appointment>();
  appointments.forEach((apt) => {
    if (apt.status === 'cancelled') return;
    const aptDate = new Date(apt.date);
    if (aptDate.toDateString() === selectedDate.toDateString()) {
      const [startHour] = apt.startTime.split(':').map(Number);
      const [endHour] = apt.endTime.split(':').map(Number);
      for (let hour = startHour; hour < endHour; hour++) {
        const key = `${apt.therapistId}-${hour}`;
        appointmentMap.set(key, apt);
      }
    }
  });

  const getAppointment = (therapistId: string, hour: number): Appointment | undefined => {
    const key = `${therapistId}-${hour}`;
    return appointmentMap.get(key);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Ocupación del Día</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <div
              className="grid gap-1"
              style={{
                gridTemplateColumns: `auto repeat(${hours.length}, minmax(40px, 1fr))`,
              }}
            >
              <div className="text-xs font-medium text-muted-foreground uppercase p-2 sticky left-0 bg-card z-10">
                Terapeuta
              </div>
              {hours.map((hour) => (
                <div key={`header-${hour}`} className="text-center p-1">
                  <div className="text-xs font-medium">{hour}:00</div>
                </div>
              ))}

              {therapists.map((therapist) => (
                <React.Fragment key={`therapist-row-${therapist.id}`}>
                  <div className="text-xs text-muted-foreground p-2 flex items-center sticky left-0 bg-card z-10">
                    {therapist.name}
                  </div>
                  {hours.map((hour) => {
                    const appointment = getAppointment(therapist.id, hour);
                    const isOccupied = !!appointment;
                    return (
                      <div
                        key={`${therapist.id}-${hour}`}
                        className="p-1 border border-border rounded-sm bg-card min-h-[40px] flex flex-wrap gap-0.5 items-center justify-center"
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={`w-full h-full rounded-sm transition-transform hover:scale-105 ${isOccupied ? 'cursor-pointer' : 'cursor-default'}`}
                              style={{
                                backgroundColor: isOccupied ? therapist.color : '#d1d5db',
                              }}
                              onClick={() => {
                                if (appointment && onAppointmentClick) {
                                  onAppointmentClick(appointment.id);
                                }
                              }}
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
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
