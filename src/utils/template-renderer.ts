export function renderTemplate(template: string, rootElement: any): string {
    // Regex zum Finden der for-Schleife
    template = template.replace(
        /@for\s*\((.*?)\)\s*\{([^{}]*(?:\{\{[^{}]*\}\}[^{}]*)*)\}/gs,
        (_, expr, innerTemplate) => {
            const match = expr.match(/let\s+(\w+)\s+of\s+(\w+)/);
            if (!match) return '';

            const itemVar = match[1];
            const arrayVar = match[2];

            const array = rootElement[arrayVar];
            if (!Array.isArray(array)) {
                throw new Error(
                    `Syntax error or "${arrayVar}" in template ${template} is not a valid array variable in the context.`
                );
            }

            return array
                .map((item) => {
                    return innerTemplate.replace(
                        new RegExp(`{{\\s*${itemVar}\\s*}}`, 'g'),
                        item
                    );
                })
                .join('');
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
