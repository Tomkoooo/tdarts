const { Project, SyntaxKind } = require('ts-morph');
const fs = require('fs');
const path = require('path');

const filesToFix = [
  "src/app/[locale]/board/[tournamentId]/page.tsx",
  "src/app/[locale]/board/redirect/[clubId]/page.tsx",
  "src/app/[locale]/tournaments/[code]/live/page.tsx",
  "src/components/board/LocalMatchGame.tsx",
  "src/components/board/MatchGame.tsx",
  "src/components/club/LeagueDetailModal.tsx",
  "src/components/club/LeagueManager.tsx",
  "src/components/player/PlayerStatsModal.tsx",
  "src/lib/toastUtils.tsx"
];

const huJsonPath = path.join(process.cwd(), 'messages/hu.json');
const huJson = JSON.parse(fs.readFileSync(huJsonPath, 'utf8'));

if (!huJson.Auto) huJson.Auto = {};

function makeKey(str) {
  let clean = str.toLowerCase().replace(/[^a-záéíóöőúüű]+/g, '_').replace(/^_+|_+$/g, '');
  let words = clean.split('_').slice(0, 3);
  return words.join('_') || 'text';
}

const project = new Project({ tsConfigFilePath: "tsconfig.json" });
const hungarianRegex = /[A-Za-záéíóöőúüűÁÉÍÓÖŐÚÜŰ]{3,}/;

for (const filePath of filesToFix) {
  const absolutePath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(absolutePath)) continue;
  
  const sourceFile = project.getSourceFile(absolutePath) || project.addSourceFileAtPath(absolutePath);
  
  const ns = "Auto";
  let hasChanges = false;
  
  // Find all JsxText components
  const jsxTexts = sourceFile.getDescendantsOfKind(SyntaxKind.JsxText);
  for (const jsxText of jsxTexts) {
     const text = jsxText.getLiteralText().trim();
     if (text.length > 2 && hungarianRegex.test(text)) {
         let key = makeKey(text);
         if (huJson.Auto[key] && huJson.Auto[key] !== text) {
             key = key + '_' + Math.floor(Math.random() * 100);
         }
         huJson.Auto[key] = text;
         
         jsxText.replaceWithText(`{t("${key}")}`);
         hasChanges = true;
     }
  }
  
  // Find all JsxAttributes and CallExpressions
  const stringLiterals = sourceFile.getDescendantsOfKind(SyntaxKind.StringLiteral);
  for (const lit of stringLiterals) {
     const parent = lit.getParent();
     const text = lit.getLiteralValue().trim();
     
     if (text.length > 2 && hungarianRegex.test(text)) {
         let valid = false;
         if (parent.getKind() === SyntaxKind.JsxAttribute) {
             const attrName = parent.getNameNode().getText();
             if (['placeholder', 'label', 'title', 'description', 'alt', 'text'].includes(attrName)) {
                 valid = true;
             }
         } else if (parent.getKind() === SyntaxKind.CallExpression) {
             const expStr = parent.getExpression().getText();
             if (expStr.includes('toast') || expStr.includes('showErrorToast') || expStr.includes('showSuccessToast')) {
                 valid = true;
             }
         }
         
         if (valid && !parent.getFirstAncestorByKind(SyntaxKind.ImportDeclaration)) {
             if (parent.getFirstAncestorByKind(SyntaxKind.FunctionDeclaration) || 
                 parent.getFirstAncestorByKind(SyntaxKind.ArrowFunction)) {
                 
                 let key = makeKey(text);
                 if (huJson.Auto[key] && huJson.Auto[key] !== text) {
                     key = key + '_' + Math.floor(Math.random() * 100);
                 }
                 huJson.Auto[key] = text;
                 
                 if (parent.getKind() === SyntaxKind.JsxAttribute) {
                     lit.replaceWithText(`{t("${key}")}`);
                 } else { // CallExpression
                     lit.replaceWithText(`t("${key}")`);
                 }
                 hasChanges = true;
             }
         }
     }
  }

  if (hasChanges) {
     const imports = sourceFile.getImportDeclarations();
     let hasNextIntl = false;
     for (const imp of imports) {
         if (imp.getModuleSpecifierValue() === 'next-intl') {
             hasNextIntl = true;
             break;
         }
     }
     if (!hasNextIntl) {
         sourceFile.insertImportDeclaration(0, {
             namedImports: ['useTranslations'],
             moduleSpecifier: 'next-intl'
         });
     }
     
     // Robustly find all functions/arrows that use `t` and inject `const t = useTranslations("Auto");`
     const calls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
     const blocksToInject = new Set();
     
     for (const call of calls) {
        if (call.getExpression().getText() === 't') {
            let scope = call.getFirstAncestorByKind(SyntaxKind.Block);
            if (scope) {
                // Find the highest block that is a function body
                let parentFunc = call.getFirstAncestorByKind(SyntaxKind.ArrowFunction) || 
                                 call.getFirstAncestorByKind(SyntaxKind.FunctionDeclaration) ||
                                 call.getFirstAncestorByKind(SyntaxKind.FunctionExpression);
                if (parentFunc && parentFunc.getBody().getKind() === SyntaxKind.Block) {
                    blocksToInject.add(parentFunc.getBody());
                }
            }
        }
     }
     
     for (const block of blocksToInject) {
         const stmts = block.getStatements();
         let hasT = false;
         for (const s of stmts) {
             if (s.getText().includes('useTranslations(') || s.getText().includes('useTranslations<')) {
                 hasT = true;
                 break;
             }
         }
         if (!hasT) {
             block.insertStatements(0, `const t = useTranslations("${ns}");`);
         }
     }
     
     sourceFile.saveSync();
     console.log(`Updated ${filePath}`);
  }
}

fs.writeFileSync(huJsonPath, JSON.stringify(huJson, null, 4));
console.log('Saved messages/hu.json');
