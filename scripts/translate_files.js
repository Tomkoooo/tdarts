const fs = require('fs');
const path = require('path');

const config = {
  "src/app/[locale]/admin/announcements/page.tsx": {
    namespace: "Admin.Announcements",
    replacements: [
      { text: "Announcement Kezelő", key: "title" },
      { text: "Rendszerüzenetek létrehozása és kezelése", key: "subtitle" }
    ]
  },
  "src/app/[locale]/admin/clubs/page.tsx": {
    namespace: "Admin.Clubs",
    replacements: [
      { text: "Hiba történt az adatok betöltése során", key: "error_fetch" },
      { text: "Klubok kezelése, statisztikák és áttekintés", key: "subtitle" },
      { text: "Klubok napi létrehozása", key: "charts.daily" },
      { text: "Keresés név, helyszín vagy leírás alapján...", key: "search_placeholder" },
      { text: "Nincs találat a keresési feltételek alapján.", key: "no_results" },
      { text: "Klubok", key: "title" },
      { text: "Frissítés", key: "refresh" },
      { text: "Összes Klub", key: "stats.total" },
      { text: "Aktív Klubok", key: "stats.active" },
      { text: "Hitelesített", key: "stats.verified" },
      { text: "Csak Hitelesített", key: "filter.verified_only" },
      { text: "Csak Nem Hitelesített", key: "filter.unverified_only" },
      { text: "Szűrés státuszra", key: "filter.placeholder" },
      { text: "Minden klub", key: "filter.all" },
      { text: "Törölt", key: "stats.deleted" },
      { text: "TÖRÖLVE", key: "status.deleted" },
      { text: "Normál", key: "status.normal" },
      { text: "Klub Név", key: "table.name" },
      { text: "Helyszín", key: "table.location" },
      { text: "Csomag", key: "table.package" },
      { text: "Tagok", key: "table.members" },
      { text: "Versenyek", key: "table.tournaments" },
      { text: "Státusz", key: "table.status" },
      { text: "Létrehozva", key: "table.created_at" },
      { text: "Műveletek", key: "table.actions" }
    ]
  },
  "src/app/[locale]/admin/emails/page.tsx": {
    namespace: "Admin.Emails",
    replacements: [
      { text: "Hiba történt a sablonok betöltése során", key: "toasts.fetch_error" },
      { text: "Hálózati hiba történt", key: "toasts.network_error" },
      { text: "Sablon sikeresen mentve", key: "toasts.save_success" },
      { text: "Hiba történt a mentés során", key: "toasts.save_error" },
      { text: "Kérjük, adj meg egy email címet", key: "toasts.missing_email" },
      { text: "Teszt email elküldve", key: "toasts.test_sent" },
      { text: "Hiba történt a küldés során", key: "toasts.test_error" },
      { text: "Sablonok betöltése...", key: "loading" },
      { text: "Email Sablonok", key: "title" },
      { text: "Kezeld az email sablonokat, amelyeket a platform küld a felhasználóknak", key: "subtitle" },
      { text: "Sablonok", key: "templates" },
      { text: "Inaktív", key: "inactive" },
      { text: "Mégse", key: "cancel" },
      { text: "Mentés...", key: "saving" },
      { text: "Mentés", key: "save" },
      { text: "Kód mód", key: "code_mode" },
      { text: "Előnézet", key: "preview" },
      { text: "Szerkesztés", key: "edit" },
      { text: "Elérhető változók:", key: "available_variables" },
      { text: "Használd ezeket a változókat a sablonban, pl:", key: "variables_help" },
      { text: "Tárgy", key: "subject" },
      { text: "HTML Tartalom", key: "html_content" },
      { text: "Szöveges Tartalom (fallback)", key: "text_content" },
      { text: "Teszt email küldése", key: "send_test.title" },
      { text: "Címzett email", key: "send_test.recipient" },
      { text: "Küldés", key: "send_test.send" },
      { text: "A teszt emailt a fent látható módon rendereljük, minta adatokkal feltöltve.", key: "send_test.help" },
      { text: "Kulcs:", key: "metadata.key" },
      { text: "Utolsó módosítás:", key: "metadata.last_modified" },
      { text: "Alapértelmezett:", key: "metadata.is_default" },
      { text: "Igen", key: "yes" },
      { text: "Nem", key: "no" },
      { text: "Nincs kiválasztott sablon", key: "no_template.title" },
      { text: "Válassz egy sablont a bal oldali listából a megtekintéshez és szerkesztéshez", key: "no_template.subtitle" }
    ]
  }
};

const huJsonPath = path.join(process.cwd(), 'messages/hu.json');
const huJson = JSON.parse(fs.readFileSync(huJsonPath, 'utf8'));

// Only creating if not exists
if (!huJson.Admin) huJson.Admin = {};

Object.entries(config).forEach(([filePath, fileConfig]) => {
  const absolutePath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(absolutePath)) {
    console.log(`File not found: ${absolutePath}`);
    return;
  }
  let content = fs.readFileSync(absolutePath, 'utf8');

  // Add keys to JSON
  const nsParts = fileConfig.namespace.split('.');
  let currentObj = huJson;
  nsParts.forEach((part, index) => {
    if (!currentObj[part]) currentObj[part] = {};
    if (index === nsParts.length - 1) {
      fileConfig.replacements.forEach(rep => {
         const keyParts = rep.key.split('.');
         let target = currentObj[part];
         for (let i = 0; i < keyParts.length - 1; i++) {
           if (!target[keyParts[i]]) target[keyParts[i]] = {};
           target = target[keyParts[i]];
         }
         target[keyParts[keyParts.length - 1]] = rep.text;
      });
    } else {
      currentObj = currentObj[part];
    }
  });

  // Prepare component for useTranslations
  if (!content.includes('next-intl')) {
    // Add import statement near other imports
    content = content.replace(/(import.*?;?\n)(?!import)/, `$1import { useTranslations } from "next-intl";\n`);
  }

  // Add the hook inside the component
  const componentMatch = content.match(/export default function ([a-zA-Z0-9_]+)\s*\([^)]*\)\s*\{/);
  if (componentMatch && !content.includes(`const t = useTranslations("${fileConfig.namespace}")`)) {
    content = content.replace(componentMatch[0], `${componentMatch[0]}\n  const t = useTranslations("${fileConfig.namespace}");\n`);
  }

  // Very naively replace exact text matches (with strict boundary checks where possible)
  fileConfig.replacements.forEach(rep => {
     // Check if text is surrounded by jsx tags
     const jsxRegex = new RegExp(`>\\s*${rep.text}\\s*<`, 'g');
     content = content.replace(jsxRegex, `>{t("${rep.key}")}<`);

     // Check if text is inside generic quotes in a JSX attribute (like placeholder="...")
     const attrRegex = new RegExp(`="\\s*${rep.text}\\s*"`, 'g');
     content = content.replace(attrRegex, `={t("${rep.key}")}`);

     // Also strings in functions like toast.error("...") 
     const strRegex = new RegExp(`(["'\`])${rep.text}\\1`, 'g');
     content = content.replace(strRegex, `t("${rep.key}")`);
  });

  fs.writeFileSync(absolutePath, content);
  console.log(`Updated ${filePath}`);
});

fs.writeFileSync(huJsonPath, JSON.stringify(huJson, null, 4));
console.log('Updated messages/hu.json');
