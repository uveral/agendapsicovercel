const MINUTES_PER_DAY = 24 * 60;

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
  openingHour: number;
  clientClosingExclusive: number;
  therapistClosingExclusive: number;
  centerClosingExclusive: number;
}

export function deriveCenterHourBounds(
  centerOpensAt: string,
  centerClosesAt: string,
  options?: {
    defaultOpeningHour?: number;
    defaultClosingHour?: number;
    therapistExtraHours?: number;
  },
): CenterHourBounds {
  const defaultOpeningMinutes = clampMinutes((options?.defaultOpeningHour ?? 9) * 60);
  const defaultClosingMinutes = clampMinutes((options?.defaultClosingHour ?? 21) * 60);
  const therapistExtraHours = options?.therapistExtraHours ?? 1;
  const minimumSpan = 60; // Require at least one working hour

  const openingMinutes = clampMinutes(parseTimeToMinutes(centerOpensAt, defaultOpeningMinutes));
  const rawClosingMinutes = clampMinutes(parseTimeToMinutes(centerClosesAt, defaultClosingMinutes));
  const ensuredClosingMinutes = Math.max(openingMinutes + minimumSpan, rawClosingMinutes);

  const openingHour = Math.max(0, Math.min(23, Math.floor(openingMinutes / 60)));
  const centerClosingExclusive = Math.min(
    24,
    Math.max(openingHour + 1, Math.ceil(ensuredClosingMinutes / 60)),
  );

  const bufferedClosingMinutes = Math.max(openingMinutes + minimumSpan, ensuredClosingMinutes - 60);
  const bufferedClosingHour = Math.floor(bufferedClosingMinutes / 60);

  const clientClosingExclusive = Math.min(
    centerClosingExclusive,
    Math.max(openingHour + 1, bufferedClosingHour + 1),
  );

  const therapistClosingExclusive = Math.min(
    24,
    Math.max(centerClosingExclusive, clientClosingExclusive + therapistExtraHours),
  );

  return {
    openingHour,
    clientClosingExclusive,
    therapistClosingExclusive,
    centerClosingExclusive,
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
