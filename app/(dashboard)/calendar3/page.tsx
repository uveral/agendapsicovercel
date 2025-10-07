
'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Therapist, Appointment, User } from '@/lib/types';
import { TherapistSelector } from '@/components/TherapistSelector';
import { CalendarView } from '@/components/CalendarView';

export default function Calendar3() {
  const [selectedTherapist, setSelectedTherapist] = useState('all');

  const { data: therapists = [], isLoading: isLoadingTherapists } = useQuery<Therapist[]>({
    queryKey: ["/api/therapists"],
  });

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  if (isLoadingTherapists) {
    return (
      <div>
        <h1>Calendario 3</h1>
        <p>Cargando datos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Calendario 3</h1>
      <TherapistSelector
        therapists={therapists}
        selectedTherapist={selectedTherapist}
        onSelectTherapist={setSelectedTherapist}
      />
      <CalendarView
        appointments={appointments}
        selectedTherapist={selectedTherapist}
      />
    </div>
  );
}
