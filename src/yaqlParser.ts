import * as vscode from 'vscode';

export class YaqlParsingError extends Error {
    constructor(public message: string, public position: vscode.Position) {
        super(message);
        this.name = "YaqlParsingError";
    }
}

interface YaqlToken {
    type: 'operator' | 'delimiter' | 'keyword' | 'function' | 'identifier' | 'string' | 'number';
    value: string;
    range: vscode.Range;
}

export class YaqlParser {
    private operators = ['+', '-', '*', '/', '%', '=', '<', '>', '>=', '<=', '!=', 'and', 'or', 'not', 'in'];
    private delimiters = ['(', ')', '{', '}', '[', ']', ',', ';', '?', ':', '$', '.'];
    private yaqlKeywords = [
        'let', 'where', 'select', 'selectMany', 'limit', 'skip',
        'true', 'false', 'null', 'if', 'then', 'else', 'switch', 'case'
    ];
    private yaqlFunctions = [
        // String functions
        'concat', 'join', 'len', 'split', 'str', 'regex', 'match', 'replace',
        'contains', 'toLower', 'toUpper', 'trim', 'endsWith', 'startsWith',

        // Math functions
        'int', 'float', 'abs', 'round', 'floor', 'ceiling', 'pow', 'mod',

        // Collection functions
        'list', 'dict', 'sum', 'avg', 'min', 'max', 'distinct', 'count',
        'fold', 'filter', 'range', 'first', 'last', 'any', 'all',

        // Mistral & OpenStack specific functions
        'task', 'env', 'json_escape', 'execute', 'get_param', 'get_attr'
    ];

    /**
     * Parse a YAQL expression and return tokens or errors
     */
    parseExpression(text: string, offset: vscode.Position = new vscode.Position(0, 0)): { tokens: YaqlToken[], errors: YaqlParsingError[] } {
        const tokens: YaqlToken[] = [];
        const errors: YaqlParsingError[] = [];

        // Simple tokenizer (in a real implementation, this would be more robust)
        let currentIndex = 0;

        while (currentIndex < text.length) {
            let char = text[currentIndex];

            // Skip whitespace
            if (/\s/.test(char)) {
                currentIndex++;
                continue;
            }

            // Handle string literals
            if (char === "'" || char === '"') {
                const quoteType = char;
                const startPos = currentIndex;
                currentIndex++;

                let stringValue = '';
                let isEscaped = false;

                while (currentIndex < text.length) {
                    const c = text[currentIndex];

                    if (isEscaped) {
                        stringValue += c;
                        isEscaped = false;
                    } else if (c === '\\') {
                        isEscaped = true;
                    } else if (c === quoteType) {
                        break;
                    } else {
                        stringValue += c;
                    }

                    currentIndex++;
                }

                if (currentIndex >= text.length || text[currentIndex] !== quoteType) {
                    // Unterminated string
                    const errorPosition = new vscode.Position(
                        offset.line,
                        offset.character + startPos
                    );
                    errors.push(new YaqlParsingError("Unterminated string literal", errorPosition));
                } else {
                    // Include the closing quote
                    currentIndex++;

                    tokens.push({
                        type: 'string',
                        value: stringValue,
                        range: new vscode.Range(
                            offset.line, offset.character + startPos,
                            offset.line, offset.character + currentIndex
                        )
                    });
                }

                continue;
            }

            // Handle numbers
            if (/[0-9]/.test(char)) {
                const startPos = currentIndex;
                let numValue = '';

                // Parse integer part
                while (currentIndex < text.length && /[0-9]/.test(text[currentIndex])) {
                    numValue += text[currentIndex];
                    currentIndex++;
                }

                // Parse decimal part if it exists
                if (currentIndex < text.length && text[currentIndex] === '.') {
                    numValue += '.';
                    currentIndex++;

                    if (!/[0-9]/.test(text[currentIndex])) {
                        const errorPosition = new vscode.Position(
                            offset.line,
                            offset.character + currentIndex
                        );
                        errors.push(new YaqlParsingError("Expected digit after decimal point", errorPosition));
                    }

                    while (currentIndex < text.length && /[0-9]/.test(text[currentIndex])) {
                        numValue += text[currentIndex];
                        currentIndex++;
                    }
                }

                tokens.push({
                    type: 'number',
                    value: numValue,
                    range: new vscode.Range(
                        offset.line, offset.character + startPos,
                        offset.line, offset.character + currentIndex
                    )
                });

                continue;
            }

            // Check for delimiters
            const delimiterMatch = this.delimiters.find(d => text.startsWith(d, currentIndex));
            if (delimiterMatch) {
                tokens.push({
                    type: 'delimiter',
                    value: delimiterMatch,
                    range: new vscode.Range(
                        offset.line, offset.character + currentIndex,
                        offset.line, offset.character + currentIndex + delimiterMatch.length
                    )
                });

                currentIndex += delimiterMatch.length;
                continue;
            }

            // Check for operators
            const operatorMatch = this.operators.find(op => text.startsWith(op, currentIndex) &&
                (currentIndex + op.length === text.length ||
                    !/[a-zA-Z0-9_]/.test(text[currentIndex + op.length])));
            if (operatorMatch) {
                tokens.push({
                    type: 'operator',
                    value: operatorMatch,
                    range: new vscode.Range(
                        offset.line, offset.character + currentIndex,
                        offset.line, offset.character + currentIndex + operatorMatch.length
                    )
                });

                currentIndex += operatorMatch.length;
                continue;
            }

            // Handle identifiers, keywords, and functions
            if (/[a-zA-Z_]/.test(char)) {
                const startPos = currentIndex;
                let identifier = '';

                while (currentIndex < text.length && /[a-zA-Z0-9_]/.test(text[currentIndex])) {
                    identifier += text[currentIndex];
                    currentIndex++;
                }

                let tokenType: 'keyword' | 'function' | 'identifier';

                if (this.yaqlKeywords.includes(identifier)) {
                    tokenType = 'keyword';
                } else if (this.yaqlFunctions.includes(identifier)) {
                    tokenType = 'function';
                } else {
                    tokenType = 'identifier';
                }

                tokens.push({
                    type: tokenType,
                    value: identifier,
                    range: new vscode.Range(
                        offset.line, offset.character + startPos,
                        offset.line, offset.character + currentIndex
                    )
                });

                continue;
            }

            // Unrecognized character
            const errorPosition = new vscode.Position(
                offset.line,
                offset.character + currentIndex
            );
            errors.push(new YaqlParsingError(`Unexpected character: ${char}`, errorPosition));
            currentIndex++;
        }

        return { tokens, errors };
    }

