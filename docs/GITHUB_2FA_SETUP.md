# GitHub 2FA Beállítás - Git Push Javítás

## 🔐 Probléma

A GitHub 2FA (Two-Factor Authentication) bekapcsolása után nem tudsz pusholni jelszóval.

**Hibaüzenet:**
```
remote: Support for password authentication was removed on August 13, 2021.
remote: Please use a personal access token instead.
```

## ✅ Megoldás: Personal Access Token (PAT)

### 1. GitHub Personal Access Token Létrehozása

1. **Menj a GitHub Token oldalra:**
   ```
   https://github.com/settings/tokens
   ```

2. **Kattints:** `Generate new token` → `Generate new token (classic)`

3. **Töltsd ki:**
   - **Note (név):** `tDarts Development`
   - **Expiration:** `No expiration` vagy `90 days`
   - **Select scopes (jogosultságok):**
     - ✅ `repo` - Teljes repo hozzáférés
     - ✅ `workflow` - GitHub Actions (ha használod)
     - ✅ `write:packages` - Docker registry (ha használod)
     - ✅ `read:org` - Szervezet olvasás (ha szükséges)

4. **Kattints:** `Generate token`

5. **⚠️ FONTOS:** Másold ki a tokent AZONNAL!
   ```
   ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
   **Csak egyszer látod! Mentsd el biztonságos helyre!**

### 2. Token Használata Git-ben (macOS)

A token már be van állítva a rendszereden:

```bash
# Git credential helper már aktív
git config --global credential.helper osxkeychain
```

### 3. Első Push a Token-nel

Amikor legközelebb pushol:

```bash
git push
```

**Felugrik egy ablak:**
- **Username:** `Tomkoooo` (GitHub felhasználóneved)
- **Password:** `ghp_xxxxxxxxxxxx` (a Personal Access Token, NEM a jelszavad!)

A macOS Keychain elmenti, így legközelebb már nem kéri!

### 4. Token Frissítése (ha lejár vagy új kell)

Ha új tokent generáltál, töröld a régit:

```bash
# Régi credentials törlése
git credential-osxkeychain erase <<< "protocol=https
host=github.com"

# Új push - kéri az új tokent
git push
```

## 🔄 Alternatív Megoldás: SSH Kulcs (Haladó)

Ha nem szeretnél token-t használni, SSH kulccsal is tudsz pusholni:

### 1. SSH Kulcs Generálása

```bash
# SSH kulcs generálása
ssh-keygen -t ed25519 -C "your_email@example.com"

# SSH agent indítása
eval "$(ssh-agent -s)"

# Kulcs hozzáadása az agent-hez
ssh-add ~/.ssh/id_ed25519

# Publikus kulcs másolása
pbcopy < ~/.ssh/id_ed25519.pub
```

### 2. SSH Kulcs Hozzáadása GitHub-hoz

1. Menj: https://github.com/settings/keys
2. Kattints: `New SSH key`
3. Illeszd be a kulcsot (már a vágólapon van)
4. Kattints: `Add SSH key`

### 3. Remote URL Átállítása SSH-ra

```bash
# Jelenlegi URL ellenőrzése
git remote -v

# HTTPS URL átállítása SSH-ra
git remote set-url origin git@github.com:Tomkoooo/tdarts.git

# Ellenőrzés
git remote -v
```

### 4. SSH Teszt

```bash
# Kapcsolat tesztelése
ssh -T git@github.com

# Sikeres válasz:
# Hi Tomkoooo! You've successfully authenticated, but GitHub does not provide shell access.
```

## 🛠️ Hibaelhárítás

### Token nem működik

```bash
# 1. Ellenőrizd a token jogosultságait GitHub-on
# 2. Töröld a régi credentials-t
git credential-osxkeychain erase <<< "protocol=https
host=github.com"

# 3. Próbálj újra pusholni
git push
```

### "Permission denied" hiba

```bash
# Ellenőrizd a remote URL-t
git remote -v

# Ha HTTPS, használj PAT-ot
# Ha SSH, ellenőrizd az SSH kulcsot:
ssh -T git@github.com
```

### Token lejárt

1. Generálj új tokent GitHub-on
2. Töröld a régi credentials-t (lásd fent)
3. Push-olj újra az új token-nel

## 📋 Checklist

- [ ] Personal Access Token generálva
- [ ] Token elmentve biztonságos helyre
- [ ] `git config credential.helper osxkeychain` beállítva
- [ ] Régi credentials törölve
- [ ] Első push sikeres az új token-nel
- [ ] Token lejárati dátuma feljegyezve (ha van)

## 🔗 Hasznos Linkek

- [GitHub Personal Access Tokens](https://github.com/settings/tokens)
- [GitHub SSH Keys](https://github.com/settings/keys)
- [GitHub 2FA Dokumentáció](https://docs.github.com/en/authentication/securing-your-account-with-two-factor-authentication-2fa)

---

**Melyiket válaszd?**
- 🟢 **PAT (Token):** Egyszerűbb, gyorsabb beállítás
- 🔵 **SSH:** Biztonságosabb, nem jár le (ajánlott hosszú távra)

**Jelenlegi beállítás:** HTTPS + PAT (már konfigurálva)
