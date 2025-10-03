import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TherapistCard } from "@/components/TherapistCard";
import { TherapistScheduleDialog } from "@/components/TherapistScheduleDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTherapistSchema, type InsertTherapist } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Therapist, Appointment } from "@shared/schema";

export default function Therapists() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [scheduleDialogTherapist, setScheduleDialogTherapist] = useState<{ id: string; name: string } | null>(null);
  const { toast } = useToast();

  const form = useForm<InsertTherapist>({
    resolver: zodResolver(insertTherapistSchema),
    defaultValues: {
      name: "",
      specialty: "",
      email: "",
      phone: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertTherapist) => {
      return await apiRequest("POST", "/api/therapists", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/therapists"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Terapeuta creado",
        description: "El terapeuta ha sido agregado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el terapeuta",
        variant: "destructive",
      });
    },
  });

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
        <Button data-testid="button-add-therapist" onClick={() => setIsDialogOpen(true)}>
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
            onManageSchedule={(id) => {
              const therapistData = therapists.find(t => t.id === id);
              if (therapistData) {
                setScheduleDialogTherapist({ id: therapistData.id, name: therapistData.name });
              }
            }}
          />
        ))}
      </div>

      {filteredTherapists.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No se encontraron terapeutas
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent data-testid="dialog-create-therapist">
          <DialogHeader>
            <DialogTitle>Nuevo Terapeuta</DialogTitle>
            <DialogDescription>
              Agrega un nuevo terapeuta al centro
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-name" placeholder="Dr. Juan Pérez" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="specialty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Especialidad</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-specialty" placeholder="Psicología Clínica" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-email" type="email" placeholder="juan@example.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-phone" placeholder="+34 600 000 000" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit">
                  {createMutation.isPending ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {scheduleDialogTherapist && (
        <TherapistScheduleDialog
          therapistId={scheduleDialogTherapist.id}
          therapistName={scheduleDialogTherapist.name}
          open={!!scheduleDialogTherapist}
          onOpenChange={(open) => {
            if (!open) {
              setScheduleDialogTherapist(null);
            }
          }}
        />
      )}
    </div>
  );
}
