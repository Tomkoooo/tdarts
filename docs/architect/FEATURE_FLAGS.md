# Feature Flag Rendszer

## Áttekintés

A tDarts platform feature flag rendszere lehetővé teszi a funkciók dinamikus engedélyezését/tiltását környezet és előfizetési szint alapján.

### Entitlement vs. subscription kvóták (két külön réteg)

Ne keverjük össze a két ellenőrzést:

1. **Entitlement (jogosultság / feature flag)** — „Használhatja-e a klub ezt a funkciót?” (ENV `NEXT_PUBLIC_ENABLE_*`, klub `featureFlags`, paywall mellett tier). Web: `FeatureFlagService`, `evaluateFeatureAccess`, kliens hookok.
2. **Subscription kvóták (használat / limit)** — „Hány verseny hozható létre havonta, sandbox vs. éles, OAC szabályok?” Csak akkor futnak, ha a paywall aktív. Implementáció: `@tdarts/services` `SubscriptionService.canCreateTournament` / `canUpdateTournament`.

A paywall kapcsoló **egy** helyen van definiálva: `isSubscriptionPaywallActive()` a [`@tdarts/core/subscription-paywall`](../../packages/core/src/lib/subscription-paywall.ts) modulban (`NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED === 'true'`). A web a [`subscriptionPaywall.ts`](../../apps/web/src/features/flags/lib/subscriptionPaywall.ts) fájlon keresztül ezt a **subpath**-ot exportálja (ne a `@tdarts/core` barrel-t: kliens komponensek behúznák a mailer/nodemailer láncot és elrontják a Next buildet).

Ha a paywall **ki**, kvóták nem érvényesülnek; versenylétrehozásnál a [`createTournament.action.ts`](../../apps/web/src/features/tournaments/actions/createTournament.action.ts) nem is hívja a limit ellenőrzést.

### Automatikus ellenőrzés (tesztek)

A dokumentált szabályok és a UI közötti eltérések elkerülésére:

- [`apps/web/src/tests/feature-flags-subscription.matrix.lib.test.ts`](../../apps/web/src/tests/feature-flags-subscription.matrix.lib.test.ts) — `isSubscriptionPaywallActive`, valós `SubscriptionService` kvóták (paywall ki/be), `FeatureFlagService` mátrix (socket, ligák, premium).
- [`apps/web/src/tests/createTournament.subscription-gate.lib.test.ts`](../../apps/web/src/tests/createTournament.subscription-gate.lib.test.ts) — `createTournamentAction` **nem mockolja** a `SubscriptionService`-t; ellenőrzi, hogy paywall ki esetén nem fut a havi limit hívás.

Futtatás: `pnpm --filter web test:qa:unit` (tartalmazza a `*.lib.test.ts` fájlokat) vagy a `web` csomag `test` scriptje a fenti mátrix + gate teszteket is lefuttatja.

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

# Előfizetéses / paywall réteg — csak explicit `true` esetén aktív (billinggel egyezően).
# Hiányzó, üres vagy `false` értéknél nincs subscription-tier ellenőrzés.
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
import { FeatureFlagService } from '@/features/flags/lib/featureFlags';

// Feature flag ellenőrzés
const enabled = await FeatureFlagService.isFeatureEnabled('liveMatchFollowing', clubId);

// Socket feature ellenőrzés
const socketEnabled = await FeatureFlagService.isSocketEnabled(clubId);
```

## Feature Flag Logika

### Általános Logika

A feature flag-ek a következő sorrendben ellenőrződnek:

1. **ENV alapú ellenőrzés**: Ha a megfelelő `NEXT_PUBLIC_ENABLE_*` nincs `true`-ra állítva, a feature tiltott (`NEXT_PUBLIC_ENABLE_ALL=true` felülírja).
2. **Paywall / subscription tier**: Csak ha `NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED=true`, akkor lépnek életbe az előfizetési szinthez kötött szabályok (pl. ligák, detailed statistics).
3. **Klub feature flag-ek**: Paywall nélkül is a klub `featureFlags` mezője szűr (pl. `liveMatchFollowing`, `premiumTournaments`); paywall mellett ezek és/vagy a `subscriptionModel` együtt érvényesülnek a feature-típustól függően.

### Detailed Statistics Feature

A `detailedStatistics` feature a következő logika szerint működik:

1. **ENV ki**: tiltott.
2. **Paywall ki** (`NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED` nem `true`): engedélyezett, ha `club.featureFlags.advancedStatistics === true`.
3. **Paywall be**: engedélyezett, ha a klub előfizetése nem `free` (tier alapú szabály).

### Live Match Following Feature

A `liveMatchFollowing` feature a következő logika szerint működik:

1. **ENV ki**: tiltott.
2. **Paywall ki**: elég a `NEXT_PUBLIC_ENABLE_LIVE_MATCH_FOLLOWING`; klub flag nem szűr (lásd socket szekció).
3. **Paywall be**: `NEXT_PUBLIC_ENABLE_LIVE_MATCH_FOLLOWING` mellett a klub `liveMatchFollowing` flagje kell legyen `true`.

### Socket Feature

A socket kapcsolat a következő logika szerint működik:

1. **NEXT_PUBLIC_ENABLE_ALL = true**: engedélyezett.
2. **NEXT_PUBLIC_ENABLE_SOCKET = false**: tiltott.
3. **Paywall be** (`NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED=true`): `NEXT_PUBLIC_ENABLE_SOCKET=true` mellett a klub `featureFlags.liveMatchFollowing` legyen `true`.
4. **Paywall ki**: elég a globális socket ENV; a klub `liveMatchFollowing` flagje nem szűr (az előfizetéses upsellhez maradt, ha a paywall aktív).

## Subscription Model Logika

A subscription model ellenőrzés a következő logika szerint működik:

1. **`NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED` nem `true`** (hiányzik, `false`, stb.): nincs subscription-tier paywall; a feature-ekre érvényes a megfelelő `NEXT_PUBLIC_ENABLE_*`, és (ahol van) klub flag — **kivétel**: élő követés / socket paywall nélkül csak ENV alapú (lásd fent).
2. **NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED=true**: bekapcsolt paywall — a feature-típus szerint `subscriptionModel` és/vagy klub flag-ek szűrnek.

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