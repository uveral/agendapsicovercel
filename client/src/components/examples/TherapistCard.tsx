import { TherapistCard } from '../TherapistCard';

export default function TherapistCardExample() {
  return (
    <div className="p-8 max-w-sm">
      <TherapistCard
        id="1"
        name="Dr. María González"
        specialty="Psicología Clínica"
        availability={75}
        upcomingAppointments={12}
        onViewCalendar={(id) => console.log('Ver calendario:', id)}
      />
    </div>
  );
}
