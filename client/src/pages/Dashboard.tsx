import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, Clock, AlertCircle } from "lucide-react";
import { AppointmentCard } from "@/components/AppointmentCard";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const stats = [
    {
      title: "Citas Hoy",
      value: "24",
      icon: Calendar,
      description: "+3 vs ayer",
    },
    {
      title: "Terapeutas Activos",
      value: "11",
      icon: Users,
      description: "de 12 total",
    },
    {
      title: "Horas Ocupadas",
      value: "85%",
      icon: Clock,
      description: "Semana actual",
    },
    {
      title: "Pendientes",
      value: "5",
      icon: AlertCircle,
      description: "Requieren atención",
    },
  ];

  const upcomingAppointments = [
    {
      id: "1",
      time: "14:00 - 15:00",
      clientName: "Carlos Rodríguez",
      therapistName: "Dr. María González",
      status: "confirmed" as const,
    },
    {
      id: "2",
      time: "15:00 - 16:00",
      clientName: "Ana Martínez",
      therapistName: "Dr. Juan Pérez",
      status: "confirmed" as const,
    },
    {
      id: "3",
      time: "16:00 - 17:00",
      clientName: "Laura Fernández",
      therapistName: "Dra. Carmen López",
      status: "pending" as const,
    },
  ];

  const alerts = [
    { id: "1", message: "3 clientes sin disponibilidad registrada", type: "warning" },
    { id: "2", message: "Dr. Pérez: Alta ocupación esta semana (95%)", type: "info" },
    { id: "3", message: "2 solicitudes de cambio de horario pendientes", type: "warning" },
  ];

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
              {upcomingAppointments.map((apt) => (
                <AppointmentCard
                  key={apt.id}
                  {...apt}
                  onEdit={(id) => console.log('Editar:', id)}
                  onCancel={(id) => console.log('Cancelar:', id)}
                />
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alertas y Notificaciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {alerts.map((alert) => (
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
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
