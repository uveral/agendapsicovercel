import { ClientCard } from '../ClientCard';

export default function ClientCardExample() {
  return (
    <div className="p-8 max-w-sm">
      <ClientCard
        id="1"
        name="Ana Martínez López"
        email="ana.martinez@email.com"
        phone="+34 612 345 678"
        hasAvailability={true}
        nextAppointment="Lun 15:00"
        onViewDetails={(id) => console.log('Ver detalles:', id)}
      />
    </div>
  );
}
