# Socket Server - Arrow Count Implementation

## Összefoglaló

A `MatchGame.tsx` komponens mostantól elküldi a **kiszálló nyílszámot** (`arrowCount`) a socket serveren keresztül. Ez az információ szükséges a live viewer számára, hogy pontosan tudja, hány nyílból történt a kiszállás.

---

## 1. MatchGame.tsx - Küldő oldal

### Küldés helye és formátuma:

**A) Leg befejezésekor (de a meccs még folytatódik):**
```javascript
// src/components/board/MatchGame.tsx:547-558
if (isConnected) {
  const lastThrow = pendingLegWinner === 1 ? player1.allThrows[player1.allThrows.length - 1] : player2.allThrows[player2.allThrows.length - 1];
  socket.emit('throw', {
    matchId: match._id,
    playerId: pendingLegWinner === 1 ? match.player1.playerId._id : match.player2.playerId._id,
    score: lastThrow,
    isCheckout: true,
    remainingScore: 0,
    legNumber: currentLeg,
    tournamentCode: window.location.pathname.split('/')[2],
    arrowCount: arrowCount  // <<<< ITT KÜLDJÜK EL
  });
}
```

**B) Meccs befejezésekor:**
```javascript
// src/components/board/MatchGame.tsx:627-638
if (isConnected) {
  const lastThrow = pendingMatchWinner === 1 ? player1.allThrows[player1.allThrows.length - 1] : player2.allThrows[player2.allThrows.length - 1];
  socket.emit('throw', {
    matchId: match._id,
    playerId: pendingMatchWinner === 1 ? match.player1.playerId._id : match.player2.playerId._id,
    score: lastThrow,
    isCheckout: true,
    remainingScore: 0,
    legNumber: currentLeg,
    tournamentCode: window.location.pathname.split('/')[2],
    arrowCount: arrowCount  // <<<< ITT IS KÜLDJÜK EL
  });
}
```

### ArrowCount értékek:
- `arrowCount` értéke **1, 2, vagy 3** lehet
- A felhasználó választja ki a checkout dialog-ban
- A `getPossibleArrowCounts()` függvény szabályozza, mely értékek lehetségesek a kiszálló pontszám alapján:
  - **1-40 pont**: 1, 2, vagy 3 nyíl
  - **41-98 pont**: 2 vagy 3 nyíl
  - **99-180 pont**: csak 3 nyíl

---

## 2. LiveMatchViewer.tsx - Fogadó oldal

### Interface frissítése:

```typescript
// src/components/tournament/LiveMatchViewer.tsx:27-38
interface CompletedLeg {
  player1Score: number;
  player2Score: number;
  player1Throws: Throw[];
  player2Throws: Throw[];
  winnerId: string;
  checkoutScore?: number;
  checkoutDarts?: number;
  winnerArrowCount?: number;  // <<<< ÚJ MEZŐ
  doubleAttempts?: number;
  createdAt: string;
}
```

### Használat a befejezett legek megjelenítésénél:

```typescript
// A completed legs chalkboard-ban a nyílszámok számításánál:
{Array.from({ length: Math.max(leg.player1Throws.length, leg.player2Throws.length) }).map((_, throwIndex) => {
  const isLastPlayer1Throw = throwIndex === leg.player1Throws.length - 1;
  const isLastPlayer2Throw = throwIndex === leg.player2Throws.length - 1;
  const isWinnerLastThrow = (winner === 1 && isLastPlayer1Throw) || (winner === 2 && isLastPlayer2Throw);
  
  // Calculate arrow count for this row
  let arrowCount = (throwIndex + 1) * 3;
  if (isWinnerLastThrow && leg.winnerArrowCount) {
    // For the winning throw, use the actual arrow count
    arrowCount = (throwIndex * 3) + leg.winnerArrowCount;
  }
  
  return (
    <div key={throwIndex} className="...">
      <span className="...">{arrowCount}</span>
    </div>
  );
})}
```

### Streaming mód (fullscreen window):

A streaming módban a nyílszám **csak az aktuális legre** vonatkozik, míg az átlag az **egész meccsre**:

