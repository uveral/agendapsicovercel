const MINUTES_PER_DAY = 24 * 60;

export function minutesToTime(totalMinutes: number): string {
  const normalized = ((totalMinutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export function addMinutesToTime(time: string, minutesToAdd: number): string {
  const [hoursPart = '0', minutesPart = '0'] = time.split(':');
  const hours = Number.parseInt(hoursPart, 10);
  const minutes = Number.parseInt(minutesPart, 10);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return time;
  }

  const totalMinutes = hours * 60 + minutes + minutesToAdd;
  const normalized = ((totalMinutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const nextHours = Math.floor(normalized / 60);
  const nextMinutes = normalized % 60;

  return `${nextHours.toString().padStart(2, '0')}:${nextMinutes
    .toString()
    .padStart(2, '0')}`;
}

function clampMinutes(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (value < 0) {
    return 0;
  }

  if (value >= MINUTES_PER_DAY) {
    return MINUTES_PER_DAY - 1;
  }

  return Math.floor(value);
}

export function parseTimeToMinutes(value: unknown, fallbackMinutes: number): number {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const match = trimmed.match(/^(\d{1,2})(?::(\d{1,2}))?$/);

    if (match) {
      const hours = Number.parseInt(match[1] ?? '0', 10);
      const minutes = Number.parseInt(match[2] ?? '0', 10);

      if (Number.isFinite(hours) && Number.isFinite(minutes)) {
        const normalizedHours = Math.min(Math.max(hours, 0), 23);
        const normalizedMinutes = Math.min(Math.max(minutes, 0), 59);
        return normalizedHours * 60 + normalizedMinutes;
      }
    }
  }

  return clampMinutes(fallbackMinutes);
}

export interface CenterHourBounds {
  appointmentOpeningHour: number;
  appointmentClosingExclusive: number;
  workOpeningHour: number;
  workClosingExclusive: number;
}

export interface ScheduleHourConfig {
  appointmentOpensAt: string;
  appointmentClosesAt: string;
  workOpensAt: string;
  workClosesAt: string;
}

export function normalizeScheduleConfig(config: ScheduleHourConfig): ScheduleHourConfig {
  const defaultOpeningMinutes = clampMinutes(9 * 60);
  const defaultClosingMinutes = clampMinutes(21 * 60);

  const workOpenMinutes = clampMinutes(
    parseTimeToMinutes(config.workOpensAt, defaultOpeningMinutes),
  );
  const rawWorkCloseMinutes = clampMinutes(
    parseTimeToMinutes(config.workClosesAt, defaultClosingMinutes),
  );
  const workCloseMinutes = Math.max(workOpenMinutes + 60, rawWorkCloseMinutes);

  const rawAppointmentOpenMinutes = clampMinutes(
    parseTimeToMinutes(config.appointmentOpensAt, workOpenMinutes),
  );
  const rawAppointmentCloseMinutes = clampMinutes(
    parseTimeToMinutes(config.appointmentClosesAt, Math.max(workOpenMinutes + 60, workCloseMinutes - 60)),
  );

  let appointmentOpenMinutes = Math.max(workOpenMinutes, rawAppointmentOpenMinutes);
  let appointmentCloseMinutes = Math.max(appointmentOpenMinutes + 60, rawAppointmentCloseMinutes);

  const appointmentCloseLimit = workCloseMinutes - 60;

  if (appointmentCloseLimit >= appointmentOpenMinutes + 60) {
    appointmentCloseMinutes = Math.min(appointmentCloseMinutes, appointmentCloseLimit);
  } else {
    appointmentCloseMinutes = Math.min(appointmentCloseMinutes, workCloseMinutes);
  }

  if (appointmentCloseMinutes < appointmentOpenMinutes + 60) {
    appointmentCloseMinutes = Math.min(workCloseMinutes, appointmentOpenMinutes + 60);
  }

  appointmentOpenMinutes = Math.min(
    appointmentOpenMinutes,
    Math.max(workOpenMinutes, appointmentCloseMinutes - 60),
  );

  return {
    workOpensAt: minutesToTime(workOpenMinutes),
    workClosesAt: minutesToTime(workCloseMinutes),
    appointmentOpensAt: minutesToTime(appointmentOpenMinutes),
    appointmentClosesAt: minutesToTime(appointmentCloseMinutes),
  };
}

export function deriveCenterHourBounds(config: ScheduleHourConfig): CenterHourBounds {
  const normalized = normalizeScheduleConfig(config);

  const workOpenMinutes = parseTimeToMinutes(normalized.workOpensAt, 9 * 60);
  const workCloseMinutes = parseTimeToMinutes(normalized.workClosesAt, 21 * 60);
  const appointmentOpenMinutes = parseTimeToMinutes(normalized.appointmentOpensAt, workOpenMinutes);
  const appointmentCloseMinutes = parseTimeToMinutes(
    normalized.appointmentClosesAt,
    Math.max(appointmentOpenMinutes + 60, workCloseMinutes - 60),
  );

  const workOpeningHour = Math.max(0, Math.min(23, Math.floor(workOpenMinutes / 60)));
  const workClosingExclusive = Math.min(24, Math.max(workOpeningHour + 1, Math.ceil(workCloseMinutes / 60)));

  const appointmentOpeningHour = Math.max(
    workOpeningHour,
    Math.min(23, Math.floor(appointmentOpenMinutes / 60)),
  );
  const appointmentClosingExclusive = Math.min(
    workClosingExclusive,
    Math.max(appointmentOpeningHour + 1, Math.ceil(appointmentCloseMinutes / 60)),
  );

  return {
    appointmentOpeningHour,
    appointmentClosingExclusive,
    workOpeningHour,
    workClosingExclusive,
  };
}

export interface DayOption {
  name: string;
  value: number;
}

export function buildDayOptions(openOnSaturday: boolean, openOnSunday: boolean): DayOption[] {
  return [
    { name: 'Lun', value: 1 },
    { name: 'Mar', value: 2 },
    { name: 'Mié', value: 3 },
    { name: 'Jue', value: 4 },
    { name: 'Vie', value: 5 },
    { name: 'Sáb', value: 6 },
    { name: 'Dom', value: 0 },
  ].filter((day) => {
    if (day.value === 6) {
      return openOnSaturday;
    }

    if (day.value === 0) {
      return openOnSunday;
    }

    return true;
  });
}

export function buildHourRange(startHour: number, exclusiveEndHour: number): number[] {
  const safeStart = Math.max(0, Math.min(23, Math.floor(startHour)));
  const safeEnd = Math.max(safeStart + 1, Math.min(24, Math.floor(exclusiveEndHour)));
  const result: number[] = [];

  for (let hour = safeStart; hour < safeEnd; hour++) {
    result.push(hour);
  }

  return result;
}
