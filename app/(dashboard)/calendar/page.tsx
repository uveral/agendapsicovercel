import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Calendario</h2>
        <p className="text-muted-foreground">
          Vista de calendario de todas las citas
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Calendario de Citas</CardTitle>
        </CardHeader>
        <CardContent className="h-[600px] flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Vista de calendario en desarrollo...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
