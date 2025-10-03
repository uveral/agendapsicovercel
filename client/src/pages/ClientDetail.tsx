import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, User, Mail, Phone, Calendar, Clock, Edit, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { User as UserType, ClientAvailability, Appointment } from "@shared/schema";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import ClientAvailabilityMatrix from "@/components/ClientAvailabilityMatrix";
import CreateAppointmentDialog from "@/components/CreateAppointmentDialog";
import ClientEditDialog from "@/components/ClientEditDialog";

export default function ClientDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const clientId = params.id;
  const [showEditAvailability, setShowEditAvailability] = useState(false);
  const [showCreateAppointment, setShowCreateAppointment] = useState(false);
  const [showEditClient, setShowEditClient] = useState(false);

  const { data: client, isLoading: clientLoading, error: clientError } = useQuery<UserType>({
    queryKey: [`/api/clients/${clientId}`],
  });

  const { data: availability = [], isLoading: availabilityLoading } = useQuery<ClientAvailability[]>({
    queryKey: [`/api/availability/${clientId}`],
    enabled: !!clientId,
  });

  const { data: allAppointments = [], isLoading: appointmentsLoading } = useQuery<Appointment[]>({
    queryKey: ['/api/appointments'],
  });

  if (clientLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-9 w-24 bg-muted animate-pulse rounded-md" />
          <div className="h-8 w-48 bg-muted animate-pulse rounded-md" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-48 bg-muted animate-pulse rounded-md" />
          <div className="h-48 bg-muted animate-pulse rounded-md" />
          <div className="h-64 bg-muted animate-pulse rounded-md" />
          <div className="h-64 bg-muted animate-pulse rounded-md" />
        </div>
      </div>
    );
  }

  if (clientError || !client) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => setLocation('/clients')}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a clientes
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4" data-testid="text-error">
              Cliente no encontrado
            </p>
            <Button onClick={() => setLocation('/clients')} data-testid="button-back-to-list">
              Volver a la lista
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const clientAppointments = allAppointments.filter(apt => apt.clientId === client.id);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const upcomingAppointments = clientAppointments
    .filter(apt => new Date(apt.date) >= today && apt.status !== 'cancelled')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const pastAppointments = clientAppointments
    .filter(apt => new Date(apt.date) < today || apt.status === 'cancelled')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  const clientName = `${client.firstName || ''} ${client.lastName || ''}`.trim() || client.email || 'Usuario';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => setLocation('/clients')}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <h1 className="text-2xl font-semibold" data-testid="text-client-name">
          {clientName}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-personal-info">
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2 space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Información Personal
              </CardTitle>
              <CardDescription>Datos del cliente</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditClient(true)}
              data-testid="button-edit-client"
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Email:</span>
                <span data-testid="text-email">{client.email || 'No disponible'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Teléfono:</span>
                <span data-testid="text-phone">{client.phone || 'No disponible'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Rol:</span>
                <Badge variant="secondary" data-testid="badge-role">{client.role}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-availability">
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2 space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Disponibilidad
              </CardTitle>
              <CardDescription>Horarios disponibles del cliente</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEditAvailability(true)}
                data-testid="button-edit-availability"
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button
                size="sm"
                onClick={() => setShowCreateAppointment(true)}
                data-testid="button-create-appointment"
              >
                <CalendarPlus className="h-4 w-4 mr-2" />
                Dar Cita
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {availabilityLoading ? (
              <div className="space-y-2">
                <div className="h-4 bg-muted animate-pulse rounded" />
                <div className="h-4 bg-muted animate-pulse rounded" />
                <div className="h-4 bg-muted animate-pulse rounded" />
              </div>
            ) : availability.length === 0 ? (
              <p className="text-sm text-muted-foreground" data-testid="text-no-availability">
                No se ha configurado disponibilidad
              </p>
            ) : (
              <div className="space-y-2" data-testid="list-availability">
                {availability.map((avail, index) => (
                  <div key={index} className="flex items-center justify-between text-sm" data-testid={`availability-item-${index}`}>
                    <span className="font-medium">{dayNames[avail.dayOfWeek]}</span>
                    <span className="text-muted-foreground">
                      {avail.startTime} - {avail.endTime}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-upcoming-appointments">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Próximas Citas
            </CardTitle>
            <CardDescription>{upcomingAppointments.length} citas programadas</CardDescription>
          </CardHeader>
          <CardContent>
            {appointmentsLoading ? (
              <div className="space-y-2">
                <div className="h-16 bg-muted animate-pulse rounded" />
                <div className="h-16 bg-muted animate-pulse rounded" />
              </div>
            ) : upcomingAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground" data-testid="text-no-upcoming">
                No hay citas próximas
              </p>
            ) : (
              <div className="space-y-3" data-testid="list-upcoming-appointments">
                {upcomingAppointments.slice(0, 5).map((apt) => (
                  <div 
                    key={apt.id} 
                    className="flex items-start justify-between p-3 rounded-md border"
                    data-testid={`appointment-${apt.id}`}
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {format(new Date(apt.date), 'EEEE, d MMMM yyyy', { locale: es })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {apt.startTime} - {apt.endTime}
                      </p>
                    </div>
                    <Badge variant={apt.status === 'confirmed' ? 'default' : 'secondary'}>
                      {apt.status === 'confirmed' ? 'Confirmada' : 
                       apt.status === 'pending' ? 'Pendiente' : 'Cancelada'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-past-appointments">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Historial de Citas
            </CardTitle>
            <CardDescription>{pastAppointments.length} citas pasadas</CardDescription>
          </CardHeader>
          <CardContent>
            {appointmentsLoading ? (
              <div className="space-y-2">
                <div className="h-16 bg-muted animate-pulse rounded" />
                <div className="h-16 bg-muted animate-pulse rounded" />
              </div>
            ) : pastAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground" data-testid="text-no-past">
                No hay citas pasadas
              </p>
            ) : (
              <div className="space-y-3" data-testid="list-past-appointments">
                {pastAppointments.slice(0, 5).map((apt) => (
                  <div 
                    key={apt.id} 
                    className="flex items-start justify-between p-3 rounded-md border"
                    data-testid={`past-appointment-${apt.id}`}
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {format(new Date(apt.date), 'EEEE, d MMMM yyyy', { locale: es })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {apt.startTime} - {apt.endTime}
                      </p>
                    </div>
                    <Badge variant={apt.status === 'cancelled' ? 'destructive' : 'outline'}>
                      {apt.status === 'cancelled' ? 'Cancelada' : 'Completada'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ClientAvailabilityMatrix
        open={showEditAvailability}
        clientId={clientId || ""}
        onClose={() => setShowEditAvailability(false)}
      />

      <CreateAppointmentDialog
        open={showCreateAppointment}
        clientId={clientId || ""}
        onClose={() => setShowCreateAppointment(false)}
      />

      {client && (
        <ClientEditDialog
          open={showEditClient}
          client={client}
          onClose={() => setShowEditClient(false)}
        />
      )}
    </div>
  );
}
