'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Therapist, Appointment, User } from '@/lib/types';
import { TherapistSelector } from '@/components/TherapistSelector';
import { CalendarView } from '@/components/CalendarView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SimpleOccupancyGrid } from '@/components/SimpleOccupancyGrid';
import { SimpleAvailabilitySummary } from '@/components/SimpleAvailabilitySummary';
import { Button } from "@/components/ui/button";
import { AppointmentEditDialog } from "@/components/AppointmentEditDialog";
import CreateAppointmentDialog from "@/components/CreateAppointmentDialog";

export default function Calendar3() {
  const [selectedTherapist, setSelectedTherapist] = useState('all');
  const [viewType, setViewType] = useState<'general' | 'individual'>('general');
  const [calendarView, setCalendarView] = useState<'monthly' | 'weekly'>('monthly');
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDialogContext, setCreateDialogContext] = useState<{
    therapistId?: string;
    date?: string;
  }>({});

  const { data: therapists = [], isLoading: isLoadingTherapists } = useQuery<Therapist[]>({
    queryKey: ["/api/therapists"],
  });

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  const { data: clients = [] } = useQuery<User[]>({
    queryKey: ["/api/clients"],
  });

  const handleDayClick = (therapistId: string, date: string) => {
    setCreateDialogContext({ therapistId, date });
    setCreateDialogOpen(true);
  };

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
            {selectedTherapist !== 'all' && (
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
            )}
            {selectedTherapist !== 'all' ? (
                <div className="space-y-4">
                {calendarView === 'monthly' ? (
                    <CalendarView
                        appointments={appointments}
                        selectedTherapist={selectedTherapist}
                    />
                ) : (
                    <p>Vista Semanal</p>
                )}
                </div>
            ) : (
                <div className="text-center py-12 text-muted-foreground">
                    Por favor, selecciona un terapeuta para ver su calendario.
                </div>
            )}
        </TabsContent>
      </Tabs>
      <AppointmentEditDialog
        appointmentId={editingAppointmentId}
        onClose={() => setEditingAppointmentId(null)}
      />
      <CreateAppointmentDialog
        open={createDialogOpen}
        initialTherapistId={createDialogContext.therapistId}
        initialDate={createDialogContext.date}
        onClose={() => {
          setCreateDialogOpen(false);
          setCreateDialogContext({});
        }}
      />
    </div>
  );
}