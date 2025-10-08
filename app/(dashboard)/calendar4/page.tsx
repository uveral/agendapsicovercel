'use client';

import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar as DayPicker } from '@/components/ui/calendar';
import { TherapistMonthView } from '@/components/TherapistMonthView';
import { WeekCalendar } from '@/components/WeekCalendar';
import { AppointmentEditDialog } from '@/components/AppointmentEditDialog';
import CreateAppointmentDialog from '@/components/CreateAppointmentDialog';
import { AvailabilitySummary } from '@/components/AvailabilitySummary';
import { useAuth } from '@/contexts/AuthContext';
import type { Appointment, Therapist, User } from '@/lib/types';

const DayOccupancyGrid = lazy(() =>
  import('@/components/DayOccupancyGrid').then((mod) => ({ default: mod.DayOccupancyGrid }))
);

const DayAvailabilitySummary = lazy(() =>
  import('@/components/DayAvailabilitySummary').then((mod) => ({ default: mod.DayAvailabilitySummary }))
);

const OccupancyGrid = lazy(() =>
  import('@/components/OccupancyGrid').then((mod) => ({ default: mod.OccupancyGrid }))
);

type ViewMode = 'general' | 'individual';
type ScheduleView = 'monthly' | 'weekly';

type CreateDialogState = {
  open: boolean;
  therapistId?: string;
  date?: string;
};

function CalendarWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const therapistFromQuery = searchParams?.get('therapist') ?? null;

  const { data: therapists = [], isLoading: loadingTherapists } = useQuery<Therapist[]>({
    queryKey: ['/api/therapists'],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ['/api/appointments'],
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: clients = [] } = useQuery<User[]>({
    queryKey: ['/api/clients'],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const inferredDefaultTherapist = useMemo(() => {
    if (therapistFromQuery) return therapistFromQuery;
    if (user?.role === 'therapist' && user.therapistId) {
      return user.therapistId;
    }
    return 'all';
  }, [therapistFromQuery, user?.role, user?.therapistId]);

  const [selectedTherapist, setSelectedTherapist] = useState<string>(inferredDefaultTherapist);
  const [viewMode, setViewMode] = useState<ViewMode>(inferredDefaultTherapist === 'all' ? 'general' : 'individual');
  const [scheduleView, setScheduleView] = useState<ScheduleView>('monthly');
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const [createDialog, setCreateDialog] = useState<CreateDialogState>({ open: false });

  useEffect(() => {
    setSelectedTherapist((prev) => (prev === inferredDefaultTherapist ? prev : inferredDefaultTherapist));
    setViewMode(inferredDefaultTherapist === 'all' ? 'general' : 'individual');
  }, [inferredDefaultTherapist]);

  const therapistOptions = useMemo(
    () => [
      { value: 'all', label: 'Todos los terapeutas' },
      ...therapists.map((therapist) => ({ value: therapist.id, label: therapist.name })),
    ],
    [therapists]
  );

  const handleTherapistChange = useCallback(
    (value: string) => {
      if (value === selectedTherapist) return;

      setSelectedTherapist(value);
      setViewMode(value === 'all' ? 'general' : 'individual');
      setScheduleView('monthly');

      const destination = value === 'all' ? '/calendar4' : `/calendar4?therapist=${value}`;
      router.replace(destination);
    },
    [router, selectedTherapist]
  );

  const openCreateDialog = useCallback((therapistId?: string, date?: string) => {
    setCreateDialog({ open: true, therapistId, date });
  }, []);

  const closeCreateDialog = useCallback(() => {
    setCreateDialog({ open: false });
  }, []);

  const handleDayClick = useCallback(
    (therapistId: string, date: string) => {
      openCreateDialog(therapistId, date);
    },
    [openCreateDialog]
  );

  if (loadingTherapists || therapists.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Cargando calendario...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Calendario 4</h1>
          <p className="text-muted-foreground">Gestiona la agenda diaria y por terapeuta desde una sola vista.</p>
        </div>

        <Select value={selectedTherapist} onValueChange={handleTherapistChange}>
          <SelectTrigger className="w-full sm:w-[280px]" data-testid="select-therapist">
            <SelectValue placeholder="Seleccionar terapeuta" />
          </SelectTrigger>
          <SelectContent>
            {therapistOptions.map((option) => (
              <SelectItem key={option.value} value={option.value} data-testid={`select-item-therapist-${option.value}`}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)} data-testid="tabs-view-mode">
        <TabsList>
          <TabsTrigger value="general" data-testid="tab-general">
            Vista General
          </TabsTrigger>
          <TabsTrigger value="individual" data-testid="tab-individual">
            Vista Individual
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6 pt-6">
          <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border"
            />
            <div className="space-y-4">
              <Suspense fallback={<div className="p-4 text-center text-muted-foreground">Cargando ocupación diaria...</div>}>
                <DayOccupancyGrid
                  therapists={therapists}
                  appointments={appointments}
                  selectedDate={selectedDate}
                  onAppointmentClick={(id) => setEditingAppointmentId(id)}
                />
                <DayAvailabilitySummary appointments={appointments} selectedDate={selectedDate} />
              </Suspense>
            </div>
          </div>

          <Suspense fallback={<div className="p-6 text-center text-muted-foreground">Preparando vista mensual...</div>}>
            <OccupancyGrid
              therapists={therapists}
              appointments={appointments}
              onAppointmentClick={(id) => setEditingAppointmentId(id)}
            />
          </Suspense>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {therapists.map((therapist) => (
              <AvailabilitySummary
                key={therapist.id}
                therapistId={therapist.id}
                therapistName={therapist.name}
                appointments={appointments}
                showTherapistName
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="individual" className="space-y-6 pt-6">
          {selectedTherapist === 'all' ? (
            <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
              Selecciona un terapeuta para acceder a su agenda personal.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={scheduleView === 'monthly' ? 'default' : 'outline'}
                  onClick={() => setScheduleView('monthly')}
                  data-testid="button-view-monthly"
                >
                  Vista Mensual
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={scheduleView === 'weekly' ? 'default' : 'outline'}
                  onClick={() => setScheduleView('weekly')}
                  data-testid="button-view-weekly"
                >
                  Vista Semanal
                </Button>
              </div>

              {scheduleView === 'monthly' ? (
                <TherapistMonthView
                  therapistId={selectedTherapist}
                  therapistName={therapistOptions.find((option) => option.value === selectedTherapist)?.label ?? ''}
                  appointments={appointments}
                  clients={clients}
                  onAppointmentClick={(id) => setEditingAppointmentId(id)}
                  onDayClick={handleDayClick}
                />
              ) : (
                <WeekCalendar
                  therapistId={selectedTherapist}
                  therapistName={therapistOptions.find((option) => option.value === selectedTherapist)?.label ?? ''}
                  appointments={appointments}
                  clients={clients}
                  onAppointmentClick={(id) => setEditingAppointmentId(id)}
                />
              )}

              <AvailabilitySummary therapistId={selectedTherapist} appointments={appointments} />
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AppointmentEditDialog appointmentId={editingAppointmentId} onClose={() => setEditingAppointmentId(null)} />

      <CreateAppointmentDialog
        open={createDialog.open}
        initialTherapistId={createDialog.therapistId}
        initialDate={createDialog.date}
        onClose={closeCreateDialog}
      />
    </div>
  );
}

export default function Calendar4Page() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-muted-foreground">Cargando calendario...</div>
      }
    >
      <CalendarWorkspace />
    </Suspense>
  );
}
