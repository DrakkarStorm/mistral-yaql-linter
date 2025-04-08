import * as yaml from "js-yaml";
import * as vscode from "vscode";
import { YaqlParser, YaqlParsingError } from "./yaqlParser";
export class MistralValidationError extends Error {
    constructor(public message: string, public range: vscode.Range) {
        super(message);
        this.name = "MistralValidationError";
    }
}

interface YaqlExpr { expression: string; range: vscode.Range; }


export class MistralValidator {
    private yaqlParser: YaqlParser;

    constructor() {
        this.yaqlParser = new YaqlParser();
    }


    /**
     * Validate a Mistral workflow document
     */
    validateDocument(
        document: vscode.TextDocument
    ): (YaqlParsingError | MistralValidationError)[] {
        const errors: (YaqlParsingError | MistralValidationError)[] = [];
        const fullText = document.getText();

        try {
            // Parse the YAML document
            const yamlDoc = yaml.load(fullText) as any;

            // Check if this is a Mistral workflow file
            if (!yamlDoc || typeof yamlDoc !== "object") {
                return errors;
            }

            // Check for version
            if (!yamlDoc.version) {
                errors.push(
                    new MistralValidationError(
                        "Missing 'version' field in workflow definition",
                        this.findKeyRange(fullText, "version")
                    )
                );
            } else if (yamlDoc.version !== "2.0") {
                errors.push(
                    new MistralValidationError(
                        "Unsupported Mistral version. Only '2.0' is supported",
                        this.findKeyRange(fullText, "version")
                    )
                );
            }

            // Validate workflows section
            if (!yamlDoc.workflows) {
                errors.push(
                    new MistralValidationError(
                        "Missing 'workflows' section in Mistral definition",
                        new vscode.Range(0, 0, 0, 10) // Just highlight the beginning of the file
                    )
                );
            } else if (typeof yamlDoc.workflows !== "object") {
                errors.push(
                    new MistralValidationError(
                        "'workflows' must be an object mapping workflow names to definitions",
                        this.findKeyRange(fullText, "workflows")
                    )
                );
            } else {
                // Validate each workflow
                for (const [name, workflow] of Object.entries(yamlDoc.workflows)) {
                    errors.push(
                        ...this.validateWorkflow(name, workflow as any, fullText)
                    );
                }
            }

            // Extract and validate all YAQL expressions
            const yaqlExpressions = this.yaqlParser.extractYaqlExpressions(fullText);
            for (const expr of yaqlExpressions) {
                const yaqlErrors = this.yaqlParser.validateExpression(
                    expr.expression,
                    expr.range.start
                );
                errors.push(...yaqlErrors);
            }

            // 1) Syntax validation of all YAQL expressions
            const allExprs: YaqlExpr[] = this.yaqlParser.extractYaqlExpressions(fullText);
            for (const { expression, range } of allExprs) {
                const yaqlErrs = this.yaqlParser.validateExpression(expression, range.start);
                errors.push(...yaqlErrs);
            }

            // 2) Semantic validation of variable references task-by-task
            errors.push(...this.validateYaqlVariableRefs(yamlDoc, fullText, allExprs));

            // 3) Advanced semantic analysis
            errors.push(...this.validateTaskNames(yamlDoc, fullText));
            errors.push(...this.validateOrphanTasks(yamlDoc, fullText));

        } catch (e) {
            // Handle YAML parsing errors
            const errorMsg = e instanceof Error ? e.message : String(e);
            errors.push(
                new MistralValidationError(
                    `Error parsing YAML: ${errorMsg}`,
                    new vscode.Range(0, 0, 0, 10)
                )
            );
        }

        return errors;
    }

