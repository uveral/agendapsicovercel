export type SampleAppointment = {
  id: string;
  therapist: string;
  client: string;
  service: string;
  date: string; // ISO date
  start: string; // HH:MM
  end: string; // HH:MM
  status: 'pendiente' | 'confirmada' | 'cancelada';
  modality: 'Presencial' | 'Online';
  room: string;
};

export const SAMPLE_APPOINTMENTS: SampleAppointment[] = [
  {
    id: 'apt-001',
    therapist: 'Laura Martínez',
    client: 'Ana Pérez',
    service: 'Terapia individual',
    date: '2024-07-02',
    start: '09:00',
    end: '10:00',
    status: 'confirmada',
    modality: 'Presencial',
    room: 'Sala 2',
  },
  {
    id: 'apt-002',
    therapist: 'Laura Martínez',
    client: 'Carlos Romero',
    service: 'Seguimiento',
    date: '2024-07-02',
    start: '10:30',
    end: '11:00',
    status: 'pendiente',
    modality: 'Online',
    room: 'Sala 2',
  },
  {
    id: 'apt-003',
    therapist: 'Miguel Ortega',
    client: 'Lucía Gómez',
    service: 'Terapia de pareja',
    date: '2024-07-02',
    start: '12:00',
    end: '13:30',
    status: 'confirmada',
    modality: 'Presencial',
    room: 'Sala 1',
  },
  {
    id: 'apt-004',
    therapist: 'Sara Núñez',
    client: 'Diego Fernández',
    service: 'Evaluación inicial',
    date: '2024-07-03',
    start: '09:30',
    end: '10:30',
    status: 'cancelada',
    modality: 'Online',
    room: 'Sala virtual',
  },
  {
    id: 'apt-005',
    therapist: 'Miguel Ortega',
    client: 'Raquel Silva',
    service: 'Terapia individual',
    date: '2024-07-03',
    start: '11:00',
    end: '12:00',
    status: 'confirmada',
    modality: 'Presencial',
    room: 'Sala 1',
  },
];

export const SAMPLE_THERAPISTS = Array.from(
  new Set(SAMPLE_APPOINTMENTS.map((appointment) => appointment.therapist)),
);

export const STATUS_TRANSLATIONS: Record<SampleAppointment['status'], string> = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  cancelada: 'Cancelada',
};
