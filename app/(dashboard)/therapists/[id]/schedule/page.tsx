'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Therapist, TherapistWorkingHours } from '@/lib/types';

const DAYS = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
];

export default function TherapistSchedulePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;

  const { data: therapist } = useQuery<Therapist>({
    queryKey: [`/api/therapists/${id}`],
  });

  const { data: schedule = [], isLoading } = useQuery<TherapistWorkingHours[]>({
    queryKey: [`/api/therapists/${id}/schedule`],
  });

  const [slots, setSlots] = useState<TherapistWorkingHours[]>([]);

  const saveMutation = useMutation({
    mutationFn: async (data: TherapistWorkingHours[]) =>
      apiRequest('PUT', `/api/therapists/${id}/schedule`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/therapists/${id}/schedule`] });
      toast({
        title: 'Horarios guardados',
        description: 'Los horarios se han actualizado correctamente',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(slots);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Cargando horarios...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Gestionar horarios</h1>
          <p className="text-muted-foreground">{therapist?.name}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Horarios de trabajo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Esta funcionalidad está en desarrollo. Por ahora, los horarios se gestionan directamente en la base de datos.
          </div>

          <div className="space-y-2">
            {schedule.map((slot) => {
              const day = DAYS.find(d => d.value === slot.dayOfWeek);
              return (
                <div key={slot.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{day?.label}</div>
                    <div className="text-sm text-muted-foreground">
                      {slot.startTime} - {slot.endTime}
                    </div>
                  </div>
                </div>
              );
            })}

            {schedule.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No hay horarios configurados
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
