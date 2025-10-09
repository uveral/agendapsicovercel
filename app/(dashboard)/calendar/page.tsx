'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { es as esLocale } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Loader2, AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useAppSettingsValue } from '@/hooks/useAppSettings';
import { useDiagnosticCalendarData } from '@/hooks/useDiagnosticCalendarData';
import AppointmentQuickCreateDialog from '@/components/AppointmentQuickCreateDialog';
import type { Therapist, TherapistWorkingHours } from '@/lib/types';
import type { NormalizedAppointment } from '@/shared/diagnosticCalendarData';
import { getUniqueTherapists } from '@/shared/diagnosticCalendarData';

const DAY_LABELS_MAP: Record<number, string> = {
  0: 'Dom',
  1: 'Lun',
  2: 'Mar',
  3: 'Mié',
  4: 'Jue',
  5: 'Vie',
  6: 'Sáb',
};

const WEEKDAY_ORDER_BASE: number[] = [1, 2, 3, 4, 5];

function getVisibleDayOrder(openOnSaturday: boolean, openOnSunday: boolean): number[] {
  const order = [...WEEKDAY_ORDER_BASE];

  if (openOnSaturday) {
    order.push(6);
  }

  if (openOnSunday) {
    order.push(0);
  }

  return order;
}

function getDayLabels(dayOrder: number[]): string[] {
  return dayOrder.map((weekday) => DAY_LABELS_MAP[weekday] ?? '');
}

function gridColumnClass(columnCount: number): string {
  switch (columnCount) {
    case 7:
      return 'grid-cols-7';
    case 6:
      return 'grid-cols-6';
    default:
      return 'grid-cols-5';
  }
}

interface TherapistOption {
  id: string;
  name: string;
}

type AppointmentsByDate = Map<string, NormalizedAppointment[]>;
type AppointmentsByTherapist = Map<string, AppointmentsByDate>;

type WorkingHoursMap = Map<string, TherapistWorkingHours[]>;

type SlotStatus = 'busy' | 'free' | 'off';

function buildMonthGrid(currentMonth: Date, dayOrder: number[]): Date[][] {
  const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });
  const weeks: Date[][] = [];

  for (let index = 0; index < days.length; index += 7) {
    const slice = days.slice(index, index + 7);
    const ordered = dayOrder
      .map((weekday) => slice.find((day) => getDay(day) === weekday))
      .filter((value): value is Date => Boolean(value));

    if (ordered.length > 0) {
      weeks.push(ordered);
    }
  }

  return weeks;
}

function groupAppointmentsByTherapist(appointments: NormalizedAppointment[]): AppointmentsByTherapist {
  const map: AppointmentsByTherapist = new Map();

  appointments.forEach((appointment) => {
    if (!map.has(appointment.therapistId)) {
      map.set(appointment.therapistId, new Map());
    }

    const byDate = map.get(appointment.therapistId)!;
    if (!byDate.has(appointment.date)) {
      byDate.set(appointment.date, []);
    }

    byDate.get(appointment.date)!.push(appointment);
  });

  map.forEach((byDate) => {
    byDate.forEach((list, key) => {
      byDate.set(
        key,
        list.sort((a, b) => a.startTime.localeCompare(b.startTime)),
      );
    });
  });

  return map;
}

function groupWorkingHours(workingHours: TherapistWorkingHours[]): WorkingHoursMap {
  return workingHours.reduce<WorkingHoursMap>((acc, slot) => {
    if (!acc.has(slot.therapistId)) {
      acc.set(slot.therapistId, []);
    }
    acc.get(slot.therapistId)!.push(slot);
    return acc;
  }, new Map());
}

function timeToMinutes(time: string): number {
  const [hoursPart, minutesPart] = time.split(':');
  const hour = Number.parseInt(hoursPart ?? '', 10);
  const minute = Number.parseInt(minutesPart ?? '', 10);

  if (!Number.isFinite(hour)) {
    return Number.NaN;
  }

  return hour * 60 + (Number.isFinite(minute) ? minute : 0);
}

