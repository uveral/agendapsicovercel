'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import type { Therapist } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import TherapistScheduleMatrix from '@/components/TherapistScheduleMatrix';

export default function TherapistSchedulePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user } = useAuth();

  const { data: therapist } = useQuery<Therapist>({
    queryKey: [`/api/therapists/${id}`],
  });

  const canEdit = useMemo(() => {
    if (!user) {
      return false;
    }

    if (user.role === 'admin') {
      return true;
    }

    return user.therapistId === id;
  }, [id, user]);

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
          <CardDescription>
            Marca los bloques disponibles haciendo clic y arrastrando sobre la cuadrícula. Los cambios respetan los días y horas de apertura del centro.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!canEdit && (
            <p className="text-sm text-muted-foreground">
              Solo puedes consultar el horario configurado. Contacta con un administrador si necesitas hacer cambios.
            </p>
          )}
          <TherapistScheduleMatrix therapistId={id} canEdit={canEdit} />
        </CardContent>
      </Card>
    </div>
  );
}
