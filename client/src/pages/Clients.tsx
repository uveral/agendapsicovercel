import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, Plus, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientCard } from "@/components/ClientCard";
import { Badge } from "@/components/ui/badge";

export default function Clients() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnlyWithAvailability, setShowOnlyWithAvailability] = useState(false);

  const clients = [
    {
      id: "1",
      name: "Ana Martínez López",
      email: "ana.martinez@email.com",
      phone: "+34 612 345 678",
      hasAvailability: true,
      nextAppointment: "Lun 15:00",
    },
    {
      id: "2",
      name: "Carlos Rodríguez",
      email: "carlos.rodriguez@email.com",
      phone: "+34 623 456 789",
      hasAvailability: true,
      nextAppointment: "Mar 10:00",
    },
    {
      id: "3",
      name: "Laura Fernández",
      email: "laura.fernandez@email.com",
      phone: "+34 634 567 890",
      hasAvailability: false,
    },
    {
      id: "4",
      name: "Pedro García",
      email: "pedro.garcia@email.com",
      phone: "+34 645 678 901",
      hasAvailability: true,
      nextAppointment: "Mié 16:00",
    },
    {
      id: "5",
      name: "Isabel Ruiz",
      email: "isabel.ruiz@email.com",
      phone: "+34 656 789 012",
      hasAvailability: false,
    },
    {
      id: "6",
      name: "Miguel Torres",
      email: "miguel.torres@email.com",
      phone: "+34 667 890 123",
      hasAvailability: true,
      nextAppointment: "Jue 14:00",
    },
  ];

  const filteredClients = clients.filter((c) => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = !showOnlyWithAvailability || c.hasAvailability;
    return matchesSearch && matchesFilter;
  });

  const clientsWithAvailability = clients.filter((c) => c.hasAvailability).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Clientes</h1>
          <p className="text-muted-foreground">
            {clients.length} clientes registrados · {clientsWithAvailability} con disponibilidad
          </p>
        </div>
        <Button data-testid="button-add-client">
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
          Con disponibilidad
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map((client) => (
          <ClientCard
            key={client.id}
            {...client}
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
