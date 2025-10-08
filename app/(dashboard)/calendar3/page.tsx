'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Appointment, Therapist, User } from '@/lib/types';
import { getAppointments, getTherapists, getUsers } from '@/lib/api';
import { CalendarView } from '@/components/CalendarView';
import { TherapistSelector } from '@/components/TherapistSelector';
import { SimpleOccupancyGrid } from '@/components/SimpleOccupancyGrid';
// import { WeekCalendar } from '@/components/WeekCalendar'; // Excluded
import { Button } from '@/components/ui/button';

export default function Calendar3Page() {
  const [selectedTherapist, setSelectedTherapist] = useState('all');
  const [calendarView, setCalendarView] = useState<'monthly' | 'weekly'>('monthly'); // Added

  const { data: appointments } = useQuery<Appointment[]>({ 
    queryKey: ['appointments'],
    queryFn: getAppointments,
  });

  const { data: therapists } = useQuery<Therapist[]>({ 
    queryKey: ['therapists'],
    queryFn: getTherapists,
  });

  const { data: clients } = useQuery<User[]>({ 
    queryKey: ['users'],
    queryFn: getUsers,
  });

  const selectedTherapistData = therapists?.find(t => t.id === selectedTherapist);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Calendario</h1>
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
      <div className="grid grid-cols-1 gap-4">
        {selectedTherapist === 'all' ? (
          therapists.map((therapist) => (
            <div key={therapist.id} className="space-y-4">
              <h2 className="text-xl font-semibold">{therapist.name}</h2>
              <CalendarView
                appointments={appointments || []}
                selectedTherapist={therapist.id}
                clients={clients || []}
              />
            </div>
          ))
        ) : (
          <div>
            {calendarView === 'monthly' ? (
              <CalendarView
                appointments={appointments || []}
                selectedTherapist={selectedTherapist}
                clients={clients || []}
              />
            ) : (
              selectedTherapistData ? (
                <CalendarView // Render CalendarView for weekly view as well
                  appointments={appointments || []}
                  selectedTherapist={selectedTherapist}
                  clients={clients || []}
                />
              ) : (
                <p>Select a therapist to view weekly calendar</p>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