    /**
     * Validate a YAQL expression and return any errors
     */
    validateExpression(expression: string, offset: vscode.Position = new vscode.Position(0, 0)): YaqlParsingError[] {
        // First check if the expression is empty
        if (!expression.trim()) {
            return []; // Empty expressions are valid
        }

        const { tokens, errors } = this.parseExpression(expression, offset);

        // Basic error checks (beyond simple tokenization)

        // Check for balanced brackets/parentheses
        const bracketStack: { char: string, pos: vscode.Position }[] = [];
        for (const token of tokens) {
            if (token.type === 'delimiter') {
                if (['(', '[', '{'].includes(token.value)) {
                    bracketStack.push({
                        char: token.value,
                        pos: new vscode.Position(token.range.start.line, token.range.start.character)
                    });
                } else if (token.value === ')') {
                    if (bracketStack.length === 0 || bracketStack[bracketStack.length - 1].char !== '(') {
                        errors.push(new YaqlParsingError(
                            "Unmatched closing parenthesis",
                            new vscode.Position(token.range.start.line, token.range.start.character)
                        ));
                    } else {
                        bracketStack.pop();
                    }
                } else if (token.value === ']') {
                    if (bracketStack.length === 0 || bracketStack[bracketStack.length - 1].char !== '[') {
                        errors.push(new YaqlParsingError(
                            "Unmatched closing bracket",
                            new vscode.Position(token.range.start.line, token.range.start.character)
                        ));
                    } else {
                        bracketStack.pop();
                    }
                } else if (token.value === '}') {
                    if (bracketStack.length === 0 || bracketStack[bracketStack.length - 1].char !== '{') {
                        errors.push(new YaqlParsingError(
                            "Unmatched closing brace",
                            new vscode.Position(token.range.start.line, token.range.start.character)
                        ));
                    } else {
                        bracketStack.pop();
                    }
                }
            }
        }

        // Check for unclosed brackets/parentheses
        for (const bracket of bracketStack) {
            let message = "";
            switch (bracket.char) {
                case '(': message = "Unclosed parenthesis"; break;
                case '[': message = "Unclosed bracket"; break;
                case '{': message = "Unclosed brace"; break;
            }
            errors.push(new YaqlParsingError(message, bracket.pos));
        }

        return errors;
    }

    /**
     * Extract YAQL expressions from YAML text
     * Looks for patterns like <% yaql_expression %>
     */
    extractYaqlExpressions(text: string): { expression: string, range: vscode.Range }[] {
        const expressions: { expression: string, range: vscode.Range }[] = [];
        const regex = /<%\s*(.*?)\s*%>/g;

        let match;
        while ((match = regex.exec(text)) !== null) {
            const matchedText = match[0];
            const expressionText = match[1];

            // Calculate the position in the document
            const matchStart = match.index;
            const matchEnd = matchStart + matchedText.length;

            // Find the line and character position
            let line = 0;
            let charPosStart = 0;
            let currentPos = 0;

            // Find the line number and start character position
            while (currentPos <= matchStart) {
                const newlineIndex = text.indexOf('\n', currentPos);
                if (newlineIndex !== -1 && newlineIndex < matchStart) {
                    line++;
                    currentPos = newlineIndex + 1;
                    charPosStart = 0;
                } else {
                    charPosStart = matchStart - currentPos;
                    break;
                }
            }

            // Calculate the end position
            let charPosEnd = charPosStart;
            let endLine = line;
            for (let i = matchStart; i < matchEnd; i++) {
                if (text[i] === '\n') {
                    endLine++;
                    charPosEnd = 0;
                } else {
                    charPosEnd++;
                }
            }

            expressions.push({
                expression: expressionText,
                range: new vscode.Range(line, charPosStart, endLine, charPosEnd)
            });
        }

        return expressions;
    }
}