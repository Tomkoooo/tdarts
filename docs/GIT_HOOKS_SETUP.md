# Git Hooks Beállítás - tDarts

## 📋 Áttekintés

A projektben Husky git hook-ok vannak beállítva, amelyek **automatikusan futnak push előtt** és megakadályozzák a hibás kód feltöltését.

## 🎯 Mit csinál a pre-push hook?

Minden `git push` parancs előtt automatikusan lefut:

1. ✅ **ESLint** - Kód minőség és stílus ellenőrzés
2. ✅ **TypeScript Type Check** - Típus hibák ellenőrzése
3. ✅ **Production Build** - Teljes build teszt

Ha **bármelyik sikertelen**, a push **megszakad** és nem töltődik fel a kód!

## 🚀 Használat

### Normál push

```bash
git add .
git commit -m "feat: új funkció"
git push
```

A hook automatikusan lefut és ellenőrzi a kódot. Ha minden rendben, a push végrehajtódik.

### Ha hiba van

```
🚀 Running pre-push checks...
⏳ This may take a few minutes...

📝 Running ESLint...
❌ ESLint failed. Please fix the errors before pushing.
Run 'npm run lint' to see the errors.
```

**Javítsd a hibákat:**

```bash
# ESLint hibák
npm run lint

# TypeScript hibák
npx tsc --noEmit

# Build hibák
npm run build
```

Majd próbáld újra:

```bash
git push
```

## ⚠️ Bypass (Csak vészhelyzetben!)

Ha **SÜRGŐSEN** kell pusholni és tudod, hogy mit csinálsz:

```bash
git push --no-verify
```

**FIGYELEM:** 
- Ez kihagyja az összes ellenőrzést!
- Hibás kód kerülhet a repository-ba!
- A CI/CD pipeline továbbra is futni fog!
- **NE HASZNÁLD** rutinszerűen!

## 🔧 Telepítés (új fejlesztőknek)

A hook-ok automatikusan települnek amikor klónozod a repo-t és futtatod:

```bash
npm install
```

Ha nem működik, manuálisan:

```bash
npx husky install
chmod +x .husky/pre-push
```

## 📊 CI/CD Pipeline

A GitHub Actions továbbra is fut minden push után és Docker image-et build-el:

- **Lokális pre-push hook:** Gyors ellenőrzés push előtt
- **GitHub Actions:** Docker build és deploy a main branch-re

## 🛠️ Hook letiltása (fejlesztés során)

Ha ideiglenesen le akarod tiltani:

```bash
# Letiltás
mv .husky/pre-push .husky/pre-push.disabled

# Visszaállítás
mv .husky/pre-push.disabled .husky/pre-push
```

## 📝 Tippek

1. **Commit gyakran, push ritkábban** - A hook csak push-nál fut
2. **Futtasd lokálisan** - `npm run lint` és `npm run build` commit előtt
3. **Ne használd a --no-verify-t** - Csak vészhelyzetben!
4. **Javítsd a hibákat azonnal** - Ne halmozd fel őket

## 🐛 Hibaelhárítás

### A hook nem fut

```bash
# Ellenőrizd a telepítést
ls -la .husky/

# Újratelepítés
npx husky install
chmod +x .husky/pre-push
```

### Permission denied

```bash
chmod +x .husky/pre-push
```

### Hook fut, de nem működik

```bash
# Ellenőrizd a fájl tartalmát
cat .husky/pre-push

# Teszteld manuálisan
.husky/pre-push
```

## 📚 További információ

- [Husky dokumentáció](https://typicode.github.io/husky/)
- [Git Hooks](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks)

## ✅ Checklist új fejlesztőknek

- [ ] `npm install` futtatva
- [ ] `.husky/pre-push` létezik és futtatható
- [ ] Teszt push: `git push --dry-run`
- [ ] Hook fut és ellenőrzi a kódot
- [ ] Dokumentáció elolvasva

---

**Kérdések?** Keresd a projekt maintainer-ét!
