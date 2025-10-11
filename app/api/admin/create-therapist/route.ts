import { NextResponse } from 'next/server';

import { createTherapistAccount } from '@/lib/accounts';

function toSnakeCase<T = unknown>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(item => toSnakeCase(item)) as T;
  }
  if (typeof value === 'object' && !(value instanceof Date)) {
    return Object.entries(value as Record<string, unknown>).reduce(
      (acc, [key, val]) => {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        acc[snakeKey] = toSnakeCase(val);
        return acc;
      },
      {} as Record<string, unknown>,
    ) as T;
  }
  return value;
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const result = await createTherapistAccount(toSnakeCase(payload));
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create therapist';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
