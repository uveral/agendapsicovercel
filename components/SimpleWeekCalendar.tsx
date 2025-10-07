'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Appointment, User } from '@/lib/types';

interface SimpleWeekCalendarProps {
  therapistName: string;
  therapistId: string;
  appointments: Appointment[];
  clients: User[];
  onAppointmentClick?: (appointmentId: string) => void;
}

const getWeekDays = (date: Date): Date[] => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
    const weekDays = [];
    for (let i = 0; i < 5; i++) {
        const day = new Date(startOfWeek);
        day.setDate(day.getDate() + i);
        weekDays.push(day);
    }
    return weekDays;
};

export function SimpleWeekCalendar({ therapistName, therapistId, appointments, clients, onAppointmentClick }: SimpleWeekCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const weekDays = getWeekDays(currentDate);

  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    appointments.forEach((apt) => {
      if (therapistId === 'all' || apt.therapistId === therapistId) {
          const date = new Date(apt.date).toDateString();
          if (!map.has(date)) {
              map.set(date, []);
          }
          map.get(date)?.push(apt);
      }
    });
    return map;
  }, [appointments, therapistId]);

  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{therapistName}</CardTitle>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={goToNextWeek}>
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-2">
          {weekDays.map(day => (
            <div key={day.toISOString()} className="border rounded-md p-2 h-48">
              <div className="text-center font-semibold">{day.toLocaleDateString('default', { weekday: 'long' })}</div>
              <div className="text-center text-sm">{day.toLocaleDateString('default', { day: 'numeric', month: 'numeric' })}</div>
              <div className="text-xs mt-2 space-y-1">
                {(appointmentsByDate.get(day.toDateString()) || []).map(apt => (
                  <div key={apt.id} onClick={() => onAppointmentClick?.(apt.id)} className="bg-gray-200 p-1 rounded-md cursor-pointer">
                    <div>{apt.startTime} - {apt.endTime}</div>
                    <div>{clients.find(c => c.id === apt.clientId)?.firstName}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}