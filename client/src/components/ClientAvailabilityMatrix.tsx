import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ClientAvailability } from "@shared/schema";
import { Loader2, RotateCcw } from "lucide-react";

interface ClientAvailabilityMatrixProps {
  open: boolean;
  clientId: string;
  onClose: () => void;
}

type DragState = { active: boolean; shouldSelect: boolean } | null;

const HOURS = Array.from({ length: 12 }, (_, index) => 9 + index);
const DAYS = [
  { name: "Lun", value: 1 },
  { name: "Mar", value: 2 },
  { name: "Mié", value: 3 },
  { name: "Jue", value: 4 },
  { name: "Vie", value: 5 },
  { name: "Sáb", value: 6 },
  { name: "Dom", value: 0 },
];

function serializeCells(cells: Set<string>) {
  return Array.from(cells).sort().join("|");
}

function parseHour(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const match = value.trim().match(/^(\d{1,2})/);
  if (!match) {
    return null;
  }

  const hour = Number.parseInt(match[1] ?? "", 10);
  return Number.isFinite(hour) ? hour : null;
}

export default function ClientAvailabilityMatrix({ open, clientId, onClose }: ClientAvailabilityMatrixProps) {
  const { toast } = useToast();
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [dragState, setDragState] = useState<DragState>(null);
  const [initialSnapshot, setInitialSnapshot] = useState<string>("");

  const {
    data: availability = [],
    isLoading,
    error,
    refetch,
  } = useQuery<ClientAvailability[]>({
    queryKey: [`/api/availability/${clientId}`],
    enabled: open && !!clientId,
  });

  const rebuildSelectionFromAvailability = useCallback((slots: ClientAvailability[]) => {
    const cells = new Set<string>();

    slots.forEach((slot) => {
      const startHour = parseHour(slot?.startTime ?? null);
      const endHour = parseHour(slot?.endTime ?? null);

      if (!Number.isFinite(startHour) || !Number.isFinite(endHour)) {
        return;
      }

      const normalizedStart = Math.max(9, startHour as number);
      const normalizedEnd = Math.min(21, Math.max(normalizedStart, endHour as number));

      for (let hour = normalizedStart; hour < normalizedEnd; hour++) {
        if (hour >= 9 && hour < 21) {
          cells.add(`${slot.dayOfWeek}-${hour}`);
        }
      }
    });

    setSelectedCells(cells);
    setInitialSnapshot(serializeCells(cells));
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    rebuildSelectionFromAvailability(availability);
  }, [availability, open, rebuildSelectionFromAvailability]);

  useEffect(() => {
    if (!dragState?.active) {
      return;
    }

    const handlePointerUp = () => {
      setDragState(null);
    };

    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragState]);

  const applyCellSelection = useCallback((day: number, hour: number, shouldSelect: boolean) => {
    setSelectedCells((previous) => {
      const next = new Set(previous);
      const key = `${day}-${hour}`;

      if (shouldSelect) {
        next.add(key);
      } else {
        next.delete(key);
      }

      return next;
    });
  }, []);

  const toggleCell = useCallback(
    (day: number, hour: number) => {
      const key = `${day}-${hour}`;
      const shouldSelect = !selectedCells.has(key);
      applyCellSelection(day, hour, shouldSelect);
    },
    [applyCellSelection, selectedCells],
  );

  const handlePointerDown = useCallback(
    (day: number, hour: number) => (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      const key = `${day}-${hour}`;
      const shouldSelect = !selectedCells.has(key);

      setDragState({ active: true, shouldSelect });
      applyCellSelection(day, hour, shouldSelect);
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [applyCellSelection, selectedCells],
  );

  const handlePointerEnter = useCallback(
    (day: number, hour: number) => (event: React.PointerEvent<HTMLButtonElement>) => {
      if (!dragState?.active) {
        return;
      }

      event.preventDefault();
      applyCellSelection(day, hour, dragState.shouldSelect);
    },
    [applyCellSelection, dragState],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (!dragState?.active) {
        return;
      }

      event.preventDefault();
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      setDragState(null);
    },
    [dragState],
  );

  const resetSelection = useCallback(() => {
    rebuildSelectionFromAvailability(availability);
  }, [availability, rebuildSelectionFromAvailability]);

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
      setInitialSnapshot(serializeCells(selectedCells));
      onClose();
    },
    onError: (error: any) => {
      let errorMessage = "No se pudo guardar la disponibilidad";

      if (error.message) {
        try {
          const parts = error.message.split(": ");
          if (parts.length > 1) {
            const jsonPart = parts.slice(1).join(": ");
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

  const handleSave = () => {
    const blocks: { dayOfWeek: number; startTime: string; endTime: string }[] = [];

    DAYS.forEach((day) => {
      let blockStart: number | null = null;

      for (let hour = 9; hour <= 21; hour++) {
        const isSelected = hour < 21 && selectedCells.has(`${day.value}-${hour}`);

        if (isSelected && blockStart === null) {
          blockStart = hour;
        } else if (!isSelected && blockStart !== null) {
          blocks.push({
            dayOfWeek: day.value,
            startTime: `${blockStart.toString().padStart(2, "0")}:00`,
            endTime: `${hour.toString().padStart(2, "0")}:00`,
          });
          blockStart = null;
        }
      }

      if (blockStart !== null) {
        blocks.push({
          dayOfWeek: day.value,
          startTime: `${blockStart.toString().padStart(2, "0")}:00`,
          endTime: "21:00",
        });
      }
    });

    saveMutation.mutate(blocks);
  };

  const isSaving = saveMutation.isPending;
  const hasChanges = useMemo(
    () => serializeCells(selectedCells) !== initialSnapshot,
    [selectedCells, initialSnapshot],
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editor de Disponibilidad</DialogTitle>
          <DialogDescription>
            Marca los horarios en los que el cliente está disponible haciendo clic o arrastrando sobre la cuadrícula
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="space-y-4">
            <p className="text-sm text-destructive">
              {error instanceof Error
                ? error.message
                : "No se pudo cargar la disponibilidad del cliente."}
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
              Reintentar
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                <div
                  className="grid gap-px bg-border"
                  style={{ gridTemplateColumns: `60px repeat(${DAYS.length}, 1fr)` }}
                >
                  <div className="bg-background p-2" />
                  {DAYS.map((day) => (
                    <div
                      key={day.value}
                      className="bg-background p-2 text-center text-sm font-medium"
                      data-testid={`day-header-${day.value}`}
                    >
                      {day.name}
                    </div>
                  ))}

                  {HOURS.map((hour) => (
                    <div key={hour} className="contents">
                      <div
                        className="bg-background p-2 text-sm text-muted-foreground text-right"
                        data-testid={`hour-label-${hour}`}
                      >
                        {hour}:00
                      </div>
                      {DAYS.map((day) => {
                        const isSelected = selectedCells.has(`${day.value}-${hour}`);
                        return (
                          <button
                            key={`${day.value}-${hour}`}
                            type="button"
                            onPointerDown={handlePointerDown(day.value, hour)}
                            onPointerEnter={handlePointerEnter(day.value, hour)}
                            onPointerUp={handlePointerUp}
                            onKeyDown={(event) => {
                              if (event.key === " " || event.key === "Enter") {
                                event.preventDefault();
                                toggleCell(day.value, hour);
                              }
                            }}
                            className={`p-2 min-h-[40px] transition-colors hover-elevate active-elevate-2 ${
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                            aria-pressed={isSelected}
                            data-testid={`cell-${day.value}-${hour}`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={resetSelection}
                disabled={isSaving || !hasChanges}
                data-testid="button-reset-client-availability"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Descartar cambios
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
                data-testid="button-save-client-availability"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
