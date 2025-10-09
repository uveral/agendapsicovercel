export function addMinutesToTime(time: string, minutesToAdd: number): string {
  const [hoursPart = '0', minutesPart = '0'] = time.split(':');
  const hours = Number.parseInt(hoursPart, 10);
  const minutes = Number.parseInt(minutesPart, 10);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return time;
  }

  const totalMinutes = hours * 60 + minutes + minutesToAdd;
  const minutesInDay = 24 * 60;
  const normalized = ((totalMinutes % minutesInDay) + minutesInDay) % minutesInDay;
  const nextHours = Math.floor(normalized / 60);
  const nextMinutes = normalized % 60;

  return `${nextHours.toString().padStart(2, '0')}:${nextMinutes
    .toString()
    .padStart(2, '0')}`;
}
