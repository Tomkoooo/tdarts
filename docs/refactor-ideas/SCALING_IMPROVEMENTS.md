# Scaling and Production Readiness Improvements

## Critical Infrastructure Improvements Required for Horizontal Scaling

### C-3: Redis Event Bus Migration (CRITICAL for horizontal scaling)

**Current Status**: In-memory EventEmitter blocks horizontal scaling
**Priority**: CRITICAL for multi-instance deployments
**Impact**: Without this fix, SSE clients on different instances won't receive events from other instances

#### Why This Is Critical

The current implementation uses an in-memory `EventEmitter` singleton in `/src/lib/events.ts`. This works perfectly for single-instance deployments but breaks completely when running multiple instances (horizontal scaling):

- Events published from Instance A are only received by SSE clients connected to Instance A
- SSE clients on Instance B never receive events from Instance A
- This causes inconsistent real-time state across users
- Tournament updates, match finishes, and live scores become unreliable

#### Implementation Plan

**Step 1: Add Redis Dependencies**
```bash
npm install ioredis
npm install --save-dev @types/ioredis
```

**Step 2: Create Redis Pub/Sub Adapter**

Create `/src/lib/redis-events.ts`:

```typescript
import Redis from 'ioredis';
import { EventEmitter } from 'events';

const BUS_IMPLEMENTATION = process.env.EVENTS_BUS_IMPLEMENTATION ?? 'inproc';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

interface EventsBus {
  publish(event: string, data: any): void;
  subscribe(event: string, handler: (data: any) => void): void;
  unsubscribe(event: string, handler: (data: any) => void): void;
}

class InMemoryEventsBus implements EventsBus {
  private emitter = new EventEmitter();

  publish(event: string, data: any): void {
    this.emitter.emit(event, data);
  }

  subscribe(event: string, handler: (data: any) => void): void {
    this.emitter.on(event, handler);
  }

  unsubscribe(event: string, handler: (data: any) => void): void {
    this.emitter.off(event, handler);
  }
}

class RedisEventsBus implements EventsBus {
  private pub: Redis;
  private sub: Redis;
  private handlers = new Map<string, Set<(data: any) => void>>();

  constructor() {
    this.pub = new Redis(REDIS_URL);
    this.sub = new Redis(REDIS_URL);

    this.sub.on('message', (channel, message) => {
      const handlers = this.handlers.get(channel);
      if (handlers) {
        try {
          const data = JSON.parse(message);
          handlers.forEach(handler => handler(data));
        } catch (error) {
          console.error(`Failed to parse Redis message on channel ${channel}:`, error);
        }
      }
    });
  }

  publish(event: string, data: any): void {
    const message = JSON.stringify(data);
    this.pub.publish(event, message).catch(error => {
      console.error(`Failed to publish to Redis channel ${event}:`, error);
    });
  }

  subscribe(event: string, handler: (data: any) => void): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
      this.sub.subscribe(event);
    }
    this.handlers.get(event)!.add(handler);
  }

  unsubscribe(event: string, handler: (data: any) => void): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(event);
        this.sub.unsubscribe(event);
      }
    }
  }
}

export const eventsBus: EventsBus =
  BUS_IMPLEMENTATION === 'redis'
    ? new RedisEventsBus()
    : new InMemoryEventsBus();

// Event constants remain the same
export const EVENTS = {
  MATCH_UPDATE: 'match:update',
  TOURNAMENT_UPDATE: 'tournament:update',
  BOARD_UPDATE: 'board:update',
  // ... other events
};
```

**Step 3: Update Environment Variables**

Add to `.env.production`:
```env
EVENTS_BUS_IMPLEMENTATION=redis
REDIS_URL=redis://your-redis-instance:6379
```

Keep `.env.local` as `inproc` for development:
```env
EVENTS_BUS_IMPLEMENTATION=inproc
```

**Step 4: Deployment Configuration**

For production deployments with multiple instances:
1. Set up a Redis instance (AWS ElastiCache, Redis Cloud, or self-hosted)
2. Configure `REDIS_URL` to point to your Redis instance
3. Set `EVENTS_BUS_IMPLEMENTATION=redis`
4. Deploy multiple app instances - they will now share events via Redis

**Step 5: Testing**

