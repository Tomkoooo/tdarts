const { Project, SyntaxKind } = require('ts-morph');
const fs = require('fs');
const path = require('path');

const project = new Project({ tsConfigFilePath: "tsconfig.json" });

const huJsonPath = path.join(process.cwd(), 'messages/hu.json');
const huJson = JSON.parse(fs.readFileSync(huJsonPath, 'utf8'));

if (!huJson.Auto) huJson.Auto = {};

function makeKey(str) {
  let clean = str.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  
  let words = clean.split('_').slice(0, 4);
  let key = words.join('_') || 'text';
  
  // Add a hash of the original string to avoid collisions for different strings that normalize to same key
  const hash = Math.abs(str.split('').reduce((a,b) => {a=((a<<5)-a)+b.charCodeAt(0);return a&a},0)).toString(36).slice(0,4);
  return `${key}_${hash}`;
}

const hungarianRegex = /[A-Za-záéíóöőúüűÁÉÍÓÖŐÚÜŰ]{3,}/;

function walk(dir, filelist = []) {
  if (!fs.existsSync(dir)) return filelist;
  fs.readdirSync(dir).forEach(file => {
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      if (!filepath.includes('node_modules') && !filepath.includes('.next') && !filepath.includes('components/ui') && !file.startsWith('.')) {
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

const allFiles = walk(path.join(process.cwd(), 'src'));

console.log(`Analyzing ${allFiles.length} files...`);

for (const filePath of allFiles) {
  const sourceFile = project.addSourceFileAtPath(filePath);
  let hasChanges = false;
  
  // Determine if t is already used and what namespace
  let existingNamespace = "Auto";
  const useTransCalls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)
    .filter(c => c.getExpression().getText() === 'useTranslations');
  
  if (useTransCalls.length > 0) {
      const arg = useTransCalls[0].getArguments()[0];
      if (arg && arg.getKind() === SyntaxKind.StringLiteral) {
          existingNamespace = arg.getLiteralValue();
      }
  }

  function getNamespaceObject(ns) {
      const parts = ns.split('.');
      let obj = huJson;
      for (const p of parts) {
          if (!obj[p]) obj[p] = {};
          obj = obj[p];
      }
      return obj;
  }

  const targetHu = getNamespaceObject(existingNamespace);

  // 1. Handle JsxText
  sourceFile.getDescendantsOfKind(SyntaxKind.JsxText).forEach(jsxText => {
    const text = jsxText.getLiteralText().trim();
    if (text.length > 1 && hungarianRegex.test(text)) {
      const key = makeKey(text);
      targetHu[key] = text;
      jsxText.replaceWithText(`{t("${key}")}`);
      hasChanges = true;
    }
  });

  // 2. Handle StringLiterals in interesting places
  sourceFile.getDescendantsOfKind(SyntaxKind.StringLiteral).forEach(lit => {
    const text = lit.getLiteralValue().trim();
    if (text.length > 1 && hungarianRegex.test(text)) {
      const parent = lit.getParent();
      let shouldTranslate = false;
      let isJsxAttr = false;

      if (parent.getKind() === SyntaxKind.JsxAttribute) {
        const attrName = parent.getNameNode().getText();
        if (['placeholder', 'label', 'title', 'description', 'alt'].includes(attrName)) {
          shouldTranslate = true;
          isJsxAttr = true;
        }
      } else if (parent.getKind() === SyntaxKind.CallExpression) {
        const callText = parent.getExpression().getText();
        if (callText.includes('toast') || callText.includes('showErrorToast') || callText.includes('showSuccessToast') || callText === 'setError' || callText === 'alert') {
          shouldTranslate = true;
        }
      } else if (parent.getKind() === SyntaxKind.ArrayLiteralExpression || parent.getKind() === SyntaxKind.PropertyAssignment) {
          // Check if it's likely a label in a config object
          const grandParent = parent.getParent();
          if (grandParent && (grandParent.getKind() === SyntaxKind.PropertyAssignment || grandParent.getKind() === SyntaxKind.ObjectLiteralExpression)) {
              if (parent.getKind() === SyntaxKind.PropertyAssignment) {
                  const propName = parent.getNameNode().getText();
                  if (['label', 'name', 'title', 'placeholder'].includes(propName)) {
                      shouldTranslate = true;
                  }
              }
          }
      }

      if (shouldTranslate) {
        const key = makeKey(text);
        targetHu[key] = text;
        if (isJsxAttr) {
          lit.replaceWithText(`{t("${key}")}`);
        } else {
          lit.replaceWithText(`t("${key}")`);
        }
        hasChanges = true;
      }
    }
  });

  if (hasChanges) {
    // Ensure next-intl import
    if (!sourceFile.getImportDeclaration('next-intl')) {
      sourceFile.addImportDeclaration({
        namedImports: ['useTranslations'],
        moduleSpecifier: 'next-intl'
      });
    }

    // Ensure t is declared in functions that use it
    sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach(call => {
      if (call.getExpression().getText() === 't') {
          let current = call;
          let block = null;
          while (current) {
              current = current.getParent();
              if (current && current.getKind() === SyntaxKind.Block) {
                  block = current;
                  // Look for function parent
                  const func = block.getParent();
                  if (func && [SyntaxKind.FunctionDeclaration, SyntaxKind.ArrowFunction, SyntaxKind.FunctionExpression].includes(func.getKind())) {
                      break;
                  }
              }
          }
          
          if (block) {
              const stmts = block.getStatements();
              if (!stmts.some(s => s.getText().includes('const t = useTranslations'))) {
                  block.insertStatements(0, `const t = useTranslations("${existingNamespace}");`);
              }
          }
      }
    });

    sourceFile.saveSync();
    console.log(`Updated ${filePath}`);
  }
}

fs.writeFileSync(huJsonPath, JSON.stringify(huJson, null, 4));
console.log('Saved messages/hu.json');
