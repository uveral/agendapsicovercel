import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User, ClientAvailability, Therapist, TherapistWorkingHours, Appointment } from "@shared/schema";
import { Loader2, Calendar, Star } from "lucide-react";
import { ClientCombobox } from "@/components/ClientCombobox";

interface CreateAppointmentDialogProps {
  open: boolean;
  clientId?: string;
  initialTherapistId?: string;
  initialDate?: string;
  onClose: () => void;
}

const formSchema = z.object({
  clientId: z.string().min(1, "Selecciona un cliente"),
  therapistId: z.string().min(1, "Selecciona un terapeuta"),
  date: z.string().min(1, "Selecciona una fecha"),
  startTime: z.string().min(1, "Selecciona hora de inicio"),
  durationMinutes: z.number().min(15, "La duración mínima es 15 minutos").max(240, "La duración máxima es 4 horas"),
  frequency: z.enum(["puntual", "semanal", "quincenal"]),
  sessionPeriod: z.enum(["1 mes", "6 meses", "1 año"]),
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
  score: number;
  reasons: string[];
}

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const generateTimeOptions = () => {
  const options: string[] = [];
  for (let hour = 8; hour <= 20; hour++) {
    options.push(`${hour.toString().padStart(2, '0')}:00`);
    if (hour < 20) {
      options.push(`${hour.toString().padStart(2, '0')}:30`);
    }
  }
  return options;
};

const TIME_OPTIONS = generateTimeOptions();

const calculateEndTime = (startTime: string, durationMinutes: number): string => {
  const [hours, minutes] = startTime.split(':').map(Number);
  const startMinutes = hours * 60 + minutes;
  const endMinutes = startMinutes + durationMinutes;
  const endHours = Math.floor(endMinutes / 60);
  const endMins = endMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
};

export default function CreateAppointmentDialog({ open, clientId, initialTherapistId, initialDate, onClose }: CreateAppointmentDialogProps) {
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: clientId || "",
      therapistId: initialTherapistId || "",
      date: initialDate || "",
      startTime: "",
      durationMinutes: 60,
      frequency: "semanal",
      sessionPeriod: "6 meses",
      status: "confirmed",
      notes: "",
    },
  });

  const frequency = form.watch("frequency");
  const sessionPeriod = form.watch("sessionPeriod");
  const selectedClientId = form.watch("clientId");
  const selectedTherapistId = form.watch("therapistId");
  const startTime = form.watch("startTime");
  const durationMinutes = form.watch("durationMinutes");

  useEffect(() => {
    if (open) {
      form.reset({
        clientId: clientId || "",
        therapistId: initialTherapistId || "",
        date: initialDate || "",
        startTime: "",
        durationMinutes: 60,
        frequency: "semanal",
        sessionPeriod: "6 meses",
        status: "confirmed",
        notes: "",
      });
      setSelectedSuggestion(null);
    }
  }, [open, clientId, initialTherapistId, initialDate, form]);

  const { data: client } = useQuery<User>({
    queryKey: [`/api/clients/${selectedClientId || clientId}`],
    enabled: open && !!(selectedClientId || clientId),
  });

  const { data: availability = [] } = useQuery<ClientAvailability[]>({
    queryKey: [`/api/availability/${selectedClientId || clientId}`],
    enabled: open && !!(selectedClientId || clientId),
  });

  const { data: therapists = [] } = useQuery<Therapist[]>({
    queryKey: ['/api/therapists'],
    enabled: open,
  });

  const { data: allClients = [] } = useQuery<User[]>({
    queryKey: ['/api/clients'],
    enabled: open && !clientId,
  });

  const { data: therapistSchedule = [] } = useQuery<TherapistWorkingHours[]>({
    queryKey: [`/api/therapists/${selectedTherapistId}/schedule`],
    enabled: open && !!selectedTherapistId,
  });

  const { data: therapistAppointments = [] } = useQuery<Appointment[]>({
    queryKey: [`/api/therapists/${selectedTherapistId}/appointments`],
    enabled: open && !!selectedTherapistId,
  });

  const { data: clientAppointments = [] } = useQuery<Appointment[]>({
    queryKey: [`/api/clients/${selectedClientId || clientId}/appointments`],
    enabled: open && !!(selectedClientId || clientId),
  });

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

  const parseTime = (time: string): number => {
    return parseInt(time.split(':')[0]);
  };

  const formatTime = (hour: number): string => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  const calculateSuggestions = useCallback(() => {
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
                let score = 0;
                const reasons: string[] = [];

                const appointmentsOnDay = therapistAppointments.filter(apt => {
                  const aptDate = new Date(apt.date);
                  aptDate.setHours(0, 0, 0, 0);
                  return aptDate.getTime() === checkDate.getTime();
                });

                let groupingScore = 0;
                for (const apt of appointmentsOnDay) {
                  const aptStartHour = parseTime(apt.startTime);
                  const aptEndHour = parseTime(apt.endTime);
                  const hourDiff = Math.min(
                    Math.abs(hour - aptEndHour),
                    Math.abs(aptStartHour - (hour + 1))
                  );

                  if (hourDiff === 0) {
                    groupingScore = 30;
                    reasons.push(`Agrupa con cita de ${apt.startTime}`);
                    break;
                  } else if (hourDiff === 1) {
                    groupingScore = Math.max(groupingScore, 20);
                    if (groupingScore === 20) {
                      reasons.push(`Cerca de cita de ${apt.startTime}`);
                    }
                  }
                }
                score += groupingScore;

                const biweeklyPatternAppointments = clientAppointments.filter(apt => {
                  const aptDate = new Date(apt.date);
                  if (apt.therapistId !== selectedTherapistId) return false;
                  if (aptDate.getDay() !== dayOfWeek) return false;
                  if (apt.startTime !== slotStart) return false;
                  
                  const daysDiff = Math.floor((checkDate.getTime() - aptDate.getTime()) / (1000 * 60 * 60 * 24));
                  return daysDiff > 0 && daysDiff % 14 === 0;
                });

                if (biweeklyPatternAppointments.length > 0) {
                  score += 25;
                  reasons.push(`Patrón quincenal detectado`);
                }

                const proximityScore = Math.max(0, 15 - dayOffset);
                score += proximityScore;
                if (dayOffset <= 3) {
                  reasons.push(`Disponible pronto`);
                }

                if (hour >= 10 && hour < 18) {
                  score += 10;
                  reasons.push(`Horario central`);
                }

                suggested.push({
                  dayOfWeek,
                  dayName: DAY_NAMES[dayOfWeek],
                  startTime: slotStart,
                  endTime: slotEnd,
                  date: checkDate.toISOString().split('T')[0],
                  score,
                  reasons,
                });
              }
            }
          }
        }
      }
    }

    suggested.sort((a, b) => b.score - a.score);
    setSuggestions(suggested.slice(0, 10));
  }, [availability, therapistSchedule, therapistAppointments, clientAppointments, selectedTherapistId]);

  useEffect(() => {
    if (selectedTherapistId && availability.length > 0 && therapistSchedule.length > 0) {
      calculateSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [selectedTherapistId, availability, therapistSchedule, calculateSuggestions]);

  const applySuggestion = (suggestion: Suggestion) => {
    form.setValue("date", suggestion.date);
    form.setValue("startTime", suggestion.startTime);
    setSelectedSuggestion(suggestion);
  };

  const getSessionCount = (freq: string, period: string): number => {
    if (freq === "puntual") return 1;
    
    if (period === "1 mes") {
      return freq === "semanal" ? 4 : 2;
    } else if (period === "6 meses") {
      return freq === "semanal" ? 26 : 13;
    } else {
      return freq === "semanal" ? 52 : 26;
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const endTime = calculateEndTime(data.startTime, data.durationMinutes);
      const finalClientId = data.clientId || clientId;
      const optimizationScore = selectedSuggestion?.score || 0;
      
      if (data.frequency === "puntual") {
        return await apiRequest("POST", "/api/appointments", {
          clientId: finalClientId,
          therapistId: data.therapistId,
          date: data.date,
          startTime: data.startTime,
          endTime: endTime,
          durationMinutes: data.durationMinutes,
          frequency: "puntual",
          status: data.status,
          notes: data.notes,
          optimizationScore,
        });
      } else {
        const seriesId = crypto.randomUUID();
        const appointments = [];
        const sessionCount = getSessionCount(data.frequency, data.sessionPeriod);

        for (let i = 0; i < sessionCount; i++) {
          const appointmentDate = new Date(data.date);
          
          if (data.frequency === "semanal") {
            appointmentDate.setDate(appointmentDate.getDate() + (i * 7));
          } else {
            appointmentDate.setDate(appointmentDate.getDate() + (i * 14));
          }

          appointments.push({
            clientId: finalClientId,
            therapistId: data.therapistId,
            date: appointmentDate.toISOString().split('T')[0],
            startTime: data.startTime,
            endTime: endTime,
            durationMinutes: data.durationMinutes,
            frequency: data.frequency,
            seriesId,
            status: data.status,
            notes: data.notes,
            optimizationScore: i === 0 ? optimizationScore : 0,
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
      setSelectedSuggestion(null);
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

  const endTime = startTime && durationMinutes ? calculateEndTime(startTime, durationMinutes) : "";

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
            {!clientId && (
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <FormControl>
                      <ClientCombobox
                        value={field.value}
                        onValueChange={field.onChange}
                        clients={allClients}
                        placeholder="Buscar cliente..."
                        testId="combobox-appointment-client"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
                    <div className="space-y-3">
                      {suggestions.map((suggestion, index) => {
                        const dayOfMonth = new Date(suggestion.date).getDate();
                        const monthName = new Date(suggestion.date).toLocaleDateString('es-ES', { month: 'short' });
                        const isOptimal = suggestion.score > 60;
                        
                        return (
                          <Tooltip key={index}>
                            <TooltipTrigger asChild>
                              <div
                                className="flex items-start gap-2 p-3 rounded-md border hover-elevate cursor-pointer"
                                onClick={() => applySuggestion(suggestion)}
                                data-testid={`button-suggestion-${index}`}
                              >
                                <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-sm">
                                      {suggestion.dayName} {dayOfMonth} {monthName} - {suggestion.startTime}
                                    </span>
                                    {isOptimal && (
                                      <Badge variant="default" className="bg-green-600 hover:bg-green-600" data-testid={`badge-optimal-${index}`}>
                                        <Star className="h-3 w-3 mr-1" />
                                        Óptimo
                                      </Badge>
                                    )}
                                    <Badge variant="outline" className="text-xs" data-testid={`badge-score-${index}`}>
                                      {suggestion.score} pts
                                    </Badge>
                                  </div>
                                  {suggestion.reasons.length > 0 && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {suggestion.reasons.join(' · ')}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p className="font-semibold mb-1">Score: {suggestion.score} puntos</p>
                              <ul className="text-xs space-y-1">
                                {suggestion.reasons.map((reason, i) => (
                                  <li key={i}>• {reason}</li>
                                ))}
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

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
                          Semanal ({getSessionCount("semanal", sessionPeriod)} sesiones)
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="quincenal" id="quincenal" data-testid="radio-quincenal" />
                        <label htmlFor="quincenal" className="text-sm cursor-pointer">
                          Quincenal ({getSessionCount("quincenal", sessionPeriod)} sesiones)
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sessionPeriod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Período de sesiones</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-session-period">
                        <SelectValue placeholder="Selecciona período" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1 mes">1 mes</SelectItem>
                      <SelectItem value="6 meses">6 meses</SelectItem>
                      <SelectItem value="1 año">1 año</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de inicio</FormLabel>
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
                    <FormLabel>Hora de inicio</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-start-time">
                          <SelectValue placeholder="Selecciona hora" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TIME_OPTIONS.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="durationMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duración (minutos)</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-duration">
                          <SelectValue placeholder="Selecciona duración" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="60">60 minutos (1 hora)</SelectItem>
                        <SelectItem value="90">90 minutos (1.5 horas)</SelectItem>
                        <SelectItem value="120">120 minutos (2 horas)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {endTime && (
                <div className="space-y-2">
                  <FormLabel>Hora de fin (calculada)</FormLabel>
                  <div className="h-9 px-3 py-2 rounded-md border border-input bg-muted flex items-center text-sm" data-testid="text-end-time">
                    {endTime}
                  </div>
                </div>
              )}
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
                  frequency === "puntual" 
                    ? "Crear Cita" 
                    : `Crear ${getSessionCount(frequency, sessionPeriod)} Citas`
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
