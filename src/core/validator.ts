import * as yaml from "js-yaml";
import { Position, Range } from './types';
import { YaqlParser, YaqlParsingError } from './yaqlParser';

export class MistralValidationError extends Error {
  constructor(public message: string, public range: Range) {
    super(message);
    this.name = 'MistralValidationError';
  }
}

interface YaqlExpr { expression: string; range: Range; }

export class MistralValidator {
  private yaqlParser: YaqlParser;

  constructor() {
    this.yaqlParser = new YaqlParser();
  }

  /**
   * Validates a Mistral workflow document.
   * @param document - The document to validate.
   * @returns An array of validation errors.
   */
  validateDocument(
    text: string
  ): (YaqlParsingError | MistralValidationError)[] {
    const errors: (YaqlParsingError | MistralValidationError)[] = [];
    const fullText = text;

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
            new Range(new Position(0, 0), new Position(0, 10)) // Just highlight the beginning of the file
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
          new Range(new Position(0, 0), new Position(0, 10))
        )
      );
    }

    return errors;
  }

  /**
   * Validates an individual Mistral workflow.
   * @param name - The name of the workflow.
   * @param workflow - The workflow object.
   * @param fullText - The full text of the document.
   * @returns An array of validation errors.
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
    if (workflow.type && !["direct", "reverse"].includes(workflow.type)) {
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
      for (const [taskName, taskDef] of Object.entries(workflow.tasks)) {
        errors.push(...this.validateTask(name, taskName, taskDef, fullText));
      }
    }

    // Validate input parameters if present (must be array or mapping)
    if (workflow.input
      && !Array.isArray(workflow.input)
      && typeof workflow.input !== 'object') {
      errors.push(
        new MistralValidationError(
          `'input' section in workflow '${name}' must be an array or a mapping of default values`,
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

    return errors;
  }

  /**
   * Validates a Mistral task with version-specific checks.
   *
   * This method performs additional validation for tasks in a Mistral workflow,
   * ensuring that various attributes meet the expected criteria.
   *
   * @param workflowName - The name of the workflow containing the task.
   * @param taskName - The name of the task to validate.
   * @param task - The task object to validate.
   * @param fullText - The full text of the document containing the workflow.
   * @returns An array of MistralValidationError objects representing any validation errors found.
   */
  private validateTaskV2(
    workflowName: string,
    taskName: string,
    task: any,
    fullText: string
  ): MistralValidationError[] {
    const errors: MistralValidationError[] = [];

    // Validate basic attributes (action/workflow, input, transitions)...

    // 3) Validate 'with-items'
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

    // 4) Validate 'pause-before' and 'wait-after'
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

    // 5) Validate 'concurrency'
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

    // 6) Validate 'join'
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

    // 7) Validate 'target'
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

    // 8) Validate 'output-on-error'
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

  /**
   * Validates the 'with-items' attribute of a Mistral task.
   *
   * This method ensures that the 'with-items' attribute is properly structured:
   * - It must be an object.
   * - It must contain both 'item' and 'values' keys.
   *
   * @param workflowName - The name of the workflow containing the task.
   * @param taskName - The name of the task to validate.
   * @param withItems - The 'with-items' attribute to validate.
   * @param fullText - The full text of the document containing the workflow.
   * @returns An array of MistralValidationError objects representing any validation errors found.
   */
  private validateWithItems(
    workflowName: string,
    taskName: string,
    withItems: any,
    fullText: string
  ): MistralValidationError[] {
    const errors: MistralValidationError[] = [];

    // Ensure 'with-items' is an object
    if (typeof withItems !== 'object') {
      errors.push(
        new MistralValidationError(
          `'with-items' must be a mapping`,
          this.findKeyRangeInTask(fullText, workflowName, taskName, 'with-items')
        )
      );
      return errors;
    }
    // Ensure 'with-items' contains both 'item' and 'values' keys
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

  /**
   * Validates the 'pause-before' and 'wait-after' attributes of a Mistral task.
   * @param workflowName - The name of the workflow containing the task.
   * @param taskName - The name of the task to validate.
   * @param key - The key to validate ('pause-before' or 'wait-after').
   * @param value - The value to validate.
   * @param fullText - The full text of the document containing the workflow.
   * @returns An array of validation errors.
   */
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

  /**
   * Validates the 'concurrency' attribute of a Mistral task.
   *
   * This method ensures that the 'concurrency' attribute is a number and is greater than or equal to 1.
   *
   * @param workflowName - The name of the workflow containing the task.
   * @param taskName - The name of the task to validate.
   * @param concurrency - The 'concurrency' attribute to validate.
   * @param fullText - The full text of the document containing the workflow.
   * @returns An array of MistralValidationError objects representing any validation errors found.
   */
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

  /**
   * Validates the 'join' attribute of a Mistral task.
   *
   * This method ensures that the 'join' attribute is one of the valid values: 'all' or 'any'.
   *
   * @param workflowName - The name of the workflow containing the task.
   * @param taskName - The name of the task to validate.
   * @param join - The 'join' attribute to validate.
   * @param fullText - The full text of the document containing the workflow.
   * @returns An array of MistralValidationError objects representing any validation errors found.
   */
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

  /**
   * Validates the 'target' attribute of a Mistral task.
   *
   * This method ensures that the 'target' attribute is a string expression.
   *
   * @param workflowName - The name of the workflow containing the task.
   * @param taskName - The name of the task to validate.
   * @param target - The 'target' attribute to validate.
   * @param fullText - The full text of the document containing the workflow.
   * @returns An array of MistralValidationError objects representing any validation errors found.
   */
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

  /**
   * Validates the 'output-on-error' attribute of a Mistral task.
   *
   * This method ensures that the 'output-on-error' attribute is a mapping,
   * which is necessary for properly handling and outputting errors.
   *
   * @param workflowName - The name of the workflow containing the task.
   * @param taskName - The name of the task to validate.
   * @param output - The 'output-on-error' attribute to validate.
   * @param fullText - The full text of the document containing the workflow.
   * @returns An array of MistralValidationError objects representing any validation errors found.
   */
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

  /**
   * Validates the 'task-defaults' section within a Mistral workflow.
   *
   * This method ensures that the 'task-defaults' attribute is an object (mapping) and
   * follows the required structure within the specified workflow.
   *
   * @param workflowName - The name of the workflow containing the 'task-defaults'.
   * @param defaults - The 'task-defaults' object to validate.
   * @param fullText - The full text of the document containing the workflow.
   * @returns An array of MistralValidationError objects representing any validation errors found.
   */
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
   * Validates a Mistral task to ensure it meets the required criteria.
   *
   * This method checks the following:
   * - Ensures the task is a valid object.
   * - Ensures the task has a name.
   * - Ensures the task has at least one of the following: action, workflow, or task-defaults.
   * - Validates the 'input' field if present.
   * - Validates transitions (on-success, on-error, on-complete).
   *
   * @param workflowName - The name of the workflow containing the task.
   * @param taskName - The name of the task to validate.
   * @param task - The task object to validate.
   * @param fullText - The full text of the document containing the workflow.
   * @returns An array of MistralValidationError objects representing any validation errors found.
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
   * Validates YAQL variable references within each task, ensuring they are declared and correctly used.
   *
   * This method isolates expressions by block based on indentation to avoid overlaps and checks for the following:
   * - Ensures variables referenced with $.varName are declared.
   * - Ensures task references within expressions are valid.
   * - Propagates published variables and local variables from 'with-items'.
   *
   * @param yamlDoc - The parsed YAML document.
   * @param fullText - The full text of the document.
   * @param allExprs - An array of all YAQL expressions extracted from the document.
   * @returns An array of MistralValidationError objects representing any validation errors found.
   */
  private validateYaqlVariableRefs(
    yamlDoc: any,
    fullText: string,
    allExprs: YaqlExpr[]
  ): MistralValidationError[] {
    const errors: MistralValidationError[] = [];
    const workflows = yamlDoc.workflows || {};

    for (const [wfName, wfDef] of Object.entries<any>(workflows)) {
      // 1) Retrieve inputs (mixed array or mapping)
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

      // 2) Initialize validVars with the inputs
      const validVars = new Set<string>(declaredInputs);

      // 3) Iterate through tasks in order
      for (const [tName, tDef] of Object.entries<any>(wfDef.tasks || {})) {
        // a) Retrieve local variables from 'with-items'
        const localVars = new Set<string>();
        if (tDef['with-items'] && typeof tDef['with-items'] === 'object') {
          const iv = tDef['with-items'].item;
          if (typeof iv === 'string') {
            localVars.add(iv);
          }
        }

        // b) Determine the boundaries of the task block
        const tRange = this.findTaskRange(fullText, wfName, tName);
        const startLine = tRange.start.line;
        const indent = tRange.start.character;
        const endLine = this.getTaskBlockEndLine(fullText.split(/\r?\n/), startLine, indent);

        // c) Validate only the YAQL expressions within this block
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

          // -- Task references task('...') --
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

        // d) Propagate published variables
        if (tDef.publish && typeof tDef.publish === 'object') {
          Object.keys(tDef.publish).forEach(k => validVars.add(k));
        }

        // e) Propagate local variables (with-items)
        localVars.forEach(v => validVars.add(v));
      }
    }
    return errors;
  }

  /**
   * Extracts the YAML text of the task `tName` within the workflow `wfName`.
   *
   * This method finds the start of the task block and extracts the text up to the next line
   * with an indentation level less than or equal to the task's indentation level.
   *
   * @param text - The full text of the document.
   * @param wfName - The name of the workflow.
   * @param tName - The name of the task.
   * @returns The YAML text of the task.
   */
  private extractYamlNodeText(text: string, wfName: string, tName: string): string {
    // Locate the position of "tasks:" and "  tName:"
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

    // From startIndex, cut until the next line with an indentation level
    // less than or equal to that of this task (i.e., the start of the block)
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
   * Returns the end line of the task block, before a line with lower indentation or the end of the document.
   *
   * This method determines the end of the task block by finding the next line with an indentation level
   * less than or equal to the task's indentation level.
   *
   * @param lines - The lines of the document split by newline characters.
   * @param startLine - The start line of the task block.
   * @param indent - The indentation level of the task block.
   * @returns The end line of the task block.
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
   * Checks if a transition is valid.
   *
   * This method ensures that the transition is either a string or an array of strings/objects.
   *
   * @param transition - The transition to validate.
   * @returns True if the transition is valid, false otherwise.
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
   * Finds the positional range of a specified key within the document text.
   *
   * This method searches for the key in the document and returns its positional range.
   * It calculates the line and character position of the key within the document.
   * If the key is not found, it defaults to the beginning of the document.
   *
   * @param text - The full text of the document.
   * @param key - The key to find the range for.
   * @returns A Range object representing the positional range of the key.
   */
  private findKeyRange(text: string, key: string): Range {
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

      return new Range(new Position(line, char), new Position(line, char + key.length));
    }

    // Default to the beginning of the document if key not found
    return new Range(new Position(0, 0), new Position(0, 10));
  }

  /**
   * Finds the positional range of a specified workflow within the document text.
   *
   * This method searches for the workflow in the document and returns its positional range.
   * It calculates the line and character position of the workflow within the document.
   * If the workflow is not found, it defaults to the beginning of the document.
   *
   * @param text - The full text of the document.
   * @param workflowName - The name of the workflow to find the range for.
   * @returns A Range object representing the positional range of the workflow.
   */
  private findWorkflowRange(text: string, workflowName: string): Range {
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

      return new Range(new Position(line, char), new Position(line, char + workflowName.length));
    }

    // Default to the beginning of the document if not found
    return new Range(new Position(0, 0), new Position(0, 10));
  }

  /**
   * Finds the positional range of a specified key within a specific workflow in the document text.
   *
   * This method first locates the workflow section and then searches for the key within that section.
   * It calculates the line and character position of the key within the workflow.
   * If the key is not found, it defaults to the range of the workflow.
   *
   * @param text - The full text of the document.
   * @param workflowName - The name of the workflow containing the key.
   * @param key - The key to find the range for.
   * @returns A Range object representing the positional range of the key within the workflow.
   */
  private findKeyRangeInWorkflow(
    text: string,
    workflowName: string,
    key: string
  ): Range {
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

        return new Range(new Position(line, char), new Position(line, char + key.length));
      }
    }

    // Default to the workflow range if key not found
    return this.findWorkflowRange(text, workflowName);
  }

  /**
   * Finds the positional range of a specified task within a specific workflow in the document text.
   *
   * This method searches for the task within the specified workflow and returns its positional range.
   * It calculates the line and character position of the task within the workflow.
   * If the task is not found, it defaults to an empty range.
   *
   * @param text - The full text of the document.
   * @param workflowName - The name of the workflow containing the task.
   * @param taskName - The name of the task to find the range for.
   * @returns A Range object representing the positional range of the task within the workflow.
   */
  private findTaskRange(
    text: string,
    workflowName: string,
    taskName: string
  ): Range {
    const regex = new RegExp(
      `(^|\\n)\\s*workflows\\s*:[\\s\\S]*?` +
      `\\n\\s*${workflowName}\\s*:[\\s\\S]*?` +
      `\\n\\s*tasks\\s*:[\\s\\S]*?` +
      `\\n\\s*${taskName}\\s*:`,
      "g"
    );
    const m = regex.exec(text);
    if (m && m.index !== undefined) {
      // Position the start of the task name
      const index = m.index + m[0].lastIndexOf(taskName);
      const preText = text.slice(0, index);
      const line = preText.split("\n").length - 1;
      const col = index - (preText.lastIndexOf("\n") + 1);

      return new Range(
        new Position(line, col),
        new Position(line, col + taskName.length)
      );
    }
    // return an empty range if not found
    return new Range(
      new Position(0, 0),
      new Position(0, 0)
    );
  }

  /**
   * Finds the text range corresponding to a specific key within a given task.
   *
   * This method searches for the key within the specified task and returns its positional range.
   * It calculates the line and character position of the key within the task.
   * If the key is not found, it defaults to an empty range.
   *
   * @param text - The full text of the document.
   * @param workflowName - The name of the workflow containing the task.
   * @param taskName - The name of the task containing the key.
   * @param key - The key to find the range for.
   * @returns A Range object representing the positional range of the key within the task.
   */
  private findKeyRangeInTask(
    text: string,
    workflowName: string,
    taskName: string,
    key: string
  ): Range {
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
      // Position the beginning of the key
      const index = m.index + m[0].lastIndexOf(key);
      const preText = text.slice(0, index);
      const line = preText.split("\n").length - 1;
      const col = index - (preText.lastIndexOf("\n") + 1);

      return new Range(
        new Position(line, col),
        new Position(line, col + key.length)
      );
    }
    // return an empty range if not found
    return new Range(
      new Position(0, 0),
      new Position(0, 0)
    );
  }

  /**
   * Validates the names of workflows and tasks to ensure they conform to OpenStack conventions.
   *
   * This method checks if the workflow and task names match the specified naming pattern.
   * It ensures that names are unique within the workflow and conform to the required format.
   *
   * @param yamlDoc - The parsed YAML document containing the workflows.
   * @param fullText - The full text of the document.
   * @returns An array of MistralValidationError objects representing any validation errors found.
   */
  private validateTaskNames(yamlDoc: any, fullText: string): MistralValidationError[] {
    const errors: MistralValidationError[] = [];
    const namePattern = /^[a-z0-9_-]+$/;
    const reserved = new Set(['noop', 'fail', 'succeed', 'pause']);

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

        // 2) Reserved names forbidden
        if (reserved.has(tName)) {
          errors.push(new MistralValidationError(
            `Task name '${tName}' must not equal one of: ${Array.from(reserved).join(', ')}.`,
            tRange
          ));
        }

        // 3) Max length
        const maxLen = wfDef.tasks[tName].join ? 208 : 255;
        if (tName.length > maxLen) {
          errors.push(new MistralValidationError(
            `Task name '${tName}' exceeds maximum length of ${maxLen} characters.`,
            tRange
          ));
        }

        // 4) Unique names
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
   * Detects orphan tasks (tasks that are declared but never referenced by requires/on-success/on-error/on-complete).
   *
   * This method identifies tasks that are not reachable from any entry point in the workflow.
   * It ensures that all tasks are properly connected within the workflow.
   *
   * @param yamlDoc - The parsed YAML document containing the workflows.
   * @param fullText - The full text of the document.
   * @returns An array of MistralValidationError objects representing any validation errors found.
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