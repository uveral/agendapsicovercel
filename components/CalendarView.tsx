'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Appointment } from '@/lib/types';
import { FixedSizeGrid as Grid } from 'react-window';
import useResizeObserver from 'use-resize-observer';

interface CalendarViewProps {
  appointments: Appointment[];
  selectedTherapist: string;
}

const getCalendarGrid = (year: number, month: number): (Date | null)[] => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();

  const grid: (Date | null)[] = [];

  for (let i = 0; i < startDayOfWeek; i++) {
    grid.push(null);
  }

  for (let i = 1; i <= daysInMonth; i++) {
    grid.push(new Date(year, month, i));
  }

  return grid;
};

export function CalendarView({ appointments, selectedTherapist }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const { ref, width = 1, height = 1 } = useResizeObserver<HTMLDivElement>();

  const calendarGrid = useMemo(() => getCalendarGrid(currentYear, currentMonth), [currentYear, currentMonth]);

  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    appointments.forEach((apt) => {
      if (selectedTherapist === 'all' || apt.therapistId === selectedTherapist) {
        const date = new Date(apt.date).toDateString();
        if (!map.has(date)) {
          map.set(date, []);
        }
        map.get(date)?.push(apt);
      }
    });
    return map;
  }, [appointments, selectedTherapist]);

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

  const rowCount = Math.ceil(calendarGrid.length / 7);
  const columnWidth = width / 7;
  const rowHeight = height / rowCount;

  const Cell = useCallback(({ columnIndex, rowIndex, style }: { columnIndex: number, rowIndex: number, style: React.CSSProperties }) => {
    const index = rowIndex * 7 + columnIndex;
    const day = calendarGrid[index];

    if (!day) {
      return <div style={style}></div>;
    }

    const dayAppointments = appointmentsByDate.get(day.toDateString()) || [];

    return (
      <div style={style} className="border rounded-md p-2 overflow-hidden">
        <div>{day.getDate()}</div>
        <div className="text-xs space-y-1">
          {dayAppointments.map(apt => (
            <div key={apt.id} className="bg-blue-100 rounded-sm px-1 truncate">{apt.startTime}</div>
          ))}
        </div>
      </div>
    );
  }, [calendarGrid, appointmentsByDate, columnWidth, rowHeight]);

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
      <CardContent style={{ height: '600px' }}>
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center font-semibold">{day}</div>
          ))}
        </div>
        <div ref={ref} style={{ width: '100%', height: 'calc(100% - 40px)' }}>
          <Grid
            columnCount={7}
            columnWidth={columnWidth}
            height={height}
            rowCount={rowCount}
            rowHeight={rowHeight}
            width={width}
            itemData={{ appointmentsByDate }}
          >
            {Cell}
          </Grid>
        </div>
      </CardContent>
    </Card>
  );
}