import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { MonthCalendar } from "@/components/MonthCalendar";
import { OccupancyGrid } from "@/components/OccupancyGrid";
import { AppointmentEditDialog } from "@/components/AppointmentEditDialog";
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
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);

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
          <OccupancyGrid 
            therapists={therapists} 
            appointments={appointments}
            onAppointmentClick={(id) => setEditingAppointmentId(id)}
          />
        </TabsContent>

        <TabsContent value="individual" className="space-y-6 mt-6">
          {selectedTherapist !== "all" ? (
            <MonthCalendar
              therapistName={therapistsList.find((t) => t.id === selectedTherapist)?.name || ""}
              therapistId={selectedTherapist}
              appointments={appointments}
              clients={clients}
              onAppointmentClick={(id) => setEditingAppointmentId(id)}
            />
          ) : (
            <div className="space-y-6">
              {therapists.map((therapist) => (
                <MonthCalendar
                  key={therapist.id}
                  therapistName={therapist.name}
                  therapistId={therapist.id}
                  appointments={appointments}
                  clients={clients}
                  onAppointmentClick={(id) => setEditingAppointmentId(id)}
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

      <AppointmentEditDialog
        appointmentId={editingAppointmentId}
        onClose={() => setEditingAppointmentId(null)}
      />
    </div>
  );
}
