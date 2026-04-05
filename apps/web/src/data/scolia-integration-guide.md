# Scolia Autoscoring Integration Guide

## Overview

The tDarts platform now supports **Scolia autoscoring** integration, allowing automatic score detection from Scolia dartboards. This eliminates manual score entry and provides a seamless, professional tournament experience.

Scolia integration is available for:
- **Local Matches** - Practice games and casual play
- **Tournament Matches** - Official tournament games with automatic scoring

---

## How Scolia Works

Scolia dartboards connect via WebSocket to detect dart throws in real-time. The system:
1. Detects each individual dart throw (score and multiplier)
2. Buffers the throws until a full turn is complete (3 darts, checkout, or bust)
3. Automatically submits the total score to the game
4. Updates the scoreboard in real-time

---

## Local Match Integration

### Setting Up Scolia for Local Matches

1. **Start a Local Match**
   - Navigate to the board view
   - Select "Local Match" option
   - Configure your game settings (legs to win, starting score)

2. **Open Settings**
   - Click the **Settings** (⚙️) icon in the top-right corner of the game screen

3. **Configure Scolia**
   - Scroll to the **"Scolia Autoscoring"** section
   - Enter your **Scolia Serial Number** (e.g., `SCO-12345`)
   - Enter your **Scolia Access Token** (provided by Scolia)
   - Toggle the **"Scolia engedélyezése"** (Enable Scolia) checkbox to ON

4. **Save Settings**
   - Click **"Mentés"** (Save) to apply the settings
   - The system will automatically connect to your Scolia board

### Using Scolia During Local Play

Once enabled:
- **Throw your darts** - Scolia automatically detects each dart
- **Automatic scoring** - After 3 darts (or checkout/bust), the score is submitted automatically
- **Manual override** - You can still enter scores manually if needed
- **Real-time updates** - The scoreboard updates instantly

### Disabling Scolia

To disable Scolia during a local match:
1. Open Settings (⚙️ icon)
2. Uncheck **"Scolia engedélyezése"**
3. Save settings
4. Manual scoring will resume

---

## Tournament Match Integration

### Admin Setup (Tournament Organizers)

Tournament organizers must configure Scolia settings for each board **before** the tournament starts.

#### Step 1: Access Tournament Boards

1. Navigate to **Control Center** (Admin Dashboard)
2. Select your tournament
3. Go to the **"Boards"** tab

#### Step 2: Configure Board Settings

1. **Hover over a board card** - A Settings (⚙️) icon will appear in the top-right corner
2. **Click the Settings icon** to open the board configuration dialog
3. **Enter Scolia credentials:**
   - **Tábla neve** (Board Name) - Optional custom name for the board
   - **Scolia Szériaszám** (Serial Number) - Your Scolia board's serial number
   - **Scolia Access Token** - Your Scolia access token
4. **Click "Mentés"** (Save)

#### Step 3: Verify Configuration

- The board settings are saved to the database
- All matches played on this board will automatically use Scolia
- Players don't need to configure anything

### Player Experience (Tournament Matches)

When a tournament match is loaded on a Scolia-enabled board:

1. **Automatic Connection**
   - The system automatically connects to Scolia using the board's saved credentials
   - No manual configuration needed by players

2. **Seamless Scoring**
   - Players throw darts normally
   - Scolia detects and buffers each dart
   - Scores are automatically submitted after each turn
   - The scoreboard updates in real-time for all viewers

3. **Manual Override Available**
   - If Scolia fails or disconnects, manual scoring is still available
   - Players can enter scores using the numpad as a fallback

### Connection Status

The system provides visual feedback:
- **Connected** - Scolia is active and detecting throws
- **Disconnected** - Manual scoring is required
- Check browser console for detailed connection logs (prefix: `[Scolia]`)

---

## Technical Details

### Dart Buffering Logic

The system uses intelligent buffering to group individual dart throws:

```
Dart 1: 60 → Buffer: [60]
Dart 2: 60 → Buffer: [60, 60]
Dart 3: 60 → Buffer: [60, 60, 60] → Submit: 180
```

