import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Therapist, Appointment } from "@shared/schema";

interface OccupancyGridProps {
  therapists: Therapist[];
  appointments: Appointment[];
}

export function OccupancyGrid({ therapists, appointments }: OccupancyGridProps) {
  const hours = Array.from({ length: 12 }, (_, i) => 9 + i); // 9:00 to 20:00
  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  
  // Calculate current week dates
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + 1); // Start on Monday

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    return date;
  });

  // Check if a therapist has an appointment at a specific time
  const hasAppointment = (therapistId: string, date: Date, hour: number): boolean => {
    return appointments.some((apt) => {
      if (apt.therapistId !== therapistId || apt.status === "cancelled") return false;
      
      const aptDate = new Date(apt.date);
      const isSameDay = aptDate.toDateString() === date.toDateString();
      
      if (!isSameDay) return false;
      
      // Parse start and end times
      const [startHour] = apt.startTime.split(':').map(Number);
      const [endHour] = apt.endTime.split(':').map(Number);
      
      return hour >= startHour && hour < endHour;
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Vista General - Ocupación de Terapeutas</CardTitle>
        <p className="text-sm text-muted-foreground">
          Cada cuadrado representa un terapeuta. Coloreado = ocupado, gris = disponible
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <div className="grid grid-cols-8 gap-2">
              {/* Header row */}
              <div className="text-xs font-medium text-muted-foreground uppercase p-2">
                Hora
              </div>
              {dayNames.map((day, i) => (
                <div key={day} className="text-center p-2">
                  <div className="text-xs font-medium uppercase">{day}</div>
                  <div className="text-xs text-muted-foreground">
                    {weekDates[i].getDate().toString().padStart(2, '0')}/
                    {(weekDates[i].getMonth() + 1).toString().padStart(2, '0')}
                  </div>
                </div>
              ))}

              {/* Time rows */}
              {hours.map((hour) => (
                <>
                  <div key={`hour-${hour}`} className="text-xs text-muted-foreground p-2 flex items-center">
                    {hour}:00
                  </div>
                  {weekDates.map((date, dayIndex) => (
                    <div
                      key={`${hour}-${dayIndex}`}
                      className="p-2 border border-border rounded-md bg-card min-h-[48px] flex flex-wrap gap-1 items-center justify-center"
                      data-testid={`occupancy-${dayNames[dayIndex]}-${hour}`}
                    >
                      {therapists.map((therapist) => {
                        const isOccupied = hasAppointment(therapist.id, date, hour);
                        return (
                          <div key={therapist.id}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={`w-4 h-4 rounded-sm transition-transform hover:scale-125 cursor-pointer`}
                                  style={{
                                    backgroundColor: isOccupied ? therapist.color : '#d1d5db',
                                  }}
                                  data-testid={`square-${therapist.id}-${dayNames[dayIndex]}-${hour}`}
                                />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-medium">{therapist.name}</p>
                                <p className="text-xs">{isOccupied ? 'Ocupado' : 'Disponible'}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
