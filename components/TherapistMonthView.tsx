
'use client';

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Appointment, User } from "@/lib/types";

interface TherapistMonthViewProps {
  therapistName: string;
  therapistId: string;
  appointments: Appointment[];
  clients: User[];
  onAppointmentClick?: (appointmentId: string) => void;
  onDayClick?: (therapistId: string, date: string) => void;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
}

const getDaysInMonth = (year: number, month: number): CalendarDay[] => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const firstDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  
  const startPadding = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  
  const days: CalendarDay[] = [];
  
  for (let i = startPadding - 1; i >= 0; i--) {
    const prevMonthDay = new Date(year, month, -i);
    days.push({ date: prevMonthDay, isCurrentMonth: false });
  }
  
  for (let day = 1; day <= daysInMonth; day++) {
    days.push({ date: new Date(year, month, day), isCurrentMonth: true });
  }
  
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
  }
  
  return days;
};

  }
);

export const TherapistMonthView = React.memo(_TherapistMonthView);