function useHourBlocks(
  workingHours: TherapistWorkingHours[],
  appointments: NormalizedAppointment[],
  centerOpensAt: string,
  centerClosesAt: string,
) {
  return useMemo(() => {
    const hours = new Set<number>();

    const openMinutes = timeToMinutes(centerOpensAt);
    const closeMinutes = timeToMinutes(centerClosesAt);

    if (Number.isFinite(openMinutes) && Number.isFinite(closeMinutes) && openMinutes < closeMinutes) {
      const startHour = Math.floor(openMinutes / 60);
      const endHour = Math.ceil(closeMinutes / 60);

      for (let hour = startHour; hour < endHour; hour += 1) {
        hours.add(hour);
      }
    }

    workingHours.forEach((slot) => {
      const startHour = parseInt(slot.startTime.slice(0, 2), 10);
      const endHour = parseInt(slot.endTime.slice(0, 2), 10);
      for (let hour = startHour; hour < endHour; hour += 1) {
        hours.add(hour);
      }
    });

    if (hours.size === 0) {
      appointments.forEach((appointment) => {
        const startHour = parseInt(appointment.startTime.slice(0, 2), 10);
        const endHour = parseInt(appointment.endTime.slice(0, 2), 10);
        for (let hour = startHour; hour < endHour; hour += 1) {
          hours.add(hour);
        }
      });
    }

    if (hours.size === 0) {
      return [9, 10, 11, 12, 13, 14, 15, 16, 17];
    }

    return Array.from(hours).sort((a, b) => a - b);
  }, [appointments, centerClosesAt, centerOpensAt, workingHours]);
}

function getTherapistSlots(
  therapistId: string,
  date: Date,
  hour: number,
  workingHours: WorkingHoursMap,
  appointments: AppointmentsByTherapist,
  openOnSaturday: boolean,
  openOnSunday: boolean,
  centerOpenMinutes: number,
  centerCloseMinutes: number,
): SlotStatus {
  const isoDate = format(date, 'yyyy-MM-dd');
  const dayOfWeek = getDay(date);

  if ((dayOfWeek === 6 && !openOnSaturday) || (dayOfWeek === 0 && !openOnSunday)) {
    return 'off';
  }

  if (
    Number.isFinite(centerOpenMinutes) &&
    Number.isFinite(centerCloseMinutes) &&
    centerOpenMinutes < centerCloseMinutes
  ) {
    const hourStart = hour * 60;
    if (hourStart < centerOpenMinutes || hourStart >= centerCloseMinutes) {
      return 'off';
    }
  }

  const therapistHours = workingHours.get(therapistId) ?? [];
  const worksAtHour = therapistHours.some((slot) => {
    if (slot.dayOfWeek !== dayOfWeek) return false;
    const startMinutes = timeToMinutes(slot.startTime);
    const endMinutes = timeToMinutes(slot.endTime);
    const hourMinutes = hour * 60;
    return hourMinutes >= startMinutes && hourMinutes < endMinutes;
  });

  if (!worksAtHour) {
    return 'off';
  }

  const therapistAppointments = appointments.get(therapistId)?.get(isoDate) ?? [];
  const occupied = therapistAppointments.some((appointment) => {
    const startMinutes = timeToMinutes(appointment.startTime);
    const endMinutes = timeToMinutes(appointment.endTime);
    const hourMinutes = hour * 60;
    return hourMinutes >= startMinutes && hourMinutes < endMinutes;
  });

  return occupied ? 'busy' : 'free';
}

function AppointmentDayCell({
  day,
  appointments,
  isCurrentMonth,
}: {
  day: Date;
  appointments: NormalizedAppointment[];
  isCurrentMonth: boolean;
}) {
  const displayAppointments = appointments.slice(0, 6);
  const extraCount = appointments.length - displayAppointments.length;

  return (
    <div
      className={cn(
        'min-h-[120px] rounded-md border p-2 transition-colors',
        isCurrentMonth ? 'bg-background' : 'bg-muted/50 text-muted-foreground',
        isToday(day) && 'border-primary',
      )}
    >
      <div className="flex items-center justify-between text-xs font-medium">
        <span>{format(day, 'd')}</span>
        {!isCurrentMonth && <span className="text-[10px]">{format(day, 'MMM', { locale: esLocale })}</span>}
      </div>
      <div className="mt-2 space-y-1">
        {displayAppointments.map((appointment) => (
          <div
            key={appointment.id}
            className="rounded-sm bg-muted px-1 py-0.5 text-[11px] leading-tight"
          >
            <span className="font-medium">{appointment.startTime.slice(0, 5)}</span>
            <span className="mx-1 text-muted-foreground">·</span>
            <span className="truncate">{appointment.clientName}</span>
          </div>
        ))}
        {extraCount > 0 && (
          <div className="text-[10px] text-muted-foreground">+{extraCount} más</div>
        )}
      </div>
    </div>
  );
}

