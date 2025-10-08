'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Calendar as DateCalendar } from '@/components/ui/calendar';
import { OccupancyGrid } from '@/components/OccupancyGrid';
import { TherapistMonthView } from '@/components/TherapistMonthView';
import { WeekCalendar } from '@/components/WeekCalendar';
import { AvailabilitySummary } from '@/components/AvailabilitySummary';
import { AppointmentEditDialog } from '@/components/AppointmentEditDialog';
import CreateAppointmentDialog from '@/components/CreateAppointmentDialog';
import { DayOccupancyGrid } from '@/components/DayOccupancyGrid';
import { DayAvailabilitySummary } from '@/components/DayAvailabilitySummary';
import { useAuth } from '@/contexts/AuthContext';
import type { Appointment, Therapist, User } from '@/lib/types';

type ActiveTab = 'overview' | 'personal';
type PersonalView = 'month' | 'week';

type CreateDialogPayload = {
  open: boolean;
  therapistId?: string;
  dateISO?: string;
};

function OverviewSection({
  therapists,
  appointments,
  selectedDate,
  onSelectDate,
  onAppointmentClick,
}: {
  therapists: Therapist[];
  appointments: Appointment[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onAppointmentClick: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
        <DateCalendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => date && onSelectDate(date)}
          className="rounded-md border"
        />
        <div className="space-y-4">
          <DayOccupancyGrid
            therapists={therapists}
            appointments={appointments}
            selectedDate={selectedDate}
            onAppointmentClick={onAppointmentClick}
          />
          <DayAvailabilitySummary appointments={appointments} selectedDate={selectedDate} />
        </div>
      </div>

      <OccupancyGrid
        therapists={therapists}
        appointments={appointments}
        onAppointmentClick={onAppointmentClick}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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
    </div>
  );
}

function PersonalSection({
  therapistId,
  therapistName,
  appointments,
  clients,
  onDayClick,
  onAppointmentClick,
}: {
  therapistId: string;
  therapistName: string;
  appointments: Appointment[];
  clients: User[];
  onDayClick: (therapistId: string, dateISO: string) => void;
  onAppointmentClick: (id: string) => void;
}) {
  const [viewMode, setViewMode] = useState<PersonalView>('month');

  useEffect(() => {
    setViewMode('month');
  }, [therapistId]);

  return (
    <div className="space-y-6">
      <div className="flex justify-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={viewMode === 'month' ? 'default' : 'outline'}
          onClick={() => setViewMode('month')}
          data-testid="button-view-monthly"
        >
          Vista Mensual
        </Button>
        <Button
          type="button"
          size="sm"
          variant={viewMode === 'week' ? 'default' : 'outline'}
          onClick={() => setViewMode('week')}
          data-testid="button-view-weekly"
        >
          Vista Semanal
        </Button>
      </div>

      {viewMode === 'month' ? (
        <TherapistMonthView
          therapistId={therapistId}
          therapistName={therapistName}
          appointments={appointments}
          clients={clients}
          onAppointmentClick={onAppointmentClick}
          onDayClick={onDayClick}
        />
      ) : (
        <WeekCalendar
          therapistId={therapistId}
          therapistName={therapistName}
          appointments={appointments}
          clients={clients}
          onAppointmentClick={onAppointmentClick}
        />
      )}

      <AvailabilitySummary therapistId={therapistId} appointments={appointments} />
    </div>
  );
}

export default function Calendar4Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

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

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [selectedTherapist, setSelectedTherapist] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [editingAppointment, setEditingAppointment] = useState<string | null>(null);
  const [createDialog, setCreateDialog] = useState<CreateDialogPayload>({ open: false });

  const therapistOptions = useMemo(
    () => [
      { value: 'all', label: 'Todos los terapeutas' },
      ...therapists.map((therapist) => ({ value: therapist.id, label: therapist.name })),
    ],
    [therapists]
  );

  const therapistLabel = useMemo(() => {
    return therapistOptions.find((option) => option.value === selectedTherapist)?.label ?? '';
  }, [selectedTherapist, therapistOptions]);

  const therapistParam = searchParams?.get('therapist');

  useEffect(() => {
    const therapistFromContext =
      user?.role === 'therapist' && user.therapistId ? user.therapistId : 'all';
    const resolvedTherapist = therapistParam ?? therapistFromContext;

    setSelectedTherapist((prev) => (prev === resolvedTherapist ? prev : resolvedTherapist));
    setActiveTab(resolvedTherapist === 'all' ? 'overview' : 'personal');
  }, [therapistParam, user?.role, user?.therapistId]);

  const openCreateDialog = useCallback((therapistId?: string, dateISO?: string) => {
    setCreateDialog({ open: true, therapistId, dateISO });
  }, []);

  const closeCreateDialog = useCallback(() => {
    setCreateDialog({ open: false });
  }, []);

  const handleTherapistChange = useCallback(
    (value: string) => {
      setSelectedTherapist(value);
      const nextTab = value === 'all' ? 'overview' : 'personal';
      setActiveTab(nextTab);
      if (value === 'all') {
        router.replace('/calendar4');
      } else {
        router.replace(`/calendar4?therapist=${value}`);
      }
    },
    [router]
  );

  const handleDayCreate = useCallback(
    (therapistId: string, dateISO: string) => {
      openCreateDialog(therapistId, dateISO);
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
          <p className="text-muted-foreground">
            Una vista combinada con el resumen diario y el detalle por terapeuta.
          </p>
        </div>

        <Select value={selectedTherapist} onValueChange={handleTherapistChange}>
          <SelectTrigger className="w-full sm:w-[280px]" data-testid="select-therapist">
            <SelectValue placeholder="Seleccionar terapeuta" />
          </SelectTrigger>
          <SelectContent>
            {therapistOptions.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                data-testid={`select-item-therapist-${option.value}`}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ActiveTab)}>
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-general">
            Vista General
          </TabsTrigger>
          <TabsTrigger value="personal" data-testid="tab-individual">
            Vista Individual
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-6">
          <OverviewSection
            therapists={therapists}
            appointments={appointments}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onAppointmentClick={(id) => setEditingAppointment(id)}
          />
        </TabsContent>

        <TabsContent value="personal" className="pt-6">
          {selectedTherapist === 'all' ? (
            <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
              Escoge un terapeuta para revisar su agenda.
            </div>
          ) : (
            <PersonalSection
              therapistId={selectedTherapist}
              therapistName={therapistLabel}
              appointments={appointments}
              clients={clients}
              onAppointmentClick={(id) => setEditingAppointment(id)}
              onDayClick={handleDayCreate}
            />
          )}
        </TabsContent>
      </Tabs>

      <AppointmentEditDialog
        appointmentId={editingAppointment}
        onClose={() => setEditingAppointment(null)}
      />

      <CreateAppointmentDialog
        open={createDialog.open}
        initialTherapistId={createDialog.therapistId}
        initialDate={createDialog.dateISO}
        onClose={closeCreateDialog}
      />
    </div>
  );
}
