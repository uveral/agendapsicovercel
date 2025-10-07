
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Therapist, Appointment } from '@/lib/types';

interface SimpleOccupancyGridProps {
  therapists: Therapist[];
  appointments: Appointment[];
}

export function SimpleOccupancyGrid({ therapists, appointments }: SimpleOccupancyGridProps) {
  const hours = Array.from({ length: 12 }, (_, i) => 9 + i); // 9:00 to 20:00
  const today = new Date();

  const appointmentMap = new Map<string, boolean>();
  appointments.forEach((apt) => {
    if (apt.status === 'cancelled') return;
    const aptDate = new Date(apt.date);
    if (aptDate.toDateString() === today.toDateString()) {
      const [startHour] = apt.startTime.split(':').map(Number);
      const [endHour] = apt.endTime.split(':').map(Number);
      for (let hour = startHour; hour < endHour; hour++) {
        const key = `${apt.therapistId}-${hour}`;
        appointmentMap.set(key, true);
      }
    }
  });

  const isOccupied = (therapistId: string, hour: number): boolean => {
    const key = `${therapistId}-${hour}`;
    return appointmentMap.has(key);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Ocupación de Hoy</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-12 gap-1">
          {therapists.map((therapist) => (
            <div key={therapist.id} className="col-span-1">
              <div className="text-center font-semibold">{therapist.name}</div>
              <div className="grid grid-rows-12 gap-1 mt-2">
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className={`w-full h-8 rounded-sm ${isOccupied(therapist.id, hour) ? 'bg-red-500' : 'bg-green-500'}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
