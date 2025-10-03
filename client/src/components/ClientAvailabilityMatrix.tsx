import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ClientAvailability } from "@shared/schema";
import { Loader2 } from "lucide-react";

interface ClientAvailabilityMatrixProps {
  open: boolean;
  clientId: string;
  onClose: () => void;
}

const HOURS = Array.from({ length: 12 }, (_, i) => 9 + i);
const DAYS = [
  { name: 'Lun', value: 1 },
  { name: 'Mar', value: 2 },
  { name: 'Mié', value: 3 },
  { name: 'Jue', value: 4 },
  { name: 'Vie', value: 5 },
  { name: 'Sáb', value: 6 },
  { name: 'Dom', value: 0 },
];

export default function ClientAvailabilityMatrix({ open, clientId, onClose }: ClientAvailabilityMatrixProps) {
  const { toast } = useToast();
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());

  const { data: availability = [], isLoading } = useQuery<ClientAvailability[]>({
    queryKey: [`/api/availability/${clientId}`],
    enabled: open && !!clientId,
  });

  useEffect(() => {
    if (availability.length > 0) {
      const cells = new Set<string>();
      
      availability.forEach(avail => {
        const startHour = parseInt(avail.startTime.split(':')[0]);
        const endHour = parseInt(avail.endTime.split(':')[0]);
        
        for (let hour = startHour; hour < endHour; hour++) {
          if (hour >= 9 && hour < 21) {
            cells.add(`${avail.dayOfWeek}-${hour}`);
          }
        }
      });
      
      setSelectedCells(cells);
    } else {
      setSelectedCells(new Set());
    }
  }, [availability]);

  const saveMutation = useMutation({
    mutationFn: async (data: { dayOfWeek: number; startTime: string; endTime: string }[]) => {
      return await apiRequest("PUT", `/api/availability/${clientId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/availability/${clientId}`] });
      toast({
        title: "Disponibilidad actualizada",
        description: "Los horarios se han guardado correctamente",
      });
      onClose();
    },
    onError: (error: any) => {
      let errorMessage = "No se pudo guardar la disponibilidad";
      
      if (error.message) {
        try {
          const parts = error.message.split(': ');
          if (parts.length > 1) {
            const jsonPart = parts.slice(1).join(': ');
            const parsed = JSON.parse(jsonPart);
            if (parsed.message) {
              errorMessage = parsed.message;
              if (parsed.errors && parsed.errors.length > 0) {
                errorMessage += `: ${parsed.errors[0].message || JSON.stringify(parsed.errors[0])}`;
              }
            }
          }
        } catch {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error al guardar",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const toggleCell = (day: number, hour: number) => {
    const key = `${day}-${hour}`;
    const newSelected = new Set(selectedCells);
    
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    
    setSelectedCells(newSelected);
  };

  const handleSave = () => {
    const blocks: { dayOfWeek: number; startTime: string; endTime: string }[] = [];
    
    DAYS.forEach(day => {
      let blockStart: number | null = null;
      
      for (let hour = 9; hour <= 20; hour++) {
        const isSelected = selectedCells.has(`${day.value}-${hour}`);
        
        if (isSelected && blockStart === null) {
          blockStart = hour;
        } else if (!isSelected && blockStart !== null) {
          blocks.push({
            dayOfWeek: day.value,
            startTime: `${blockStart.toString().padStart(2, '0')}:00`,
            endTime: `${hour.toString().padStart(2, '0')}:00`,
          });
          blockStart = null;
        }
      }
      
      if (blockStart !== null) {
        blocks.push({
          dayOfWeek: day.value,
          startTime: `${blockStart.toString().padStart(2, '0')}:00`,
          endTime: '21:00',
        });
      }
    });
    
    saveMutation.mutate(blocks);
  };

  const isCellSelected = (day: number, hour: number) => {
    return selectedCells.has(`${day}-${hour}`);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editor de Disponibilidad</DialogTitle>
          <DialogDescription>
            Marca los horarios en los que el cliente está disponible
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                <div className="grid gap-px bg-border" style={{ gridTemplateColumns: `60px repeat(${DAYS.length}, 1fr)` }}>
                  <div className="bg-background p-2"></div>
                  {DAYS.map(day => (
                    <div
                      key={day.value}
                      className="bg-background p-2 text-center text-sm font-medium"
                      data-testid={`day-header-${day.value}`}
                    >
                      {day.name}
                    </div>
                  ))}

                  {HOURS.map(hour => (
                    <>
                      <div
                        key={`hour-${hour}`}
                        className="bg-background p-2 text-sm text-muted-foreground text-right"
                        data-testid={`hour-label-${hour}`}
                      >
                        {hour}:00
                      </div>
                      {DAYS.map(day => (
                        <button
                          key={`${day.value}-${hour}`}
                          onClick={() => toggleCell(day.value, hour)}
                          className={`p-2 min-h-[40px] transition-colors hover-elevate active-elevate-2 ${
                            isCellSelected(day.value, hour)
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                          data-testid={`cell-${day.value}-${hour}`}
                        />
                      ))}
                    </>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={saveMutation.isPending}
                data-testid="button-cancel"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                data-testid="button-save"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar Disponibilidad'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
