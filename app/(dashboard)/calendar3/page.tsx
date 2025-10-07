'use client';

import React, { useState } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import type { Appointment, Therapist, User } from '@/lib/types';
import { getAppointments, getTherapists, getUsers } from '@/lib/api';
import { CalendarView } from '@/components/CalendarView';
import { TherapistSelector } from '@/components/TherapistSelector';

export default function Calendar3Page() {
  const [selectedTherapist, setSelectedTherapist] = useState('all');

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

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Calendar 3 - Phase 2: Implement CalendarView</h1>
      <TherapistSelector
        therapists={therapists || []}
        selectedTherapist={selectedTherapist}
        onSelectTherapist={setSelectedTherapist}
      />
      <CalendarView
        appointments={appointments || []}
        selectedTherapist={selectedTherapist}
      />
    </div>
  );
}
