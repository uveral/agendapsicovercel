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

export default function Calendar() {
  const [selectedTherapist, setSelectedTherapist] = useState("all");
  const [viewMode, setViewMode] = useState<"single" | "multi">("single");

  const therapists = [
    { id: "all", name: "Todos los terapeutas" },
    { id: "1", name: "Dr. María González" },
    { id: "2", name: "Dr. Juan Pérez" },
    { id: "3", name: "Dra. Carmen López" },
    { id: "4", name: "Dr. Roberto Martín" },
  ];

  const mockSchedule = [
    {
      day: "Lun",
      date: "04/10",
      slots: [
        { id: "1", time: "9:00", client: "Ana M.", status: "confirmed" as const },
        { id: "2", time: "11:00", client: "Pedro L.", status: "pending" as const },
        { id: "3", time: "14:00", client: "Carlos R.", status: "confirmed" as const },
      ],
    },
    {
      day: "Mar",
      date: "05/10",
      slots: [
        { id: "4", time: "10:00", client: "María G.", status: "confirmed" as const },
        { id: "5", time: "16:00", client: "Laura F.", status: "pending" as const },
      ],
    },
    {
      day: "Mié",
      date: "06/10",
      slots: [
        { id: "6", time: "9:00", client: "Isabel R.", status: "confirmed" as const },
        { id: "7", time: "14:00", client: "Miguel T.", status: "confirmed" as const },
      ],
    },
    {
      day: "Jue",
      date: "07/10",
      slots: [
        { id: "8", time: "11:00", client: "Pedro G.", status: "pending" as const },
      ],
    },
    {
      day: "Vie",
      date: "08/10",
      slots: [
        { id: "9", time: "15:00", client: "Ana M.", status: "confirmed" as const },
      ],
    },
    { day: "Sáb", date: "09/10", slots: [] },
    { day: "Dom", date: "10/10", slots: [] },
  ];

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
            {therapists.map((therapist) => (
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
            therapistName={therapists.find((t) => t.id === selectedTherapist)?.name || ""}
            schedule={mockSchedule}
            onSlotClick={(id) => console.log('Slot clicked:', id)}
          />
        )}

        {viewMode === "multi" || selectedTherapist === "all" ? (
          <div className="space-y-6">
            {therapists.slice(1, 3).map((therapist) => (
              <WeekCalendar
                key={therapist.id}
                therapistName={therapist.name}
                schedule={mockSchedule}
                onSlotClick={(id) => console.log('Slot clicked:', id)}
              />
            ))}
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
