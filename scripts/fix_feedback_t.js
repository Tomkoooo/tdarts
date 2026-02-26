const { Project, SyntaxKind } = require('ts-morph');
const fs = require('fs');
const path = require('path');

const project = new Project({ tsConfigFilePath: "tsconfig.json" });

const targets = [
    {
        file: "src/app/[locale]/feedback/page.tsx",
        constName: "categoryConfig"
    },
    {
        file: "src/app/[locale]/feedback/page.tsx",
        constName: "deviceOptions"
    }
];

for (const target of targets) {
    const absolutePath = path.resolve(target.file);
    if (!fs.existsSync(absolutePath)) continue;

    const sourceFile = project.addSourceFileAtPath(absolutePath);
    const variable = sourceFile.getVariableDeclaration(target.constName);
    
    if (variable) {
        const initializer = variable.getInitializer().getText();
        const statement = variable.getVariableStatement();
        
        // Find default export component
        const mainFunc = sourceFile.getFunctions().find(f => f.isDefaultExport()) 
                       || sourceFile.getVariableDeclarations().find(v => v.isDefaultExport())?.getInitializerIfKind(SyntaxKind.ArrowFunction)
                       || sourceFile.getFunction(sourceFile.getBaseNameWithoutExtension())
                       || sourceFile.getVariableDeclaration(sourceFile.getBaseNameWithoutExtension())?.getInitializerIfKind(SyntaxKind.ArrowFunction);

        if (mainFunc) {
            let body;
            if (mainFunc.getKind() === SyntaxKind.FunctionDeclaration) {
                body = mainFunc;
            } else if (mainFunc.getKind() === SyntaxKind.ArrowFunction) {
                body = mainFunc.getBody();
            }

            if (body) {
                // Ensure useMemo is imported
                if (!sourceFile.getImportDeclaration('react')?.getNamedImports().some(i => i.getName() === 'useMemo')) {
                    const reactImport = sourceFile.getImportDeclaration('react');
                    if (reactImport) {
                        reactImport.addNamedImport('useMemo');
                    } else {
                        sourceFile.addImportDeclaration({
                            namedImports: ['useMemo'],
                            moduleSpecifier: 'react'
                        });
                    }
                }

                // Insert useMemo inside body
                body.insertStatements(1, `const ${target.constName} = useMemo(() => (${initializer}), [t]);`);
                
                // Remove original global statement
                statement.remove();
                
                sourceFile.saveSync();
                console.log(`Moved ${target.constName} inside component in ${target.file}`);
            }
        }
    }
}
