import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar, Users, Clock, TrendingUp } from "lucide-react";

export default function Landing() {
  const features = [
    {
      icon: Calendar,
      title: "Gestión de Calendarios",
      description: "Visualiza y gestiona los horarios de todos los terapeutas en tiempo real",
    },
    {
      icon: Users,
      title: "Administración de Clientes",
      description: "Registra la disponibilidad de cada cliente de forma sencilla",
    },
    {
      icon: Clock,
      title: "Asignación Inteligente",
      description: "Cruza disponibilidad de clientes con calendarios de terapeutas",
    },
    {
      icon: TrendingUp,
      title: "Sugerencias Automáticas",
      description: "Obtén propuestas de reasignación cuando un cliente necesite cambiar",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
              <Calendar className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Centro Psicología</h2>
              <p className="text-xs text-muted-foreground">Gestión de Horarios</p>
            </div>
          </div>
          <Button
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-login"
          >
            Iniciar Sesión
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-semibold">
              Sistema de Gestión de Horarios
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Optimiza la asignación de citas entre clientes y terapeutas con sugerencias automáticas basadas en disponibilidad
            </p>
            <div className="pt-4">
              <Button
                size="lg"
                onClick={() => window.location.href = '/api/login'}
                data-testid="button-get-started"
              >
                Comenzar
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8">
            {features.map((feature) => (
              <Card key={feature.title}>
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </div>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t p-6 text-center text-sm text-muted-foreground">
        <p>© 2024 Centro de Psicología. Sistema de Gestión de Horarios.</p>
      </footer>
    </div>
  );
}
