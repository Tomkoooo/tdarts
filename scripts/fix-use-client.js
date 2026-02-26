const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts') || filePath.endsWith('.jsx')) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let useClientIndex = -1;
    let importTranslationsIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('use client') && !lines[i].includes('//')) {
        useClientIndex = i;
      }
      if (lines[i].includes('import { useTranslations } from "next-intl"')) {
        importTranslationsIndex = i;
      }
      // if we found both and use client is a few lines down, maybe we swap them
      // actually, just look at the first few lines
      if (i > 10) break;
    }

    if (useClientIndex > 0 && importTranslationsIndex === 0) {
      console.log(`Fixing ${filePath}`);
      // Swap them: put use client at the very top
      const useClientLine = lines.splice(useClientIndex, 1)[0];
      lines.unshift(useClientLine);
      fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    }
  }
});
