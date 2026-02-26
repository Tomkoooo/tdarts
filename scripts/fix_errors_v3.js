const { Project, SyntaxKind } = require('ts-morph');
const fs = require('fs');
const path = require('path');

const project = new Project({ tsConfigFilePath: "tsconfig.json" });

const filesToFix = [
    "src/app/[locale]/admin/clubs/page.tsx",
    "src/app/[locale]/admin/layout.tsx",
    "src/app/[locale]/auth/callback/google/page.tsx",
    "src/app/[locale]/feedback/page.tsx",
    "src/app/[locale]/invitations/[token]/page.tsx",
    "src/app/[locale]/layout.tsx",
    "src/app/[locale]/myclub/page.tsx",
    "src/components/admin/CommandPalette.tsx",
    "src/components/forms/CreateTournamentFormEnhanced.tsx",
    "src/components/tournament/TournamentPlayers.tsx",
    "src/lib/toastUtils.tsx"
];

for (const filePath of filesToFix) {
    const absolutePath = path.resolve(filePath);
    if (!fs.existsSync(absolutePath)) continue;

    const sourceFile = project.addSourceFileAtPath(absolutePath);
    let hasChanges = false;

    // Fix src/app/[locale]/layout.tsx specifically
    if (filePath.endsWith('layout.tsx') && sourceFile.getFilePath().includes('src/app/[locale]')) {
        const metadataFunc = sourceFile.getFunction('generateMetadata');
        if (metadataFunc) {
            const useTrans = metadataFunc.getDescendantsOfKind(SyntaxKind.VariableDeclaration)
                .find(v => v.getText().includes('useTranslations("Auto")'));
            if (useTrans) {
                useTrans.remove();
                hasChanges = true;
            }
        }
    }

    // Fix shadowing/duplicate in TournamentPlayers.tsx
    if (filePath.endsWith('TournamentPlayers.tsx')) {
        const func = sourceFile.getFunction('getPlayerStatusBadge');
        if (func) {
            const paramT = func.getParameter('t');
            if (paramT) {
                paramT.rename('t_arg');
                hasChanges = true;
            }
        }
    }

    // Fix toastUtils.tsx specifically
    if (filePath.endsWith('toastUtils.tsx')) {
        // remove the injected const t = useTranslations("Auto") because it's not a component
        const useTransImport = sourceFile.getImportDeclaration('next-intl');
        if (useTransImport) {
            useTransImport.remove();
            hasChanges = true;
        }
        
        const showErrorToastFunc = sourceFile.getVariableDeclaration('showErrorToast');
        if (showErrorToastFunc) {
            const blocker = showErrorToastFunc.getDescendantsOfKind(SyntaxKind.VariableDeclaration)
                .find(v => v.getText().includes('const t = useTranslations("Auto")'));
            if (blocker) {
                blocker.remove();
                hasChanges = true;
            }

            // Fix the toast.error callback param 't'
            const toastErrorCall = showErrorToastFunc.getDescendantsOfKind(SyntaxKind.CallExpression)
                .find(c => c.getExpression().getText() === 'toast.error');
            if (toastErrorCall) {
                const cb = toastErrorCall.getArguments()[0];
                if (cb && cb.getKind() === SyntaxKind.ArrowFunction) {
                    const param = cb.getParameters()[0];
                    if (param && param.getName() === 't') {
                        param.rename('toastObj');
                        hasChanges = true;
                    }
                }
            }
            
            // Revert translated strings to English/Hungarian literal because we can't use 't' here safely without passing it
            // Actually, let's just use hardcoded "Hibabejelentés" for now to fix the build
            sourceFile.getDescendantsOfKind(SyntaxKind.JsxExpression).forEach(expr => {
                if (expr.getText() === '{t("hibabejelentes_oz6e")}') {
                    expr.replaceWithText('"Hibabejelentés"');
                    hasChanges = true;
                }
            });
        }
    }

    // General fix for missing useTranslations or duplicate 't'
    const tCalls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)
        .filter(c => c.getExpression().getText() === 't');

    if (tCalls.length > 0) {
        // Find existing t declarations
        const tDecls = sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration)
            .filter(v => v.getName() === 't');

        if (tDecls.length === 0) {
            // Check top level first
            const defaultExport = sourceFile.getDefaultExportSymbol() || sourceFile.getSymbol();
            const mainFunc = sourceFile.getFunctions().find(f => f.isDefaultExport()) 
                           || sourceFile.getVariableDeclarations().find(v => v.isDefaultExport() || v.getName() === sourceFile.getBaseNameWithoutExtension())?.getInitializerIfKind(SyntaxKind.ArrowFunction);
            
            if (mainFunc && mainFunc.getKind() === SyntaxKind.FunctionDeclaration) {
                mainFunc.insertStatements(0, 'const t = useTranslations("Auto");');
                hasChanges = true;
            } else if (mainFunc && mainFunc.getKind() === SyntaxKind.ArrowFunction) {
                const body = mainFunc.getBody();
                if (body.getKind() === SyntaxKind.Block) {
                    body.insertStatements(0, 'const t = useTranslations("Auto");');
                    hasChanges = true;
                }
            } else {
                // Fallback: search for any block that uses t and insert it there if not present
                tCalls.forEach(call => {
                    let parent = call.getParent();
                    while (parent && parent.getKind() !== SyntaxKind.Block) {
                        parent = parent.getParent();
                    }
                    if (parent) {
                        if (!parent.getText().includes('const t = useTranslations')) {
                             // but check if any outer scope has it
                             let outer = parent;
                             let found = false;
                             while (outer) {
                                 if (outer.getKind() === SyntaxKind.Block && outer.getStatements().some(s => s.getText().includes('const t = useTranslations'))) {
                                     found = true;
                                     break;
                                 }
                                 outer = outer.getParent();
                             }
                             if (!found) {
                                 parent.insertStatements(0, 'const t = useTranslations("Auto");');
                                 hasChanges = true;
                             }
                        }
                    }
                });
            }
        } else if (tDecls.length > 1) {
            // Keep only the first one if they are the same
            const first = tDecls[0];
            tDecls.slice(1).forEach(d => {
                if (d.getInitializer()?.getText().includes('useTranslations')) {
                    d.remove();
                    hasChanges = true;
                }
            });
        }

        // Ensure import
        if (!sourceFile.getImportDeclaration('next-intl') && !filePath.endsWith('toastUtils.tsx')) {
            sourceFile.addImportDeclaration({
                namedImports: ['useTranslations'],
                moduleSpecifier: 'next-intl'
            });
            hasChanges = true;
        }
    }

    if (hasChanges) {
        sourceFile.saveSync();
        console.log(`Fixed ${filePath}`);
    }
}
