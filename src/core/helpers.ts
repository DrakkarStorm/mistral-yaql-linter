import * as yaml from "js-yaml";
import { mistralKeyDocs, yaqlFunctionDocs } from './completionsData';

export class MistralHelper {
  /**
   * List the workflow names declared in the given text.
   * The workflow name is the key under 'workflows'.
   * @param text, the text to parse.
   * @returns the list of workflow names.
   */
  public getWorkflowNames(text: string): string[] {
    const doc: any = yaml.load(text) || {};
    return doc.workflows ? Object.keys(doc.workflows) : [];
  }

  /**
   * List the task names declared in the given workflow.
   * The task name is the key under 'workflows.<wfName>.tasks'.
   * @param text, the text to parse.
   * @param wfName, the workflow name.
   * @returns the list of task names.
   */
  public getTaskNames(text: string, wfName: string): string[] {
    const doc: any = yaml.load(text) || {};
    const wf = doc.workflows?.[wfName];
    return wf?.tasks ? Object.keys(wf.tasks) : [];
  }

  /**
   * Get the list of variables declared in the given text (inputs + publish + with-items).
   * @param text, the text to parse.
   * @returns the list of variables.
   */
  public getDeclaredVariables(text: string): string[] {
    const doc: any = yaml.load(text) || {};
    const vars = new Set<string>();

    const workflows = doc.workflows || {};
    for (const wfDef of Object.values<any>(workflows)) {
      // --- INPUT ---
      if (wfDef.input !== undefined && wfDef.input !== null) {
        if (Array.isArray(wfDef.input)) {
          wfDef.input.forEach((inp: any) => {
            if (typeof inp === 'string') {
              vars.add(inp);
            } else if (typeof inp === 'object') {
              Object.keys(inp).forEach(k => vars.add(k));
            }
          });
        } else if (typeof wfDef.input === 'object') {
          Object.keys(wfDef.input).forEach(k => vars.add(k));
        }
      }

      // --- TASKS ---
      const tasks = wfDef.tasks || {};
      for (const taskDef of Object.values<any>(tasks)) {
        // publish
        if (taskDef.publish && typeof taskDef.publish === 'object') {
          Object.keys(taskDef.publish).forEach(k => vars.add(k));
        }
        // output-on-error
        if (taskDef['output-on-error'] && typeof taskDef['output-on-error'] === 'object') {
          Object.keys(taskDef['output-on-error']).forEach(k => vars.add(k));
        }
        // with-items.item
        const wi = taskDef['with-items'];
        if (wi && typeof wi === 'object' && typeof wi.item === 'string') {
          vars.add(wi.item);
        }
      }
    }

    return Array.from(vars);
  }

  /**
   * Return the map of YAQL functions (signature + doc).
   * @returns Map of YAQL functions with their signatures and descriptions.
   */
  public getYaqlFunctionDocs() {
    return yaqlFunctionDocs;
  }

  /**
   * Return the map of Mistral keys (doc).
   * @returns Map of Mistral keys with their descriptions.
   */
  public getMistralKeyDocs() {
    return mistralKeyDocs;
  }
}