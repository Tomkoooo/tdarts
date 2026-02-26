const { Project, SyntaxKind } = require('ts-morph');
const fs = require('fs');

const project = new Project({ tsConfigFilePath: "tsconfig.json" });

const filesToFix = [
  "src/app/[locale]/board/[tournamentId]/page.tsx",
  "src/app/[locale]/tournaments/[code]/live/page.tsx",
  "src/components/board/LocalMatchGame.tsx",
  "src/components/board/MatchGame.tsx",
  "src/components/club/LeagueDetailModal.tsx",
  "src/components/club/LeagueManager.tsx",
  "src/components/player/PlayerStatsModal.tsx",
  "src/lib/toastUtils.tsx"
];

for (const filePath of filesToFix) {
    const sourceFile = project.getSourceFile(filePath) || project.addSourceFileAtPath(filePath);
    let hasChanges = false;
    
    // Find all call expressions of `t("...")`
    const calls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
    for (const call of calls) {
        if (call.getExpression().getText() === 't') {
            // Found a usage of t(). Check if t is declared in scope.
            let safeScope = null;
            let current = call;
            while (current) {
                current = current.getParent();
                if (!current) break;
                if (current.getKind() === SyntaxKind.FunctionDeclaration ||
                    current.getKind() === SyntaxKind.ArrowFunction ||
                    current.getKind() === SyntaxKind.FunctionExpression) {
                    
                    const body = current.getBody();
                    if (body && body.getKind() === SyntaxKind.Block) {
                        safeScope = current;
                        break;
                    }
                }
            }
            
            if (safeScope) {
                const body = safeScope.getBody();
                const stmts = body.getStatements();
                let hasT = false;
                for (const s of stmts) {
                    if (s.getText().includes('useTranslations(')) {
                        hasT = true;
                        break;
                    }
                }
                if (!hasT) {
                    body.insertStatements(0, `const t = useTranslations("Auto");`);
                    hasChanges = true;
                }
            }
        }
    }
    
    // Fix the `toast` shadowing in `toastUtils.tsx`
    if (filePath.includes('toastUtils.tsx')) {
         const tstCalls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
         for (const toast of tstCalls) {
             if (toast.getExpression().getText() === 't' && toast.getParent().getText().includes('hibabejelentés')) {
                 // That's my translated `toast("...")` call, but toastUtils exports a React component
                 // Actually the issue in `toastUtils.tsx` is: "Type 'Toast' has no call signatures. 52 {t("hibabejelentés")}</Button>"
                 // Oh! That means there's a variable named `t` with type `Toast` that shadows my `t`!
                 // Let me manually fix it below.
             }
         }
    }
    
    if (hasChanges) {
        sourceFile.saveSync();
        console.log(`Fixed ${filePath}`);
    }
}
