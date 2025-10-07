'use client';

import React, { useState } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import type { Appointment, Therapist, User } from '@/lib/types';
import { getAppointments } from '@/lib/api/appointments';
import { getTherapists } from '@/lib/api/therapists';
import { getUsers } from '@/lib/api/users';

export default function Calendar3Page() {
  const [selectedTherapist, setSelectedTherapist] = useState('all');

  const { data: appointments, isLoading: isLoadingAppointments } = useSuspenseQuery<Appointment[]>({ // Changed to useSuspenseQuery
    queryKey: ['appointments'],
    queryFn: getAppointments,
  });

  const { data: therapists, isLoading: isLoadingTherapists } = useSuspenseQuery<Therapist[]>({ // Changed to useSuspenseQuery
    queryKey: ['therapists'],
    queryFn: getTherapists,
  });

  const { data: clients, isLoading: isLoadingClients } = useSuspenseQuery<User[]>({ // Changed to useSuspenseQuery
    queryKey: ['users'],
    queryFn: getUsers,
  });

  if (isLoadingAppointments || isLoadingTherapists || isLoadingClients) {
    return (
      <div>
        <h1>Calendar 3</h1>
        <p>Loading data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Calendar 3 - Phase 1: Basic Structure and Data Fetching</h1>
      <p>Appointments loaded: {appointments.length}</p>
      <p>Therapists loaded: {therapists.length}</p>
      <p>Clients loaded: {clients.length}</p>
    </div>
  );
}