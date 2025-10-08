'use client';

import React, { useState, useEffect, Suspense, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TherapistMonthView } from "@/components/TherapistMonthView";
import { WeekCalendar } from "@/components/WeekCalendar";
import { OccupancyGrid } from "@/components/OccupancyGrid";
import { AvailabilitySummary } from "@/components/AvailabilitySummary";
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

function CalendarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // TEMP FIX: Comment out useAuth to test if multiple instances cause render loops
  // const { user } = useAuth();
  const user: User | null = null; // Temporarily disable to test

  console.log('[Calendar] CalendarContent mounted/rendered');

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
  // TEMP: Simplified without user dependency
  const initialTherapist = useMemo(() => {
    if (therapistParam) return therapistParam;
    // Temporarily disabled user-based logic
    // if (user?.role === "therapist" && user?.therapistId) {
    //   return user.therapistId;
    // }
    return "all";
  }, [therapistParam]);

  const [selectedTherapist, setSelectedTherapist] = useState(initialTherapist);
  // TEMP: Simplified without user dependency
  const [viewType, setViewType] = useState<"general" | "individual">(
    therapistParam ? "individual" : "general"
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
    console.log('[Calendar] useEffect - therapistParam changed:', therapistParam);
    if (therapistParam) {
      setSelectedTherapist(therapistParam);
      setViewType("individual");
    }
  }, [therapistParam]);

  const therapistsList = useMemo(() => {
    console.log('[Calendar] Recalculating therapistsList');
    return [
      { id: "all", name: "Todos los terapeutas" },
      ...therapists.map((t) => ({ id: t.id, name: t.name })),
    ];
  }, [therapists]);

  const handleTherapistChange = useCallback((value: string) => {
    console.log('[Calendar] handleTherapistChange:', value);
    if (value === selectedTherapist) {
      console.log('[Calendar] Same therapist selected, skipping navigation');
      return; // Avoid navigation if no change
    }

    setSelectedTherapist(value);
    if (value !== "all") {
      setViewType("individual");
      router.replace(`/calendar?therapist=${value}`); // Use replace instead of push
    } else {
      setViewType("general");
      router.replace("/calendar"); // Use replace instead of push
    }
  }, [router, selectedTherapist]);

  const handleDayClick = useCallback((therapistId: string, date: string) => {
    console.log('[Calendar] handleDayClick:', therapistId, date);
    setCreateDialogContext({ therapistId, date });
    setCreateDialogOpen(true);
  }, []);

  // DEBUG: Log render
  console.log('[Calendar] Rendering. therapists:', therapists.length, 'appointments:', appointments.length);

  // CRITICAL FIX: Don't render heavy components until we have all data
  if (isLoadingTherapists || therapists.length === 0) {
    console.log('[Calendar] Loading therapists... (blocking heavy component render)');
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
          <h1 className="text-2xl font-semibold mb-1">Calendario</h1>
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
          {/* <RenderDetector name="OccupancyGrid"> */}
            <OccupancyGrid
              therapists={therapists}
              appointments={appointments}
              onAppointmentClick={(id) => setEditingAppointmentId(id)}
            />
          {/* </RenderDetector> */}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {therapists.map((therapist) => (
              // <RenderDetector key={therapist.id} name={`AvailabilitySummary-${therapist.id}`}>
                <AvailabilitySummary
                  key={therapist.id}
                  therapistId={therapist.id}
                  therapistName={therapist.name}
                  appointments={appointments}
                  showTherapistName={true}
                />
              // </RenderDetector>
            ))}
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

              <AvailabilitySummary
                therapistId={selectedTherapist}
                appointments={appointments}
                showTherapistName={false}
              />
            </div>
          ) : (
            <div className="space-y-6">
              {therapists.map((therapist) => (
                <div key={therapist.id} className="space-y-4">
                  <TherapistMonthView
                    therapistName={therapist.name}
                    therapistId={therapist.id}
                    appointments={appointments}
                    clients={clients}
                    onAppointmentClick={(id) => setEditingAppointmentId(id)}
                    onDayClick={handleDayClick}
                  />
                  <AvailabilitySummary
                    therapistId={therapist.id}
                    appointments={appointments}
                    showTherapistName={false}
                  />
                </div>
              ))}
              {therapists.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No hay terapeutas registrados
                </div>
              )}
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

export default function Calendar() {
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
