'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Calendar, Mail, Phone } from 'lucide-react';
import type { Therapist } from '@/lib/types';

export default function TherapistDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: therapist, isLoading } = useQuery<Therapist>({
    queryKey: [`/api/therapists/${id}`],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Cargando terapeuta...</div>
      </div>
    );
  }

  if (!therapist) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Terapeuta no encontrado</div>
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
          <h1 className="text-2xl font-semibold">{therapist.name}</h1>
          <p className="text-muted-foreground">{therapist.specialty}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Información de contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{therapist.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{therapist.phone}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              className="w-full"
              onClick={() => router.push(`/calendar?therapist=${therapist.id}`)}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Ver calendario
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push(`/therapists/${therapist.id}/schedule`)}
            >
              Gestionar horarios
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
