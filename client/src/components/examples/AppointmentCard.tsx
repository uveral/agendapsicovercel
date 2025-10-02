import { AppointmentCard } from '../AppointmentCard';

export default function AppointmentCardExample() {
  return (
    <div className="p-8 max-w-md space-y-4">
      <AppointmentCard
        id="1"
        time="14:00 - 15:00"
        clientName="Carlos Rodríguez"
        therapistName="Dr. María González"
        status="confirmed"
        onEdit={(id) => console.log('Editar:', id)}
        onCancel={(id) => console.log('Cancelar:', id)}
      />
      <AppointmentCard
        id="2"
        time="16:00 - 17:00"
        clientName="Laura Fernández"
        therapistName="Dr. Juan Pérez"
        status="pending"
        onEdit={(id) => console.log('Editar:', id)}
        onCancel={(id) => console.log('Cancelar:', id)}
      />
    </div>
  );
}
