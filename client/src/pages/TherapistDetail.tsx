import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Download, Mail, Clock, Edit } from "lucide-react";
import { AppointmentCard } from "@/components/AppointmentCard";
import { TherapistScheduleDialog } from "@/components/TherapistScheduleDialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Therapist, Appointment, User, TherapistWorkingHours } from "@shared/schema";

export default function TherapistDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth() as { user: User | undefined };
  
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  
  const [editInfoOpen, setEditInfoOpen] = useState(false);
  const [editScheduleOpen, setEditScheduleOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    email: "",
    specialty: "",
    color: ""
  });

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

  const updateTherapistMutation = useMutation({
    mutationFn: async (data: { email?: string; specialty?: string; color?: string }) => {
      return await apiRequest("PATCH", `/api/therapists/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/therapists', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/therapists'] });
      toast({
        title: "Información actualizada",
        description: "Los datos del terapeuta han sido actualizados exitosamente",
      });
      setEditInfoOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la información",
        variant: "destructive",
      });
    },
  });

  const handleEditInfo = () => {
    if (therapist) {
      setEditForm({
        email: therapist.email || "",
        specialty: therapist.specialty || "",
        color: therapist.color || "#3b82f6"
      });
      setEditInfoOpen(true);
    }
  };

  const handleSaveInfo = () => {
    updateTherapistMutation.mutate(editForm);
  };

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
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle>Información del Terapeuta</CardTitle>
            {user?.role === 'admin' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleEditInfo}
                data-testid="button-edit-therapist-info"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
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
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle>Horario Laboral</CardTitle>
            {user?.role === 'admin' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditScheduleOpen(true)}
                data-testid="button-edit-therapist-schedule"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
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

      <Dialog open={editInfoOpen} onOpenChange={setEditInfoOpen}>
        <DialogContent data-testid="dialog-edit-therapist-info">
          <DialogHeader>
            <DialogTitle>Editar Información del Terapeuta</DialogTitle>
            <DialogDescription>
              Actualiza los datos básicos del terapeuta
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="email@ejemplo.com"
                data-testid="input-edit-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-specialty">Especialidad</Label>
              <Input
                id="edit-specialty"
                value={editForm.specialty}
                onChange={(e) => setEditForm({ ...editForm, specialty: e.target.value })}
                placeholder="Especialidad"
                data-testid="input-edit-specialty"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-color">Color de Identificación</Label>
              <div className="flex gap-3 items-center">
                <Input
                  id="edit-color"
                  type="color"
                  value={editForm.color}
                  onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                  className="w-20 h-10"
                  data-testid="input-edit-color"
                />
                <Input
                  value={editForm.color}
                  onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                  placeholder="#3b82f6"
                  data-testid="input-edit-color-text"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditInfoOpen(false)}
              disabled={updateTherapistMutation.isPending}
              data-testid="button-cancel-edit-info"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveInfo}
              disabled={updateTherapistMutation.isPending}
              data-testid="button-save-therapist-info"
            >
              {updateTherapistMutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {therapist && (
        <TherapistScheduleDialog
          therapistId={therapist.id}
          therapistName={therapist.name}
          open={editScheduleOpen}
          onOpenChange={setEditScheduleOpen}
        />
      )}
    </div>
  );
}
