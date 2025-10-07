
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Appointment } from '@/lib/types';

interface CalendarViewProps {
  appointments: Appointment[];
  selectedTherapist: string;
}

const getDaysInMonth = (year: number, month: number): Date[] => {
  const date = new Date(year, month, 1);
  const days = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};

export function CalendarView({ appointments, selectedTherapist }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);

  const appointmentsByDate = new Map<string, Appointment[]>();
  appointments.forEach((apt) => {
    if (selectedTherapist === 'all' || apt.therapistId === selectedTherapist) {
        const date = new Date(apt.date).toDateString();
        if (!appointmentsByDate.has(date)) {
            appointmentsByDate.set(date, []);
        }
        appointmentsByDate.get(date)?.push(apt);
    }
  });

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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' })} {currentYear}</CardTitle>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center font-semibold">{day}</div>
          ))}
          {daysInMonth.map(day => {
            const dayAppointments = appointmentsByDate.get(day.toDateString()) || [];
            return (
              <div key={day.toISOString()} className="border rounded-md p-2 h-24">
                <div>{day.getDate()}</div>
                <div className="text-xs">
                  {dayAppointments.map(apt => (
                    <div key={apt.id}>{apt.startTime}</div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