    /**
     * Validate an individual Mistral workflow
     */
    private validateWorkflow(
        name: string,
        workflow: any,
        fullText: string
    ): MistralValidationError[] {
        const errors: MistralValidationError[] = [];

        if (!workflow || typeof workflow !== "object") {
            errors.push(
                new MistralValidationError(
                    `Workflow '${name}' must be an object`,
                    this.findKeyRange(fullText, name)
                )
            );
            return errors;
        }

        // Check for workflow type
        if (!workflow.type) {
            errors.push(
                new MistralValidationError(
                    `Missing 'type' field in workflow '${name}'`,
                    this.findKeyRangeInWorkflow(fullText, name, "type")
                )
            );
        } else if (!["direct", "reverse"].includes(workflow.type)) {
            errors.push(
                new MistralValidationError(
                    `Invalid workflow type '${workflow.type}'. Must be 'direct' or 'reverse'`,
                    this.findKeyRangeInWorkflow(fullText, name, "type")
                )
            );
        }

        // Check for tasks section
        if (!workflow.tasks) {
            errors.push(
                new MistralValidationError(
                    `Missing 'tasks' section in workflow '${name}'`,
                    this.findWorkflowRange(fullText, name)
                )
            );
        } else if (typeof workflow.tasks !== "object") {
            errors.push(
                new MistralValidationError(
                    `'tasks' section in workflow '${name}' must be a mapping`,
                    this.findKeyRangeInWorkflow(fullText, name, "tasks")
                )
            );
        } else {
            // Validate each task
            //   for (const task of workflow.tasks) {
            //     errors.push(...this.validateTask(name, task, fullText));
            //   }
            for (const [taskName, taskDef] of Object.entries(workflow.tasks)) {
                errors.push(...this.validateTask(name, taskName, taskDef, fullText));
            }
        }

        // Validate input parameters if present
        if (workflow.input && !Array.isArray(workflow.input)) {
            errors.push(
                new MistralValidationError(
                    `'input' section in workflow '${name}' must be an array`,
                    this.findKeyRangeInWorkflow(fullText, name, "input")
                )
            );
        }

        if (workflow['task-defaults']) {
            errors.push(
                ...this.validateTaskDefaults(
                    name,
                    workflow['task-defaults'],
                    fullText
                )
            );
        }

        // 2) Tasks v2
        if (typeof workflow.tasks === 'object') {
            for (const [taskName, taskDef] of Object.entries(workflow.tasks)) {
                errors.push(
                    ...this.validateTaskV2(name, taskName, taskDef as any, fullText)
                );
            }
        }

        // Validate other workflow fields as needed
        // - output
        // - vars
        // - description
        // etc.

        return errors;
    }

    // --- Nouvelle méthode de validation des tâches v2 ---
    private validateTaskV2(
        workflowName: string,
        taskName: string,
        task: any,
        fullText: string
    ): MistralValidationError[] {
        const errors: MistralValidationError[] = [];

        // Validation de base (action/workflow, input, transitions)...

        // 3) with-items
        if (task['with-items']) {
            errors.push(
                ...this.validateWithItems(
                    workflowName,
                    taskName,
                    task['with-items'],
                    fullText
                )
            );
        }

        // 4) pause-before / wait-after
        if (task['pause-before'] !== undefined) {
            errors.push(
                ...this.validatePauseOrWait(
                    workflowName,
                    taskName,
                    'pause-before',
                    task['pause-before'],
                    fullText
                )
            );
        }
        if (task['wait-after'] !== undefined) {
            errors.push(
                ...this.validatePauseOrWait(
                    workflowName,
                    taskName,
                    'wait-after',
                    task['wait-after'],
                    fullText
                )
            );
        }

        // 5) concurrency
        if (task.concurrency !== undefined) {
            errors.push(
                ...this.validateConcurrency(
                    workflowName,
                    taskName,
                    task.concurrency,
                    fullText
                )
            );
        }

        // 6) join
        if (task.join !== undefined) {
            errors.push(
                ...this.validateJoin(
                    workflowName,
                    taskName,
                    task.join,
                    fullText
                )
            );
        }

        // 7) target
        if (task.target) {
            errors.push(
                ...this.validateTarget(
                    workflowName,
                    taskName,
                    task.target,
                    fullText
                )
            );
        }

        // 8) output-on-error
        if (task['output-on-error']) {
            errors.push(
                ...this.validateOutputOnError(
                    workflowName,
                    taskName,
                    task['output-on-error'],
                    fullText
                )
            );
        }

        return errors;
    }

