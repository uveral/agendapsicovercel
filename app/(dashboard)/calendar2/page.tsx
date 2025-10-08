'use client';

import React, { useState, useEffect, Suspense, useMemo, lazy } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TherapistMonthView } from "@/components/TherapistMonthView";
import { WeekCalendar } from "@/components/WeekCalendar";
// LAZY LOAD HEAVY COMPONENTS FOR DEBUGGING
const DayOccupancyGrid = lazy(() => import("@/components/DayOccupancyGrid").then(mod => ({ default: mod.DayOccupancyGrid })));
const DayAvailabilitySummary = lazy(() => import("@/components/DayAvailabilitySummary").then(mod => ({ default: mod.DayAvailabilitySummary })));
import { AppointmentEditDialog } from "@/components/AppointmentEditDialog";
import CreateAppointmentDialog from "@/components/CreateAppointmentDialog";
import { useAuth } from "@/hooks/useAuth";
// import { RenderDetector } from "@/components/RenderDetector"; // DISABLED FOR DEBUGGING
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import type { Therapist, Appointment, User } from "@/lib/types";
import { Calendar } from "@/components/ui/calendar";

function CalendarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  // FIX: useMemo to prevent creating new Date on every render
  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(today);

  // Parse query params
  const therapistParam = searchParams?.get('therapist');

  const { data: therapists = [], isLoading: isLoadingTherapists } = useQuery<Therapist[]>({
    queryKey: ["/api/therapists"],
  });

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  const { data: clients = [] } = useQuery<User[]>({
    queryKey: ["/api/clients"],
  });

  // Determine initial selected therapist based on user role
  const initialTherapist = useMemo(() => {
    if (therapistParam) return therapistParam;
    if (user?.role === "therapist" && user?.therapistId) {
      return user.therapistId;
    }
    return "all";
  }, [therapistParam, user?.role, user?.therapistId]);

  const [selectedTherapist, setSelectedTherapist] = useState(initialTherapist);
  const [viewType, setViewType] = useState<"general" | "individual">(
    therapistParam || (user?.role === "therapist" && user?.therapistId) ? "individual" : "general"
  );
  const [calendarView, setCalendarView] = useState<"monthly" | "weekly">("monthly");
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDialogContext, setCreateDialogContext] = useState<{
    therapistId?: string;
    date?: string;
  }>({});

  // Update selected therapist when query param changes
  useEffect(() => {
    console.log('[Calendar2] useEffect - therapistParam changed:', therapistParam);
    if (therapistParam) {
      setSelectedTherapist(therapistParam);
      setViewType("individual");
    }
  }, [therapistParam]);

  const therapistsList = useMemo(() => [
    { id: "all", name: "Todos los terapeutas" },
    ...therapists.map((t) => ({ id: t.id, name: t.name })),
  ], [therapists]);

  const handleTherapistChange = (value: string) => {
    setSelectedTherapist(value);
    if (value !== "all") {
      setViewType("individual");
      router.push(`/calendar2?therapist=${value}`);
    } else {
      setViewType("general");
      router.push("/calendar2");
    }
  };

  const handleDayClick = (therapistId: string, date: string) => {
    setCreateDialogContext({ therapistId, date });
    setCreateDialogOpen(true);
  };

  // DEBUG: Log render
  console.log('[Calendar2] Rendering. therapists:', therapists.length, 'appointments:', appointments.length, 'selectedDate:', selectedDate);

  // CRITICAL FIX: Don't render heavy components until we have all data
  if (isLoadingTherapists || therapists.length === 0) {
    console.log('[Calendar2] Loading therapists... (blocking heavy component render)');
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Cargando calendario...</div>
      </div>
    );
  }

  return (
    // <RenderDetector name="CalendarPage"> // DISABLED FOR DEBUGGING
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Calendario 2</h1>
          <p className="text-muted-foreground">
            Visualiza y gestiona las citas de los terapeutas
          </p>
        </div>

        <Select
          value={selectedTherapist}
          onValueChange={handleTherapistChange}
        >
          <SelectTrigger className="w-full sm:w-[280px]" data-testid="select-therapist">
            <SelectValue placeholder="Seleccionar terapeuta" />
          </SelectTrigger>
          <SelectContent>
            {therapistsList.map((therapist) => (
              <SelectItem
                key={therapist.id}
                value={therapist.id}
                data-testid={`select-item-therapist-${therapist.id}`}
              >
                {therapist.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={viewType} onValueChange={(value) => setViewType(value as "general" | "individual")} data-testid="tabs-view-type">
        <TabsList>
          <TabsTrigger value="general" data-testid="tab-general">
            Vista General
          </TabsTrigger>
          <TabsTrigger value="individual" data-testid="tab-individual">
            Vista Individual
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6 mt-6">
            <div className="flex gap-4">
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      console.log('[Calendar2] Date selected:', date);
                      setSelectedDate(date);
                    }}
                    className="rounded-md border"
                />
                <div className="flex-1 space-y-4">
                    <Suspense fallback={<div className="p-4 text-center text-muted-foreground">Cargando vista del día...</div>}>
                      <DayOccupancyGrid
                          therapists={therapists}
                          appointments={appointments}
                          selectedDate={selectedDate || new Date()}
                          onAppointmentClick={(id) => setEditingAppointmentId(id)}
                      />
                      <DayAvailabilitySummary
                          appointments={appointments}
                          selectedDate={selectedDate || new Date()}
                      />
                    </Suspense>
                </div>
            </div>
        </TabsContent>

        <TabsContent value="individual" className="space-y-6 mt-6">
          {selectedTherapist !== "all" && (
            <div className="flex justify-center gap-2 mb-4">
              <Button
                variant={calendarView === "monthly" ? "default" : "outline"}
                size="sm"
                onClick={() => setCalendarView("monthly")}
                data-testid="button-view-monthly"
              >
                Vista Mensual
              </Button>
              <Button
                variant={calendarView === "weekly" ? "default" : "outline"}
                size="sm"
                onClick={() => setCalendarView("weekly")}
                data-testid="button-view-weekly"
              >
                Vista Semanal
              </Button>
            </div>
          )}

          {selectedTherapist !== "all" ? (
            <div className="space-y-4">
              {calendarView === "monthly" ? (
                <TherapistMonthView
                  therapistName={therapistsList.find((t) => t.id === selectedTherapist)?.name || ""}
                  therapistId={selectedTherapist}
                  appointments={appointments}
                  clients={clients}
                  onAppointmentClick={(id) => setEditingAppointmentId(id)}
                  onDayClick={handleDayClick}
                />
              ) : (
                <WeekCalendar
                  therapistName={therapistsList.find((t) => t.id === selectedTherapist)?.name || ""}
                  therapistId={selectedTherapist}
                  appointments={appointments}
                  clients={clients}
                  onAppointmentClick={(id) => setEditingAppointmentId(id)}
                />
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
    // </RenderDetector> // DISABLED FOR DEBUGGING
  );
}

export default function Calendar2() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Cargando calendario...</div>
      </div>
    }>
      <CalendarContent />
    </Suspense>
  );
}