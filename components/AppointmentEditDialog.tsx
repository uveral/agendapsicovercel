
'use client';

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { insertAppointmentSchema, type Appointment, type User, type Therapist } from "@/lib/types";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, User as UserIcon, Trash2 } from "lucide-react";

interface AppointmentEditDialogProps {
  appointmentId: string | null;
  onClose: () => void;
}

const formSchema = z.object({
  startTime: z.string().min(1, "Hora de inicio es requerida"),
  endTime: z.string().min(1, "Hora de fin es requerida"),
  status: z.enum(["pending", "confirmed", "cancelled"]),
  notes: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof formSchema>;

export function AppointmentEditDialog({ appointmentId, onClose }: AppointmentEditDialogProps) {
  const { toast } = useToast();
  const [editScope, setEditScope] = useState<"this_only" | "this_and_future">("this_only");
  const [deleteScope, setDeleteScope] = useState<"this_only" | "this_and_future">("this_only");
  const [newFrequency, setNewFrequency] = useState<"semanal" | "quincenal">("semanal");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: appointment, isLoading: isLoadingAppointment } = useQuery<Appointment>({
    queryKey: ["/api/appointments", appointmentId],
    enabled: !!appointmentId,
  });

  const { data: clients = [] } = useQuery<User[]>({
    queryKey: ["/api/clients"],
    enabled: !!appointmentId,
  });

  const { data: therapists = [] } = useQuery<Therapist[]>({
    queryKey: ["/api/therapists"],
    enabled: !!appointmentId,
  });

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      startTime: "",
      endTime: "",
      status: "pending",
      notes: "",
    },
  });

  useEffect(() => {
    if (appointment) {
      form.reset({
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        status: appointment.status,
        notes: appointment.notes || "",
      });
      setNewFrequency(appointment.frequency === "quincenal" ? "quincenal" : "semanal");
    }
  }, [appointment, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      if (!appointmentId) return;
      
      if (appointment?.frequency === "puntual") {
        return await apiRequest("PATCH", `/api/appointments/${appointmentId}`, data);
      } else {
        return await apiRequest(
          "PATCH",
          `/api/appointments/${appointmentId}/series?scope=${editScope}`,
          data
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      onClose();
      toast({
        title: "Cita actualizada",
        description: "La cita ha sido actualizada exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la cita",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!appointmentId) return;
      
      if (appointment?.frequency === "puntual") {
        return await apiRequest("DELETE", `/api/appointments/${appointmentId}`);
      } else {
        return await apiRequest(
          "DELETE",
          `/api/appointments/${appointmentId}/series?scope=${deleteScope}`
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      onClose();
      toast({
        title: "Cita eliminada",
        description: "La cita ha sido eliminada exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la cita",
        variant: "destructive",
      });
    },
  });

  const changeFrequencyMutation = useMutation({
    mutationFn: async () => {
      if (!appointmentId) return;
      return await apiRequest("PATCH", `/api/appointments/${appointmentId}/frequency`, {
        frequency: newFrequency,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Frecuencia actualizada",
        description: "La frecuencia de la serie ha sido actualizada exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la frecuencia",
        variant: "destructive",
      });
    },
  });

  if (!appointmentId) return null;

  if (isLoadingAppointment || !appointment) {
    return (
      <Dialog open={!!appointmentId} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl" data-testid="dialog-edit-appointment">
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Cargando cita...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const client = clients.find((c) => c.id === appointment.clientId);
  const therapist = therapists.find((t) => t.id === appointment.therapistId);

  const clientName = client
    ? `${client.firstName || ''} ${client.lastName || ''}`.trim() || client.email?.split('@')[0] || 'Cliente'
    : 'Cliente';

  const therapistName = therapist?.name || 'Terapeuta';

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isRecurring = appointment.frequency !== "puntual";

  return (
    <>
      <Dialog open={!!appointmentId} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-edit-appointment">
          <DialogHeader>
            <DialogTitle>Editar Cita</DialogTitle>
            <DialogDescription>
              Modifica los detalles de la cita
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-md">
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Cliente</div>
                  <div className="font-medium" data-testid="text-client-name">{clientName}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Terapeuta</div>
                  <div className="font-medium" data-testid="text-therapist-name">{therapistName}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Fecha</div>
                  <div className="font-medium" data-testid="text-date">{formatDate(appointment.date)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Tipo</div>
                  <div className="font-medium capitalize" data-testid="text-frequency">
                    {appointment.frequency === "puntual" ? "Cita única" : 
                     appointment.frequency === "semanal" ? "Semanal" : "Quincenal"}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))} className="space-y-4">
                {isRecurring && (
                  <div className="space-y-2">
                    <Label>Alcance de la edición</Label>
                    <RadioGroup value={editScope} onValueChange={(value) => setEditScope(value as "this_only" | "this_and_future")}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="this_only" id="edit-this-only" data-testid="radio-edit-this-only" />
                        <Label htmlFor="edit-this-only" className="font-normal cursor-pointer">
                          Solo esta cita
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="this_and_future" id="edit-this-and-future" data-testid="radio-edit-this-and-future" />
                        <Label htmlFor="edit-this-and-future" className="font-normal cursor-pointer">
                          Esta y todas las siguientes
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hora de inicio</FormLabel>
                        <FormControl>
                          <Input {...field} type="time" data-testid="input-start-time" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hora de fin</FormLabel>
                        <FormControl>
                          <Input {...field} type="time" data-testid="input-end-time" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">Pendiente</SelectItem>
                          <SelectItem value="confirmed">Confirmada</SelectItem>
                          <SelectItem value="cancelled">Cancelada</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} data-testid="textarea-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={updateMutation.isPending} data-testid="button-save-changes">
                  {updateMutation.isPending ? "Guardando..." : "Guardar cambios"}
                </Button>
              </form>
            </Form>

            {isRecurring && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Cambiar frecuencia de la serie</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      Esto afectará a esta cita y todas las siguientes en la serie
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Select value={newFrequency} onValueChange={(value) => setNewFrequency(value as "semanal" | "quincenal")}>
                      <SelectTrigger className="flex-1" data-testid="select-frequency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="semanal">Semanal</SelectItem>
                        <SelectItem value="quincenal">Quincenal</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => changeFrequencyMutation.mutate()}
                      disabled={changeFrequencyMutation.isPending || newFrequency === appointment.frequency}
                      data-testid="button-change-frequency"
                    >
                      {changeFrequencyMutation.isPending ? "Cambiando..." : "Cambiar"}
                    </Button>
                  </div>
                </div>
              </>
            )}

            <Separator />

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-destructive">Zona de peligro</h3>
              
              {isRecurring && (
                <div className="space-y-2">
                  <Label>Alcance de la eliminación</Label>
                  <RadioGroup value={deleteScope} onValueChange={(value) => setDeleteScope(value as "this_only" | "this_and_future")}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="this_only" id="delete-this-only" data-testid="radio-delete-this-only" />
                      <Label htmlFor="delete-this-only" className="font-normal cursor-pointer">
                        Solo esta cita
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="this_and_future" id="delete-this-and-future" data-testid="radio-delete-this-and-future" />
                      <Label htmlFor="delete-this-and-future" className="font-normal cursor-pointer">
                        Esta y todas las siguientes
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleteMutation.isPending}
                data-testid="button-delete"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {deleteMutation.isPending ? "Eliminando..." : "Eliminar cita"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent data-testid="alert-confirm-delete">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              {isRecurring && deleteScope === "this_and_future"
                ? "Esto eliminará esta cita y todas las siguientes en la serie. Esta acción no se puede deshacer."
                : "Esta acción no se puede deshacer."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteMutation.mutate();
                setShowDeleteConfirm(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
