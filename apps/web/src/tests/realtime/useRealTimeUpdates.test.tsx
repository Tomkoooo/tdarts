import { act, renderHook, waitFor } from '@testing-library/react';

class MockEventSource {
  static instances: MockEventSource[] = [];
  /** Total constructions — reconnect creates a second instance after the first closes. */
  static createCount = 0;
  url: string;
  onopen: ((this: EventSource, ev: Event) => void) | null = null;
  onmessage: ((this: EventSource, ev: MessageEvent) => void) | null = null;
  onerror: ((this: EventSource, ev: Event) => void) | null = null;
  private listeners: Record<string, Set<(ev: MessageEvent) => void>> = {};

  constructor(url: string) {
    this.url = url;
    MockEventSource.createCount += 1;
    MockEventSource.instances.push(this);
    queueMicrotask(() => {
      this.onopen?.call(this as unknown as EventSource, new Event('open'));
    });
  }

  addEventListener(type: string, listener: (ev: MessageEvent) => void) {
    if (!this.listeners[type]) this.listeners[type] = new Set();
    this.listeners[type].add(listener);
  }

  emitEvent(type: string, data: string) {
    const ev = { data } as MessageEvent;
    this.listeners[type]?.forEach((fn) => fn(ev));
  }

  close() {
    MockEventSource.instances = MockEventSource.instances.filter((i) => i !== this);
  }
}

let useRealTimeUpdates: typeof import('@/hooks/useRealTimeUpdates').useRealTimeUpdates;

beforeAll(async () => {
  (globalThis as unknown as { EventSource: typeof MockEventSource }).EventSource = MockEventSource as unknown as typeof EventSource;
  ({ useRealTimeUpdates } = await import('@/hooks/useRealTimeUpdates'));
});

beforeEach(() => {
  MockEventSource.instances = [];
  MockEventSource.createCount = 0;
  jest.useRealTimers();
});

describe('useRealTimeUpdates', () => {
  it('queues tournament-update and bumps sseTick', async () => {
    const { result } = renderHook(() => useRealTimeUpdates({ tournamentId: 'T1', maxSessionAgeMs: 120_000 }));

    await waitFor(() => expect(result.current.isConnected).toBe(true));
    const es = MockEventSource.instances[MockEventSource.instances.length - 1];
    expect(es.url).toContain('tournamentId=T1');

    const payload = {
      schemaVersion: 1,
      kind: 'delta',
      tournamentId: 'T1',
      scope: 'tournament',
      action: 'updated',
      data: {},
      emittedAt: new Date().toISOString(),
    };

    act(() => {
      es.emitEvent('tournament-update', JSON.stringify(payload));
    });

    expect(result.current.sseTick).toBe(1);
    const drained = result.current.drainPendingSseEvents();
    expect(drained).toHaveLength(1);
    expect(drained[0].type).toBe('tournament-update');
    expect(drained[0].delta?.action).toBe('updated');
  });

  it('derives delta from legacy match-update payload', async () => {
    const { result } = renderHook(() => useRealTimeUpdates({ tournamentId: 'T2', maxSessionAgeMs: 120_000 }));
    await waitFor(() => expect(result.current.isConnected).toBe(true));
    const es = MockEventSource.instances[MockEventSource.instances.length - 1];

    act(() => {
      es.emitEvent(
        'match-update',
        JSON.stringify({ tournamentId: 'T2', type: 'started', matchId: 'm1' }),
      );
    });

    const drained = result.current.drainPendingSseEvents();
    expect(drained[0].delta?.action).toBe('started');
    expect(drained[0].delta?.scope).toBe('match');
  });

  it('ignores malformed JSON on typed events without throwing', async () => {
    const err = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useRealTimeUpdates({ tournamentId: 'T3', maxSessionAgeMs: 120_000 }));
    await waitFor(() => expect(result.current.isConnected).toBe(true));
    const es = MockEventSource.instances[MockEventSource.instances.length - 1];
    const tickBefore = result.current.sseTick;

    act(() => {
      es.emitEvent('tournament-update', 'not-json');
    });

    expect(result.current.sseTick).toBe(tickBefore);
    expect(result.current.drainPendingSseEvents()).toHaveLength(0);
    err.mockRestore();
  });

  it('schedules reconnect after onerror using backoff timers', async () => {
    const { result } = renderHook(() => useRealTimeUpdates({ tournamentId: 'T4', maxSessionAgeMs: 120_000 }));

    await waitFor(() => expect(result.current.isConnected).toBe(true));
    const first = MockEventSource.instances[MockEventSource.instances.length - 1];
    expect(MockEventSource.createCount).toBe(1);

    const errLog = jest.spyOn(console, 'error').mockImplementation(() => {});

    jest.useFakeTimers({ advanceTimers: true });

    act(() => {
      first.onerror?.call(first as unknown as EventSource, new Event('error'));
    });

    expect(result.current.isConnected).toBe(false);

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(MockEventSource.createCount).toBeGreaterThanOrEqual(2);
    errLog.mockRestore();
    jest.useRealTimers();
  });

  it('does not connect when enabled is false', () => {
    renderHook(() => useRealTimeUpdates({ enabled: false, tournamentId: 'TX', maxSessionAgeMs: 120_000 }));
    expect(MockEventSource.instances).toHaveLength(0);
  });
});