Test the Redis adapter:
1. Start Redis locally: `docker run -p 6379:6379 redis:alpine`
2. Set environment variables and start multiple instances
3. Verify events are received across all instances
4. Monitor Redis pub/sub: `redis-cli monitor`

#### Rollout Strategy

**Phase 1**: Development Testing (Week 1)
- Implement Redis adapter with feature flag
- Test with local Redis instance
- Verify SSE events work across instances

**Phase 2**: Staging Deployment (Week 2)
- Deploy to staging with Redis enabled
- Run load tests with 2-3 instances
- Monitor Redis performance metrics

**Phase 3**: Production Rollout (Week 3)
- Deploy Redis infrastructure
- Enable Redis event bus for all instances
- Monitor for 24-48 hours
- Verify no event loss or duplicates

#### Performance Considerations

- **Redis Throughput**: Redis can handle 100k+ pub/sub messages per second
- **Latency**: Network RTT + ~1ms Redis overhead (typically <5ms total)
- **Memory**: Minimal - pub/sub doesn't persist messages
- **Connection Pooling**: One pub + one sub connection per instance

#### Monitoring & Observability

Add metrics for:
- Event publish rate per channel
- Redis connection health
- Event delivery latency
- Failed publish attempts

---

### C-4: LRU Cache for Authorization Service (CRITICAL - Memory Leak)

**Current Status**: Unbounded Map with basic size check
**Priority**: CRITICAL - Prevents memory leak
**Impact**: Current implementation will leak 50-100MB over 24h at 500 users

#### Current Implementation Issues

File: `/src/database/services/authorization.service.ts:12-35`

The `roleCache` uses a basic Map with only size-based cleanup:
- No LRU eviction strategy
- No max memory bounds
- Cleanup only happens during writes, not reads
- Can grow unbounded with high user traffic

#### Recommended Implementation

**Option 1: Use lru-cache package** (Recommended)

```bash
npm install lru-cache
```

Update `/src/database/services/authorization.service.ts`:

```typescript
import LRU from 'lru-cache';

type ClubRole = 'admin' | 'moderator' | 'member' | 'none';

const roleCache = new LRU<string, ClubRole>({
  max: 5000, // Maximum 5000 entries
  ttl: 10_000, // 10 seconds TTL
  updateAgeOnGet: false, // Don't extend TTL on access
  updateAgeOnHas: false,
});

// Remove manual cache management functions
// LRU cache handles eviction automatically

async function resolveClubRole(userId: string, clubId: string): Promise<ClubRole> {
  const key = `${userId}:${clubId}`;
  const cached = roleCache.get(key);
  if (cached !== undefined) return cached;

  await connectMongo();

  // ... existing role resolution logic ...

  roleCache.set(key, role);
  return role;
}
```

**Option 2: Use @isaacs/ttlcache** (Alternative)

```bash
npm install @isaacs/ttlcache
```

This is a lighter alternative with similar features.

#### Benefits

1. **Memory Bounded**: Hard cap at 5000 entries (~1MB memory)
2. **Automatic Eviction**: LRU algorithm evicts least-recently-used entries
3. **TTL Support**: Entries expire after 10 seconds
4. **Thread Safe**: Handles concurrent access correctly
5. **Performance**: O(1) get/set operations

---

### C-2: MongoDB Transactions for Race Conditions (CRITICAL - Data Integrity)

**Current Status**: Atomic individual operations, but multi-step workflows are not transactional
**Priority**: CRITICAL - Prevents data corruption
**Impact**: Race conditions in knockout tournaments can cause duplicate player assignments and corrupted brackets

#### Affected Operations

1. **autoAdvanceKnockoutWinner** (`tournament.service.ts:989-1108`)
   - Reads tournament
   - Updates match
   - Updates tournament
   - Assigns board
   - Multiple DB operations without transaction

2. **finishLeg** (`match.service.ts:219-449`)
   - Uses atomic `findOneAndUpdate` (GOOD)
   - But subsequent operations not in transaction

#### Implementation Example

