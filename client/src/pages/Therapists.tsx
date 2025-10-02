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

export default function Therapists() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState("all");

  const therapists = [
    {
      id: "1",
      name: "Dr. María González",
      specialty: "Psicología Clínica",
      availability: 75,
      upcomingAppointments: 12,
    },
    {
      id: "2",
      name: "Dr. Juan Pérez",
      specialty: "Terapia Cognitiva",
      availability: 45,
      upcomingAppointments: 18,
    },
    {
      id: "3",
      name: "Dra. Carmen López",
      specialty: "Psicología Infantil",
      availability: 82,
      upcomingAppointments: 9,
    },
    {
      id: "4",
      name: "Dr. Roberto Martín",
      specialty: "Terapia de Pareja",
      availability: 68,
      upcomingAppointments: 14,
    },
    {
      id: "5",
      name: "Dra. Ana Sánchez",
      specialty: "Psicología Clínica",
      availability: 91,
      upcomingAppointments: 6,
    },
    {
      id: "6",
      name: "Dr. Luis Rodríguez",
      specialty: "Terapia Cognitiva",
      availability: 55,
      upcomingAppointments: 16,
    },
  ];

  const filteredTherapists = therapists.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpecialty = filterSpecialty === "all" || t.specialty === filterSpecialty;
    return matchesSearch && matchesSpecialty;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Terapeutas</h1>
          <p className="text-muted-foreground">
            Gestiona los {therapists.length} terapeutas del centro
          </p>
        </div>
        <Button data-testid="button-add-therapist">
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
            <SelectItem value="Psicología Clínica">Psicología Clínica</SelectItem>
            <SelectItem value="Terapia Cognitiva">Terapia Cognitiva</SelectItem>
            <SelectItem value="Psicología Infantil">Psicología Infantil</SelectItem>
            <SelectItem value="Terapia de Pareja">Terapia de Pareja</SelectItem>
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
