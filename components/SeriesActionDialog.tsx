'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { Calendar, CalendarDays } from 'lucide-react';

export type SeriesActionScope = 'this_only' | 'this_and_future' | 'all';

interface SeriesActionDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (scope: SeriesActionScope) => void;
  action: 'edit' | 'delete';
  frequency: 'semanal' | 'quincenal';
}

export default function SeriesActionDialog({
  open,
  onClose,
  onConfirm,
  action,
  frequency,
}: SeriesActionDialogProps) {
  const [scope, setScope] = useState<SeriesActionScope>('this_only');

  const handleConfirm = () => {
    onConfirm(scope);
    setScope('this_only');
  };

  const handleCancel = () => {
    onClose();
    setScope('this_only');
  };

  const actionText = action === 'edit' ? 'modificar' : 'eliminar';
  const actionTextUpper = action === 'edit' ? 'Modificar' : 'Eliminar';
  const frequencyText = frequency === 'semanal' ? 'semanal' : 'quincenal';

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && handleCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{actionTextUpper} cita en serie</AlertDialogTitle>
          <AlertDialogDescription>
            Esta cita es parte de una serie {frequencyText}. ¿Qué deseas {actionText}?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <RadioGroup value={scope} onValueChange={(v) => setScope(v as SeriesActionScope)}>
            <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="this_only" id="this_only" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="this_only" className="font-medium cursor-pointer">
                  Solo esta cita
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {action === 'edit' ? 'Modificar' : 'Eliminar'} únicamente esta cita, las demás de la serie permanecerán sin cambios.
                </p>
              </div>
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="this_and_future" id="this_and_future" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="this_and_future" className="font-medium cursor-pointer">
                  Esta y las siguientes
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {action === 'edit' ? 'Modificar' : 'Eliminar'} esta cita y todas las citas futuras de la serie.
                </p>
              </div>
              <CalendarDays className="h-5 w-5 text-muted-foreground mt-0.5" />
            </div>

            {action === 'delete' && (
              <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="all" id="all" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="all" className="font-medium cursor-pointer">
                    Toda la serie
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Eliminar todas las citas de la serie, incluyendo las pasadas.
                  </p>
                </div>
                <CalendarDays className="h-5 w-5 text-destructive mt-0.5" />
              </div>
            )}
          </RadioGroup>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>
            Continuar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
