
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Appointment } from '@/lib/types';

interface DayAvailabilitySummaryProps {
  appointments: Appointment[];
  selectedDate: Date;
}

export function DayAvailabilitySummary({ appointments, selectedDate }: DayAvailabilitySummaryProps) {
  const dailyAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.date);
    return aptDate.toDateString() === selectedDate.toDateString() && apt.status !== 'cancelled';
  });

  const totalAppointments = dailyAppointments.length;
  const totalHours = dailyAppointments.reduce((acc, apt) => {
    const [startHour] = apt.startTime.split(':').map(Number);
    const [endHour] = apt.endTime.split(':').map(Number);
    return acc + (endHour - startHour);
  }, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Resumen del Día</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total de Citas</p>
            <p className="text-2xl font-bold">{totalAppointments}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total de Horas</p>
            <p className="text-2xl font-bold">{totalHours}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
