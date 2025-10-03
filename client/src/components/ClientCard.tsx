import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Mail, Phone, Trash2 } from "lucide-react";

interface ClientCardProps {
  id: string;
  name: string;
  email: string;
  phone: string;
  hasAvailability: boolean;
  nextAppointment?: string;
  onViewDetails: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function ClientCard({
  id,
  name,
  email,
  phone,
  hasAvailability,
  nextAppointment,
  onViewDetails,
  onDelete,
}: ClientCardProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className="hover-elevate" data-testid={`card-client-${id}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-accent text-accent-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-base truncate" data-testid={`text-client-name-${id}`}>
                {name}
              </h3>
              <div className="flex flex-col gap-1 mt-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{email}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span>{phone}</span>
                </div>
              </div>
            </div>
          </div>
          <Badge variant={hasAvailability ? "default" : "secondary"} data-testid={`badge-availability-${id}`}>
            {hasAvailability ? "Disponible" : "Sin datos"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {nextAppointment && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Próxima: {nextAppointment}</span>
          </div>
        )}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onViewDetails(id)}
            data-testid={`button-view-details-${id}`}
          >
            Ver detalles
          </Button>
          {onDelete && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(id)}
              data-testid={`button-delete-client-${id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