```javascript
// updateDartCounters függvény:
// Calculate MATCH totals for average
let player1TotalThrows = 0, player2TotalThrows = 0;
let player1TotalScore = 0, player2TotalScore = 0;

// Add current leg + completed legs to match totals
// ... (összes leg hozzáadása)

// Calculate match averages (3-dart average from ALL legs)
const player1Avg = player1TotalThrows > 0 ? (player1TotalScore / player1TotalThrows).toFixed(2) : '0.00';
const player2Avg = player2TotalThrows > 0 ? (player2TotalScore / player2TotalThrows).toFixed(2) : '0.00';

// Calculate CURRENT LEG dart count only
const player1CurrentLegDarts = state.currentLegData.player1Throws ? state.currentLegData.player1Throws.length * 3 : 0;
const player2CurrentLegDarts = state.currentLegData.player2Throws ? state.currentLegData.player2Throws.length * 3 : 0;

// Display current leg darts and match average
document.getElementById('player1-darts').textContent = '(' + player1CurrentLegDarts + ')';
document.getElementById('player2-darts').textContent = '(' + player2CurrentLegDarts + ')';
document.getElementById('player1-avg').textContent = player1Avg;
document.getElementById('player2-avg').textContent = player2Avg;
```

---

## 3. Socket Server - Implementálandó változások

### A) 'throw' event kezelése

**Jelenlegi állapot:**
```javascript
socket.on('throw', (data) => {
  // data tartalmazza:
  // - matchId
  // - playerId
  // - score
  // - isCheckout
  // - remainingScore
  // - legNumber
  // - tournamentCode
});
```

**ÚJ - arrowCount hozzáadása:**
```javascript
socket.on('throw', (data) => {
  // data most már tartalmazza:
  // - matchId
  // - playerId
  // - score
  // - isCheckout
  // - remainingScore
  // - legNumber
  // - tournamentCode
  // - arrowCount  // <<<< ÚJ PARAMÉTER (1, 2, vagy 3)
  
  // Ha isCheckout === true, akkor az arrowCount meg van adva
  if (data.isCheckout && data.arrowCount) {
    // Ezt az információt továbbítani kell a matchState-ben
    // és a leg mentésekor az adatbázisba
  }
});
```

### B) matchState frissítése

A `matchState` objektumnak tartalmaznia kell a `winnerArrowCount` mezőt:

```javascript
// Példa matchState struktúra:
const matchState = {
  matchId: 'xxx',
  currentLeg: 2,
  completedLegs: [
    {
      legNumber: 1,
      player1Throws: [...],
      player2Throws: [...],
      winnerId: 'player1_id',
      winnerArrowCount: 2,  // <<<< ÚJ MEZŐ
      // ...
    }
  ],
  currentLegData: {
    player1Throws: [...],
    player2Throws: [...],
    // ...
  }
};
```

### C) Leg mentése az adatbázisba

Amikor egy leg befejeződik, a `winnerArrowCount` mezőt is menteni kell:

```javascript
// Példa leg mentés:
await MatchModel.findByIdAndUpdate(matchId, {
  $push: {
    legs: {
      player1Score: 501,
      player2Score: 501,
      player1Throws: [...],
      player2Throws: [...],
      winnerId: winnerId,
      winnerArrowCount: arrowCount,  // <<<< ÚJ MEZŐ MENTÉSE
      checkoutScore: lastThrow,
      // ...
    }
  }
});
```

### D) Broadcast a live viewereknek

Amikor egy 'throw' event érkezik (különösen checkout esetén), broadcastelni kell a matchState-et:

```javascript
socket.on('throw', async (data) => {
  // ... throw feldolgozása ...
  
  if (data.isCheckout && data.arrowCount) {
    // Leg befejeződött
    const completedLeg = {
      legNumber: data.legNumber,
      player1Throws: [...],
      player2Throws: [...],
      winnerId: data.playerId,
      winnerArrowCount: data.arrowCount,  // <<<< TOVÁBBÍTÁS
      // ...
    };
    
    // Mentés az adatbázisba
    await saveCompletedLeg(completedLeg);
    
    // Broadcast a live viewereknek
    io.to(`match:${data.matchId}`).emit('match-state-update', {
      currentLeg: nextLegNumber,
      completedLegs: [...previousLegs, completedLeg],
      currentLegData: resetLegData(),
      // ...
    });
  } else {
    // Normál dobás, csak a currentLegData frissítése
    io.to(`match:${data.matchId}`).emit('match-state-update', {
      currentLegData: {
        // ... frissített dobások ...
      }
    });
  }
});
```

