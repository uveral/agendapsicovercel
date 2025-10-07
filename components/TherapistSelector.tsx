
'use client';

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Therapist } from '@/lib/types';

interface TherapistSelectorProps {
  therapists: Therapist[];
  selectedTherapist: string;
  onSelectTherapist: (therapistId: string) => void;
}

export function TherapistSelector({ therapists, selectedTherapist, onSelectTherapist }: TherapistSelectorProps) {
  const therapistsList = [
    { id: "all", name: "Todos los terapeutas" },
    ...therapists.map((t) => ({ id: t.id, name: t.name })),
  ];

  return (
    <Select value={selectedTherapist} onValueChange={onSelectTherapist}>
      <SelectTrigger className="w-full sm:w-[280px]">
        <SelectValue placeholder="Seleccionar terapeuta" />
      </SelectTrigger>
      <SelectContent>
        {therapistsList.map((therapist) => (
          <SelectItem key={therapist.id} value={therapist.id}>
            {therapist.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
