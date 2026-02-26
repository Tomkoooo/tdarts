#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Files to update
const files = {
  'src/app/[locale]/admin/announcements/page.tsx': { namespace: 'Admin.announcements', useCommon: false },
  'src/app/[locale]/admin/clubs/page.tsx': { namespace: 'Admin.clubs', useCommon: true },
  'src/app/[locale]/admin/tournaments/page.tsx': { namespace: 'Admin.tournaments', useCommon: true },
  'src/app/[locale]/admin/users/page.tsx': { namespace: 'Admin.users', useCommon: true },
  'src/app/[locale]/admin/errors/page.tsx': { namespace: 'Admin.errors', useCommon: false },
  'src/app/[locale]/admin/settings/page.tsx': { namespace: 'Admin.settings', useCommon: false },
  'src/app/[locale]/admin/emails/page.tsx': { namespace: 'Admin.emails', useCommon: false },
  'src/app/[locale]/admin/todos/page.tsx': { namespace: 'Admin.todos', useCommon: false },
  'src/app/[locale]/admin/feedback/page.tsx': { namespace: 'Admin.feedback', useCommon: false },
  'src/app/[locale]/admin/leagues/page.tsx': { namespace: 'Admin.leagues', useCommon: true },
  'src/app/[locale]/admin/layout.tsx': { namespace: 'Admin.layout', useCommon: false },
  'src/components/admin/CommandPalette.tsx': { namespace: 'Admin.components', useCommon: false },
  'src/components/admin/GlobalTodoShortcut.tsx': { namespace: 'Admin.components', useCommon: false },
  'src/components/admin/YearWrapCard.tsx': { namespace: 'Admin.components', useCommon: false },
  'src/components/admin/SmartTodoManager.tsx': { namespace: 'Admin.components', useCommon: false },
  'src/components/admin/DailyChart.tsx': { namespace: 'Admin.components', useCommon: false },
  'src/components/admin/SmartInput.tsx': { namespace: 'Admin.components', useCommon: false },
};

// Common keys that should use tCommon
const commonKeys = [
  'hiba_történt_az', 'létrehozva', 'találat_oldal', 'törölve', 'versenyek',
  'összesen', 'aktív', 'játékosok', 'klub'
];

let updatedCount = 0;

for (const [filePath, config] of Object.entries(files)) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠ Skipping ${filePath} - file not found`);
    continue;
  }
  
  let content = fs.readFileSync(fullPath, 'utf-8');
  
  // Update useTranslations("Auto") to new namespace
  const autoRegex = /const\s+t\s*=\s*useTranslations\(["']Auto["']\);?/;
  if (autoRegex.test(content)) {
    if (config.useCommon) {
      content = content.replace(
        autoRegex,
        `const t = useTranslations("${config.namespace}");\n    const tCommon = useTranslations("Admin.common");`
      );
    } else {
      content = content.replace(
        autoRegex,
        `const t = useTranslations("${config.namespace}");`
      );
    }
    
    // If useCommon, replace common key usages
    if (config.useCommon) {
      commonKeys.forEach(key => {
        const regex = new RegExp(`t\\(["']${key}["']\\)`, 'g');
        content = content.replace(regex, `tCommon("${key}")`);
      });
    }
    
    fs.writeFileSync(fullPath, content, 'utf-8');
    updatedCount++;
    console.log(`✓ Updated ${filePath}`);
  } else {
    console.log(`⚠ Skipping ${filePath} - no Auto translation found`);
  }
}

console.log(`\n✓ Successfully updated ${updatedCount} admin files`);
