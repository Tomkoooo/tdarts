# MMR Migration Script

## Áttekintés

Ez a script hozzáadja az MMR (Matchmaking Rating) mezőt az összes meglévő játékoshoz, akiknek még nincs.

## Előfeltételek

- MongoDB kapcsolat működik
- Node.js és npm telepítve
- TypeScript futtatási környezet

## Futtatás

```bash
# Development környezetben
npx ts-node scripts/migrate-add-mmr-to-players.ts

# Production környezetben (ha szükséges)
NODE_ENV=production npx ts-node scripts/migrate-add-mmr-to-players.ts
```

## Mit csinál a script?

1. **Kapcsolódik** a MongoDB-hez
2. **Megkeresi** az összes játékost, akiknek nincs MMR mezője
3. **Inicializálja** az MMR-t 1000-re (alap rating)
4. **Elmenti** az összes változtatást
5. **Jelentést** készít a migrációról

## Alapértelmezett értékek

- **MMR:** 1000 (alap rating)
- Minden játékos ezzel az értékkel indul
- A későbbi tornák eredményei alapján változik

## Biztonság

- ✅ Csak azokat a játékosokat módosítja, akiknek nincs MMR-je
- ✅ Nem írja felül a meglévő MMR értékeket
- ✅ Hibakezelés minden játékosnál
- ✅ Progress log 10 játékosonként

## Eredmény

A script a következő információkat jeleníti meg:

```
🚀 Starting MMR migration...
✅ Connected to MongoDB
📊 Found 150 players without MMR
⏳ Progress: 10/150 players updated
⏳ Progress: 20/150 players updated
...
=== Migration Complete ===
✅ Successfully updated: 150 players
❌ Errors: 0 players
📊 Total processed: 150 players
```

## Megjegyzések

- A script csak egyszer kell fusson
- Ha új játékosok regisztrálnak, automatikusan kapnak MMR-t (1000)
- A meglévő játékosok MMR-je a következő torna lezáráskor fog változni

## Hibaelhárítás

Ha a script hibát dob:

1. Ellenőrizd a MongoDB kapcsolatot
2. Ellenőrizd, hogy a `MONGODB_URI` környezeti változó be van-e állítva
3. Futtasd újra a scriptet - biztonságos többször futtatni
