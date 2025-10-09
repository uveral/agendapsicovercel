export function toCamelCase<T = unknown>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase) as T;
  }

  if (obj !== null && typeof obj === 'object') {
    const record = obj as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    Object.keys(record).forEach((key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = toCamelCase(record[key]);
    });

    return result as T;
  }

  return obj;
}

export function toSnakeCase<T = unknown>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(toSnakeCase) as T;
  }

  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const record = obj as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    Object.keys(record).forEach((key) => {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      result[snakeKey] = toSnakeCase(record[key]);
    });

    return result as T;
  }

  return obj;
}
