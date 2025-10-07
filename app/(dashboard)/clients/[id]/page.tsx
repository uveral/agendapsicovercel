'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Calendar, Mail, Phone } from 'lucide-react';
import type { User, Appointment } from '@/lib/types';

export default function ClientDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: client, isLoading: clientLoading } = useQuery<User>({
    queryKey: [`/api/clients/${id}`],
  });

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ['/api/appointments'],
  });

  const clientAppointments = appointments.filter(apt => apt.clientId === id);
  const upcomingAppointments = clientAppointments.filter(
    apt => new Date(apt.date) >= new Date() && apt.status !== 'cancelled'
  );

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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">{fullName}</h1>
          <p className="text-muted-foreground">Cliente</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Información de contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
        <CardContent>
          <Button
            className="w-full md:w-auto"
            onClick={() => router.push(`/appointments?client=${id}`)}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Ver todas las citas
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
