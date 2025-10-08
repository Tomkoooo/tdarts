# Board Migration Script

## Overview

This migration script moves boards from the `Club` model to the `Tournament` model. This is a breaking change that restructures how boards are stored in the database.

## What Changed

### Before Migration
- Boards were stored in `club.boards[]`
- Each board had a `tournamentId` field to link it to a tournament
- Boards were managed at the club level

### After Migration
- Boards are stored in `tournament.boards[]`
- Boards are directly part of the tournament document
- No more `tournamentId` field needed (boards belong to their tournament)

## Running the Migration

### Prerequisites
1. Backup your database before running the migration
2. Ensure you have Node.js and TypeScript installed
3. Make sure your MongoDB connection is configured

### Steps

1. **Backup your database:**
```bash
mongodump --uri="your_mongodb_connection_string" --out=./backup
```

2. **Run the migration script:**
```bash
npx ts-node scripts/migrate-boards-to-tournaments.ts
```

3. **Verify the migration:**
   - Check the console output for migration statistics
   - Verify that tournaments now have boards in `tournament.boards`
   - Check for any errors in the migration log

## What the Script Does

1. **Finds all clubs** with boards
2. **Groups boards by tournamentId** 
3. **For each tournament:**
   - Finds the tournament document
   - Migrates boards from `club.boards` to `tournament.boards`
   - Renumbers boards starting from 1
   - Updates `tournamentSettings.boardCount`
   - Preserves board status, currentMatch, nextMatch, etc.

4. **Reports statistics:**
   - Number of clubs processed
   - Number of tournaments updated
   - Total boards migrated
   - Any errors encountered

## Migration Output Example

```
🚀 Starting board migration from clubs to tournaments...

✅ Connected to MongoDB

📊 Found 5 clubs to process

🏢 Processing club: Budapest Darts Club (507f1f77bcf86cd799439011)
   📋 Found 4 boards in club
   🎯 Found boards for 2 tournaments

   🏆 Migrating 2 boards to tournament: ABC1
   ✅ Successfully migrated 2 boards to tournament ABC1
      Board numbers: 1, 2

============================================================
📊 MIGRATION SUMMARY
============================================================
Clubs processed:       5
Tournaments updated:   8
Boards migrated:       24
Errors:                0
============================================================

✅ Migration completed successfully!
```

## Post-Migration Steps

1. **Test the application:**
   - Create a new tournament and verify boards are created
   - Edit tournament boards
   - Check board status updates during matches

2. **Remove old club.boards references** (already done in code)

3. **Optional: Clean up old board data from clubs**
   ```javascript
   // Run this in MongoDB shell if you want to remove old boards field
   db.clubs.updateMany({}, { $unset: { boards: "" } })
   ```

## Rollback

If you need to rollback:

1. Restore from backup:
```bash
mongorestore --uri="your_mongodb_connection_string" ./backup
```

2. Revert code changes to previous commit

## Troubleshooting

### Error: "Tournament not found"
- Some boards reference tournaments that no longer exist
- These boards will be skipped and logged in errors
- Review the error log and manually handle if needed

### Error: "Tournament already has boards"
- The tournament was already migrated
- Script will skip these tournaments
- This is safe and expected on re-runs

## Support

If you encounter issues:
1. Check the migration error log
2. Verify your MongoDB connection
3. Ensure all tournaments exist in the database
4. Contact the development team

## Notes

- The migration is idempotent (safe to run multiple times)
- Boards that don't have a tournamentId will be ignored
- The script preserves all board data (status, matches, etc.)
- Board numbers are automatically renumbered starting from 1
