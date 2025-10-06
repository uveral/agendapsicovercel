import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function TherapistsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Terapeutas</h2>
          <p className="text-muted-foreground">
            Gestiona los terapeutas del centro
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Terapeuta
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Terapeutas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Esta página está en desarrollo. Aquí podrás ver y gestionar todos los terapeutas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
