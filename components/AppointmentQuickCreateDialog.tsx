'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format, addWeeks, addDays, getDay } from 'date-fns';
import { es as esLocale } from 'date-fns/locale';
import { Search, Loader2, Clock, AlertCircle, Calendar, Info } from 'lucide-react';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import { addMinutesToTime } from '@/lib/time-utils';
import type { User, Therapist, TherapistWorkingHours } from '@/lib/types';

interface AppointmentQuickCreateDialogProps {
  open: boolean;
  onClose: () => void;
  date: Date;
  hour: number;
  availableTherapists: Array<{
    therapist: Therapist;
    isInSchedule: boolean;
  }>;
  workingHours: TherapistWorkingHours[];
}

type Frequency = 'puntual' | 'semanal' | 'quincenal';

export default function AppointmentQuickCreateDialog({
  open,
  onClose,
  date,
  hour,
  availableTherapists,
  workingHours,
}: AppointmentQuickCreateDialogProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedTherapistId, setSelectedTherapistId] = useState<string>('');
  const [frequency, setFrequency] = useState<Frequency>('puntual');
  const [startTime, setStartTime] = useState(`${hour.toString().padStart(2, '0')}:00`);
  const computedEndTime = useMemo(() => addMinutesToTime(startTime, 60), [startTime]);

  const { data: clients = [], isLoading: clientsLoading } = useQuery<User[]>({
    queryKey: ['/api/clients'],
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      clientId: string;
      therapistId: string;
      dates: string[];
      startTime: string;
      endTime: string;
      frequency: Frequency;
    }) => {
      const seriesId = data.frequency === 'puntual' ? null : crypto.randomUUID();

      // Create all appointments in the series
      const appointments = data.dates.map((dateStr) => ({
        clientId: data.clientId,
        therapistId: data.therapistId,
        date: dateStr,
        startTime: data.startTime,
        endTime: data.endTime,
        frequency: data.frequency,
        status: 'confirmed',
        ...(seriesId ? { seriesId } : {}),
      }));

      // Create all appointments
      const results = await Promise.all(
        appointments.map(apt => apiRequest('POST', '/api/appointments', apt))
      );

      return results;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      const count = variables.dates.length;
      toast({
        title: 'Citas creadas',
        description: count === 1
          ? 'La cita ha sido agendada exitosamente'
          : `Se han creado ${count} citas en la serie`,
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al crear las citas',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const filteredClients = useMemo(() => {
    if (!searchTerm.trim()) return [];

    const term = searchTerm.toLowerCase();
    return clients.filter(client => {
      const fullName = `${client.firstName || ''} ${client.lastName || ''}`.toLowerCase();
      const email = (client.email || '').toLowerCase();
      return fullName.includes(term) || email.includes(term);
    }).slice(0, 10);
  }, [clients, searchTerm]);

  const selectedClient = useMemo(() => {
    return clients.find(c => c.id === selectedClientId);
  }, [clients, selectedClientId]);

  // Calculate series dates based on frequency
  const seriesDates = useMemo(() => {
    const dates = [format(date, 'yyyy-MM-dd')];

    if (frequency === 'semanal') {
      // 52 weeks = 1 year
      for (let i = 1; i < 52; i++) {
        const nextDate = addWeeks(date, i);
        dates.push(format(nextDate, 'yyyy-MM-dd'));
      }
    } else if (frequency === 'quincenal') {
      // 26 biweekly = 1 year
      for (let i = 1; i < 26; i++) {
        const nextDate = addWeeks(date, i * 2);
        dates.push(format(nextDate, 'yyyy-MM-dd'));
      }
    }

    return dates;
  }, [date, frequency]);

  // Check therapist availability for all dates in series
  const availabilityWarnings = useMemo(() => {
    if (!selectedTherapistId || frequency === 'puntual') return [];

    const therapistHours = workingHours.filter(wh => wh.therapistId === selectedTherapistId);
    const dayOfWeek = getDay(date);
    const warnings: string[] = [];

    // Check if therapist works on this day of the week
    const worksOnDay = therapistHours.some(wh => wh.dayOfWeek === dayOfWeek);

    if (!worksOnDay) {
      warnings.push(`El terapeuta no trabaja los ${['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'][dayOfWeek]}`);
    } else {
      // Check if the time is within working hours
      const startMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);

      const withinHours = therapistHours.some(wh => {
        if (wh.dayOfWeek !== dayOfWeek) return false;
        const whStart = parseInt(wh.startTime.split(':')[0]) * 60 + parseInt(wh.startTime.split(':')[1]);
        const whEnd = parseInt(wh.endTime.split(':')[0]) * 60 + parseInt(wh.endTime.split(':')[1]);
        return startMinutes >= whStart && startMinutes < whEnd;
      });

      if (!withinHours) {
        warnings.push('El horario está fuera del horario laboral del terapeuta');
      }
    }

    return warnings;
  }, [selectedTherapistId, frequency, workingHours, date, startTime]);

  const handleClose = () => {
    setSearchTerm('');
    setSelectedClientId('');
    setSelectedTherapistId('');
    setFrequency('puntual');
    setStartTime(`${hour.toString().padStart(2, '0')}:00`);
    onClose();
  };

  const handleCreate = () => {
    if (!selectedClientId || !selectedTherapistId) {
      toast({
        title: 'Faltan datos',
        description: 'Selecciona un cliente y un terapeuta',
        variant: 'destructive',
      });
      return;
    }

    createMutation.mutate({
      clientId: selectedClientId,
      therapistId: selectedTherapistId,
      dates: seriesDates,
      startTime,
      endTime: computedEndTime,
      frequency,
    });
  };

  const dateLabel = format(date, "EEEE d 'de' MMMM yyyy", { locale: esLocale });
  const timeLabel = `${hour.toString().padStart(2, '0')}:00 - ${(hour + 1).toString().padStart(2, '0')}:00`;

  // Auto-select therapist if only one is in schedule
  useEffect(() => {
    const inSchedule = availableTherapists.filter(t => t.isInSchedule);
    if (inSchedule.length === 1 && !selectedTherapistId) {
      setSelectedTherapistId(inSchedule[0].therapist.id);
    }
  }, [availableTherapists, selectedTherapistId]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Agendar nueva cita</DialogTitle>
          <DialogDescription className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              <span className="capitalize">{dateLabel}</span>
            </div>
            <div className="text-sm font-medium">{timeLabel}</div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Client Search */}
          <div className="space-y-2">
            <Label>Cliente</Label>
            {selectedClient ? (
              <div className="flex items-center justify-between p-3 border rounded-md bg-muted">
                <div>
                  <div className="font-medium">
                    {selectedClient.firstName} {selectedClient.lastName}
                  </div>
                  <div className="text-sm text-muted-foreground">{selectedClient.email}</div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedClientId('')}
                >
                  Cambiar
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar cliente por nombre o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {searchTerm && (
                  <ScrollArea className="h-48 border rounded-md">
                    {clientsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredClients.length > 0 ? (
                      <div className="p-2 space-y-1">
                        {filteredClients.map((client) => (
                          <button
                            key={client.id}
                            onClick={() => {
                              setSelectedClientId(client.id);
                              setSearchTerm('');
                            }}
                            className="w-full text-left p-2 rounded hover:bg-muted transition-colors"
                          >
                            <div className="font-medium">
                              {client.firstName} {client.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">{client.email}</div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                        No se encontraron clientes
                      </div>
                    )}
                  </ScrollArea>
                )}
              </div>
            )}
          </div>

          {/* Therapist Selection */}
          {selectedClientId && (
            <div className="space-y-2">
              <Label>Terapeuta</Label>
              <ScrollArea className="h-48 border rounded-md">
                <div className="p-2 space-y-2">
                  {availableTherapists.map(({ therapist, isInSchedule }) => (
                    <button
                      key={therapist.id}
                      onClick={() => setSelectedTherapistId(therapist.id)}
                      className={cn(
                        'w-full text-left p-3 rounded border-2 transition-all',
                        selectedTherapistId === therapist.id
                          ? 'border-primary bg-primary/5'
                          : 'border-transparent hover:bg-muted',
                        !isInSchedule && 'opacity-60'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className={cn(
                            'font-medium',
                            !isInSchedule && 'text-muted-foreground'
                          )}>
                            {therapist.name}
                          </div>
                          {therapist.specialty && (
                            <div className="text-sm text-muted-foreground">
                              {therapist.specialty}
                            </div>
                          )}
                        </div>
                        {!isInSchedule && (
                          <Badge variant="outline" className="text-xs">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Fuera de horario
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
              {!availableTherapists.some(t => t.isInSchedule) && (
                <div className="flex items-start gap-2 p-3 text-sm bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-md">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Todos los terapeutas están fuera de horario</div>
                    <div className="text-xs opacity-80">
                      Puedes agendar la cita de todas formas, pero será fuera del horario laboral del terapeuta.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Frequency and Time Selection */}
          {selectedClientId && selectedTherapistId && (
            <>
              <div className="space-y-2">
                <Label>Frecuencia</Label>
                <RadioGroup value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="puntual" id="puntual" />
                    <Label htmlFor="puntual" className="font-normal cursor-pointer">
                      Cita puntual (una sola vez)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="semanal" id="semanal" />
                    <Label htmlFor="semanal" className="font-normal cursor-pointer">
                      Semanal (52 citas por 1 año)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="quincenal" id="quincenal" />
                    <Label htmlFor="quincenal" className="font-normal cursor-pointer">
                      Quincenal (26 citas por 1 año)
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="start-time">Hora inicio</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Se reservará durante 1 hora (fin a las {computedEndTime}).
                </p>
              </div>

              {availabilityWarnings.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-1">Advertencia de disponibilidad:</div>
                    <ul className="list-disc list-inside space-y-1">
                      {availabilityWarnings.map((warning, idx) => (
                        <li key={idx} className="text-sm">{warning}</li>
                      ))}
                    </ul>
                    {frequency !== 'puntual' && (
                      <div className="mt-2 text-sm opacity-90">
                        Esto aplicará a todas las {frequency === 'semanal' ? '52' : '26'} citas de la serie.
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {frequency !== 'puntual' && availabilityWarnings.length === 0 && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Se crearán {seriesDates.length} citas {frequency === 'semanal' ? 'semanales' : 'quincenales'} durante un año.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={createMutation.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!selectedClientId || !selectedTherapistId || createMutation.isPending}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creando...
              </>
            ) : (
              'Crear cita'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
