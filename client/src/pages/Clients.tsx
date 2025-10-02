import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, Plus, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientCard } from "@/components/ClientCard";
import { useQuery } from "@tanstack/react-query";
import type { User, Appointment, ClientAvailability } from "@shared/schema";

export default function Clients() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnlyWithAvailability, setShowOnlyWithAvailability] = useState(false);

  const { data: clients = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/clients"],
  });

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  // For simplicity, we'll check if clients have availability by looking at appointments
  // In a real scenario, we'd query the availability endpoint for each client
  const clientsWithStats = clients.map((client) => {
    const clientAppointments = appointments.filter(
      (apt) => apt.clientId === client.id && apt.status !== "cancelled"
    );
    
    const today = new Date();
    const upcomingAppointments = clientAppointments.filter(
      (apt) => new Date(apt.date) >= today
    );

    const nextAppointment = upcomingAppointments[0];
    let nextAppointmentText;
    
    if (nextAppointment) {
      const date = new Date(nextAppointment.date);
      const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      nextAppointmentText = `${dayNames[date.getDay()]} ${nextAppointment.startTime}`;
    }

    // Consider a client has availability if they have upcoming appointments
    const hasAvailability = clientAppointments.length > 0;

    return {
      ...client,
      hasAvailability,
      nextAppointment: nextAppointmentText,
    };
  });

  const filteredClients = clientsWithStats.filter((c) => {
    const matchesSearch = 
      c.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = !showOnlyWithAvailability || c.hasAvailability;
    return matchesSearch && matchesFilter;
  });

  const clientsWithAvailability = clientsWithStats.filter((c) => c.hasAvailability).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Cargando clientes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Clientes</h1>
          <p className="text-muted-foreground">
            {clients.length} clientes registrados · {clientsWithAvailability} con citas
          </p>
        </div>
        <Button data-testid="button-add-client" onClick={() => console.log('Add client')}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo cliente
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <Button
          variant={showOnlyWithAvailability ? "default" : "outline"}
          onClick={() => setShowOnlyWithAvailability(!showOnlyWithAvailability)}
          data-testid="button-filter-availability"
        >
          <Filter className="h-4 w-4 mr-2" />
          Con citas
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map((client) => (
          <ClientCard
            key={client.id}
            id={client.id}
            name={`${client.firstName || ''} ${client.lastName || ''}`.trim() || client.email || 'Usuario'}
            email={client.email || ''}
            phone="+34 XXX XXX XXX"
            hasAvailability={client.hasAvailability}
            nextAppointment={client.nextAppointment}
            onViewDetails={(id) => console.log('Ver detalles:', id)}
          />
        ))}
      </div>

      {filteredClients.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No se encontraron clientes
        </div>
      )}
    </div>
  );
}
