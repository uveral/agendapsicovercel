import { SuggestionsPanel } from '../SuggestionsPanel';

export default function SuggestionsPanelExample() {
  const mockSuggestions = [
    {
      id: "1",
      therapistName: "Dr. María González",
      day: "Martes",
      time: "10:00 - 11:00",
      matchScore: 95,
      reason: "Horario preferido del cliente, terapeuta con experiencia similar",
    },
    {
      id: "2",
      therapistName: "Dr. Juan Pérez",
      day: "Miércoles",
      time: "16:00 - 17:00",
      matchScore: 87,
      reason: "Disponibilidad compatible, especialidad relacionada",
    },
    {
      id: "3",
      therapistName: "Dra. Laura Martín",
      day: "Jueves",
      time: "14:00 - 15:00",
      matchScore: 82,
      reason: "Horario alternativo disponible",
    },
  ];

  return (
    <div className="p-8 max-w-2xl">
      <SuggestionsPanel
        clientName="Carlos Rodríguez"
        currentSlot="Lunes 15:00"
        suggestions={mockSuggestions}
        onApply={(id) => console.log('Aplicar sugerencia:', id)}
        onDismiss={() => console.log('Cerrar panel')}
      />
    </div>
  );
}
