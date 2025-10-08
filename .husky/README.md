# Git Hooks

Ez a mappa tartalmazza a Husky git hook-okat.

## Pre-push Hook

A `pre-push` hook automatikusan fut minden `git push` előtt és a következő ellenőrzéseket végzi:

1. **ESLint** - Kód minőség ellenőrzés
2. **TypeScript Type Check** - Típus ellenőrzés
3. **Production Build** - Build teszt

Ha bármelyik ellenőrzés sikertelen, a push **nem fog végrehajtódni**.

### Bypass (NE HASZNÁLD ÉLES KÖRNYEZETBEN!)

Ha sürgősen kell pusholni és tudod, hogy mit csinálsz:

```bash
git push --no-verify
```

**FIGYELEM:** Ez kihagyja az összes ellenőrzést és hibás kódot is fel tudsz tölteni!

### Hibák javítása

Ha a pre-push hook hibát jelez:

1. **ESLint hibák:**
   ```bash
   npm run lint
   ```

2. **TypeScript hibák:**
   ```bash
   npx tsc --noEmit
   ```

3. **Build hibák:**
   ```bash
   npm run build
   ```

### Hook letiltása (fejlesztés során)

Ha ideiglenesen le akarod tiltani a hook-okat:

```bash
# Átnevezés
mv .husky/pre-push .husky/pre-push.disabled

# Visszaállítás
mv .husky/pre-push.disabled .husky/pre-push
```

## Telepítés új fejlesztőknek

A hook-ok automatikusan telepítődnek amikor futtatod:

```bash
npm install
```

Ha nem működik, manuálisan:

```bash
npx husky install
chmod +x .husky/pre-push
```
