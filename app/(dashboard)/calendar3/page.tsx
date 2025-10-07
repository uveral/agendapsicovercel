'use client';

import React, { useState } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import type { Appointment, Therapist, User } from '@/lib/types';
import { getAppointments, getTherapists, getUsers } from '@/lib/api';

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
      <h1 className="text-2xl font-bold">Calendar 3 - Phase 1: Basic Structure and Data Fetching</h1>
      <p>Appointments loaded: {appointments.length}</p>
      <p>Therapists loaded: {therapists.length}</p>
      <p>Clients loaded: {clients.length}</p>
    </div>
  );
}