```typescript
import mongoose from 'mongoose';

static async autoAdvanceKnockoutWinner(matchId: string): Promise<void> {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      // All operations within this block are atomic
      const match = await MatchModel.findById(matchId).session(session);
      if (!match) throw new BadRequestError('Match not found');

      const tournament = await TournamentModel.findById(match.tournamentRef).session(session);
      if (!tournament) throw new BadRequestError('Tournament not found');

      // ... all logic here ...

      // All saves use the session
      await tournament.save({ session });
      await nextMatch.save({ session });
    });
  } catch (error) {
    // Transaction automatically rolled back on error
    console.error('Failed to advance knockout winner:', error);
    throw error;
  } finally {
    session.endSession();
  }
}
```

#### Benefits

1. **Atomicity**: All operations succeed or all fail
2. **Consistency**: No partial state updates
3. **Race Condition Protection**: Prevents concurrent modifications
4. **Data Integrity**: Guarantees correct bracket state

#### Performance Impact

- Minimal: ~2-5ms overhead per transaction
- Worth it for data correctness
- Only use for multi-step critical operations

---

## Additional Architectural Improvements

### 1. Read Replicas

**When**: After reaching 300+ concurrent users
**Why**: Separate read/write load
**How**:
- Configure MongoDB replica set
- Route read queries to replicas
- Keep writes on primary

### 2. Edge Caching

**When**: For global audience
**Why**: Reduce latency for static data
**How**:
- Cache tournament public data at CDN edge
- Use `Cache-Control` headers
- Invalidate on updates

### 3. Background Job Queue

**When**: Stats recalculation takes >100ms
**Why**: Offload heavy computation
**How**:
- Use BullMQ or similar
- Queue stats recalculations
- Process asynchronously

### 4. Circuit Breaker

**When**: Before production launch
**Why**: Protect against cascading failures
**How**:
- Use Opossum or similar
- Wrap DB calls and external APIs
- Fail fast on repeated errors

### 5. Graceful Shutdown

**When**: Before production launch
**Why**: Zero-downtime deployments
**How**:
```typescript
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, starting graceful shutdown');

  // Stop accepting new connections
  await server.close();

  // Close SSE connections gracefully
  // Close DB connections
  await mongoose.connection.close();

  process.exit(0);
});
```

### 6. Distributed Rate Limiting

**When**: To prevent abuse
**Why**: Protect against DoS
**How**:
- Use Redis-based rate limiter
- Apply to SSE connections, auth endpoints
- Configure per-IP and per-user limits

### 7. APM Integration

**When**: Production launch
**Why**: Deep performance insights
**How**:
- Integrate DataDog, New Relic, or Sentry
- Track transaction traces
- Set up alerts for anomalies

---

## Environment Variables Checklist

### Required for Horizontal Scaling
```env
# Redis Event Bus
EVENTS_BUS_IMPLEMENTATION=redis
REDIS_URL=redis://host:6379

# MongoDB
MONGODB_URI=mongodb://host:27017/tdarts
MONGODB_POOL_SIZE=75

# Security
NODE_ENV=production
LOAD_TEST_MODE=false

# Socket
SOCKET_JWT_SECRET=<secret>
```

### Optional but Recommended
```env
# Monitoring
SENTRY_DSN=<your-sentry-dsn>
DD_API_KEY=<your-datadog-key>

# Feature Flags
FF_ENABLE_CIRCUIT_BREAKER=true
FF_ENABLE_RATE_LIMITING=true
```

---

## Deployment Checklist

Before deploying to production with >100 concurrent users:

- [ ] Implement Redis event bus (C-3)
- [ ] Replace roleCache with LRU cache (C-4)
- [ ] Add MongoDB transactions to critical operations (C-2)
- [ ] Set up Redis infrastructure
- [ ] Configure environment variables
- [ ] Test with load testing tool (Artillery)
- [ ] Monitor Redis pub/sub metrics
- [ ] Set up alerting for memory/CPU
- [ ] Configure graceful shutdown
- [ ] Document rollback procedures

---

## Estimated Timeline

- **Critical Fixes (C-1, C-2, C-4, H-2, H-6)**: 1-2 days
- **Redis Event Bus (C-3)**: 2-3 days
- **Testing & Validation**: 2-3 days
- **Production Deployment**: 1 day
- **Total**: ~1-2 weeks

---

## Support & Questions

For questions about implementing these improvements:
1. Review the code audit report
2. Check MongoDB documentation for transactions
3. See Redis pub/sub documentation
4. Consult with DevOps for infrastructure setup
