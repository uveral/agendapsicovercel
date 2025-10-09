'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Calendar, Loader2, Mail, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { Therapist } from '@/lib/types';

export default function TherapistDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [formValues, setFormValues] = useState<{
    name: string;
    email: string;
    phone: string;
    specialty: string;
  }>({
    name: '',
    email: '',
    phone: '',
    specialty: '',
  });

  const { data: therapist, isLoading } = useQuery<Therapist>({
    queryKey: [`/api/therapists/${id}`],
  });

  useEffect(() => {
    if (therapist) {
      setFormValues({
        name: therapist.name ?? '',
        email: therapist.email ?? '',
        phone: therapist.phone ?? '',
        specialty: therapist.specialty ?? '',
      });
    }
  }, [therapist]);

  const updateMutation = useMutation({
    mutationFn: async (payload: { name: string; email: string; phone: string; specialty: string }) => {
      return (await apiRequest('PATCH', `/api/therapists/${id}`, payload)) as Therapist;
    },
    onSuccess: async (updated) => {
      setFormValues({
        name: updated.name ?? '',
        email: updated.email ?? '',
        phone: updated.phone ?? '',
        specialty: updated.specialty ?? '',
      });
      queryClient.setQueryData([`/api/therapists/${id}`], updated);
      await queryClient.invalidateQueries({ queryKey: ['/api/therapists'], refetchType: 'active' });
      toast({
        title: 'Cambios guardados',
        description: 'La información del terapeuta se actualizó correctamente.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al guardar',
        description: error.message || 'No se pudieron guardar los cambios del terapeuta.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAdmin) {
      return;
    }
    updateMutation.mutate({ ...formValues });
  };

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
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => router.back()}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 space-y-3">
          <div>
            <h1 className="text-2xl font-semibold">
              {isAdmin ? formValues.name || 'Nombre sin especificar' : therapist.name}
            </h1>
            <p className="text-muted-foreground">
              {isAdmin ? formValues.specialty || 'Sin especialidad' : therapist.specialty || 'Sin especialidad'}
            </p>
          </div>
          {isAdmin && (
            <div className="max-w-md space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={formValues.name}
                onChange={(event) =>
                  setFormValues((previous) => ({ ...previous, name: event.target.value }))
                }
                placeholder="Nombre del terapeuta"
                required
              />
            </div>
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="max-w-md space-y-2">
          <Label htmlFor="specialty">Especialidad</Label>
          <Input
            id="specialty"
            value={formValues.specialty}
            onChange={(event) =>
              setFormValues((previous) => ({ ...previous, specialty: event.target.value }))
            }
            placeholder="Especialidad principal"
          />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {isAdmin ? (
          <Card>
            <CardHeader>
              <CardTitle>Información de contacto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Correo electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formValues.email}
                  onChange={(event) =>
                    setFormValues((previous) => ({ ...previous, email: event.target.value }))
                  }
                  placeholder="correo@ejemplo.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  Teléfono
                </Label>
                <Input
                  id="phone"
                  value={formValues.phone}
                  onChange={(event) =>
                    setFormValues((previous) => ({ ...previous, phone: event.target.value }))
                  }
                  placeholder="+34 600 000 000"
                />
              </div>
            </CardContent>
          </Card>
        ) : (
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
        )}

        <Card>
          <CardHeader>
            <CardTitle>Acciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isAdmin && (
              <Button
                type="submit"
                className="w-full"
                disabled={updateMutation.isPending}
                data-testid="button-save-therapist"
              >
                {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar cambios
              </Button>
            )}
            <Button
              type="button"
              className="w-full"
              onClick={() =>
                router.push(`/calendar?view=personal&therapist=${encodeURIComponent(therapist.id)}`)
              }
            >
              <Calendar className="h-4 w-4 mr-2" />
              Ver calendario
            </Button>
            <Button
              variant="outline"
              className="w-full"
              type="button"
              onClick={() => router.push(`/therapists/${therapist.id}/schedule`)}
            >
              Gestionar horarios
            </Button>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
