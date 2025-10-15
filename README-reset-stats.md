# Player Statistics Reset and Recalculation Script

## 📋 Leírás

Ez a script teljesen újraszámolja az összes játékos statisztikáját az összes befejezett torna alapján.

## ⚠️ FIGYELEM

**EZ A SCRIPT TELJESEN TÖRÖLNI FOGJA ÉS ÚJRASZÁMOLJA AZ ÖSSZES JÁTÉKOS STATISZTIKÁJÁT!**

- Az összes player dokumentum statisztikái nullázódnak
- Az összes tournament history törlődik
- Az összes MMR visszaáll 800-ra
- Majd végigmegy az összes befejezett tornán és újraszámolja mindent

## 🚀 Futtatás

### Előfeltételek

1. Győződj meg róla, hogy a `.env` fájlban helyesen van beállítva a MongoDB kapcsolat
2. A script a `tdarts_v2` adatbázist fogja használni

### Futtatási parancs

```bash
node reset-all-player-stats.js
```

## 📊 Mit csinál a script?

### 1. Reset Fázis
- Összes player dokumentum statisztikái nullázódnak
- `tournamentHistory` tömbök ürítődnek
- MMR értékek 800-ra állítódnak

### 2. Újraszámítás Fázis
Minden befejezett tornánál:

#### Match Statisztikák
- Összes befejezett meccs feldolgozása
- Meccs győzelmek/vereségek számítása
- Leg győzelmek/vereségek számítása
- 180-asok számítása
- Legmagasabb kiszálló számítása

#### Átlag Számítás
- Minden meccs átlaga a dobások alapján
- Tornához tartozó átlag = meccs átlagok átlaga
- Összesített átlag = minden torna átlagának átlaga

#### MMR Számítás
- Helyezés alapján
- Meccs győzelmi arány alapján
- Leg győzelmi arány alapján
- Átlag alapján
- Torna átlag alapján

#### Tournament History
- Minden torna hozzáadása a játékos történetéhez
- Helyezés, kiesés kör, statisztikák

## 🔧 Módosítások

Ha módosítani szeretnéd a scriptet:

### MMR Számítás
A `MMRService.calculateMMRChange` metódust módosíthatod a `reset-all-player-stats.js` fájlban.

### Átlag Számítás
A match average számítás logikája a scriptben található, ahol a dobások alapján számítja ki.

### Torna Szűrés
Ha csak bizonyos tornákat szeretnél feldolgozni, módosíthatod a query-t:

```javascript
const tournaments = await tournamentsCollection.find({
    'tournamentSettings.status': 'finished',
    // Add additional filters here
    'tournamentSettings.startDate': { $gte: new Date('2024-01-01') }
}).sort({ 'tournamentSettings.startDate': 1 }).toArray();
```

## 📈 Eredmény

A script futtatása után:
- ✅ Minden játékosnak pontosan azok a statisztikái lesznek, amiket elért
- ✅ MMR értékek helyesen számolva
- ✅ Tournament history teljes és pontos
- ✅ All-time átlagok helyesen számolva
- ✅ Liga pontok érintetlenek maradnak (csak player statisztikák)

## 🐛 Hibaelhárítás

### MongoDB Kapcsolat
Ha kapcsolódási problémák vannak, ellenőrizd:
- `.env` fájlban a `MONGODB_URI` beállítást
- MongoDB szerver elérhetőségét

### Memória Problémák
Ha sok torna van, a script memóriaigényes lehet. Ebben az esetben:
- Csökkentsd a batch méretét
- Vagy futtasd tornánként külön

### Log Üzenetek
A script részletes log üzeneteket ad, így követheted a folyamatot:
- `🔄` - Reset fázis
- `🏆` - Tournament feldolgozás
- `📊` - Player statisztikák
- `✅` - Sikeres műveletek
- `❌` - Hibák

## 📝 Példa Output

```
🚀 Starting complete player statistics reset and recalculation...

✅ Connected to MongoDB
📊 Using database: tdarts_v2

🔄 Resetting all player statistics...
✅ Reset 150 players' statistics

🏆 Processing all finished tournaments...
📋 Found 25 finished tournaments

🎯 Processing tournament: Spring Championship (A1B2)
  📊 Found 45 finished matches
  📈 Processing 32 players
    ✅ John Doe: 4W/2L, Avg: 52.3, MMR: 800 → 856
    ✅ Jane Smith: 3W/3L, Avg: 48.7, MMR: 800 → 834
    ...
  ✅ Tournament processed successfully

🎉 All tournaments processed successfully!

✅ Complete player statistics reset and recalculation finished successfully!
🔌 Disconnected from MongoDB
```

## ⚡ Gyors Futtatás

```bash
# Futtatás fejlesztői környezetben
NODE_ENV=development node reset-all-player-stats.js

# Futtatás production környezetben (extra óvatosan!)
NODE_ENV=production node reset-all-player-stats.js
```
