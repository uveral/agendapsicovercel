'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from 'react';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AppointmentEditDialog } from '@/components/AppointmentEditDialog';
import CreateAppointmentDialog from '@/components/CreateAppointmentDialog';
import { useAuth } from '@/contexts/AuthContext';
import type { Appointment, Therapist, User } from '@/lib/types';

const STATUS_LABELS: Record<Appointment['status'], string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
};

const STATUS_CLASSES: Record<Appointment['status'], string> = {
  pending: 'text-amber-600',
  confirmed: 'text-emerald-600',
  cancelled: 'text-rose-600',
};

const dayLongFormatter = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

const dayShortFormatter = new Intl.DateTimeFormat('es-ES', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

const timeFormatter = new Intl.DateTimeFormat('es-ES', {
  hour: '2-digit',
  minute: '2-digit',
});

type ActiveTab = 'overview' | 'personal';

type CreateDialogPayload = {
  open: boolean;
  therapistId?: string;
  dateISO?: string;
};

interface NormalizedAppointment {
  id: string;
  therapistId: string;
  therapistName: string;
  clientId: string;
  clientName: string;
  status: Appointment['status'];
  notes?: string | null;
  start: Date;
  end: Date;
  dateKey: string;
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function combineDateTime(dateInput: Date | string, time: string): Date {
  const reference = new Date(dateInput);
  if (Number.isNaN(reference.getTime())) {
    return new Date(NaN);
  }
  const [hour, minute] = time.split(':').map((segment) => Number.parseInt(segment, 10) || 0);
  return new Date(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate(),
    hour,
    minute,
    0,
    0,
  );
}

function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = (day + 6) % 7; // convierte domingo (0) a 6, lunes (1) a 0
  result.setDate(result.getDate() - diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(date: Date, amount: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function formatHourRange(start: Date, end: Date): string {
  return `${timeFormatter.format(start)} – ${timeFormatter.format(end)}`;
}

function formatDayLong(date: Date): string {
  return dayLongFormatter.format(date);
}

function formatDayShort(date: Date): string {
  return dayShortFormatter.format(date);
}

function formatWeekRange(start: Date, end: Date): string {
  const startLabel = formatDayShort(start);
  const endLabel = formatDayShort(end);
  return `${startLabel} – ${endLabel}`;
}

function DailyStats({
  date,
  appointments,
  onCreate,
}: {
  date: Date;
  appointments: NormalizedAppointment[];
  onCreate: (therapistId?: string, isoDate?: string) => void;
}) {
  const stats = useMemo(() => {
    return appointments.reduce(
      (acc, appointment) => {
        acc.total += 1;
        acc[appointment.status] += 1;
        return acc;
      },
      { total: 0, pending: 0, confirmed: 0, cancelled: 0 },
    );
  }, [appointments]);

  const dateKey = formatDateKey(date);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Resumen del día</CardTitle>
        <CardDescription>{formatDayLong(date)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-md border p-3">
            <dt className="text-muted-foreground">Citas totales</dt>
            <dd className="text-xl font-semibold">{stats.total}</dd>
          </div>
          <div className="rounded-md border p-3">
            <dt className="text-muted-foreground">Confirmadas</dt>
            <dd className="text-xl font-semibold text-emerald-600">{stats.confirmed}</dd>
          </div>
          <div className="rounded-md border p-3">
            <dt className="text-muted-foreground">Pendientes</dt>
            <dd className="text-xl font-semibold text-amber-600">{stats.pending}</dd>
          </div>
          <div className="rounded-md border p-3">
            <dt className="text-muted-foreground">Canceladas</dt>
            <dd className="text-xl font-semibold text-rose-600">{stats.cancelled}</dd>
          </div>
        </dl>
        <Button type="button" className="w-full" onClick={() => onCreate(undefined, dateKey)}>
          Crear cita para este día
        </Button>
      </CardContent>
    </Card>
  );
}

function DailyAgenda({
  date,
  therapists,
  appointments,
  onEdit,
  onCreate,
}: {
  date: Date;
  therapists: Therapist[];
  appointments: NormalizedAppointment[];
  onEdit: (id: string) => void;
  onCreate: (therapistId?: string, isoDate?: string) => void;
}) {
  const dateKey = formatDateKey(date);

  const grouped = useMemo(() => {
    const groups = new Map<
      string,
      {
        therapistId?: string;
        therapistName: string;
        items: NormalizedAppointment[];
      }
    >();

    therapists.forEach((therapist) => {
      groups.set(therapist.id, {
        therapistId: therapist.id,
        therapistName: therapist.name,
        items: [],
      });
    });

    appointments.forEach((appointment) => {
      if (appointment.dateKey !== dateKey) return;
      const key = groups.has(appointment.therapistId)
        ? appointment.therapistId
        : `extra-${appointment.therapistId}`;
      if (!groups.has(key)) {
        groups.set(key, {
          therapistId: appointment.therapistId,
          therapistName: appointment.therapistName,
          items: [],
        });
      }
      groups.get(key)!.items.push(appointment);
    });

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        items: group.items
          .slice()
          .sort((a, b) => a.start.getTime() - b.start.getTime()),
      }))
      .filter((group) => group.items.length > 0);
  }, [appointments, dateKey, therapists]);

  if (grouped.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Agenda diaria</CardTitle>
          <CardDescription>{formatDayLong(date)}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No hay citas registradas para este día.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {grouped.map((group) => (
        <Card key={group.therapistId ?? group.therapistName}>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">{group.therapistName}</CardTitle>
              <CardDescription>{group.items.length} citas programadas</CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onCreate(group.therapistId, dateKey)}
            >
              Nueva cita
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {group.items.map((appointment) => (
              <button
                key={appointment.id}
                type="button"
                onClick={() => onEdit(appointment.id)}
                className="flex w-full items-start justify-between rounded-md border bg-background p-3 text-left transition hover:bg-muted"
              >
                <div className="space-y-1">
                  <p className="font-medium leading-none">
                    {formatHourRange(appointment.start, appointment.end)}
                  </p>
                  <p className="text-sm text-muted-foreground">{appointment.clientName}</p>
                  {appointment.notes ? (
                    <p className="text-xs text-muted-foreground">{appointment.notes}</p>
                  ) : null}
                </div>
                <span className={`text-xs font-medium uppercase ${STATUS_CLASSES[appointment.status]}`}>
                  {STATUS_LABELS[appointment.status]}
                </span>
              </button>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function WeeklyAgenda({
  therapistId,
  therapistName,
  focusDate,
  appointments,
  onWeekChange,
  onEdit,
  onCreate,
  onSelectDate,
}: {
  therapistId: string;
  therapistName: string;
  focusDate: Date;
  appointments: NormalizedAppointment[];
  onWeekChange: (offset: number) => void;
  onEdit: (id: string) => void;
  onCreate: (therapistId: string, isoDate?: string) => void;
  onSelectDate: (date: Date) => void;
}) {
  const weekStart = useMemo(() => startOfWeek(focusDate), [focusDate]);
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  }, [weekStart]);
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);

  const appointmentsByDay = useMemo(() => {
    const map = new Map<string, NormalizedAppointment[]>();
    appointments.forEach((appointment) => {
      const key = appointment.dateKey;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(appointment);
    });

    map.forEach((list) => {
      list.sort((a, b) => a.start.getTime() - b.start.getTime());
    });

    return map;
  }, [appointments]);

  const upcomingAppointments = useMemo(() => {
    const now = Date.now();
    return appointments
      .filter((appointment) => appointment.start.getTime() >= now)
      .slice()
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, 5);
  }, [appointments]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-lg">Agenda semanal</CardTitle>
            <CardDescription>
              {therapistName} · {formatWeekRange(weekStart, weekEnd)}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onWeekChange(-1)}>
              Semana anterior
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => onWeekChange(1)}>
              Siguiente semana
            </Button>
            <Button type="button" size="sm" onClick={() => onSelectDate(new Date())}>
              Ir a hoy
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                {weekDays.map((day) => (
                  <th key={day.toISOString()} className="px-2 pb-2 font-medium">
                    <button
                      type="button"
                      onClick={() => onSelectDate(day)}
                      className="rounded-md px-2 py-1 text-left transition hover:bg-muted"
                    >
                      <span className="block text-xs uppercase tracking-wide">
                        {formatDayShort(day)}
                      </span>
                      <span className="text-base font-semibold">
                        {day.getDate()}
                      </span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {weekDays.map((day) => {
                  const key = formatDateKey(day);
                  const dayAppointments = appointmentsByDay.get(key) ?? [];
                  return (
                    <td key={key} className="align-top">
                      <div className="flex min-h-[120px] flex-col gap-2 rounded-md border p-2">
                        {dayAppointments.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Sin citas</p>
                        ) : (
                          dayAppointments.map((appointment) => (
                            <button
                              key={appointment.id}
                              type="button"
                              onClick={() => onEdit(appointment.id)}
                              className="rounded-md border bg-background px-2 py-1 text-left text-xs transition hover:bg-muted"
                            >
                              <span className="block font-medium">
                                {formatHourRange(appointment.start, appointment.end)}
                              </span>
                              <span className="block text-muted-foreground">
                                {appointment.clientName}
                              </span>
                            </button>
                          ))
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="mt-auto justify-start px-2 text-xs"
                          onClick={() => onCreate(therapistId, key)}
                        >
                          + Añadir cita
                        </Button>
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Próximas citas</CardTitle>
          <CardDescription>
            Las próximas cinco citas confirmadas o pendientes para {therapistName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcomingAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay citas próximas.</p>
          ) : (
            upcomingAppointments.map((appointment) => (
              <button
                key={appointment.id}
                type="button"
                onClick={() => onEdit(appointment.id)}
                className="flex w-full items-center justify-between rounded-md border bg-background p-3 text-left transition hover:bg-muted"
              >
                <div>
                  <p className="text-sm font-medium">
                    {formatDayLong(appointment.start)} · {formatHourRange(appointment.start, appointment.end)}
                  </p>
                  <p className="text-xs text-muted-foreground">{appointment.clientName}</p>
                </div>
                <span className={`text-xs font-semibold uppercase ${STATUS_CLASSES[appointment.status]}`}>
                  {STATUS_LABELS[appointment.status]}
                </span>
              </button>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Calendar4Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [isNavigating, startNavigation] = useTransition();

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

  const therapistParam = searchParams?.get('therapist');

  const preferredTherapist = useMemo(() => {
    if (therapistParam) return therapistParam;
    if (user?.role === 'therapist' && user.therapistId) {
      return user.therapistId;
    }
    return 'all';
  }, [therapistParam, user?.role, user?.therapistId]);

  const [activeTab, setActiveTab] = useState<ActiveTab>(preferredTherapist === 'all' ? 'overview' : 'personal');
  const [selectedTherapist, setSelectedTherapist] = useState<string>(preferredTherapist);
  const [focusDate, setFocusDate] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [editingAppointment, setEditingAppointment] = useState<string | null>(null);
  const [createDialog, setCreateDialog] = useState<CreateDialogPayload>({ open: false });

  useEffect(() => {
    setSelectedTherapist((prev) => (prev === preferredTherapist ? prev : preferredTherapist));
    setActiveTab((prev) => {
      const next = preferredTherapist === 'all' ? 'overview' : 'personal';
      return prev === next ? prev : next;
    });
  }, [preferredTherapist]);

  const therapistOptions = useMemo(
    () => [
      { value: 'all', label: 'Todos los terapeutas' },
      ...therapists.map((therapist) => ({ value: therapist.id, label: therapist.name })),
    ],
    [therapists],
  );

  const therapistMap = useMemo(() => {
    return new Map(therapists.map((therapist) => [therapist.id, therapist.name]));
  }, [therapists]);

  const clientMap = useMemo(() => {
    return new Map(
      clients.map((client) => {
        const name = [client.firstName, client.lastName].filter(Boolean).join(' ').trim();
        const fallback = client.email ?? 'Sin nombre';
        return [client.id, name || fallback];
      }),
    );
  }, [clients]);

  const normalizedAppointments = useMemo(() => {
    if (appointments.length === 0) return [] as NormalizedAppointment[];

    return appointments
      .map((appointment) => {
        const start = combineDateTime(appointment.date, appointment.startTime);
        const end = combineDateTime(appointment.date, appointment.endTime);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
          return null;
        }
        const therapistName = therapistMap.get(appointment.therapistId) ?? 'Sin terapeuta';
        const clientName = clientMap.get(appointment.clientId) ?? 'Sin asignar';
        const normalized: NormalizedAppointment = {
          id: appointment.id,
          therapistId: appointment.therapistId,
          therapistName,
          clientId: appointment.clientId,
          clientName,
          status: appointment.status,
          notes: appointment.notes,
          start,
          end,
          dateKey: formatDateKey(start),
        };
        return normalized;
      })
      .filter((value): value is NormalizedAppointment => value !== null)
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [appointments, clientMap, therapistMap]);

  const appointmentsByTherapist = useMemo(() => {
    const map = new Map<string, NormalizedAppointment[]>();
    normalizedAppointments.forEach((appointment) => {
      if (!map.has(appointment.therapistId)) {
        map.set(appointment.therapistId, []);
      }
      map.get(appointment.therapistId)!.push(appointment);
    });
    return map;
  }, [normalizedAppointments]);

  const openCreateDialog = useCallback((therapistId?: string, dateISO?: string) => {
    setCreateDialog({ open: true, therapistId, dateISO });
  }, []);

  const closeCreateDialog = useCallback(() => {
    setCreateDialog({ open: false });
  }, []);

  const handleTherapistChange = useCallback(
    (value: string) => {
      setSelectedTherapist(value);
      setActiveTab(value === 'all' ? 'overview' : 'personal');
      startNavigation(() => {
        if (value === 'all') {
          router.replace('/calendar4');
        } else {
          router.replace(`/calendar4?therapist=${value}`);
        }
      });
    },
    [router, startNavigation],
  );

  const handleWeekChange = useCallback((offset: number) => {
    setFocusDate((previous) => {
      const next = addDays(previous, offset * 7);
      next.setHours(0, 0, 0, 0);
      return next;
    });
  }, []);

  if (loadingTherapists || therapists.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Cargando calendario...
      </div>
    );
  }

  const selectedTherapistName = therapistOptions.find((option) => option.value === selectedTherapist)?.label ?? '';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Calendario 4</h1>
          <p className="text-muted-foreground">
            Nueva vista creada desde cero combinando el resumen diario y la agenda individual.
          </p>
        </div>

        <Select value={selectedTherapist} onValueChange={handleTherapistChange} disabled={isNavigating}>
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
          <div className="grid gap-6 xl:grid-cols-[320px,1fr]">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Selecciona una fecha</CardTitle>
                  <CardDescription>Elige el día para revisar la ocupación</CardDescription>
                </CardHeader>
                <CardContent>
                  <DateCalendar
                    mode="single"
                    selected={focusDate}
                    onSelect={(nextDate) => {
                      if (!nextDate) return;
                      const normalized = new Date(nextDate);
                      normalized.setHours(0, 0, 0, 0);
                      setFocusDate(normalized);
                    }}
                    className="rounded-md border"
                  />
                </CardContent>
              </Card>

              <DailyStats date={focusDate} appointments={normalizedAppointments} onCreate={openCreateDialog} />
            </div>

            <DailyAgenda
              date={focusDate}
              therapists={therapists}
              appointments={normalizedAppointments}
              onEdit={(id) => setEditingAppointment(id)}
              onCreate={openCreateDialog}
            />
          </div>
        </TabsContent>

        <TabsContent value="personal" className="pt-6">
          {selectedTherapist === 'all' ? (
            <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
              Selecciona un terapeuta para revisar su agenda semanal.
            </div>
          ) : (
            <WeeklyAgenda
              therapistId={selectedTherapist}
              therapistName={selectedTherapistName}
              focusDate={focusDate}
              appointments={appointmentsByTherapist.get(selectedTherapist) ?? []}
              onWeekChange={handleWeekChange}
              onEdit={(id) => setEditingAppointment(id)}
              onCreate={(therapistId, isoDate) => openCreateDialog(therapistId, isoDate)}
              onSelectDate={(date) => {
                const normalized = new Date(date);
                normalized.setHours(0, 0, 0, 0);
                setFocusDate(normalized);
              }}
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
