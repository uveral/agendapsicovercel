import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calculateWeeklyStats } from '../lib/therapist-stats';

describe('calculateWeeklyStats', () => {
  const schedule = [
    { dayOfWeek: 1, startTime: '09:00', endTime: '13:00' },
    { dayOfWeek: 3, startTime: '15:00', endTime: '19:00' },
  ] as unknown as Parameters<typeof calculateWeeklyStats>[1];

  const referenceDate = new Date('2025-01-06T10:00:00Z');

  it('returns zero availability and occupancy when schedule is empty', () => {
    const result = calculateWeeklyStats([], [], referenceDate);
    assert.deepEqual(result, { availability: 0, occupancy: 0 });
  });

  it('ignores cancelled appointments and respects duration minutes', () => {
    const appointments = [
      {
        id: 'a',
        date: '2025-01-07',
        startTime: '09:00',
        endTime: '10:00',
        status: 'confirmed',
        durationMinutes: 50,
      },
      {
        id: 'b',
        date: '2025-01-08',
        startTime: '15:00',
        endTime: '16:00',
        status: 'cancelled',
      },
    ] as unknown as Parameters<typeof calculateWeeklyStats>[0];

    const result = calculateWeeklyStats(appointments, schedule, referenceDate);
    const expectedOccupancy = Math.round((50 / 480) * 100);
    assert.equal(result.occupancy, expectedOccupancy);
    assert.equal(result.availability, 100 - expectedOccupancy);
  });

  it('falls back to hour difference when duration is missing', () => {
    const appointments = [
      {
        id: 'c',
        date: '2025-01-06',
        startTime: '09:00',
        endTime: '11:00',
        status: 'confirmed',
      },
    ] as unknown as Parameters<typeof calculateWeeklyStats>[0];

    const result = calculateWeeklyStats(appointments, schedule, referenceDate);
    assert.equal(result.occupancy, 25);
    assert.equal(result.availability, 75);
  });
});
