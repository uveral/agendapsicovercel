'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Therapist, Appointment } from '@/lib/types';
import { TherapistSelector } from '@/components/TherapistSelector';
import { CalendarView } from '@/components/CalendarView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SimpleOccupancyGrid } from '@/components/SimpleOccupancyGrid';
import { SimpleAvailabilitySummary } from '@/components/SimpleAvailabilitySummary';

export default function Calendar3() {
  const [selectedTherapist, setSelectedTherapist] = useState('all');
  const [viewType, setViewType] = useState<'general' | 'individual'>('general');

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
      <Tabs value={viewType} onValueChange={(value) => setViewType(value as 'general' | 'individual')}>
        <TabsList>
          <TabsTrigger value="general">Vista General</TabsTrigger>
          <TabsTrigger value="individual">Vista Individual</TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="space-y-4">
          <SimpleOccupancyGrid
            therapists={therapists}
            appointments={appointments}
          />
          <SimpleAvailabilitySummary
            appointments={appointments}
          />
        </TabsContent>
        <TabsContent value="individual">
            <CalendarView
                appointments={appointments}
                selectedTherapist={selectedTherapist}
            />
        </TabsContent>
      </Tabs>
    </div>
  );
}