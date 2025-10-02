import { AvailabilityForm } from '../AvailabilityForm';

export default function AvailabilityFormExample() {
  return (
    <div className="p-8 max-w-3xl">
      <AvailabilityForm
        onSave={(data) => console.log('Disponibilidad guardada:', data)}
      />
    </div>
  );
}