    // --- Exemples de nouvelles fonctions de validation ---
    private validateWithItems(
        workflowName: string,
        taskName: string,
        withItems: any,
        fullText: string
    ): MistralValidationError[] {
        const errors: MistralValidationError[] = [];
        if (typeof withItems !== 'object') {
            errors.push(
                new MistralValidationError(
                    `'with-items' must be a mapping`,
                    this.findKeyRangeInTask(fullText, workflowName, taskName, 'with-items')
                )
            );
            return errors;
        }
        if (!withItems.item || !withItems.values) {
            errors.push(
                new MistralValidationError(
                    `'with-items' requires both 'item' and 'values' keys`,
                    this.findKeyRangeInTask(fullText, workflowName, taskName, 'with-items')
                )
            );
        }
        return errors;
    }

    private validatePauseOrWait(
        workflowName: string,
        taskName: string,
        key: 'pause-before' | 'wait-after',
        value: any,
        fullText: string
    ): MistralValidationError[] {
        const errors: MistralValidationError[] = [];
        if (typeof value !== 'number' || value < 0) {
            errors.push(
                new MistralValidationError(
                    `'${key}' must be a positive integer`,
                    this.findKeyRangeInTask(fullText, workflowName, taskName, key)
                )
            );
        }
        return errors;
    }

    private validateConcurrency(
        workflowName: string,
        taskName: string,
        concurrency: any,
        fullText: string
    ): MistralValidationError[] {
        const errors: MistralValidationError[] = [];
        if (typeof concurrency !== 'number' || concurrency < 1) {
            errors.push(
                new MistralValidationError(
                    `'concurrency' must be an integer >= 1`,
                    this.findKeyRangeInTask(fullText, workflowName, taskName, 'concurrency')
                )
            );
        }
        return errors;
    }

    private validateJoin(
        workflowName: string,
        taskName: string,
        join: any,
        fullText: string
    ): MistralValidationError[] {
        const errors: MistralValidationError[] = [];
        const valid = ['all', 'any'];
        if (!valid.includes(join)) {
            errors.push(
                new MistralValidationError(
                    `'join' must be one of ${valid.join(', ')}`,
                    this.findKeyRangeInTask(fullText, workflowName, taskName, 'join')
                )
            );
        }
        return errors;
    }

    private validateTarget(
        workflowName: string,
        taskName: string,
        target: any,
        fullText: string
    ): MistralValidationError[] {
        const errors: MistralValidationError[] = [];
        if (typeof target !== 'string') {
            errors.push(
                new MistralValidationError(
                    `'target' must be a string expression`,
                    this.findKeyRangeInTask(fullText, workflowName, taskName, 'target')
                )
            );
        }
        return errors;
    }

    private validateOutputOnError(
        workflowName: string,
        taskName: string,
        output: any,
        fullText: string
    ): MistralValidationError[] {
        const errors: MistralValidationError[] = [];
        if (typeof output !== 'object') {
            errors.push(
                new MistralValidationError(
                    `'output-on-error' must be a mapping`,
                    this.findKeyRangeInTask(fullText, workflowName, taskName, 'output-on-error')
                )
            );
        }
        return errors;
    }

    private validateTaskDefaults(
        workflowName: string,
        defaults: any,
        fullText: string
    ): MistralValidationError[] {
        const errors: MistralValidationError[] = [];
        if (typeof defaults !== 'object') {
            errors.push(
                new MistralValidationError(
                    `'task-defaults' must be a mapping at workflow '${workflowName}'`,
                    this.findKeyRangeInWorkflow(fullText, workflowName, 'task-defaults')
                )
            );
        }
        return errors;
    }



