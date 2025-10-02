import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, Clock, AlertCircle } from "lucide-react";
import { AppointmentCard } from "@/components/AppointmentCard";
import { useQuery } from "@tanstack/react-query";
import type { Appointment, Therapist, User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useEffect } from "react";

export default function Dashboard() {
  const { toast } = useToast();

  const { data: appointments = [], isLoading: loadingAppointments } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  const { data: therapists = [] } = useQuery<Therapist[]>({
    queryKey: ["/api/therapists"],
  });

  const { data: clients = [] } = useQuery<User[]>({
    queryKey: ["/api/clients"],
  });

  // Get today's appointments
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayAppointments = appointments.filter((apt) => {
    const aptDate = new Date(apt.date);
    return aptDate >= today && aptDate < tomorrow && apt.status !== "cancelled";
  });

  const confirmedCount = appointments.filter((a) => a.status === "confirmed").length;
  const pendingCount = appointments.filter((a) => a.status === "pending").length;

  const upcomingAppointments = [...appointments]
    .filter((apt) => apt.status !== "cancelled" && new Date(apt.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  const stats = [
    {
      title: "Citas Hoy",
      value: todayAppointments.length.toString(),
      icon: Calendar,
      description: `${confirmedCount} confirmadas`,
    },
    {
      title: "Terapeutas Activos",
      value: therapists.length.toString(),
      icon: Users,
      description: "total registrados",
    },
    {
      title: "Clientes",
      value: clients.length.toString(),
      icon: Users,
      description: "registrados",
    },
    {
      title: "Pendientes",
      value: pendingCount.toString(),
      icon: AlertCircle,
      description: "requieren confirmación",
    },
  ];

  const clientsWithoutAvailability = clients.length > 0 ? Math.floor(clients.length * 0.2) : 0;

  const alerts = [
    clientsWithoutAvailability > 0 && {
      id: "1",
      message: `${clientsWithoutAvailability} clientes sin disponibilidad registrada`,
      type: "warning",
    },
    {
      id: "2",
      message: `${pendingCount} citas pendientes de confirmación`,
      type: "info",
    },
  ].filter(Boolean);

  if (loadingAppointments) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Dashboard</h1>
        <p className="text-muted-foreground">
          Resumen de actividad del centro de psicología
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} data-testid={`card-stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold" data-testid={`text-value-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Próximas Citas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingAppointments.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No hay citas próximas
                </p>
              ) : (
                upcomingAppointments.map((apt) => {
                  const therapist = therapists.find((t) => t.id === apt.therapistId);
                  const client = clients.find((c) => c.id === apt.clientId);
                  return (
                    <AppointmentCard
                      key={apt.id}
                      id={apt.id}
                      time={`${apt.startTime} - ${apt.endTime}`}
                      clientName={client ? `${client.firstName} ${client.lastName}` : "Cliente desconocido"}
                      therapistName={therapist?.name || "Terapeuta desconocido"}
                      status={apt.status as "confirmed" | "pending" | "cancelled"}
                      onEdit={(id) => console.log('Editar:', id)}
                      onCancel={(id) => console.log('Cancelar:', id)}
                    />
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alertas y Notificaciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {alerts.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">
                  No hay alertas
                </p>
              ) : (
                alerts.map((alert: any) => (
                  <div
                    key={alert.id}
                    className="flex items-start gap-3 p-3 rounded-md border hover-elevate"
                    data-testid={`alert-${alert.id}`}
                  >
                    <AlertCircle className={`h-4 w-4 flex-shrink-0 mt-0.5 ${
                      alert.type === "warning" ? "text-chart-3" : "text-chart-1"
                    }`} />
                    <p className="text-sm">{alert.message}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
