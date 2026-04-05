# Git Hooks

Ez a mappa tartalmazza a Husky git hook-okat.

## Pre-push Hook

A `pre-push` hook automatikusan fut minden `git push` előtt és a következő ellenőrzéseket végzi:

1. **Production Build (web)** - `pnpm run build:web` a monorepo gyökeréből

Ha bármelyik ellenőrzés sikertelen, a push **nem fog végrehajtódni**.

### Bypass (NE HASZNÁLD ÉLES KÖRNYEZETBEN!)

Ha sürgősen kell pusholni és tudod, hogy mit csinálsz:

```bash
git push --no-verify
```

**FIGYELEM:** Ez kihagyja az összes ellenőrzést és hibás kódot is fel tudsz tölteni!

### Hibák javítása

Ha a pre-push hook hibát jelez:

1. **Lint:**
   ```bash
   pnpm lint
   ```

2. **TypeScript (web):**
   ```bash
   pnpm exec tsc --noEmit -p apps/web
   ```

3. **Build hibák:**
   ```bash
   pnpm run build:web
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
