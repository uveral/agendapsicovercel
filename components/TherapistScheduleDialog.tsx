'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import TherapistScheduleMatrix from '@/components/TherapistScheduleMatrix';

interface TherapistScheduleDialogProps {
  therapistId: string;
  therapistName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit?: boolean;
}

export function TherapistScheduleDialog({
  therapistId,
  therapistName,
  open,
  onOpenChange,
  canEdit = true,
}: TherapistScheduleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-manage-schedule">
        <DialogHeader>
          <DialogTitle>Gestionar horario - {therapistName}</DialogTitle>
          <DialogDescription>
            Marca los bloques disponibles haciendo clic o arrastrando sobre la cuadrícula. Los cambios respetan los días y
            horas configurados en el centro.
          </DialogDescription>
        </DialogHeader>

        {!canEdit && (
          <p className="mb-2 text-sm text-muted-foreground">
            Solo puedes consultar el horario configurado. Contacta con un administrador si necesitas realizar cambios.
          </p>
        )}

        <TherapistScheduleMatrix
          therapistId={therapistId}
          canEdit={canEdit}
          onSaveSuccess={() => {
            if (canEdit) {
              onOpenChange(false);
            }
          }}
        />

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TherapistScheduleDialog;
