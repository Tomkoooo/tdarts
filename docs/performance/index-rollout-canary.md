# Index Canary Rollout (Backward-Compatible)

These steps are safe for existing production tournaments and players because all changes are additive.

## Recommended rollout order

1. Low-risk read indexes
2. Player-stat match indexes
3. Multikey tournament-player index (last)

## Hidden-index canary flow

Use hidden indexes first so they are built but not chosen by planner until unhidden.

```javascript
// Example: create hidden index
db.matches.createIndex(
  { tournamentRef: 1, status: 1, createdAt: 1 },
  { name: "matches_tournament_status_createdAt_asc", hidden: true }
);

// Evaluate with hint
db.matches.find(
  { tournamentRef: ObjectId("..."), status: { $in: ["pending", "ongoing"] } },
  { _id: 1, status: 1, boardReference: 1 }
).sort({ createdAt: 1 }).limit(120).hint("matches_tournament_status_createdAt_asc").explain("executionStats");

// Unhide after validation
db.matches.unhideIndex("matches_tournament_status_createdAt_asc");
```

## Rollback if regression appears

```javascript
// Fast rollback without dropping
db.matches.hideIndex("matches_tournament_status_createdAt_asc");

// Optional hard rollback after observation window
db.matches.dropIndex("matches_tournament_status_createdAt_asc");
```

## Required checks before and after

- `docsExamined` and `keysExamined` for hot queries
- request p95/p99 for `/en`, `/en/home`, board/live
- write latency impact during lifecycle mutations
- timeout counters (`errors.ETIMEDOUT`) trend
