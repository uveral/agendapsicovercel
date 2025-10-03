import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery, useMutation } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeProvider } from "@/lib/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "./lib/queryClient";
import Dashboard from "@/pages/Dashboard";
import Therapists from "@/pages/Therapists";
import TherapistDetail from "@/pages/TherapistDetail";
import Clients from "@/pages/Clients";
import ClientDetail from "@/pages/ClientDetail";
import Calendar from "@/pages/Calendar";
import Appointments from "@/pages/Appointments";
import Availability from "@/pages/Availability";
import Settings from "@/pages/Settings";
import Landing from "@/pages/Landing";
import NotFound from "@/pages/not-found";
import type { User } from "@shared/schema";

function RoleSwitcher() {
  const { toast } = useToast();
  const { data: user } = useQuery<User>({
    queryKey: ['/api/auth/user'],
  });

  const roleMutation = useMutation({
    mutationFn: async (role: string) => {
      const res = await apiRequest('PATCH', '/api/auth/user/role', { role });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast({
        title: "Rol actualizado",
        description: "El rol de usuario ha sido actualizado correctamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el rol",
        variant: "destructive",
      });
    },
  });

  if (!user) return null;

  return (
    <Select
      value={user.role}
      onValueChange={(value) => roleMutation.mutate(value)}
      data-testid="select-role"
    >
      <SelectTrigger className="w-32" data-testid="select-role">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="admin" data-testid="option-admin">Admin</SelectItem>
        <SelectItem value="client" data-testid="option-client">Client</SelectItem>
      </SelectContent>
    </Select>
  );
}

function Router({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/therapists" component={Therapists} />
          <Route path="/therapists/:id" component={TherapistDetail} />
          <Route path="/clients" component={Clients} />
          <Route path="/clients/:id" component={ClientDetail} />
          <Route path="/calendar" component={Calendar} />
          <Route path="/appointments" component={Appointments} />
          <Route path="/availability" component={Availability} />
          <Route path="/settings" component={Settings} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  };

  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Router isAuthenticated={false} />
        <Toaster />
      </>
    );
  }

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between p-4 border-b">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-4">
              {import.meta.env.DEV && <RoleSwitcher />}
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            <Router isAuthenticated={true} />
          </main>
        </div>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <AppContent />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
