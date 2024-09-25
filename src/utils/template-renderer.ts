export function renderTemplate(template: string, rootElement: any): string {
    // Regex zum Finden der for-Schleife
    template = template.replace(
        /@for\s*\((.*?)\)\s*\{([^{}]*(?:\{\{[^{}]*\}\}[^{}]*)*)\}/gs,
        (_, expr, innerTemplate) => {
            // Prüfe, ob es sich um eine "for...of"-Schleife handelt
            let match = expr.match(/let\s+(\w+)\s+of\s+(\w+)/);
            if (match) {
                const itemVar = match[1];
                const arrayVar = match[2];

                const array = rootElement[arrayVar];
                if (!Array.isArray(array) && typeof array !== 'object') {
                    throw new Error(
                        `Syntax error: "${arrayVar}" in template ${template} is not a valid array or object variable in the context.`
                    );
                }

                // Verarbeite "for...of"-Schleife für Arrays oder Objekte mit numerischen Schlüsseln
                return Object.keys(array)
                    .map((key) => {
                        return innerTemplate.replace(
                            new RegExp(`{{\\s*${itemVar}\\s*}}`, 'g'),
                            array[key]
                        );
                    })
                    .join('');
            }

            // Prüfe, ob es sich um eine "for"-Schleife handelt, inklusive Array- und Objekt-Zugriffe wie "files[0]"
            match = expr.match(
                /let\s+(\w+)\s*=\s*(.+);\s*\1\s*<\s*(.+);\s*\1\+\+/
            );
            if (match) {
                const indexVar = match[1];
                const startExpr = match[2];
                const endExpr = match[3];

                // Funktion zum Auswerten von Ausdrücken, die auch Array- und Objekt-Zugriffe enthalten können
                const evaluateExpression = (expr: string): number => {
                    // Überprüfen, ob der Ausdruck ein Array- oder Objekt-Zugriff wie "files[0]" ist
                    const arrayAccessMatch = expr.match(/(\w+)\[(\d+)\]/);
                    if (arrayAccessMatch) {
                        const arrayVar = arrayAccessMatch[1];
                        const arrayIndex = parseInt(arrayAccessMatch[2], 10);
                        const array = rootElement[arrayVar];
                        if (Array.isArray(array) || typeof array === 'object') {
                            return array[arrayIndex];
                        } else {
                            throw new Error(
                                `Variable "${arrayVar}" in template ${template} is not an array or object.`
                            );
                        }
                    }

                    // Falls es keine Array- oder Objekt-Zugriffe gibt, prüfe, ob es eine Zahl oder eine Variable im rootElement ist
                    return isNaN(Number(expr))
                        ? rootElement[expr]
                        : parseInt(expr, 10);
                };

                // Konvertiere den Start- und Endwert, entweder aus rootElement oder als direkte Zahl oder Array-/Objekt-Zugriff
                const start = evaluateExpression(startExpr);
                const end = evaluateExpression(endExpr);

                // Verarbeite "for"-Schleife
                const result = [];
                for (let i = start; i < end; i++) {
                    let innerResult = innerTemplate.replace(
                        new RegExp(`{{\\s*${indexVar}\\s*}}`, 'g'),
                        i.toString()
                    );

                    // Ersetze auch andere Variablen aus dem rootElement-Kontext
                    innerResult = innerResult.replace(
                        /{{\s*([\w\.\-]+)\s*}}/g,
                        (match: any, variableName: string) => {
                            if (variableName in rootElement) {
                                return String(rootElement[variableName]);
                            } else {
                                throw new Error(
                                    `Syntax error or variable “${variableName}” in the template ${template} does not exist in the context.`
                                );
                            }
                        }
                    );

                    result.push(innerResult);
                }

                return result.join('');
            }

            throw new Error(
                `Unsupported "for" loop format in template: ${expr}`
            );
        }
    );

    // Regex zum Finden der if-Bedingungen
    template = template.replace(
        /@if\s*\((.*?)\)\s*\{([^{}]*(?:\{\{[^{}]*\}\}[^{}]*)*)\}/gs,
        (_, condition, innerTemplate) => {
            // Ersetze Variablen im Ausdruck durch Werte aus dem Kontext
            const conditionWithContext = condition.replace(
                /\b(\w+)\b/g,
                (match: string | number) => {
                    return rootElement.hasOwnProperty(match)
                        ? JSON.stringify(rootElement[match])
                        : match;
                }
            );
            // Auswertung der Bedingung
            const conditionResult = eval(conditionWithContext);

            if (conditionResult) {
                return innerTemplate;
            } else {
                return '';
            }
        }
    );

    // Erkennung und Ersetzung von Attribut-Bindungen [attribute]=expression
    template = template.replace(
        /\[(\w+)\]\s*=\s*["']?([\w\.\-]+)["']?/g,
        (match, attributeName, expression) => {
            if (expression in rootElement) {
                const value = rootElement[expression];

                if (value) {
                    return `${attributeName}="${value}"`;
                } else {
                    return ''; // Attribut weglassen, wenn der Wert false ist
                }
            } else {
                throw new Error(
                    `Syntax error or variable “${expression}” in the template ${template} does not exist in the context.`
                );
            }
        }
    );

    // Ersetzen von {{variable}} durch die tatsächlichen Werte aus dem Kontext
    template = template.replace(
        /{{\s*([\w\.\-]+)\s*}}/g,
        (match, variableName) => {
            if (variableName in rootElement) {
                return String(rootElement[variableName]);
            } else {
                throw new Error(
                    `Syntax error or variable “${variableName}” in the template ${template} does not exist in the context.`
                );
            }
        }
    );

    return template;
}