function GlobalDayCell({
  day,
  therapists,
  hourBlocks,
  workingHours,
  appointments,
  isCurrentMonth,
  openOnSaturday,
  openOnSunday,
  centerOpenMinutes,
  centerCloseMinutes,
  onSlotClick,
}: {
  day: Date;
  therapists: TherapistOption[];
  hourBlocks: number[];
  workingHours: WorkingHoursMap;
  appointments: AppointmentsByTherapist;
  isCurrentMonth: boolean;
  openOnSaturday: boolean;
  openOnSunday: boolean;
  centerOpenMinutes: number;
  centerCloseMinutes: number;
  onSlotClick?: (date: Date, hour: number, therapistId: string, status: SlotStatus) => void;
}) {
  const statusClass = (status: SlotStatus) => {
    switch (status) {
      case 'busy':
        return 'bg-amber-400';
      case 'free':
        return 'bg-emerald-500';
      default:
        return 'bg-muted';
    }
  };

  const dayKey = format(day, 'yyyyMMdd');
  const dayLabel = format(day, 'd MMM', { locale: esLocale });

  return (
    <div
      className={cn(
        'min-h-[120px] rounded-md border p-2 transition-colors',
        isCurrentMonth ? 'bg-background' : 'bg-muted/50 text-muted-foreground',
        isToday(day) && 'border-primary',
      )}
    >
      <div className="flex items-center justify-between text-xs font-medium">
        <span>{format(day, 'd')}</span>
        {!isCurrentMonth && <span className="text-[10px]">{format(day, 'MMM', { locale: esLocale })}</span>}
      </div>
      <div className="mt-2 space-y-1">
        {hourBlocks.map((hour) => {
          const hourLabel = `${hour.toString().padStart(2, '0')}:00`;

          return (
            <div
              key={`${dayKey}-${hour}`}
              className="grid items-center gap-[2px]"
              style={{ gridTemplateColumns: `minmax(2.5rem, auto) repeat(${therapists.length}, minmax(0, 1fr))` }}
            >
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{hourLabel}</span>
              {therapists.map((therapist) => {
                const status = getTherapistSlots(
                  therapist.id,
                  day,
                  hour,
                  workingHours,
                  appointments,
                  openOnSaturday,
                  openOnSunday,
                  centerOpenMinutes,
                  centerCloseMinutes,
                );

                return (
                  <button
                    key={`${therapist.id}-${dayKey}-${hour}`}
                    className={cn(
                      'h-2 w-full rounded-sm md:h-3 transition-all',
                      statusClass(status),
                      status === 'free' && 'cursor-pointer hover:ring-2 hover:ring-primary hover:ring-offset-1'
                    )}
                    title={`${dayLabel} · ${hourLabel} · ${therapist.name}`}
                    onClick={() => onSlotClick?.(day, hour, therapist.id, status)}
                    disabled={status !== 'free'}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ALL_THERAPISTS_VALUE = '__all__';

interface TherapistMonthCalendarProps {
  therapist: TherapistOption;
  appointments: AppointmentsByDate;
  currentMonth: Date;
  monthGrid: Date[][];
  dayLabels: string[];
}

function TherapistMonthCalendar({
  therapist,
  appointments,
  currentMonth,
  monthGrid,
  dayLabels,
}: TherapistMonthCalendarProps) {
  const monthLabel = format(currentMonth, 'MMMM yyyy', { locale: esLocale });
  const columnClass = gridColumnClass(dayLabels.length);

  return (
    <Card>
      <CardHeader className="px-4 pb-0 pt-4 sm:px-6 sm:pb-2">
        <CardTitle className="text-lg font-semibold capitalize">
          {monthLabel} — {therapist.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-4 sm:px-6 sm:pb-6">
        <div className="grid gap-4">
          <div className={cn('grid gap-2', columnClass)}>
            {dayLabels.map((label) => (
              <div key={label} className="text-center text-xs font-semibold uppercase text-muted-foreground">
                {label}
              </div>
            ))}
          </div>
          <div className="grid gap-2">
            {monthGrid.map((week, weekIndex) => (
              <div
                key={weekIndex}
                className={cn('grid gap-2', columnClass)}
              >
                {week.map((day) => {
                  const isoDate = format(day, 'yyyy-MM-dd');
                  const dayAppointments = appointments.get(isoDate) ?? [];

                  return (
                    <AppointmentDayCell
                      key={isoDate}
                      day={day}
                      appointments={dayAppointments}
                      isCurrentMonth={isSameMonth(day, currentMonth)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CalendarPage() {
  const { user, loading: authLoading } = useAuth();
  const settings = useAppSettingsValue();
  const { appointments, isLoading: appointmentsLoading } = useDiagnosticCalendarData();
  const { data: therapists = [], isLoading: therapistsLoading } = useQuery<Therapist[]>({
    queryKey: ['/api/therapists'],
  });
  const { data: workingHours = [] } = useQuery<TherapistWorkingHours[]>({
    queryKey: ['/api/therapist-working-hours'],
  });

  const isAdmin = user?.role === 'admin';
  const therapistOwnId = user?.therapistId ?? null;
  const canViewOthers = isAdmin || settings.therapistCanViewOthers;

  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(new Date()));
  const [viewMode, setViewMode] = useState<'personal' | 'global'>(isAdmin ? 'global' : 'personal');
  const [selectedTherapistId, setSelectedTherapistId] = useState<string>(() =>
    isAdmin ? ALL_THERAPISTS_VALUE : therapistOwnId ?? '',
  );
  const [quickCreateDialogOpen, setQuickCreateDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    date: Date;
    hour: number;
    clickedTherapistId: string;
  } | null>(null);
  const adminViewInitializedRef = useRef(isAdmin);

  useEffect(() => {
    if (isAdmin && !adminViewInitializedRef.current) {
      setViewMode('global');
      adminViewInitializedRef.current = true;
    }
  }, [isAdmin]);

  const appointmentsByTherapist = useMemo(
    () => groupAppointmentsByTherapist(appointments),
    [appointments],
  );

  const workingHoursMap = useMemo(() => groupWorkingHours(workingHours), [workingHours]);
  const hourBlocks = useHourBlocks(
    workingHours,
    appointments,
    settings.centerOpensAt,
    settings.centerClosesAt,
  );

  const baseTherapists: TherapistOption[] = useMemo(() => {
    const mapped = therapists.map((therapist) => ({ id: therapist.id, name: therapist.name }));
    const derived = getUniqueTherapists(appointments);

    derived.forEach((entry) => {
      if (!mapped.some((therapist) => therapist.id === entry.id)) {
        mapped.push(entry);
      }
    });

    return mapped.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [appointments, therapists]);

  const visibleTherapists = useMemo(() => {
    if (isAdmin) return baseTherapists;
    if (canViewOthers) return baseTherapists;
    if (therapistOwnId) {
      return baseTherapists.filter((therapist) => therapist.id === therapistOwnId);
    }
    return baseTherapists;
  }, [baseTherapists, canViewOthers, isAdmin, therapistOwnId]);

  useEffect(() => {
    if (visibleTherapists.length === 0) {
      return;
    }

    if (isAdmin) {
      if (
        selectedTherapistId === ALL_THERAPISTS_VALUE ||
        (selectedTherapistId &&
          visibleTherapists.some((therapist) => therapist.id === selectedTherapistId))
      ) {
        return;
      }

      setSelectedTherapistId(ALL_THERAPISTS_VALUE);
      return;
    }

    if (
      selectedTherapistId &&
      visibleTherapists.some((therapist) => therapist.id === selectedTherapistId)
    ) {
      return;
    }

    if (therapistOwnId && visibleTherapists.some((therapist) => therapist.id === therapistOwnId)) {
      setSelectedTherapistId(therapistOwnId);
      return;
    }

    setSelectedTherapistId(visibleTherapists[0].id);
  }, [isAdmin, therapistOwnId, selectedTherapistId, visibleTherapists]);

  const resolvedSelectedTherapistId =
    selectedTherapistId ||
    (isAdmin && visibleTherapists.length > 0
      ? ALL_THERAPISTS_VALUE
      : visibleTherapists[0]?.id ?? '');

  useEffect(() => {
    if (!selectedTherapistId && resolvedSelectedTherapistId) {
      setSelectedTherapistId(resolvedSelectedTherapistId);
    }
  }, [resolvedSelectedTherapistId, selectedTherapistId]);

  const dayOrder = useMemo(
    () => getVisibleDayOrder(settings.openOnSaturday, settings.openOnSunday),
    [settings.openOnSaturday, settings.openOnSunday],
  );

  const dayLabels = useMemo(() => getDayLabels(dayOrder), [dayOrder]);

  const monthGrid = useMemo(
    () => buildMonthGrid(currentMonth, dayOrder),
    [currentMonth, dayOrder],
  );

  const centerOpenMinutes = timeToMinutes(settings.centerOpensAt);
  const centerCloseMinutes = timeToMinutes(settings.centerClosesAt);

  const handleSlotClick = (date: Date, hour: number, clickedTherapistId: string, status: SlotStatus) => {
    if (status !== 'free') return;

    setSelectedSlot({ date, hour, clickedTherapistId });
    setQuickCreateDialogOpen(true);
  };

  const availableTherapistsForSlot = useMemo(() => {
    if (!selectedSlot) return [];

    const dayOfWeek = getDay(selectedSlot.date);

    return baseTherapists.map(therapist => {
      const status = getTherapistSlots(
        therapist.id,
        selectedSlot.date,
        selectedSlot.hour,
        workingHoursMap,
        appointmentsByTherapist,
        settings.openOnSaturday,
        settings.openOnSunday,
        centerOpenMinutes,
        centerCloseMinutes,
      );

      const therapistData = therapists.find(t => t.id === therapist.id);

      return {
        therapist: therapistData ?? {
          id: therapist.id,
          name: therapist.name,
          specialty: '',
          email: null,
          phone: null,
          color: undefined,
          createdAt: new Date().toISOString(),
        },
        isInSchedule: status === 'free',
      };
    }).sort((a, b) => {
      // Clicked therapist first
      if (a.therapist.id === selectedSlot.clickedTherapistId) return -1;
      if (b.therapist.id === selectedSlot.clickedTherapistId) return 1;
      // Then in-schedule therapists
      if (a.isInSchedule && !b.isInSchedule) return -1;
      if (!a.isInSchedule && b.isInSchedule) return 1;
      // Then by name
      return a.therapist.name.localeCompare(b.therapist.name);
    });
  }, [selectedSlot, baseTherapists, therapists, workingHoursMap, appointmentsByTherapist, settings.openOnSaturday, settings.openOnSunday, centerOpenMinutes, centerCloseMinutes]);

  const isLoading = authLoading || appointmentsLoading || therapistsLoading;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">Calendario</h1>
          {isAdmin && visibleTherapists.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-1.5 text-xs sm:text-sm">
              <span className="font-medium">Leyenda</span>
              <div className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                <span>Hora libre</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" />
                <span>Hora ocupada</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-sm bg-muted" />
                <span>Fuera de horario</span>
              </div>
              <Badge variant="outline" className="ml-0 sm:ml-2">
                {visibleTherapists.length} terapeutas
              </Badge>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 rounded-md border px-2 py-1 sm:justify-end">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth((month) => addMonths(month, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[140px] text-center text-sm font-medium capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: esLocale })}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth((month) => addMonths(month, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'personal' | 'global')}>
        <TabsList className={cn(isAdmin ? 'grid grid-cols-2' : 'grid grid-cols-1', 'w-full sm:w-auto')}>
          <TabsTrigger value="personal">Calendario personal</TabsTrigger>
          {isAdmin && <TabsTrigger value="global">Calendario global</TabsTrigger>}
        </TabsList>

        <TabsContent value="personal" className="space-y-6">
          {!isAdmin && !canViewOthers && (
            <Card>
              <CardContent className="flex items-center gap-3 p-4 text-xs text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />
                <span>Solo puedes visualizar tu propio calendario.</span>
              </CardContent>
            </Card>
          )}

          {visibleTherapists.length === 0 ? (
            <Card>
              <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />
                <span>No hay terapeutas disponibles para mostrar.</span>
              </CardContent>
            </Card>
          ) : (
            <Tabs value={resolvedSelectedTherapistId} onValueChange={setSelectedTherapistId}>
              <ScrollArea className="w-full">
                <TabsList className="mt-2 w-max">
                  {isAdmin && (
                    <TabsTrigger value={ALL_THERAPISTS_VALUE} className="whitespace-nowrap">
                      Todos los terapeutas
                    </TabsTrigger>
                  )}
                  {visibleTherapists.map((therapist) => (
                    <TabsTrigger key={therapist.id} value={therapist.id} className="whitespace-nowrap">
                      {therapist.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </ScrollArea>

              {isAdmin && (
                <TabsContent value={ALL_THERAPISTS_VALUE} className="mt-6 space-y-6">
                  {visibleTherapists.map((therapist) => {
                    const therapistAppointments =
                      appointmentsByTherapist.get(therapist.id) ?? new Map();

                    return (
                      <TherapistMonthCalendar
                        key={therapist.id}
                        therapist={therapist}
                        appointments={therapistAppointments}
                        currentMonth={currentMonth}
                        monthGrid={monthGrid}
                        dayLabels={dayLabels}
                      />
                    );
                  })}
                </TabsContent>
              )}

              {visibleTherapists.map((therapist) => {
                const therapistAppointments = appointmentsByTherapist.get(therapist.id) ?? new Map();

                return (
                  <TabsContent key={therapist.id} value={therapist.id} className="mt-6">
                    <TherapistMonthCalendar
                      therapist={therapist}
                      appointments={therapistAppointments}
                      currentMonth={currentMonth}
                      monthGrid={monthGrid}
                      dayLabels={dayLabels}
                    />
                  </TabsContent>
                );
              })}
            </Tabs>
          )}
        </TabsContent>

        {isAdmin && (
          <TabsContent value="global" className="space-y-6">
            {visibleTherapists.length === 0 ? (
              <Card>
                <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
                  <AlertTriangle className="h-4 w-4" />
                  <span>No hay terapeutas disponibles para el calendario global.</span>
                </CardContent>
              </Card>
            ) : (
              <> 
                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <div className={cn('grid gap-2', gridColumnClass(dayLabels.length))}>
                      {dayLabels.map((label) => (
                        <div key={label} className="text-center text-xs font-semibold uppercase text-muted-foreground">
                          {label}
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 space-y-2">
                      {monthGrid.map((week, weekIndex) => (
                        <div
                          key={weekIndex}
                          className={cn('grid gap-2', gridColumnClass(dayLabels.length))}
                        >
                          {week.map((day) => (
                            <GlobalDayCell
                              key={format(day, 'yyyy-MM-dd')}
                              day={day}
                              therapists={visibleTherapists}
                              hourBlocks={hourBlocks}
                              workingHours={workingHoursMap}
                              appointments={appointmentsByTherapist}
                              isCurrentMonth={isSameMonth(day, currentMonth)}
                              openOnSaturday={settings.openOnSaturday}
                              openOnSunday={settings.openOnSunday}
                              centerOpenMinutes={centerOpenMinutes}
                              centerCloseMinutes={centerCloseMinutes}
                              onSlotClick={handleSlotClick}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        )}
      </Tabs>

      {selectedSlot && (
        <AppointmentQuickCreateDialog
          open={quickCreateDialogOpen}
          onClose={() => {
            setQuickCreateDialogOpen(false);
            setSelectedSlot(null);
          }}
          date={selectedSlot.date}
          hour={selectedSlot.hour}
          availableTherapists={availableTherapistsForSlot}
          workingHours={workingHours}
        />
      )}
    </div>
  );
}