    /**
     * Validate a Mistral task
     */
    private validateTask(
        workflowName: string,
        taskName: string,
        task: any,
        fullText: string
    ): MistralValidationError[] {
        const errors: MistralValidationError[] = [];

        if (!task || typeof task !== "object") {
            errors.push(
                new MistralValidationError(
                    `Task in workflow '${workflowName}' must be an object`,
                    this.findKeyRangeInWorkflow(fullText, workflowName, "tasks")
                )
            );
            return errors;
        }

        // Check for task name
        if (!taskName) {
            errors.push(
                new MistralValidationError(
                    `Missing 'name' field in task in workflow '${workflowName}'`,
                    this.findTaskRange(fullText, workflowName, taskName || "")
                )
            );
        }

        // At least one of action, workflow, or task-defaults must be present
        if (!task.action && !task.workflow && !task["task-defaults"]) {
            errors.push(
                new MistralValidationError(
                    `Task '${taskName}' must have at least one of: action, workflow, or task-defaults`,
                    this.findTaskRange(fullText, workflowName, taskName || "")
                )
            );
        }

        // Validate input if present
        if (task.input && typeof task.input !== "object") {
            errors.push(
                new MistralValidationError(
                    `'input' in task '${taskName}' must be an object`,
                    this.findKeyRangeInTask(fullText, workflowName, taskName, "input")
                )
            );
        }

        // Transitions (on-success/on-error/on-complete)
        for (const key of ["on-success", "on-error", "on-complete"] as const) {
            if (task[key] && !this.isValidTransition(task[key])) {
                errors.push(
                    new MistralValidationError(
                        `Invalid '${key}' in task '${taskName}'. Must be string or array`,
                        this.findKeyRangeInTask(fullText, workflowName, taskName, key)
                    )
                );
            }
        }

        // Validate other task fields as needed

        return errors;
    }

