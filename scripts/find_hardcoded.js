const fs = require('fs');
const path = require('path');

function walk(dir, filelist = []) {
  if (!fs.existsSync(dir)) return filelist;
  fs.readdirSync(dir).forEach(file => {
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      if (!filepath.includes('components/ui') && !filepath.includes('node_modules') && !file.startsWith('.')) {
        filelist = walk(filepath, filelist);
      }
    } else {
      if (filepath.endsWith('.tsx') && !filepath.includes('/api/')) {
        filelist.push(filepath);
      }
    }
  });
  return filelist;
}

const files = walk(path.join(process.cwd(), 'src'));
const unlocalized = [];

// More robust regex logic
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');

  // Skip explicitly translated files
  if (content.includes('next-intl') || content.includes('useTranslations') || content.includes('getTranslations')) {
    continue;
  }

  let hasHardcoded = false;

  // Clean up code comments to avoid matching text inside them
  const noComments = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');

  // 1. Check for Hungarian text or noticeable text inside JSX tags
  // We're looking for > something <
  // Note: the regex match logic below searches for matches of characters often found in regular text
  const jsxTextRegex = />[^<]*?([A-Za-záéíóöőúüűÁÉÍÓÖŐÚÜŰ]{3,}(\s+[A-Za-záéíóöőúüűÁÉÍÓÖŐÚÜŰ]{2,})+)[^<]*?</g;
  let match;
  while ((match = jsxTextRegex.exec(noComments)) !== null) {
    hasHardcoded = true;
    break;
  }

  // 2. Check for Hungarian text inside common string props
  if (!hasHardcoded) {
    const propsRegex = /(?:placeholder|label|title|description|alt)=["']([^"']{3,})["']/g;
    while ((match = propsRegex.exec(noComments)) !== null) {
      // Just check if there's actually a word inside
      if (/[A-Za-záéíóöőúüűÁÉÍÓÖŐÚÜŰ]{3,}/.test(match[1])) {
        hasHardcoded = true;
        break;
      }
    }
  }

  if (hasHardcoded) {
    unlocalized.push(file.replace(process.cwd() + '/', ''));
  }
}

console.log(JSON.stringify(unlocalized, null, 2));
