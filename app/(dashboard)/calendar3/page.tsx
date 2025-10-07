'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Appointment, Therapist, User } from '@/lib/types';
import { getAppointments, getTherapists, getUsers } from '@/lib/api';
import { CalendarView } from '@/components/CalendarView';
import { TherapistSelector } from '@/components/TherapistSelector';
import { SimpleOccupancyGrid } from '@/components/SimpleOccupancyGrid';

export default function Calendar3Page() {
  const [selectedTherapist, setSelectedTherapist] = useState('all');

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
      <h1 className="text-2xl font-bold">Calendar 3 - Phase 3: Implement SimpleOccupancyGrid</h1>
      <TherapistSelector
        therapists={therapists || []}
        selectedTherapist={selectedTherapist}
        onSelectTherapist={setSelectedTherapist}
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <CalendarView
            appointments={appointments || []}
            selectedTherapist={selectedTherapist}
          />
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
