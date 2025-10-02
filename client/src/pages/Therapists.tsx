import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TherapistCard } from "@/components/TherapistCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import type { Therapist, Appointment } from "@shared/schema";

export default function Therapists() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState("all");

  const { data: therapists = [], isLoading } = useQuery<Therapist[]>({
    queryKey: ["/api/therapists"],
  });

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  // Get unique specialties
  const specialties = Array.from(new Set(therapists.map((t) => t.specialty)));

  // Calculate stats for each therapist
  const therapistsWithStats = therapists.map((therapist) => {
    const therapistAppointments = appointments.filter(
      (apt) => apt.therapistId === therapist.id && apt.status !== "cancelled"
    );
    
    const today = new Date();
    const upcomingAppointments = therapistAppointments.filter(
      (apt) => new Date(apt.date) >= today
    ).length;

    // Calculate availability (simplified: 100 - percentage of busy slots)
    const availability = Math.max(0, 100 - (therapistAppointments.length * 5));

    return {
      ...therapist,
      availability,
      upcomingAppointments,
    };
  });

  const filteredTherapists = therapistsWithStats.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpecialty = filterSpecialty === "all" || t.specialty === filterSpecialty;
    return matchesSearch && matchesSpecialty;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Cargando terapeutas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Terapeutas</h1>
          <p className="text-muted-foreground">
            Gestiona los {therapists.length} terapeutas del centro
          </p>
        </div>
        <Button data-testid="button-add-therapist" onClick={() => console.log('Add therapist')}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo terapeuta
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar terapeuta..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <Select value={filterSpecialty} onValueChange={setFilterSpecialty}>
          <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-specialty">
            <SelectValue placeholder="Especialidad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {specialties.map((specialty) => (
              <SelectItem key={specialty} value={specialty}>
                {specialty}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTherapists.map((therapist) => (
          <TherapistCard
            key={therapist.id}
            {...therapist}
            onViewCalendar={(id) => console.log('Ver calendario:', id)}
          />
        ))}
      </div>

      {filteredTherapists.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No se encontraron terapeutas
        </div>
      )}
    </div>
  );
}
