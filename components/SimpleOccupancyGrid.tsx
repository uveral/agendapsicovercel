'use client';

import React, { useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Therapist, Appointment } from '@/lib/types';
import { FixedSizeGrid } from 'react-window';
import useResizeObserver from 'use-resize-observer';

interface SimpleOccupancyGridProps {
  therapists: Therapist[];
  appointments: Appointment[];
}

export function SimpleOccupancyGrid({ therapists, appointments }: SimpleOccupancyGridProps) {
  const { ref, width = 1, height = 1 } = useResizeObserver<HTMLDivElement>();
  const hours = Array.from({ length: 12 }, (_, i) => 9 + i); // 9:00 to 20:00
  const today = new Date();

  const appointmentMap = useMemo(() => {
    const map = new Map<string, boolean>();
    appointments.forEach((apt) => {
      if (apt.status === 'cancelled') return;
      const aptDate = new Date(apt.date);
      if (aptDate.toDateString() === today.toDateString()) {
        const [startHour] = apt.startTime.split(':').map(Number);
        const [endHour] = apt.endTime.split(':').map(Number);
        for (let hour = startHour; hour < endHour; hour++) {
          const key = `${apt.therapistId}-${hour}`;
          map.set(key, true);
        }
      }
    });
    return map;
  }, [appointments]);

  const columnWidth = width / therapists.length;
  const rowHeight = height / hours.length;

  const Cell = useCallback(({ columnIndex, rowIndex, style }: { columnIndex: number, rowIndex: number, style: React.CSSProperties }) => {
    const therapist = therapists[columnIndex];
    const hour = hours[rowIndex];
    const key = `${therapist.id}-${hour}`;
    const isOccupied = appointmentMap.has(key);

    return (
      <div style={style} className="flex items-center justify-center">
        <div
          className={`w-full h-full rounded-sm ${isOccupied ? 'bg-red-500' : 'bg-green-500'}`}
        />
      </div>
    );
  }, [therapists, hours, appointmentMap, columnWidth, rowHeight]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Ocupación de Hoy</CardTitle>
      </CardHeader>
      <CardContent style={{ height: '400px' }}>
        <div className="grid" style={{ gridTemplateColumns: `repeat(${therapists.length}, 1fr)`}}>
            {therapists.map((therapist) => (
                <div key={therapist.id} className="text-center font-semibold">{therapist.name}</div>
            ))}
        </div>
        <div ref={ref} style={{ width: '100%', height: 'calc(100% - 40px)' }}>
            <FixedSizeGrid
                columnCount={therapists.length}
                columnWidth={columnWidth}
                height={height}
                rowCount={hours.length}
                rowHeight={rowHeight}
                width={width}
            >
                {Cell}
            </FixedSizeGrid>
        </div>
      </CardContent>
    </Card>
  );
}