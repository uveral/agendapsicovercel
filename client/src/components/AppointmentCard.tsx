import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, User, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppointmentCardProps {
  id: string;
  time: string;
  clientName: string;
  therapistName: string;
  status: "confirmed" | "pending" | "cancelled";
  onEdit: (id: string) => void;
  onCancel: (id: string) => void;
}

const statusConfig = {
  confirmed: { label: "Confirmada", variant: "default" as const },
  pending: { label: "Pendiente", variant: "secondary" as const },
  cancelled: { label: "Cancelada", variant: "outline" as const },
};

export function AppointmentCard({
  id,
  time,
  clientName,
  therapistName,
  status,
  onEdit,
  onCancel,
}: AppointmentCardProps) {
  const statusInfo = statusConfig[status];

  return (
    <Card className="hover-elevate" data-testid={`card-appointment-${id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="font-medium" data-testid={`text-time-${id}`}>{time}</span>
              <Badge variant={statusInfo.variant} data-testid={`badge-status-${id}`}>
                {statusInfo.label}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm truncate" data-testid={`text-client-${id}`}>{clientName}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Terapeuta: {therapistName}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" data-testid={`button-menu-${id}`}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(id)} data-testid={`menu-edit-${id}`}>
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onCancel(id)}
                className="text-destructive"
                data-testid={`menu-cancel-${id}`}
              >
                Cancelar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
