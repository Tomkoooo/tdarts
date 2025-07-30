# Tournament Lifecycle Test

This test simulates a complete tournament lifecycle by creating a tournament, adding players, generating groups, playing matches, and generating knockout stages.

## Prerequisites

1. **Development server must be running** on `http://localhost:3000`
2. **Database must be accessible** with the test club and user IDs
3. **Jest must be configured** in your project

## Configuration

The test uses the following configuration:

- **Club ID**: `687fabffb16ffd1e85174d7c`
- **User ID**: `6870f51d9b58837d598e80d5`
- **Base URL**: `http://localhost:3000/api`

## Running the Test

### Method 1: Direct Jest Command

```bash
# Run with default 16 players
npm test -- src/tests/tournament-lifecycle.test.ts

# Run with specific player count
npm test -- src/tests/tournament-lifecycle.test.ts --testNamePattern="Complete Tournament Lifecycle"
```

### Method 2: Using the Helper Script

```bash
# Run with 12 players
node src/tests/run-tournament-test.js 12

# Run with 8 players
node src/tests/run-tournament-test.js 8

# Run with 24 players
node src/tests/run-tournament-test.js 24
```

## Test Flow

The test performs the following steps:

1. **Create Tournament** - Creates a new tournament with specified settings
2. **Add Players** - Adds the specified number of test players
3. **Check-in Players** - Checks-in all players (required before generating groups)
4. **Generate Groups** - Automatically generates group stage matches
5. **Play Group Matches** - Simulates playing all group matches with random results
6. **Generate Knockout** - Creates knockout stage with automatic seeding (calculates optimal playersCount)
7. **Play Knockout Matches** - Simulates playing all knockout matches
8. **Finish Tournament** - Marks the tournament as finished
9. **Verify Results** - Checks final tournament state

## Test Configuration

You can modify the test configuration in `tournament-lifecycle.test.ts`:

```typescript
const CONFIG = {
  playerCount: 16,        // Number of players to test with
  maxPlayers: 16,         // Maximum players allowed
  boardCount: 2,          // Number of boards
  legsToWin: 2,           // Legs needed to win a match
  delayBetweenRequests: 200,  // Delay between API requests (ms)
  delayBetweenSteps: 1000,    // Delay between major steps (ms)
};
```

## Expected Results

- ✅ Tournament created successfully
- ✅ All players added to tournament
- ✅ All players checked-in successfully
- ✅ Groups generated automatically
- ✅ All group matches played with random results
- ✅ Knockout stage generated
- ✅ All knockout matches played
- ✅ Tournament marked as finished
- ✅ Final verification passed

## Troubleshooting

### Server Not Accessible
```
❌ Server is not accessible. Make sure the dev server is running on localhost:3000
```
**Solution**: Start your development server with `npm run dev`

### Database Connection Issues
```
❌ Failed to create tournament
```
**Solution**: Ensure your database is running and accessible

### Duplicate Key Errors
```
❌ E11000 duplicate key error collection: tournaments index: code_1 dup key: { code: null }
```
**Solution**: 
1. **First, fix the database indexes:**
   ```bash
   node src/tests/fix-database-indexes.js
   ```
2. The test now includes retry logic for duplicate key errors
3. Increased delays between requests to avoid race conditions
4. Each tournament gets a unique name with timestamp
5. If you still get errors, run the cleanup script:
   ```bash
   node src/tests/cleanup-test-tournaments.js
   ```

### Player Count Issues
```
❌ Please provide a valid player count between 4 and 32
```
**Solution**: Use a player count between 4 and 32

### Timeout Issues
The test has a 5-minute timeout. If it times out:
- Check server performance
- Increase delays in configuration
- Reduce player count

## Test Output

The test provides detailed logging:

```
🚀 Starting tournament lifecycle test with 16 players...

📝 Step 1: Creating tournament...
✅ Tournament created: AbC1

👥 Step 2: Adding 16 players...
✅ Added 16 players

✅ Step 2.5: Checking-in all players...
Found 16 players to check-in
✅ Checked-in 16 players

🏆 Step 3: Generating groups...
✅ Groups generated

🎯 Step 4: Playing group matches...
Found 24 group matches
✅ All group matches completed

🥊 Step 6: Generating knockout stage...
✅ Knockout stage generated

🎯 Step 7: Playing knockout matches...
Found 8 knockout matches
✅ All knockout matches completed

🏁 Step 9: Finishing tournament...
✅ Tournament finished

📊 Step 10: Verifying final tournament state...
✅ Tournament lifecycle test completed successfully!

📈 Final tournament status: finished
👥 Total players: 16
🏆 Tournament ID: AbC1
🎯 Group matches played: 24
🥊 Knockout matches played: 8
```

## Cleanup

The test logs the tournament ID for manual cleanup. You can:
- Delete the tournament manually from the database
- Use the tournament ID to access the tournament in the UI
- The tournament will be marked as a test tournament for easy identification

## Notes

- The test uses random match results to simulate realistic gameplay
- All API endpoints are tested with proper error handling
- The test includes connectivity checks before running
- Player names are generated automatically (Test Player 1, Test Player 2, etc.)
- The test is designed to be idempotent and can be run multiple times
- **playersCount calculation**: For knockout generation, the test automatically calculates the optimal number of players (nearest power of 2) from the total checked-in players 