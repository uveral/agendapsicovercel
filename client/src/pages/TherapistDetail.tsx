import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Download, Mail, Clock } from "lucide-react";
import { AppointmentCard } from "@/components/AppointmentCard";
import type { Therapist, Appointment, User, TherapistWorkingHours } from "@shared/schema";

export default function TherapistDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const { data: therapist, isLoading: loadingTherapist } = useQuery<Therapist>({
    queryKey: ['/api/therapists', id],
  });

  const { data: schedule = [] } = useQuery<TherapistWorkingHours[]>({
    queryKey: ['/api/therapists', id, 'schedule'],
  });

  const { data: appointments = [], isLoading: loadingAppointments } = useQuery<Appointment[]>({
    queryKey: ['/api/therapists', id, 'appointments'],
  });

  const { data: clients = [] } = useQuery<User[]>({
    queryKey: ['/api/clients'],
  });

  const handleDownloadPDF = async () => {
    if (!therapist) return;
    
    try {
      const response = await fetch(`/api/therapists/${id}/appointments/pdf?month=${selectedMonth}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al generar el PDF");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_${therapist.name}_${selectedMonth}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "PDF generado",
        description: "El reporte ha sido descargado correctamente",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo generar el PDF",
        variant: "destructive"
      });
    }
  };

  if (loadingTherapist) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!therapist) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-muted-foreground">Terapeuta no encontrado</div>
        <Button variant="outline" onClick={() => navigate('/therapists')} data-testid="button-back">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Terapeutas
        </Button>
      </div>
    );
  }

  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const groupedSchedule = schedule.reduce((acc, hour) => {
    if (!acc[hour.dayOfWeek]) {
      acc[hour.dayOfWeek] = [];
    }
    acc[hour.dayOfWeek].push(hour);
    return acc;
  }, {} as Record<number, TherapistWorkingHours[]>);

  const now = new Date();
  const upcomingAppointments = appointments
    .filter((apt) => new Date(apt.date) >= now && apt.status !== "cancelled")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  const pastAppointments = appointments
    .filter((apt) => new Date(apt.date) < now)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/therapists')}
          data-testid="button-back-to-therapists"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-semibold mb-2" data-testid="text-therapist-name">
          {therapist.name}
        </h1>
        <p className="text-muted-foreground">{therapist.specialty}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-therapist-info">
          <CardHeader>
            <CardTitle>Información del Terapeuta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm" data-testid="text-therapist-email">
                {therapist.email || "No especificado"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div 
                className="h-6 w-6 rounded-full border-2" 
                style={{ backgroundColor: therapist.color }}
                data-testid="color-indicator"
              />
              <span className="text-sm">Color de identificación</span>
            </div>
            <div>
              <span className="text-sm font-medium">Especialidad:</span>
              <Badge variant="secondary" className="ml-2">
                {therapist.specialty}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-working-hours">
          <CardHeader>
            <CardTitle>Horario Laboral</CardTitle>
          </CardHeader>
          <CardContent>
            {schedule.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay horario configurado
              </p>
            ) : (
              <div className="space-y-3">
                {Object.entries(groupedSchedule).map(([day, hours]) => (
                  <div key={day} className="flex items-start gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{dayNames[parseInt(day)]}</div>
                      <div className="text-sm text-muted-foreground">
                        {hours.map((h, idx) => (
                          <span key={h.id}>
                            {h.startTime} - {h.endTime}
                            {idx < hours.length - 1 && ', '}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-monthly-reports">
        <CardHeader>
          <CardTitle>Reportes Mensuales</CardTitle>
          <CardDescription>
            Generar reporte PDF de todas las citas del mes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Label htmlFor="month-selector" className="sr-only">
                Seleccionar mes
              </Label>
              <Input 
                id="month-selector"
                type="month" 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
                data-testid="input-month-selector"
              />
            </div>
            <Button 
              onClick={handleDownloadPDF}
              data-testid="button-generate-pdf"
            >
              <Download className="mr-2 h-4 w-4" />
              Generar PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-upcoming-appointments">
        <CardHeader>
          <CardTitle>Próximas Citas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingAppointments ? (
            <p className="text-center py-8 text-muted-foreground">Cargando...</p>
          ) : upcomingAppointments.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No hay citas próximas
            </p>
          ) : (
            upcomingAppointments.map((apt) => {
              const client = clients.find((c) => c.id === apt.clientId);
              return (
                <AppointmentCard
                  key={apt.id}
                  id={apt.id}
                  time={`${apt.startTime} - ${apt.endTime}`}
                  clientName={
                    client
                      ? `${client.firstName} ${client.lastName}`
                      : "Cliente desconocido"
                  }
                  therapistName={therapist.name}
                  status={apt.status as "confirmed" | "pending" | "cancelled"}
                  onEdit={(id) => console.log("Editar:", id)}
                  onCancel={(id) => console.log("Cancelar:", id)}
                />
              );
            })
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-past-appointments">
        <CardHeader>
          <CardTitle>Citas Pasadas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pastAppointments.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No hay citas pasadas
            </p>
          ) : (
            pastAppointments.map((apt) => {
              const client = clients.find((c) => c.id === apt.clientId);
              return (
                <AppointmentCard
                  key={apt.id}
                  id={apt.id}
                  time={`${apt.startTime} - ${apt.endTime}`}
                  clientName={
                    client
                      ? `${client.firstName} ${client.lastName}`
                      : "Cliente desconocido"
                  }
                  therapistName={therapist.name}
                  status={apt.status as "confirmed" | "pending" | "cancelled"}
                  onEdit={(id) => console.log("Editar:", id)}
                  onCancel={(id) => console.log("Cancelar:", id)}
                />
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
