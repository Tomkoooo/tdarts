type Serializable =
  | null
  | string
  | number
  | boolean
  | Serializable[]
  | { [key: string]: Serializable };

function isObjectIdLike(value: unknown): value is { toString: () => string } {
  if (!value || typeof value !== 'object') return false;
  const maybe = value as { _bsontype?: string; constructor?: { name?: string }; toString?: () => string };
  return (
    typeof maybe.toString === 'function' &&
    (maybe._bsontype === 'ObjectID' || maybe._bsontype === 'ObjectId' || maybe.constructor?.name === 'ObjectId')
  );
}

export function serializeForClient<T>(value: T): T {
  const seen = new WeakSet<object>();

  const walk = (input: unknown): Serializable => {
    if (input === null || input === undefined) return null;
    if (typeof input === 'string' || typeof input === 'number' || typeof input === 'boolean') return input;
    if (typeof input === 'bigint') return input.toString();
    if (input instanceof Date) return input.toISOString();

    if (Array.isArray(input)) {
      return input.map((item) => walk(item));
    }

    if (typeof input !== 'object') {
      return String(input);
    }

    if (isObjectIdLike(input)) {
      return input.toString();
    }

    const obj = input as {
      toObject?: () => unknown;
      entries?: () => Iterable<[unknown, unknown]>;
      constructor?: { name?: string };
      [key: string]: unknown;
    };

    if (typeof obj.toObject === 'function') {
      return walk(obj.toObject());
    }

    if (obj.constructor?.name === 'Map' && typeof obj.entries === 'function') {
      const mapped: Record<string, Serializable> = {};
      for (const [key, val] of obj.entries()) {
        mapped[String(key)] = walk(val);
      }
      return mapped;
    }

    if (seen.has(input as object)) {
      return '[Circular]';
    }
    seen.add(input as object);

    const out: Record<string, Serializable> = {};
    for (const [key, val] of Object.entries(obj)) {
      out[key] = walk(val);
    }
    return out;
  };

  return walk(value) as T;
}
