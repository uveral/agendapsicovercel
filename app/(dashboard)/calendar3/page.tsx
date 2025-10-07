'use client';

import React, { useState } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import type { Appointment, Therapist, User } from '@/lib/types';
import { getAppointments } from '@/lib/api/appointments';
import { getTherapists } from '@/lib/api/therapists';
import { getUsers } from '@/lib/api/users';
import { CalendarView } from '@/components/CalendarView';
import { TherapistSelector } from '@/components/TherapistSelector';
import { SimpleOccupancyGrid } from '@/components/SimpleOccupancyGrid';
import { WeekCalendar } from '@/components/WeekCalendar';
import { Button } from '@/components/ui/button';

export default function Calendar3Page() {
  const [selectedTherapist, setSelectedTherapist] = useState('all');
  const [calendarView, setCalendarView] = useState<'monthly' | 'weekly'>('monthly');

  const { data: appointments } = useSuspenseQuery<Appointment[]>({ 
    queryKey: ['appointments'],
    queryFn: getAppointments,
  });

  const { data: therapists } = useSuspenseQuery<Therapist[]>({ 
    queryKey: ['therapists'],
    queryFn: getTherapists,
  });

  const { data: clients } = useSuspenseQuery<User[]>({ 
    queryKey: ['users'],
    queryFn: getUsers,
  });

  const selectedTherapistData = therapists.find(t => t.id === selectedTherapist);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Calendar 3 - Phase 4: Implement WeekCalendar</h1>
      <TherapistSelector
        therapists={therapists || []}
        selectedTherapist={selectedTherapist}
        onSelectTherapist={setSelectedTherapist}
      />
      <div className="flex justify-center gap-2 mb-4">
        <Button
          variant={calendarView === 'monthly' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCalendarView('monthly')}
        >
          Vista Mensual
        </Button>
        <Button
          variant={calendarView === 'weekly' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCalendarView('weekly')}
        >
          Vista Semanal
        </Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          {calendarView === 'monthly' ? (
            <CalendarView
              appointments={appointments || []}
              selectedTherapist={selectedTherapist}
            />
          ) : (
            selectedTherapistData ? (
              <WeekCalendar
                therapistName={selectedTherapistData.name}
                therapistId={selectedTherapistData.id}
                appointments={appointments || []}
                clients={clients || []}
              />
            ) : (
              <p>Select a therapist to view weekly calendar</p>
            )
          )}
        </div>
        <div>
          <SimpleOccupancyGrid
            therapists={therapists || []}
            appointments={appointments || []}
          />
        </div>
      </div>
    </div>
  );
}
