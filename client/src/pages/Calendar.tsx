import { useState } from "react";
import { WeekCalendar } from "@/components/WeekCalendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Grid3x3, LayoutGrid } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Therapist, Appointment, User } from "@shared/schema";

export default function Calendar() {
  const [selectedTherapist, setSelectedTherapist] = useState("all");
  const [viewMode, setViewMode] = useState<"single" | "multi">("single");

  const { data: therapists = [], isLoading } = useQuery<Therapist[]>({
    queryKey: ["/api/therapists"],
  });

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  const { data: clients = [] } = useQuery<User[]>({
    queryKey: ["/api/clients"],
  });

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

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <Select value={selectedTherapist} onValueChange={setSelectedTherapist}>
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

        <div className="flex gap-2">
          <Button
            variant={viewMode === "single" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("single")}
            data-testid="button-view-single"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "multi" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("multi")}
            data-testid="button-view-multi"
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {viewMode === "single" && selectedTherapist !== "all" && (
          <WeekCalendar
            therapistName={therapistsList.find((t) => t.id === selectedTherapist)?.name || ""}
            schedule={generateScheduleForTherapist(selectedTherapist)}
            onSlotClick={(id) => console.log('Slot clicked:', id)}
          />
        )}

        {viewMode === "multi" || selectedTherapist === "all" ? (
          <div className="space-y-6">
            {therapists.slice(0, 3).map((therapist) => (
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
        ) : null}

        {viewMode === "single" && selectedTherapist === "all" && (
          <div className="text-center py-12 text-muted-foreground">
            Selecciona un terapeuta para ver su calendario
          </div>
        )}
      </div>
    </div>
  );
}
