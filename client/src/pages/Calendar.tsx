import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { WeekCalendar } from "@/components/WeekCalendar";
import { OccupancyGrid } from "@/components/OccupancyGrid";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import type { Therapist, Appointment, User } from "@shared/schema";

export default function Calendar() {
  const searchString = useSearch();
  const [, setLocation] = useLocation();
  
  // Parse query params
  const queryParams = new URLSearchParams(searchString);
  const therapistParam = queryParams.get('therapist');
  
  const [selectedTherapist, setSelectedTherapist] = useState(therapistParam || "all");
  const [viewType, setViewType] = useState<"general" | "individual">(therapistParam ? "individual" : "general");

  const { data: therapists = [], isLoading } = useQuery<Therapist[]>({
    queryKey: ["/api/therapists"],
  });

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  const { data: clients = [] } = useQuery<User[]>({
    queryKey: ["/api/clients"],
  });

  // Update selected therapist when query param changes
  useEffect(() => {
    if (therapistParam && therapistParam !== selectedTherapist) {
      setSelectedTherapist(therapistParam);
      setViewType("individual");
    }
  }, [therapistParam, selectedTherapist]);

  // Generate week schedule for a therapist
  const generateScheduleForTherapist = (therapistId: string) => {
    const therapistAppointments = appointments.filter(
      (apt) => apt.therapistId === therapistId && apt.status !== "cancelled"
    );

    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1); // Start on Monday

    const schedule = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      
      const daySlots = therapistAppointments
        .filter((apt) => {
          const aptDate = new Date(apt.date);
          return aptDate.toDateString() === date.toDateString();
        })
        .map((apt) => {
          const client = clients.find((c) => c.id === apt.clientId);
          const clientName = client
            ? `${client.firstName || ''} ${client.lastName || ''}`.trim() || client.email?.split('@')[0] || 'Cliente'
            : 'Cliente';

          return {
            id: apt.id,
            time: apt.startTime,
            client: clientName,
            status: apt.status as "confirmed" | "pending",
          };
        });

      schedule.push({
        day: dayNames[date.getDay()],
        date: `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`,
        slots: daySlots,
      });
    }

    return schedule;
  };

  const therapistsList = [
    { id: "all", name: "Todos los terapeutas" },
    ...therapists.map((t) => ({ id: t.id, name: t.name })),
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Cargando calendario...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Calendario</h1>
        <p className="text-muted-foreground">
          Visualiza y gestiona las citas de los terapeutas
        </p>
      </div>

      <Tabs value={viewType} onValueChange={(value) => setViewType(value as "general" | "individual")} data-testid="tabs-view-type">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <TabsList>
            <TabsTrigger value="general" data-testid="tab-general">
              Vista General
            </TabsTrigger>
            <TabsTrigger value="individual" data-testid="tab-individual">
              Vista Individual
            </TabsTrigger>
          </TabsList>

          {viewType === "individual" && (
            <Select 
              value={selectedTherapist} 
              onValueChange={(value) => {
                setSelectedTherapist(value);
                if (value !== "all") {
                  setLocation(`/calendar?therapist=${value}`);
                } else {
                  setLocation("/calendar");
                }
              }}
            >
              <SelectTrigger className="w-full sm:w-[280px]" data-testid="select-therapist">
                <SelectValue placeholder="Seleccionar terapeuta" />
              </SelectTrigger>
              <SelectContent>
                {therapistsList.map((therapist) => (
                  <SelectItem key={therapist.id} value={therapist.id}>
                    {therapist.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <TabsContent value="general" className="space-y-6 mt-6">
          <OccupancyGrid therapists={therapists} appointments={appointments} />
        </TabsContent>

        <TabsContent value="individual" className="space-y-6 mt-6">
          {selectedTherapist !== "all" ? (
            <WeekCalendar
              therapistName={therapistsList.find((t) => t.id === selectedTherapist)?.name || ""}
              schedule={generateScheduleForTherapist(selectedTherapist)}
              onSlotClick={(id) => console.log('Slot clicked:', id)}
            />
          ) : (
            <div className="space-y-6">
              {therapists.map((therapist) => (
                <WeekCalendar
                  key={therapist.id}
                  therapistName={therapist.name}
                  schedule={generateScheduleForTherapist(therapist.id)}
                  onSlotClick={(id) => console.log('Slot clicked:', id)}
                />
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
    </div>
  );
}
