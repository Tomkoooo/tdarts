# Google OAuth Beállítás

## 1. Google Cloud Console Beállítás

1. Menj a [Google Cloud Console](https://console.cloud.google.com/)-ra
2. Hozz létre egy új projektet vagy válassz egy meglévőt
3. Engedélyezd a Google+ API-t
4. Menj a "Credentials" részhez
5. Kattints "Create Credentials" > "OAuth 2.0 Client IDs"
6. Válaszd ki az "Web application" típust
7. Add meg az engedélyezett JavaScript eredeteket:
   - `http://localhost:3000` (fejlesztéshez)
   - `https://yourdomain.com` (produkcióhoz)
8. Add meg az engedélyezett átirányítási URI-kat:
   - `http://localhost:3000/api/auth/callback/google` (fejlesztéshez)
   - `https://yourdomain.com/api/auth/callback/google` (produkcióhoz)

## 2. Környezeti Változók

Add hozzá a következő változókat a `.env.local` fájlhoz:

```env
# NextAuth
NEXTAUTH_SECRET=your-nextauth-secret-here
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## 3. NEXTAUTH_SECRET Generálása

Generálj egy biztonságos secret-et:

```bash
openssl rand -base64 32
```

## 4. Funkciók

### Új Felhasználók
- Google OAuth-val regisztráló felhasználók automatikusan verifikáltak
- A felhasználónév az email cím prefixe lesz
- A profil kép automatikusan beállításra kerül

### Meglévő Felhasználók
- Ha egy felhasználó már létezik az email címmel, a Google OAuth adatok hozzáadódnak
- A felhasználó automatikusan verifikált lesz
- A profil kép frissül

### Biztonság
- OAuth felhasználóknál nincs jelszó tárolva
- A `matchPassword` metódus `false`-t ad vissza OAuth felhasználóknál
- A jelszó hash-elés kihagyásra kerül OAuth felhasználóknál

## 5. UI Komponensek

### LoginForm
- Google bejelentkezés gomb hozzáadva
- "vagy" elválasztó a hagyományos és Google bejelentkezés között
- Többnyelvű támogatás (magyar/angol)

### RegisterForm
- Google regisztráció gomb hozzáadva
- "vagy" elválasztó a hagyományos és Google regisztráció között
- Többnyelvű támogatás (magyar/angol)

### GoogleAccountLinkModal
- Modal komponens a Google fiók összekapcsolásához
- Email és jelszó mezők a meglévő fiók validálásához
- Automatikus email kitöltés a Google adatokból
- Hibakezelés és loading állapotok

## 6. Adatbázis Változások

### User Model
- `googleId`: Google felhasználó ID
- `profilePicture`: Profil kép URL
- `authProvider`: 'local' vagy 'google'
- `password`: Opcionális (OAuth esetén nincs)

### Interface
- `IUser` interface kibővítve OAuth mezőkkel
- `password` mező opcionális

## 7. API Endpoints

### `/api/auth/[...nextauth]`
- NextAuth.js kezeli az OAuth flow-t
- Google provider konfigurálva

### `/api/auth/google`
- Google OAuth callback kezelése
- JWT token generálása
- Cookie beállítása

### `/api/auth/link-google`
- Meglévő felhasználói fiók összekapcsolása Google OAuth-val
- Email és jelszó validáció
- Google adatok hozzáadása a meglévő fiókhoz

## 8. Hibakezelés

### OAuthAccountNotLinked Hiba
- Ha egy Google fiók már kapcsolva van egy másik felhasználói fiókkal
- Automatikus modal megjelenítése a fiók összekapcsolásához
- A felhasználó megadhatja a meglévő fiókja email címét és jelszavát

### Új Felhasználó Regisztráció
- Ha nincs meglévő fiók az email címmel, automatikus regisztráció
- Google adatok alapján új felhasználó létrehozása
- Automatikus verifikáció és bejelentkezés

### Hibakezelés
- Google OAuth hiba esetén a felhasználó visszairányításra kerül a bejelentkezési oldalra
- Hibaüzenetek megjelenítése a callback oldalon
- Console log-ok a hibakereséshez

## 9. Tesztelés

1. Indítsd el a fejlesztői szervert: `npm run dev`
2. Menj a `/auth/login` oldalra
3. Kattints a "Bejelentkezés Google-lel" gombra
4. Válaszd ki a Google fiókodat
5. Ellenőrizd, hogy sikeresen bejelentkeztél

## 10. Produkció

- Győződj meg róla, hogy a Google Cloud Console-ban beállítottad a helyes domain-t
- A `NEXTAUTH_URL` környezeti változó legyen a produkciós domain
- A `GOOGLE_CLIENT_SECRET` biztonságosan tárolva legyen
