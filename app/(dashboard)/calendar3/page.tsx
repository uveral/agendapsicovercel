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

  const selectedTherapistData = therapists?.find(t => t.id === selectedTherapist); // Added optional chaining

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Calendar 3 - Phase 4: Implement WeekCalendar (without WeekCalendar component)</h1>
      <TherapistSelector
        therapists={therapists || []}
        selectedTherapist={selectedTherapist}
        onSelectTherapist={setSelectedTherapist}
      />
      <div className="flex justify-center gap-2 mb-4"> {/* Added */}
        <Button {/* Added */}
          variant={calendarView === 'monthly' ? 'default' : 'outline'} {/* Added */}
          size="sm" {/* Added */}
          onClick={() => setCalendarView('monthly')} {/* Added */}
        > {/* Added */}
          Vista Mensual {/* Added */}
        </Button> {/* Added */}
        <Button {/* Added */}
          variant={calendarView === 'weekly' ? 'default' : 'outline'} {/* Added */}
          size="sm" {/* Added */}
          onClick={() => setCalendarView('weekly')} {/* Added */}
        > {/* Added */}
          Vista Semanal {/* Added */}
        </Button> {/* Added */}
      </div> {/* Added */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          {calendarView === 'monthly' ? ( {/* Modified */}
            <CalendarView
              appointments={appointments || []}
              selectedTherapist={selectedTherapist}
            />
          ) : ( {/* Modified */}
            selectedTherapistData ? ( {/* Modified */}
              <CalendarView // Render CalendarView for weekly view as well
                appointments={appointments || []}
                selectedTherapist={selectedTherapist}
              />
            ) : ( {/* Modified */}
              <p>Select a therapist to view weekly calendar</p> {/* Modified */}
            ) {/* Modified */}
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
