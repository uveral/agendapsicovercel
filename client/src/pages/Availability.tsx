import { useState } from "react";
import { AvailabilityForm } from "@/components/AvailabilityForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ClientAvailability } from "@shared/schema";

export default function Availability() {
  const { toast } = useToast();

  const { data: availability = [], isLoading } = useQuery<ClientAvailability[]>({
    queryKey: ["/api/availability"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any[]) => {
      return await apiRequest("POST", "/api/availability", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/availability"] });
      toast({
        title: "Disponibilidad guardada",
        description: "Tu disponibilidad ha sido actualizada correctamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar la disponibilidad",
        variant: "destructive",
      });
    },
  });

  const handleSave = (data: { dayOfWeek: number; startTime: string; endTime: string }[]) => {
    saveMutation.mutate(data);
  };

  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const uniqueDays = Array.from(new Set(availability.map((a) => a.dayOfWeek)));
  const daysAvailable = uniqueDays.map((d) => dayNames[d]).filter(Boolean);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Cargando disponibilidad...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Mi Disponibilidad</h1>
        <p className="text-muted-foreground">
          Configura tus horarios disponibles para recibir citas
        </p>
      </div>

      {availability.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estado Actual</CardTitle>
            <CardDescription>
              Última actualización: {new Date().toLocaleDateString('es-ES')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="font-medium">{daysAvailable.length}</span> días disponibles
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="font-medium">{availability.length}</span> franjas horarias
                </span>
              </div>
            </div>
            {daysAvailable.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {daysAvailable.map((day) => (
                  <Badge key={day} variant="secondary">
                    {day}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <AvailabilityForm 
        onSave={handleSave} 
        existingAvailability={availability}
        isLoading={isLoading}
      />
    </div>
  );
}
