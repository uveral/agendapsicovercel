import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Settings } from "lucide-react";

interface TherapistCardProps {
  id: string;
  name: string;
  specialty: string;
  availability: number;
  upcomingAppointments: number;
  onViewCalendar: (id: string) => void;
  onManageSchedule?: (id: string) => void;
}

export function TherapistCard({
  id,
  name,
  specialty,
  availability,
  upcomingAppointments,
  onViewCalendar,
  onManageSchedule,
}: TherapistCardProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className="hover-elevate" data-testid={`card-therapist-${id}`}>
      <CardHeader className="space-y-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary text-primary-foreground text-base">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate" data-testid={`text-therapist-name-${id}`}>
              {name}
            </h3>
            <p className="text-sm text-muted-foreground truncate">{specialty}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Disponibilidad</span>
          <Badge variant="secondary" data-testid={`badge-availability-${id}`}>
            {availability}%
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            {upcomingAppointments} citas próximas
          </span>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => onViewCalendar(id)}
          data-testid={`button-view-calendar-${id}`}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Ver calendario
        </Button>
        {onManageSchedule && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onManageSchedule(id)}
            data-testid={`button-manage-schedule-${id}`}
          >
            <Settings className="h-4 w-4 mr-2" />
            Gestionar horario
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