---

## 4. Adatbázis séma

### Match Model - Leg Schema

```typescript
// src/database/models/match.model.ts:11-23
const legSchema = new mongoose.Schema({
  player1Score: { type: Number, required: true },
  player2Score: { type: Number, required: true },
  player1Throws: [throwSchema],
  player2Throws: [throwSchema],
  winnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  checkoutScore: Number,
  checkoutDarts: Number,
  winnerArrowCount: Number,  // <<<< MÁR LÉTEZIK AZ ADATBÁZISBAN
  loserRemainingScore: Number,
  doubleAttempts: Number,
  createdAt: { type: Date, default: Date.now },
}, { _id: false });
```

**Fontos:** A `winnerArrowCount` mező **már létezik** az adatbázis sémában, csak a socket server kódban kell kezelni és továbbítani!

---

## 5. Tesztelési lépések

1. **MatchGame-ben checkout:**
   - Játssz egy leg-et
   - Amikor kiszállás történik, válaszd ki a nyílszámot (1, 2, vagy 3)
   - Ellenőrizd a developer console-ban, hogy a socket emit tartalmazza-e az `arrowCount` mezőt

2. **Socket server:**
   - Ellenőrizd a server log-ban, hogy megérkezik-e az `arrowCount`
   - Ellenőrizd, hogy a matchState frissül-e megfelelően
   - Ellenőrizd, hogy az adatbázisba mentésre kerül-e

3. **LiveMatchViewer:**
   - Nyisd meg a live viewer-t
   - Ellenőrizd a befejezett legek chalkboard-ján, hogy a nyílszámok helyesen jelennek-e meg
   - Az utolsó sor lehet hogy nem 3-mal osztható (pl. 67, 68, 70 stb.)

4. **Streaming mód:**
   - Nyisd meg a streaming fullscreen ablakot
   - Ellenőrizd, hogy a nyílszám csak az aktuális legre vonatkozik
   - Ellenőrizd, hogy az átlag az egész meccsre vonatkozik

---

## 6. Várható eredmény

- ✅ MatchGame elküldi az `arrowCount` paramétert checkout esetén
- ✅ Socket server fogadja és továbbítja az `arrowCount` értéket
- ✅ Adatbázisba mentésre kerül a `winnerArrowCount`
- ✅ LiveMatchViewer helyesen jeleníti meg a nyílszámokat a befejezett legeknél
- ✅ Streaming mód mutatja a jelenlegi leg nyílszámait és az egész meccs átlagát

---

## 7. Példa Socket Event Flow

```
1. MatchGame -> Socket Server
   Event: 'throw'
   Data: {
     matchId: '123',
     playerId: 'player1',
     score: 32,
     isCheckout: true,
     remainingScore: 0,
     legNumber: 2,
     tournamentCode: 'ABC123',
     arrowCount: 2  // <<<< ÚJ
   }

2. Socket Server -> Database
   Save leg with winnerArrowCount: 2

3. Socket Server -> All Live Viewers
   Event: 'match-state-update'
   Data: {
     currentLeg: 3,
     completedLegs: [
       {
         legNumber: 1,
         winnerId: 'player2',
         winnerArrowCount: 3,
         ...
       },
       {
         legNumber: 2,
         winnerId: 'player1',
         winnerArrowCount: 2,  // <<<< ÚJ INFORMÁCIÓ
         ...
       }
     ],
     currentLegData: { ... }
   }

4. LiveMatchViewer receives update
   - Chalkboard shows arrow counts: 3, 6, 9, 12, 15, 18, 21, 23  (last one is 21 + 2)
```

---

## Összefoglalás

A módosítás egyszerű: a socket server-nek fogadnia kell az `arrowCount` paramétert a 'throw' eventben, majd ezt továbbítania kell a matchState-ben és menteni az adatbázisba a `winnerArrowCount` mezőbe. A frontend (LiveMatchViewer) már készen áll ennek fogadására és megjelenítésére.

