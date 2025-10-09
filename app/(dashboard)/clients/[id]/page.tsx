'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Calendar, Loader2, Mail, Phone, UserCog } from 'lucide-react';
import type { User, Appointment } from '@/lib/types';
import ClientAvailabilityMatrix from '@/components/ClientAvailabilityMatrix';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest, queryClient } from '@/lib/queryClient';

export default function ClientDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [formValues, setFormValues] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  const { data: client, isLoading: clientLoading } = useQuery<User>({
    queryKey: [`/api/clients/${id}`],
  });

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ['/api/appointments'],
  });

  useEffect(() => {
    if (client) {
      setFormValues({
        firstName: client.firstName ?? '',
        lastName: client.lastName ?? '',
        email: client.email ?? '',
        phone: client.phone ?? '',
      });
    }
  }, [client]);

  const clientAppointments = useMemo(
    () => appointments.filter(apt => apt.clientId === id),
    [appointments, id]
  );
  const upcomingAppointments = useMemo(
    () =>
      clientAppointments.filter(
        apt => new Date(apt.date) >= new Date() && apt.status !== 'cancelled'
      ),
    [clientAppointments]
  );

  const updateMutation = useMutation({
    mutationFn: async (payload: typeof formValues) => {
      return (await apiRequest('PATCH', `/api/clients/${id}`, payload)) as User;
    },
    onSuccess: async (updated) => {
      setFormValues({
        firstName: updated.firstName ?? '',
        lastName: updated.lastName ?? '',
        email: updated.email ?? '',
        phone: updated.phone ?? '',
      });
      queryClient.setQueryData([`/api/clients/${id}`], updated);
      await queryClient.invalidateQueries({ queryKey: ['/api/clients'], refetchType: 'active' });
      toast({
        title: 'Cambios guardados',
        description: 'La información del cliente se actualizó correctamente.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al guardar',
        description: error.message || 'No se pudieron guardar los cambios del cliente.',
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

  if (clientLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Cargando cliente...</div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Cliente no encontrado</div>
      </div>
    );
  }

  const fullName = `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Sin nombre';

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Button variant="outline" size="icon" onClick={() => router.back()} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 space-y-3">
          <div>
            <h1 className="text-2xl font-semibold">
              {isAdmin ? `${formValues.firstName} ${formValues.lastName}`.trim() || 'Sin nombre' : fullName}
            </h1>
            <p className="text-muted-foreground">Cliente</p>
          </div>
          {isAdmin && (
            <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nombre</Label>
                <Input
                  id="firstName"
                  value={formValues.firstName}
                  onChange={(event) =>
                    setFormValues((previous) => ({ ...previous, firstName: event.target.value }))
                  }
                  placeholder="Nombre del cliente"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Apellidos</Label>
                <Input
                  id="lastName"
                  value={formValues.lastName}
                  onChange={(event) =>
                    setFormValues((previous) => ({ ...previous, lastName: event.target.value }))
                  }
                  placeholder="Apellidos del cliente"
                  required
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Información de contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isAdmin ? (
              <>
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
              </>
            ) : (
              <div className="space-y-3">
                {client.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{client.phone}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximas citas</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingAppointments.length > 0 ? (
              <div className="space-y-2">
                {upcomingAppointments.slice(0, 3).map(apt => (
                  <div key={apt.id} className="text-sm">
                    <div className="font-medium">
                      {new Date(apt.date).toLocaleDateString('es-ES', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short'
                      })}
                    </div>
                    <div className="text-muted-foreground">
                      {apt.startTime} - {apt.endTime}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No hay citas próximas
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Acciones</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 md:flex-row">
          {isAdmin && (
            <Button
              type="submit"
              className="w-full md:w-auto"
              disabled={updateMutation.isPending}
              data-testid="button-save-client"
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar cambios
            </Button>
          )}
          <Button
            className="w-full md:w-auto"
            onClick={() => router.push(`/appointments?client=${id}`)}
            type="button"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Ver todas las citas
          </Button>
          <Button
            variant="outline"
            className="w-full md:w-auto"
            onClick={() => setAvailabilityOpen(true)}
            type="button"
          >
            <UserCog className="h-4 w-4 mr-2" />
            Editar disponibilidad
          </Button>
        </CardContent>
      </Card>

      <ClientAvailabilityMatrix
        open={availabilityOpen}
        clientId={id}
        onClose={() => setAvailabilityOpen(false)}
      />
    </form>
  );
}
