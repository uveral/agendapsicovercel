import { AvailabilityForm } from "@/components/AvailabilityForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";

export default function Availability() {
  const currentAvailability = {
    lastUpdated: "28 Sep 2024",
    totalSlots: 15,
    days: ["Lunes", "Martes", "Miércoles", "Jueves"],
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Mi Disponibilidad</h1>
        <p className="text-muted-foreground">
          Configura tus horarios disponibles para recibir citas
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estado Actual</CardTitle>
          <CardDescription>
            Última actualización: {currentAvailability.lastUpdated}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <span className="font-medium">{currentAvailability.days.length}</span> días disponibles
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <span className="font-medium">{currentAvailability.totalSlots}</span> franjas horarias
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {currentAvailability.days.map((day) => (
              <Badge key={day} variant="secondary">
                {day}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <AvailabilityForm
        onSave={(data) => {
          console.log('Disponibilidad guardada:', data);
        }}
      />
    </div>
  );
}
