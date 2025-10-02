import { WeekCalendar } from '../WeekCalendar';

export default function WeekCalendarExample() {
  const mockSchedule = [
    {
      day: "Lun",
      date: "04/10",
      slots: [
        { id: "1", time: "9:00", client: "Ana M.", status: "confirmed" as const },
        { id: "2", time: "11:00", client: "Pedro L.", status: "pending" as const },
      ],
    },
    {
      day: "Mar",
      date: "05/10",
      slots: [
        { id: "3", time: "10:00", client: "María G.", status: "confirmed" as const },
      ],
    },
    {
      day: "Mié",
      date: "06/10",
      slots: [
        { id: "4", time: "14:00", client: "Carlos R.", status: "confirmed" as const },
      ],
    },
    { day: "Jue", date: "07/10", slots: [] },
    { day: "Vie", date: "08/10", slots: [] },
    { day: "Sáb", date: "09/10", slots: [] },
    { day: "Dom", date: "10/10", slots: [] },
  ];

  return (
    <div className="p-8">
      <WeekCalendar
        therapistName="Dr. María González"
        schedule={mockSchedule}
        onSlotClick={(id) => console.log('Slot clicked:', id)}
      />
    </div>
  );
}
