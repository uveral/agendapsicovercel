'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Therapist, Appointment, User } from '@/lib/types';

export default function Calendar3() {
  const { data: therapists = [], isLoading: isLoadingTherapists } = useQuery<Therapist[]>({
    queryKey: ["/api/therapists"],
  });

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  const { data: clients = [] } = useQuery<User[]>({
    queryKey: ["/api/clients"],
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
    <div>
      <h1>Calendario 3</h1>
      <p>Datos cargados!</p>
      <pre>{JSON.stringify({ therapists, appointments, clients }, null, 2)}</pre>
    </div>
  );
}