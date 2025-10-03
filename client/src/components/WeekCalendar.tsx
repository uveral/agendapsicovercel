import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, Fragment } from "react";

interface TimeSlot {
  id: string;
  time: string;
  client?: string;
  status?: "confirmed" | "pending";
}

interface DaySchedule {
  day: string;
  date: string;
  slots: TimeSlot[];
}

interface WeekCalendarProps {
  therapistName: string;
  schedule: DaySchedule[];
  onSlotClick: (slotId: string) => void;
}

export function WeekCalendar({ therapistName, schedule, onSlotClick }: WeekCalendarProps) {
  const [weekOffset, setWeekOffset] = useState(0);

  const hours = Array.from({ length: 12 }, (_, i) => `${8 + i}:00`);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">{therapistName}</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setWeekOffset((prev) => prev - 1)}
              data-testid="button-prev-week"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[100px] text-center">
              Semana {weekOffset === 0 ? "actual" : weekOffset > 0 ? `+${weekOffset}` : weekOffset}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setWeekOffset((prev) => prev + 1)}
              data-testid="button-next-week"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="grid grid-cols-8 gap-2 min-w-[700px]">
            <div className="text-xs font-medium text-muted-foreground uppercase p-2">
              Hora
            </div>
            {schedule.map((day) => (
              <div key={day.day} className="text-center p-2">
                <div className="text-xs font-medium uppercase">{day.day}</div>
                <div className="text-xs text-muted-foreground">{day.date}</div>
              </div>
            ))}
            
            {hours.map((hour) => (
              <Fragment key={hour}>
                <div className="text-xs text-muted-foreground p-2 flex items-center">
                  {hour}
                </div>
                {schedule.map((day) => {
                  const slot = day.slots.find((s) => s.time === hour);
                  return (
                    <button
                      key={`${day.day}-${hour}`}
                      onClick={() => slot && onSlotClick(slot.id)}
                      className={`p-2 rounded-md text-xs min-h-[60px] border transition-colors ${
                        slot?.client
                          ? slot.status === "confirmed"
                            ? "bg-chart-1/10 border-chart-1/30 hover-elevate"
                            : "bg-chart-3/10 border-chart-3/30 hover-elevate"
                          : "bg-card border-border hover-elevate"
                      }`}
                      data-testid={`slot-${day.day}-${hour.replace(":", "")}`}
                    >
                      {slot?.client && (
                        <div className="space-y-1">
                          <div className="font-medium truncate">{slot.client}</div>
                          <Badge
                            variant={slot.status === "confirmed" ? "default" : "secondary"}
                            className="text-[10px] px-1 py-0"
                          >
                            {slot.status === "confirmed" ? "Conf" : "Pend"}
                          </Badge>
                        </div>
                      )}
                    </button>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
