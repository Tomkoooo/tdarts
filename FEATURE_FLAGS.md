# Feature Flag Rendszer

## Áttekintés

A tDarts platform feature flag rendszere lehetővé teszi a funkciók dinamikus engedélyezését/tiltását környezet és előfizetési szint alapján.

## Konfiguráció

### Environment Variables

A következő environment változókat lehet használni:

```env
# Ha true, akkor minden feature elérhető (fejlesztői mód)
NEXT_PUBLIC_ENABLE_ALL=false

# Socket kapcsolat engedélyezése
NEXT_PUBLIC_ENABLE_SOCKET=true

# Live match following engedélyezése
NEXT_PUBLIC_ENABLE_LIVE_MATCH_FOLLOWING=true

# Advanced statistics engedélyezése
NEXT_PUBLIC_ENABLE_ADVANCED_STATISTICS=true

# Premium tournaments engedélyezése
NEXT_PUBLIC_ENABLE_PREMIUM_TOURNAMENTS=true

# Subscription model ellenőrzés engedélyezése
NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED=false
```

### Adatbázis alapú flag-ek

A Club modellben a következő mezők találhatók:

```typescript
interface Club {
  subscriptionModel: 'free' | 'basic' | 'pro' | 'enterprise';
  featureFlags: {
    liveMatchFollowing: boolean;
    advancedStatistics: boolean;
    premiumTournaments: boolean;
  };
}
```

## Használat

### Frontend Hook-ok

```typescript
import { useFeatureFlag, useSocketFeature } from '@/hooks/useFeatureFlag';

// Általános feature flag
const { isEnabled, isLoading, error } = useFeatureFlag('liveMatchFollowing', clubId);

// Socket feature specifikus
const { isSocketEnabled, isLoading, error } = useSocketFeature(clubId);
```

### Backend Service

```typescript
import { FeatureFlagService } from '@/lib/featureFlags';

// Feature flag ellenőrzés
const enabled = await FeatureFlagService.isFeatureEnabled('liveMatchFollowing', clubId);

// Socket feature ellenőrzés
const socketEnabled = await FeatureFlagService.isSocketEnabled(clubId);
```

## Feature Flag Logika

### Általános Logika

A feature flag-ek a következő sorrendben ellenőrződnek:

1. **ENV alapú ellenőrzés**: Ha `NEXT_PUBLIC_ENABLE_[FEATURE] = false`, akkor a feature mindenképp tiltott
2. **Fizetős modell ellenőrzés**: Ha `NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED = false`, akkor minden feature elérhető
3. **Klub specifikus ellenőrzés**: Ha a fizetős modell be van kapcsolva, akkor ellenőrzi a klub subscription modeljét

### Detailed Statistics Feature

A `detailedStatistics` feature a következő logika szerint működik:

1. **NEXT_PUBLIC_ENABLE_ADVANCED_STATISTICS = false**: Mindenképp tiltott
2. **NEXT_PUBLIC_ENABLE_ADVANCED_STATISTICS = true + NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED = false**: Mindenképp engedélyezett
3. **NEXT_PUBLIC_ENABLE_ADVANCED_STATISTICS = true + NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED = true**: Csak akkor engedélyezett, ha `club.subscriptionModel === 'pro'`

### Live Match Following Feature

A `liveMatchFollowing` feature a következő logika szerint működik:

1. **NEXT_PUBLIC_ENABLE_LIVE_MATCH_FOLLOWING = false**: Mindenképp tiltott
2. **NEXT_PUBLIC_ENABLE_LIVE_MATCH_FOLLOWING = true + NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED = false**: Mindenképp engedélyezett
3. **NEXT_PUBLIC_ENABLE_LIVE_MATCH_FOLLOWING = true + NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED = true**: Csak akkor engedélyezett, ha a klub feature flag-je be van kapcsolva

### Socket Feature

A socket kapcsolat a következő logika szerint működik:

1. **NEXT_PUBLIC_ENABLE_ALL = true**: Mindenképp engedélyezett
2. **NEXT_PUBLIC_ENABLE_SOCKET = false**: Mindenképp tiltott
3. **NEXT_PUBLIC_ENABLE_SOCKET = true + NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED = false**: Mindenképp engedélyezett
4. **NEXT_PUBLIC_ENABLE_SOCKET = true + NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED = true**: Csak akkor engedélyezett, ha `club.subscriptionModel === 'pro'`

## Subscription Model Logika

A subscription model ellenőrzés a következő logika szerint működik:

1. **NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED = false**: Mindenképp engedélyezett (korlátlan)
2. **NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED = true**: Ellenőrzi a klub subscription modeljét

### Subscription Csomagok

- **free**: 1 verseny/hó
- **basic**: 2 verseny/hó  
- **pro**: 4 verseny/hó
- **enterprise**: Korlátlan verseny/hó

### Ellenőrzés Logika

A rendszer a torna start date-je alapján határozza meg, hogy melyik hónaphoz tartozik a verseny, és ellenőrzi, hogy a klub nem lépte-e túl a havi limitet.

## API Endpoint-ok

### Feature Flag Ellenőrzés
```
GET /api/feature-flags/check?feature=liveMatchFollowing&clubId=123
```

### Socket Feature Ellenőrzés
```
GET /api/feature-flags/socket?clubId=123
```

## Implementáció példák

### MatchGame komponens

```typescript
const MatchGame: React.FC<MatchGameProps> = ({ match, onBack, clubId }) => {
  const { socket, isConnected, emit } = useSocket({ 
    matchId: match._id, 
    clubId 
  });

  // Socket csak akkor működik, ha a feature flag engedélyezett
  useEffect(() => {
    if (!isConnected) return;
    
    emit('set-match-players', {
      matchId: match._id,
      player1Id: match.player1.playerId._id,
      player2Id: match.player2.playerId._id
    });
  }, [isConnected, match._id, match.player1.playerId._id, match.player2.playerId._id, emit]);
};
```

## Jövőbeli bővítések

- Admin interface a feature flag-ek kezeléséhez
- Cache rendszer a teljesítmény javításához
- A/B tesztelés támogatása
- Feature flag használat statisztikák 