import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User, ClientAvailability, Therapist, TherapistWorkingHours, Appointment } from "@shared/schema";
import { Loader2, Calendar } from "lucide-react";

interface CreateAppointmentDialogProps {
  open: boolean;
  clientId: string;
  onClose: () => void;
}

const formSchema = z.object({
  therapistId: z.string().min(1, "Selecciona un terapeuta"),
  date: z.string().min(1, "Selecciona una fecha"),
  startTime: z.string().min(1, "Selecciona hora de inicio"),
  endTime: z.string().min(1, "Selecciona hora de fin"),
  frequency: z.enum(["puntual", "semanal", "quincenal"]),
  sessionCount: z.number().min(1).max(52),
  status: z.enum(["pending", "confirmed"]),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Suggestion {
  dayOfWeek: number;
  dayName: string;
  startTime: string;
  endTime: string;
  date: string;
}

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function CreateAppointmentDialog({ open, clientId, onClose }: CreateAppointmentDialogProps) {
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      therapistId: "",
      date: "",
      startTime: "",
      endTime: "",
      frequency: "puntual",
      sessionCount: 4,
      status: "confirmed",
      notes: "",
    },
  });

  const frequency = form.watch("frequency");
  const selectedTherapistId = form.watch("therapistId");

  const { data: client } = useQuery<User>({
    queryKey: [`/api/clients/${clientId}`],
    enabled: open && !!clientId,
  });

  const { data: availability = [] } = useQuery<ClientAvailability[]>({
    queryKey: [`/api/availability/${clientId}`],
    enabled: open && !!clientId,
  });

  const { data: therapists = [] } = useQuery<Therapist[]>({
    queryKey: ['/api/therapists'],
    enabled: open,
  });

  const { data: therapistSchedule = [] } = useQuery<TherapistWorkingHours[]>({
    queryKey: [`/api/therapists/${selectedTherapistId}/schedule`],
    enabled: open && !!selectedTherapistId,
  });

  const { data: therapistAppointments = [] } = useQuery<Appointment[]>({
    queryKey: [`/api/therapists/${selectedTherapistId}/appointments`],
    enabled: open && !!selectedTherapistId,
  });

  useEffect(() => {
    if (selectedTherapistId && availability.length > 0 && therapistSchedule.length > 0) {
      calculateSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [selectedTherapistId, availability, therapistSchedule, therapistAppointments]);

  const timeRangesOverlap = (
    start1: string,
    end1: string,
    start2: string,
    end2: string
  ): boolean => {
    const toMinutes = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const s1 = toMinutes(start1);
    const e1 = toMinutes(end1);
    const s2 = toMinutes(start2);
    const e2 = toMinutes(end2);
    
    return s1 < e2 && s2 < e1;
  };

  const calculateSuggestions = () => {
    const suggested: Suggestion[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() + dayOffset);
      const dayOfWeek = checkDate.getDay();

      const clientSlots = availability.filter(a => a.dayOfWeek === dayOfWeek);
      const therapistSlots = therapistSchedule.filter(w => w.dayOfWeek === dayOfWeek);

      for (const clientSlot of clientSlots) {
        for (const therapistSlot of therapistSlots) {
          const clientStart = parseTime(clientSlot.startTime);
          const clientEnd = parseTime(clientSlot.endTime);
          const therapistStart = parseTime(therapistSlot.startTime);
          const therapistEnd = parseTime(therapistSlot.endTime);

          const overlapStart = Math.max(clientStart, therapistStart);
          const overlapEnd = Math.min(clientEnd, therapistEnd);

          if (overlapStart < overlapEnd) {
            for (let hour = overlapStart; hour < overlapEnd; hour++) {
              const slotStart = formatTime(hour);
              const slotEnd = formatTime(hour + 1);

              const hasConflict = therapistAppointments.some(apt => {
                const aptDate = new Date(apt.date);
                aptDate.setHours(0, 0, 0, 0);
                
                if (aptDate.getTime() !== checkDate.getTime()) {
                  return false;
                }
                
                return timeRangesOverlap(
                  apt.startTime,
                  apt.endTime,
                  slotStart,
                  slotEnd
                );
              });

              if (!hasConflict) {
                suggested.push({
                  dayOfWeek,
                  dayName: DAY_NAMES[dayOfWeek],
                  startTime: slotStart,
                  endTime: slotEnd,
                  date: checkDate.toISOString().split('T')[0],
                });
              }
            }
          }
        }
      }
    }

    setSuggestions(suggested.slice(0, 10));
  };

  const parseTime = (time: string): number => {
    return parseInt(time.split(':')[0]);
  };

  const formatTime = (hour: number): string => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  const applysuggestion = (suggestion: Suggestion) => {
    form.setValue("date", suggestion.date);
    form.setValue("startTime", suggestion.startTime);
    form.setValue("endTime", suggestion.endTime);
  };

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (data.frequency === "puntual") {
        return await apiRequest("POST", "/api/appointments", {
          clientId,
          therapistId: data.therapistId,
          date: data.date,
          startTime: data.startTime,
          endTime: data.endTime,
          frequency: "puntual",
          status: data.status,
          notes: data.notes,
        });
      } else {
        const seriesId = crypto.randomUUID();
        const appointments = [];

        for (let i = 0; i < data.sessionCount; i++) {
          const appointmentDate = new Date(data.date);
          
          if (data.frequency === "semanal") {
            appointmentDate.setDate(appointmentDate.getDate() + (i * 7));
          } else {
            appointmentDate.setDate(appointmentDate.getDate() + (i * 14));
          }

          appointments.push({
            clientId,
            therapistId: data.therapistId,
            date: appointmentDate.toISOString().split('T')[0],
            startTime: data.startTime,
            endTime: data.endTime,
            frequency: data.frequency,
            seriesId,
            status: data.status,
            notes: data.notes,
          });
        }

        for (const apt of appointments) {
          await apiRequest("POST", "/api/appointments", apt);
        }

        return appointments;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      const count = Array.isArray(data) ? data.length : 1;
      toast({
        title: "Citas creadas",
        description: `Se ${count === 1 ? 'ha creado 1 cita' : `han creado ${count} citas`} exitosamente`,
      });
      form.reset();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la cita",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createMutation.mutate(data);
  };

  const clientName = client ? `${client.firstName || ''} ${client.lastName || ''}`.trim() || client.email : '';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Cita para {clientName}</DialogTitle>
          <DialogDescription>
            Configura los detalles de la cita
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="therapistId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Terapeuta</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-therapist">
                        <SelectValue placeholder="Selecciona un terapeuta" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {therapists.map((therapist) => (
                        <SelectItem key={therapist.id} value={therapist.id}>
                          {therapist.name} - {therapist.specialty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedTherapistId && (
              <Card data-testid="card-suggestions">
                <CardHeader>
                  <CardTitle className="text-base">Horarios Sugeridos</CardTitle>
                  <CardDescription>Basados en disponibilidad mutua</CardDescription>
                </CardHeader>
                <CardContent>
                  {suggestions.length === 0 ? (
                    <p className="text-sm text-muted-foreground" data-testid="text-no-suggestions">
                      No hay horarios coincidentes. Selecciona manualmente.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((suggestion, index) => (
                        <Button
                          key={index}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => applysuggestion(suggestion)}
                          data-testid={`button-suggestion-${index}`}
                        >
                          <Calendar className="h-3 w-3 mr-1" />
                          {suggestion.dayName} {suggestion.startTime}
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora inicio</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} data-testid="input-start-time" />
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
                    <FormLabel>Hora fin</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} data-testid="input-end-time" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frecuencia</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex flex-col space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="puntual" id="puntual" data-testid="radio-puntual" />
                        <label htmlFor="puntual" className="text-sm cursor-pointer">
                          Puntual (una sola vez)
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="semanal" id="semanal" data-testid="radio-semanal" />
                        <label htmlFor="semanal" className="text-sm cursor-pointer">
                          Semanal
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="quincenal" id="quincenal" data-testid="radio-quincenal" />
                        <label htmlFor="quincenal" className="text-sm cursor-pointer">
                          Quincenal
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {frequency !== "puntual" && (
              <FormField
                control={form.control}
                name="sessionCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de sesiones</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="52"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        data-testid="input-session-count"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
                      <SelectItem value="confirmed">Confirmada</SelectItem>
                      <SelectItem value="pending">Pendiente</SelectItem>
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
                  <FormLabel>Notas (opcional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} data-testid="input-notes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={createMutation.isPending}
                data-testid="button-cancel"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                data-testid="button-submit"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  frequency === "puntual" ? "Crear Cita" : `Crear ${form.watch("sessionCount")} Citas`
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
