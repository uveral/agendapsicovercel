import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppointmentCard } from "@/components/AppointmentCard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Appointments() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const appointments = [
    {
      id: "1",
      time: "09:00 - 10:00",
      clientName: "Ana Martínez",
      therapistName: "Dr. María González",
      status: "confirmed" as const,
      date: "Lun 04/10",
    },
    {
      id: "2",
      time: "10:00 - 11:00",
      clientName: "Carlos Rodríguez",
      therapistName: "Dr. Juan Pérez",
      status: "confirmed" as const,
      date: "Lun 04/10",
    },
    {
      id: "3",
      time: "11:00 - 12:00",
      clientName: "Laura Fernández",
      therapistName: "Dra. Carmen López",
      status: "pending" as const,
      date: "Lun 04/10",
    },
    {
      id: "4",
      time: "14:00 - 15:00",
      clientName: "Pedro García",
      therapistName: "Dr. Roberto Martín",
      status: "confirmed" as const,
      date: "Mar 05/10",
    },
    {
      id: "5",
      time: "15:00 - 16:00",
      clientName: "Isabel Ruiz",
      therapistName: "Dra. Ana Sánchez",
      status: "pending" as const,
      date: "Mar 05/10",
    },
    {
      id: "6",
      time: "16:00 - 17:00",
      clientName: "Miguel Torres",
      therapistName: "Dr. Luis Rodríguez",
      status: "cancelled" as const,
      date: "Mar 05/10",
    },
  ];

  const filteredAppointments = appointments.filter((apt) => {
    const matchesSearch =
      apt.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.therapistName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || apt.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const confirmedCount = appointments.filter((a) => a.status === "confirmed").length;
  const pendingCount = appointments.filter((a) => a.status === "pending").length;
  const cancelledCount = appointments.filter((a) => a.status === "cancelled").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Citas</h1>
          <p className="text-muted-foreground">
            Gestiona todas las citas del centro
          </p>
        </div>
        <Button data-testid="button-new-appointment">
          <Plus className="h-4 w-4 mr-2" />
          Nueva cita
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Confirmadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{confirmedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Canceladas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{cancelledCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente o terapeuta..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-status">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="confirmed">Confirmadas</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
            <SelectItem value="cancelled">Canceladas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filteredAppointments.map((apt) => (
          <div key={apt.id}>
            <div className="text-xs font-medium text-muted-foreground uppercase mb-2">
              {apt.date}
            </div>
            <AppointmentCard
              {...apt}
              onEdit={(id) => console.log('Editar:', id)}
              onCancel={(id) => console.log('Cancelar:', id)}
            />
          </div>
        ))}
      </div>

      {filteredAppointments.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No se encontraron citas
        </div>
      )}
    </div>
  );
}
