import type { Appointment, TherapistWorkingHours } from '@shared/schema';

type WeeklyStats = {
  availability: number;
  occupancy: number;
};

function parseTimeToMinutes(time: string | null | undefined): number | null {
  if (!time) {
    return null;
  }

  const [hourPart = '0', minutePart = '0'] = time.split(':');
  const hours = Number.parseInt(hourPart, 10);
  const minutes = Number.parseInt(minutePart, 10);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

export function calculateWeeklyStats(
  appointments: Appointment[],
  schedule: TherapistWorkingHours[],
  referenceDate: Date = new Date(),
): WeeklyStats {
  let availableMinutes = 0;

  for (const block of schedule) {
    const start = parseTimeToMinutes(block.startTime);
    const end = parseTimeToMinutes(block.endTime);

    if (start === null || end === null || end <= start) {
      continue;
    }

    availableMinutes += end - start;
  }

  if (availableMinutes <= 0) {
    return { availability: 0, occupancy: 0 };
  }

  const dayOfWeek = referenceDate.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(referenceDate);
  weekStart.setDate(referenceDate.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const thisWeekAppointments = appointments.filter((apt) => {
    if (apt.status === 'cancelled') {
      return false;
    }

    const aptDate = new Date(apt.date);
    return aptDate >= weekStart && aptDate <= weekEnd;
  });

  const appointmentMinutes = thisWeekAppointments.reduce((total, apt) => {
    if (apt.durationMinutes && apt.durationMinutes > 0) {
      return total + apt.durationMinutes;
    }

    const start = parseTimeToMinutes(apt.startTime ?? null);
    const end = parseTimeToMinutes(apt.endTime ?? null);

    if (start !== null && end !== null && end > start) {
      return total + (end - start);
    }

    return total + 60;
  }, 0);

  const occupancyPercentage = Math.min(
    100,
    Math.max(0, Math.round((appointmentMinutes / availableMinutes) * 100)),
  );
  const availabilityPercentage = Math.max(0, Math.min(100, 100 - occupancyPercentage));

  return {
    availability: availabilityPercentage,
    occupancy: occupancyPercentage,
  };
}

export type { WeeklyStats };
