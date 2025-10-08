'use client';

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { insertTherapistSchema, type InsertTherapist } from "@/lib/types";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Therapist, Appointment, TherapistWorkingHours } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";

const calculateWeeklyAvailability = (
  appointments: Appointment[],
  schedule: TherapistWorkingHours[]
): number => {
  // Calculate available hours per week
  let availableHours = 0;
  for (const block of schedule) {
    const startHour = parseInt(block.startTime.split(':')[0]);
    const startMin = parseInt(block.startTime.split(':')[1]);
    const endHour = parseInt(block.endTime.split(':')[0]);
    const endMin = parseInt(block.endTime.split(':')[1]);

    const durationHours = (endHour * 60 + endMin - startHour * 60 - startMin) / 60;
    availableHours += durationHours;
  }

  if (availableHours === 0) return 0;

  // Get current week bounds (Monday to Sunday)
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sunday, 1=Monday, ...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  // Calculate occupied hours this week
  const thisWeekAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.date);
    return aptDate >= weekStart && aptDate <= weekEnd && apt.status !== "cancelled";
  });

  let occupiedHours = 0;
  for (const apt of thisWeekAppointments) {
    occupiedHours += (apt.durationMinutes || 60) / 60;
  }

  // Calculate percentage
  const occupancyRate = (occupiedHours / availableHours) * 100;
  const availability = Math.max(0, Math.min(100, Math.round(100 - occupancyRate)));

  return availability;
};

export default function Therapists() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [scheduleDialogTherapist, setScheduleDialogTherapist] = useState<{ id: string; name: string } | null>(null);
  const [deleteTherapist, setDeleteTherapist] = useState<{ id: string; name: string } | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const isAdmin = user?.role === "admin";
  const currentTherapistId = user?.therapistId ?? null;

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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/therapists/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/therapists"] });
      setDeleteTherapist(null);
      toast({
        title: "Terapeuta eliminado",
        description: "El terapeuta ha sido eliminado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el terapeuta",
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

  const { data: allWorkingHours = [] } = useQuery<TherapistWorkingHours[]>({
    queryKey: ["/api/therapist-working-hours"],
  });

  // Get unique specialties (filter out empty strings)
  const specialties = Array.from(new Set(therapists.map((t) => t.specialty))).filter(s => s && s.trim() !== "");

  // Calculate stats for each therapist
  const therapistsWithStats = therapists.map((therapist) => {
    const therapistAppointments = appointments.filter(
      (apt) => apt.therapistId === therapist.id && apt.status !== "cancelled"
    );

    const today = new Date();
    const upcomingAppointments = therapistAppointments.filter(
      (apt) => new Date(apt.date) >= today
    ).length;

    // Get therapist's working hours schedule
    const therapistSchedule = allWorkingHours.filter(
      (wh) => wh.therapistId === therapist.id
    );

    // Calculate weekly availability based on working hours and appointments
    const availability = calculateWeeklyAvailability(
      therapistAppointments,
      therapistSchedule
    );

    return {
      ...therapist,
      availability,
      upcomingAppointments,
    };
  });

  const allowedTherapists = useMemo(() => {
    if (isAdmin) return therapistsWithStats;
    if (currentTherapistId) {
      return therapistsWithStats.filter((t) => t.id === currentTherapistId);
    }
    return [];
  }, [currentTherapistId, isAdmin, therapistsWithStats]);

  const filteredTherapists = allowedTherapists.filter((t) => {
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
        {isAdmin && (
          <Button data-testid="button-add-therapist" onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo terapeuta
          </Button>
        )}
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
        {filteredTherapists.map((therapist) => {
          const canManageSchedule = isAdmin || therapist.id === currentTherapistId;

          return (
            <TherapistCard
              key={therapist.id}
              {...therapist}
              onViewCalendar={(id) => router.push(`/calendar?therapist=${id}`)}
              onManageSchedule={canManageSchedule ? (id) => {
                const therapistData = therapists.find(t => t.id === id);
                if (therapistData) {
                  setScheduleDialogTherapist({ id: therapistData.id, name: therapistData.name });
                }
              } : undefined}
              onDelete={isAdmin ? (id) => {
                const therapistData = therapists.find(t => t.id === id);
                if (therapistData) {
                  setDeleteTherapist({ id: therapistData.id, name: therapistData.name });
                }
              } : undefined}
            />
          );
        })}
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
          canEdit={isAdmin || scheduleDialogTherapist.id === currentTherapistId}
        />
      )}

      {isAdmin && (
        <AlertDialog open={!!deleteTherapist} onOpenChange={(open) => !open && setDeleteTherapist(null)}>
        <AlertDialogContent data-testid="dialog-delete-therapist">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar terapeuta?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar a {deleteTherapist?.name}? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTherapist && deleteMutation.mutate(deleteTherapist.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
