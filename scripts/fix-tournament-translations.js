const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      if (content.match(/t\(['"]Tournament\./)) {
        console.log('Fixing', fullPath);
        
        // Inject tTour if not present
        if (!content.includes('const tTour = useTranslations("Tournament")')) {
          content = content.replace(
            /(const t = useTranslations\([^)]*\);?)/i,
            '$1\n  const tTour = useTranslations("Tournament");'
          );
        }
        
        // Replace t('Tournament. -> tTour('
        content = content.replace(/t\('Tournament\./g, "tTour('");
        content = content.replace(/t\("Tournament\./g, 'tTour("');
        
        fs.writeFileSync(fullPath, content, 'utf8');
      }
    }
  }
}

processDir('/Users/tomko/programing/tdarts_torunament/src/components/tournament');
console.log('Done');
