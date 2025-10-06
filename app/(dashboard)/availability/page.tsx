import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function AvailabilityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Mi Disponibilidad</h2>
        <p className="text-muted-foreground">
          Configura tus horarios disponibles
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Horarios Disponibles</CardTitle>
          <CardDescription>
            Selecciona los días y horarios en los que estás disponible para citas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Configurador de disponibilidad en desarrollo...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
