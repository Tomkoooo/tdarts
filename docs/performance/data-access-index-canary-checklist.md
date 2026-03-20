# Data Access Index Canary Checklist

## Candidate indexes (create hidden first)

```javascript
db.players.createIndex(
  { "stats.oacMmr": -1, name: 1 },
  { name: "players_oac_rank", hidden: true }
);

db.players.createIndex(
  { country: 1, "stats.oacMmr": -1, name: 1 },
  { name: "players_country_oac_rank", hidden: true }
);

db.matches.createIndex(
  { status: 1, "player1.playerId": 1, createdAt: -1 },
  { name: "matches_status_p1_createdAt_desc", hidden: true }
);

db.matches.createIndex(
  { status: 1, "player2.playerId": 1, createdAt: -1 },
  { name: "matches_status_p2_createdAt_desc", hidden: true }
);

db.matches.createIndex(
  { manualOverride: 1, overrideTimestamp: -1 },
  { name: "matches_manualOverride_overrideTimestamp_desc", hidden: true }
);

db.leagues.createIndex(
  { verified: 1, isActive: 1, createdAt: -1 },
  { name: "leagues_verified_active_createdAt_desc", hidden: true }
);

db.clubs.createIndex(
  { verified: 1, isActive: 1, createdAt: -1 },
  { name: "clubs_verified_active_createdAt_desc", hidden: true }
);
```

## Verify with `hint()` + `explain("executionStats")`

```javascript
db.players.find({ "tournamentHistory.isVerified": true })
  .sort({ "stats.oacMmr": -1, name: 1 })
  .limit(50)
  .hint("players_oac_rank")
  .explain("executionStats");

db.matches.find({ status: "finished", "player1.playerId": ObjectId("000000000000000000000000") })
  .sort({ createdAt: -1 })
  .limit(100)
  .hint("matches_status_p1_createdAt_desc")
  .explain("executionStats");
```

## Canary unhide sequence

1. Unhide one index.
2. Monitor request latency p95/p99 and DB write latency for 24h.
3. Keep only if no regression and explain-plan is improved.
4. Repeat with next index.

## Fast rollback

```javascript
db.players.hideIndex("players_oac_rank");
db.matches.hideIndex("matches_status_p1_createdAt_desc");
```