    /**
     * Vérifie $.var et task('...') au sein de chaque tâche, en isolant
     * les expressions par bloc selon indentation pour éviter les chevauchements.
     */
    private validateYaqlVariableRefs(
        yamlDoc: any,
        fullText: string,
        allExprs: YaqlExpr[]
    ): MistralValidationError[] {
        const errors: MistralValidationError[] = [];
        const workflows = yamlDoc.workflows || {};
        const lines = fullText.split(/\r?\n/);

        for (const [wfName, wfDef] of Object.entries<any>(workflows)) {
            // 1) Récupère les inputs (array mixte ou mapping)
            let declaredInputs: string[] = [];
            if (Array.isArray(wfDef.input)) {
                for (const inp of wfDef.input) {
                    if (typeof inp === 'string') {
                        declaredInputs.push(inp);
                    } else if (inp && typeof inp === 'object') {
                        declaredInputs.push(...Object.keys(inp));
                    }
                }
            } else if (wfDef.input && typeof wfDef.input === 'object') {
                declaredInputs = Object.keys(wfDef.input);
            }

            // 2) Initialise validVars avec les inputs
            const validVars = new Set<string>(declaredInputs);

            // 3) Parcours des tâches dans l'ordre
            for (const [tName, tDef] of Object.entries<any>(wfDef.tasks || {})) {
                // a) Récupère les variables locales de with-items
                const localVars = new Set<string>();
                if (tDef['with-items'] && typeof tDef['with-items'] === 'object') {
                    const iv = tDef['with-items'].item;
                    if (typeof iv === 'string') {
                        localVars.add(iv);
                    }
                }

                // b) Détermine les bornes du bloc de la tâche
                const tRange = this.findTaskRange(fullText, wfName, tName);
                const startLine = tRange.start.line;
                const indent = tRange.start.character;
                const endLine = this.getTaskBlockEndLine(fullText.split(/\r?\n/), startLine, indent);

                // c) Valide uniquement les expressions YAQL de ce bloc
                for (const { expression, range } of allExprs) {
                    const line = range.start.line;
                    if (line < startLine || line > endLine) { continue; }

                    // -- Variables $.varName --
                    for (const m of Array.from(expression.matchAll(/\$\.([a-zA-Z_][\w]*)/g))) {
                        const v = m[1];
                        if (!validVars.has(v) && !localVars.has(v)) {
                            errors.push(new MistralValidationError(
                                `Unknown YAQL variable '$.${v}' in task '${tName}' of workflow '${wfName}'`,
                                range
                            ));
                        }
                    }

                    // -- Références task('...') --
                    for (const m of Array.from(expression.matchAll(/task\(['"]([\w-]+)['"]\)/g))) {
                        const ref = m[1];
                        if (!wfDef.tasks || !(ref in wfDef.tasks)) {
                            errors.push(new MistralValidationError(
                                `Unknown task reference '${ref}' in YAQL expression of task '${tName}'`,
                                range
                            ));
                        }
                    }
                }

                // d) Propagation des variables publiées
                if (tDef.publish && typeof tDef.publish === 'object') {
                    Object.keys(tDef.publish).forEach(k => validVars.add(k));
                }

                // e) Propagation des variables localVars (with-items)
                localVars.forEach(v => validVars.add(v));
            }
        }
        return errors;
    }

    /**
   * Récupère le texte YAML de la tâche `tName` dans le workflow `wfName`.
   */
    private extractYamlNodeText(text: string, wfName: string, tName: string): string {
        // On localise la position de "tasks:" et de "  tName:"
        const taskStartRe = new RegExp(
            `^workflows:\\s*\\n` +
            `[ \\t]*${wfName}:` +
            `[\\s\\S]*?^\\s*tasks:` +
            `[\\s\\S]*?^\\s*${tName}:`,
            'm'
        );
        const startMatch = taskStartRe.exec(text);
        if (!startMatch) {
            return '';
        }
        const startIndex = startMatch.index + startMatch[0].lastIndexOf(tName);

        // À partir de startIndex, on coupe jusqu'à la prochaine ligne dont
        // l'indentation est ≤ celle de cette tâche (c-à-d début de bloc)
        const after = text.slice(startIndex);
        const lines = after.split(/\r?\n/);
        const indent = lines[0].match(/^(\s*)/)![1].length;
        let endLine = 1;
        for (; endLine < lines.length; endLine++) {
            const lineIndent = (lines[endLine].match(/^(\s*)/)![1] || '').length;
            if (lines[endLine].trim() === '' || lineIndent > indent) {
                continue;
            }
            break;
        }
        return lines.slice(0, endLine).join('\n');
    }

    /**
 * Retourne la ligne de fin de la tâche (avant une indentation plus faible ou fin de doc)
 */
    private getTaskBlockEndLine(
        lines: string[],
        startLine: number,
        indent: number
    ): number {
        for (let i = startLine + 1; i < lines.length; i++) {
            const l = lines[i];
            const trimmed = l.trim();
            if (trimmed === '') { continue; }
            const lineIndent = (l.match(/^(\s*)/)![1] || '').length;
            if (lineIndent <= indent) {
                return i - 1;
            }
        }
        return lines.length - 1;
    }


    /**
     * Check if a transition is valid (string or array of strings/objects)
     */
    private isValidTransition(transition: any): boolean {
        if (typeof transition === "string") {
            return true;
        }

        if (Array.isArray(transition)) {
            return transition.every(
                (item) =>
                    typeof item === "string" ||
                    (typeof item === "object" && item !== null)
            );
        }

        return false;
    }

    /**
     * Find the range of a key in the document
     */
    private findKeyRange(text: string, key: string): vscode.Range {
        const regex = new RegExp(`(^|\\n)\\s*${key}\\s*:`, "g");
        const match = regex.exec(text);

        if (match) {
            // Calculate line and character position
            const matchIndex = match.index + (match[1] ? match[1].length : 0);
            let line = 0;
            let char = 0;

            for (let i = 0; i < matchIndex; i++) {
                if (text[i] === "\n") {
                    line++;
                    char = 0;
                } else {
                    char++;
                }
            }

            return new vscode.Range(line, char, line, char + key.length);
        }

        // Default to the beginning of the document if key not found
        return new vscode.Range(0, 0, 0, 10);
    }

    /**
     * Find the range of a workflow in the document
     */
    private findWorkflowRange(text: string, workflowName: string): vscode.Range {
        const regex = new RegExp(
            `(^|\\n)\\s*workflows\\s*:[\\s\\S]*?\\n\\s*${workflowName}\\s*:`,
            "g"
        );
        const match = regex.exec(text);

        if (match) {
            // Calculate line and character position
            const matchIndex = match.index + match[0].lastIndexOf(workflowName);
            let line = 0;
            let char = 0;

            for (let i = 0; i < matchIndex; i++) {
                if (text[i] === "\n") {
                    line++;
                    char = 0;
                } else {
                    char++;
                }
            }

            return new vscode.Range(line, char, line, char + workflowName.length);
        }

        // Default to the beginning of the document if not found
        return new vscode.Range(0, 0, 0, 10);
    }

    /**
     * Find the range of a key in a workflow
     */
    private findKeyRangeInWorkflow(
        text: string,
        workflowName: string,
        key: string
    ): vscode.Range {
        // Find the workflow section first
        const workflowMatch = new RegExp(
            `(^|\\n)\\s*workflows\\s*:[\\s\\S]*?\\n\\s*${workflowName}\\s*:`,
            "g"
        ).exec(text);

        if (workflowMatch) {
            // Find the key within this workflow
            const startIndex = workflowMatch.index + workflowMatch[0].length;
            const workflowSection = text.substring(startIndex);

            // Find the key
            const keyMatch = new RegExp(`(^|\\n)\\s*${key}\\s*:`, "g").exec(
                workflowSection
            );

            if (keyMatch) {
                const matchIndex =
                    startIndex + keyMatch.index + (keyMatch[1] ? keyMatch[1].length : 0);
                let line = 0;
                let char = 0;

                for (let i = 0; i < matchIndex; i++) {
                    if (text[i] === "\n") {
                        line++;
                        char = 0;
                    } else {
                        char++;
                    }
                }

                return new vscode.Range(line, char, line, char + key.length);
            }
        }

        // Default to the workflow range if key not found
        return this.findWorkflowRange(text, workflowName);
    }

    /**
     * Trouve la plage de texte correspondant au nom d'une tâche dans un workflow.
     */
    private findTaskRange(
        text: string,
        workflowName: string,
        taskName: string
    ): vscode.Range {
        const regex = new RegExp(
            `(^|\\n)\\s*workflows\\s*:[\\s\\S]*?` +
            `\\n\\s*${workflowName}\\s*:[\\s\\S]*?` +
            `\\n\\s*tasks\\s*:[\\s\\S]*?` +
            `\\n\\s*${taskName}\\s*:`,
            "g"
        );
        const m = regex.exec(text);
        if (m && m.index !== undefined) {
            // Position du début du nom de la tâche
            const index = m.index + m[0].lastIndexOf(taskName);
            const preText = text.slice(0, index);
            const line = preText.split("\n").length - 1;
            const col = index - (preText.lastIndexOf("\n") + 1);

            return new vscode.Range(
                new vscode.Position(line, col),
                new vscode.Position(line, col + taskName.length)
            );
        }
        // Retourne une plage vide si non trouvée
        return new vscode.Range(
            new vscode.Position(0, 0),
            new vscode.Position(0, 0)
        );
    }

    /**
     * Trouve la plage de texte correspondant à une clé spécifique dans une tâche donnée.
     */
    private findKeyRangeInTask(
        text: string,
        workflowName: string,
        taskName: string,
        key: string
    ): vscode.Range {
        const regex = new RegExp(
            `(^|\\n)\\s*workflows\\s*:[\\s\\S]*?` +
            `\\n\\s*${workflowName}\\s*:[\\s\\S]*?` +
            `\\n\\s*tasks\\s*:[\\s\\S]*?` +
            `\\n\\s*${taskName}\\s*:[\\s\\S]*?` +
            `\\n\\s*${key}\\s*:`,
            "g"
        );
        const m = regex.exec(text);
        if (m && m.index !== undefined) {
            // Position du début de la clé
            const index = m.index + m[0].lastIndexOf(key);
            const preText = text.slice(0, index);
            const line = preText.split("\n").length - 1;
            const col = index - (preText.lastIndexOf("\n") + 1);

            return new vscode.Range(
                new vscode.Position(line, col),
                new vscode.Position(line, col + key.length)
            );
        }
        // Retourne une plage vide si non trouvée
        return new vscode.Range(
            new vscode.Position(0, 0),
            new vscode.Position(0, 0)
        );
    }

    /**
   * Vérifie la conformité des noms de workflows et de tâches aux conventions OpenStack.
   */
    private validateTaskNames(yamlDoc: any, fullText: string): MistralValidationError[] {
        const errors: MistralValidationError[] = [];
        const namePattern = /^[a-z0-9_]+$/;
        const workflows = yamlDoc.workflows || {};

        for (const [wfName, wfDef] of Object.entries<any>(workflows)) {
            // Workflow name
            if (!namePattern.test(wfName)) {
                const range = this.findKeyRange(fullText, wfName);
                errors.push(new MistralValidationError(
                    `Workflow name '${wfName}' must match ${namePattern}`,
                    range
                ));
            }

            // Task names
            const seenTasks = new Set<string>();
            for (const tName of Object.keys(wfDef.tasks || {})) {
                const tRange = this.findTaskRange(fullText, wfName, tName);
                if (!namePattern.test(tName)) {
                    errors.push(new MistralValidationError(
                        `Task name '${tName}' must match ${namePattern}`,
                        tRange
                    ));
                }
                if (seenTasks.has(tName)) {
                    errors.push(new MistralValidationError(
                        `Duplicate task name '${tName}' in workflow '${wfName}'`,
                        tRange
                    ));
                }
                seenTasks.add(tName);
            }
        }
        return errors;
    }

    /**
     * Détecte les tâches orphelines (déclarées mais jamais référencées par requires/on-success/on-error/on-complete).
     */
    private validateOrphanTasks(yamlDoc: any, fullText: string): MistralValidationError[] {
        const errors: MistralValidationError[] = [];
        const workflows = yamlDoc.workflows || {};

        for (const [wfName, wfDef] of Object.entries<any>(workflows)) {
            const tasks = wfDef.tasks || {};
            const declared = Object.keys(tasks);
            const reachable = new Set<string>();

            // 1) Identify entry tasks (no requires or empty requires)
            for (const tName of declared) {
                const req = tasks[tName].requires;
                if (req === undefined || (Array.isArray(req) && req.length === 0)) {
                    reachable.add(tName);
                }
            }

            // 2) Propagate reachability via requires
            let added: boolean;
            do {
                added = false;
                for (const tName of declared) {
                    if (reachable.has(tName)) { continue; }
                    const req = tasks[tName].requires;
                    if (Array.isArray(req) && req.every((r: string) => reachable.has(r))) {
                        reachable.add(tName);
                        added = true;
                    }
                }
            } while (added);

            // 3) Report unreachable tasks as orphans
            for (const tName of declared) {
                if (!reachable.has(tName)) {
                    const tRange = this.findTaskRange(fullText, wfName, tName);
                    errors.push(
                        new MistralValidationError(
                            `Orphan task '${tName}' is not reachable from any entry in workflow '${wfName}'`,
                            tRange
                        )
                    );
                }
            }
        }

        return errors;
    }

}
