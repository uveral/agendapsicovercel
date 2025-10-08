import type { TherapistWorkingHours } from "@/lib/types";

const TIME_24H = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const TIME_WITH_SECONDS = /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/;

export const DEFAULT_START_TIME = "09:00";
export const DEFAULT_END_TIME = "10:00";

function toStringOrNull(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  return null;
}

function normalizeDayIndex(value: unknown): number | null {
  const raw = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(raw)) {
    return null;
  }
  // Ensure range 0-6 regardless of incoming values
  const normalized = ((raw % 7) + 7) % 7;
  return normalized;
}

function normalizeTimeValue(value: unknown, fallback: string): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (TIME_24H.test(trimmed)) {
      return trimmed;
    }
    if (TIME_WITH_SECONDS.test(trimmed)) {
      return trimmed.slice(0, 5);
    }

    const parts = trimmed.match(/^(\d{1,2}):(\d{1,2})/);
    if (parts) {
      const hours = Math.min(23, Math.max(0, Number.parseInt(parts[1], 10)));
      const minutes = Math.min(59, Math.max(0, Number.parseInt(parts[2], 10)));
      return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}`;
    }
  }

  return fallback;
}

export interface UiScheduleSlot {
  dayOfWeek: number; // 0-6 (0 = Monday)
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

function normalizeDateValue(value: unknown): string | Date | null {
  if (value instanceof Date) {
    return value;
  }
  const maybeString = toStringOrNull(value);
  return maybeString;
}

export function sanitizeWorkingHoursRecord(
  slot: Record<string, unknown> | TherapistWorkingHours,
): TherapistWorkingHours | null {
  const therapistId =
    toStringOrNull((slot as TherapistWorkingHours).therapistId) ??
    toStringOrNull((slot as Record<string, unknown>).therapist_id);

  const day =
    normalizeDayIndex((slot as TherapistWorkingHours).dayOfWeek) ??
    normalizeDayIndex((slot as Record<string, unknown>).day_of_week);

  if (!therapistId || day === null) {
    return null;
  }

  const startTime = normalizeTimeValue(
    (slot as TherapistWorkingHours).startTime ??
      (slot as Record<string, unknown>).start_time,
    DEFAULT_START_TIME,
  );
  const endTime = normalizeTimeValue(
    (slot as TherapistWorkingHours).endTime ??
      (slot as Record<string, unknown>).end_time,
    DEFAULT_END_TIME,
  );

  const id =
    toStringOrNull((slot as TherapistWorkingHours).id) ??
    toStringOrNull((slot as Record<string, unknown>).id) ??
    `${therapistId}-${day}-${startTime}-${endTime}`;

  return {
    id,
    therapistId,
    dayOfWeek: day,
    startTime,
    endTime,
    createdAt: normalizeDateValue(
      (slot as TherapistWorkingHours).createdAt ??
        (slot as Record<string, unknown>).created_at,
    ),
    updatedAt: normalizeDateValue(
      (slot as TherapistWorkingHours).updatedAt ??
        (slot as Record<string, unknown>).updated_at,
    ),
  };
}

export function sanitizeWorkingHoursCollection(
  slots: unknown,
): TherapistWorkingHours[] {
  if (!Array.isArray(slots)) {
    return [];
  }

  const seenKeys = new Set<string>();
  const sanitized: TherapistWorkingHours[] = [];

  for (const entry of slots) {
    const normalized = sanitizeWorkingHoursRecord(entry as Record<string, unknown>);
    if (!normalized) {
      continue;
    }

    const key = `${normalized.therapistId}-${normalized.dayOfWeek}-${normalized.startTime}-${normalized.endTime}`;
    if (seenKeys.has(key)) {
      continue;
    }
    seenKeys.add(key);
    sanitized.push(normalized);
  }

  return sanitized;
}

export function workingHoursToUiSlots(slots: unknown): UiScheduleSlot[] {
  const normalized = sanitizeWorkingHoursCollection(slots);

  return normalized
    .map((slot) => ({
      dayOfWeek: (slot.dayOfWeek + 6) % 7,
      startTime: slot.startTime,
      endTime: slot.endTime,
    }))
    .sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) {
        return a.dayOfWeek - b.dayOfWeek;
      }
      return a.startTime.localeCompare(b.startTime);
    });
}

export function uiSlotsToPersistable(slots: UiScheduleSlot[]): {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}[] {
  return slots.map((slot) => {
    const safeDay = normalizeDayIndex(slot.dayOfWeek) ?? 0;
    const dbDay = (safeDay + 1) % 7; // Convert 0=Monday UI to 0=Sunday DB

    return {
      dayOfWeek: dbDay,
      startTime: normalizeTimeValue(slot.startTime, DEFAULT_START_TIME),
      endTime: normalizeTimeValue(slot.endTime, DEFAULT_END_TIME),
    };
  });
}
