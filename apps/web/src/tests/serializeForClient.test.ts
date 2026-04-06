import mongoose from 'mongoose';
import { serializeForClient } from '@/shared/lib/serializeForClient';

describe('serializeForClient', () => {
  it('converts ObjectId and Date recursively', () => {
    const objectId = new mongoose.Types.ObjectId('5f43a1c0b7e4a7b7a8c8d8e0');
    const now = new Date('2026-03-15T10:20:30.000Z');

    const result = serializeForClient({
      _id: objectId,
      createdAt: now,
      nested: [{ playerId: objectId }],
    }) as {
      _id: string;
      createdAt: string;
      nested: Array<{ playerId: string }>;
    };

    expect(result._id).toBe(objectId.toString());
    expect(result.createdAt).toBe(now.toISOString());
    expect(result.nested[0].playerId).toBe(objectId.toString());
  });

  it('serializes mongoose-like docs through toObject', () => {
    const doc = {
      toObject: () => ({
        _id: new mongoose.Types.ObjectId('5f43a1c0b7e4a7b7a8c8d8e1'),
        when: new Date('2026-03-15T00:00:00.000Z'),
      }),
    };

    const result = serializeForClient(doc) as { _id: string; when: string };
    expect(result._id).toBe('5f43a1c0b7e4a7b7a8c8d8e1');
    expect(result.when).toBe('2026-03-15T00:00:00.000Z');
  });

  it('keeps duplicated shared object references fully serialized', () => {
    const shared = {
      _id: new mongoose.Types.ObjectId('5f43a1c0b7e4a7b7a8c8d8e2'),
      name: 'Shared Player',
    };
    const result = serializeForClient({
      left: shared,
      right: shared,
    }) as {
      left: { _id: string; name: string };
      right: { _id: string; name: string };
    };

    expect(result.left._id).toBe('5f43a1c0b7e4a7b7a8c8d8e2');
    expect(result.right._id).toBe('5f43a1c0b7e4a7b7a8c8d8e2');
    expect(result.left.name).toBe('Shared Player');
    expect(result.right.name).toBe('Shared Player');
  });

  it('still marks true cycles as circular', () => {
    const cyclic: { self?: unknown; value: string } = { value: 'root' };
    cyclic.self = cyclic;
    const result = serializeForClient(cyclic) as { self: string; value: string };
    expect(result.value).toBe('root');
    expect(result.self).toBe('[Circular]');
  });
});
