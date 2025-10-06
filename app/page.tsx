import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-background">
      <div className="mx-auto max-w-2xl text-center px-6">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-primary mb-4">
            Centro Orienta
          </h1>
          <p className="text-2xl text-muted-foreground">
            Sistema de Gestión de Citas
          </p>
        </div>

        <p className="text-lg text-muted-foreground mb-12">
          Gestiona tus citas, horarios y disponibilidad de manera eficiente.
          Sistema diseñado para terapeutas y profesionales de la psicología.
        </p>

        <div className="flex gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/login">Iniciar Sesión</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/signup">Crear Cuenta</Link>
          </Button>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="text-4xl mb-2">📅</div>
            <h3 className="font-semibold mb-2">Gestión de Citas</h3>
            <p className="text-sm text-muted-foreground">
              Administra tus citas de forma intuitiva
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-2">🔄</div>
            <h3 className="font-semibold mb-2">Citas Recurrentes</h3>
            <p className="text-sm text-muted-foreground">
              Programa sesiones semanales o quincenales
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-2">📊</div>
            <h3 className="font-semibold mb-2">Reportes</h3>
            <p className="text-sm text-muted-foreground">
              Genera reportes en PDF de tus actividades
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