**Auto-submit triggers:**
- **3 darts thrown** - Normal turn completion
- **Checkout detected** - Remaining score reaches exactly 0
- **Bust detected** - Remaining score goes below 0 or equals 1

### WebSocket Connection

- **Endpoint:** `wss://game.scoliadarts.com/api/v1/social`
- **Authentication:** Serial Number + Access Token
- **Event:** `THROW_DETECTED` provides dart details
- **Reconnection:** Automatic reconnection on disconnect

### Data Model

Board configuration is stored in the database:

```typescript
{
  boardNumber: number,
  name?: string,
  scoliaSerialNumber?: string,
  scoliaAccessToken?: string,
  isActive: boolean,
  status: 'idle' | 'waiting' | 'playing'
}
```

---

## Troubleshooting

### Scolia Not Connecting

**Check:**
1. Serial number and access token are correct
2. Scolia board is powered on and connected to the network
3. Browser console for error messages (`[Scolia] Error`)

**Solutions:**
- Verify credentials with Scolia support
- Check network connectivity
- Try disabling and re-enabling Scolia

### Scores Not Registering

**Check:**
1. Connection status (should show "Connected" in console)
2. Darts are being detected (console logs `[Scolia] Throw detected`)
3. Buffer is being submitted (console logs throw submission)

**Solutions:**
- Ensure you're throwing at the active Scolia board
- Check if the board is in the correct mode
- Fall back to manual scoring if needed

### Duplicate Scores

**Issue:** Score is registered twice (Scolia + manual entry)

**Solution:**
- Don't manually enter scores when Scolia is enabled
- Wait for automatic submission after each turn
- If a score doesn't register, disable Scolia before manual entry

### Connection Drops Mid-Game

**What happens:**
- Scolia disconnects during a match
- Manual scoring becomes available immediately
- Game state is preserved

**Solution:**
- Continue with manual scoring
- Try re-enabling Scolia in settings
- Check network stability

---

## Best Practices

### For Tournament Organizers

1. **Pre-configure all boards** before the tournament starts
2. **Test connections** with each Scolia board before matches begin
3. **Have backup credentials** in case of issues
4. **Train staff** on manual override procedures
5. **Monitor connection status** during matches

### For Players

1. **Wait for auto-submission** - Don't rush to manually enter scores
2. **Verify scores** - Check that the correct score was registered
3. **Report issues immediately** - Alert tournament staff if Scolia fails
4. **Know manual fallback** - Be prepared to enter scores manually if needed

### For Local Play

1. **Save your credentials** - Store serial number and token securely
2. **Test before important games** - Verify connection before matches
3. **Keep manual option available** - Don't rely 100% on Scolia
4. **Update settings as needed** - Enable/disable based on preference

---

## Security Notes

- **Access tokens are sensitive** - Treat them like passwords
- **Tokens are stored securely** - Encrypted in the database
- **Board-level permissions** - Only admins/moderators can configure boards
- **Local storage** - Local match settings are stored in browser only

---

## API Integration

For developers integrating Scolia:

### Update Board Settings
```typescript
PATCH /api/tournaments/[tournamentId]/boards/[boardNumber]
{
  "name": "Board 1",
  "scoliaSerialNumber": "SCO-12345",
  "scoliaAccessToken": "your-token-here"
}
```

### Retrieve Board Settings
```typescript
GET /api/tournaments/[tournamentId]/boards
// Returns array of boards with Scolia configuration
```

---

## Support

For Scolia-specific issues:
- **Scolia Support:** Contact Scolia directly for hardware/API issues
- **tDarts Support:** Contact tDarts for integration issues

For technical assistance:
- Check browser console for detailed error logs
- Provide serial number (not token) when requesting support
- Include match ID and timestamp for tournament issues

---

## Future Enhancements

Planned improvements:
- Visual connection status indicator in UI
- Automatic credential validation
- Multi-board tournament support with board rotation
- Historical Scolia usage statistics
- Advanced error recovery mechanisms

---

*Last Updated: December 2024*
*Version: 1.0*
