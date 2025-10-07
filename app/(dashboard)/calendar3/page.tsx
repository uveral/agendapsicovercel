'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Appointment, Therapist, User } from '@/lib/types';
import { getAppointments, getTherapists, getUsers } from '@/lib/api';
import { CalendarView } from '@/components/CalendarView';
import { TherapistSelector } from '@/components/TherapistSelector';
import { SimpleOccupancyGrid } from '@/components/SimpleOccupancyGrid';
import { WeekCalendar } from '@/components/WeekCalendar';
import { Button } from '@/components/ui/button';
import { AppointmentEditDialog } from '@/components/AppointmentEditDialog';
import CreateAppointmentDialog from '@/components/CreateAppointmentDialog';

export default function Calendar3Page() {
  const [selectedTherapist, setSelectedTherapist] = useState('all');
  const [calendarView, setCalendarView] = useState<'monthly' | 'weekly'>('monthly');
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDialogContext, setCreateDialogContext] = useState<{
    therapistId?: string;
    date?: string;
  }>({});

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

  const handleAppointmentClick = (appointmentId: string) => {
    setEditingAppointmentId(appointmentId);
  };

  const handleDayClick = (date: Date) => {
    setCreateDialogContext({ date: date.toISOString().split('T')[0] });
    setCreateDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Calendar 3 - Phase 5: Implement Appointment Dialogs</h1>
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          {calendarView === 'monthly' ? (
            <CalendarView
              appointments={appointments || []}
              selectedTherapist={selectedTherapist}
              onAppointmentClick={handleAppointmentClick}
              onDayClick={handleDayClick}
            />
          ) : (
            selectedTherapistData ? (
              <WeekCalendar
                therapistName={selectedTherapistData.name}
                therapistId={selectedTherapistData.id}
                appointments={appointments || []}
                clients={clients || []}
                onAppointmentClick={handleAppointmentClick}
              />
            ) : (
              <p>Select a therapist to view weekly calendar</p>
            )
          )}
        </div>
        <div>
          <SimpleOccupancyGrid
            therapists={therapists || []}
            appointments={appointments || []}
          />
        </div>
      </div>
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
