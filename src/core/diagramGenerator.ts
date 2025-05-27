import * as yaml from 'js-yaml';

/**
 * Parse the document text and emit a Graphviz DOT description.
 */
export function generateDotFromYaml(text: string): string {
  const doc: any = yaml.load(text) || {};
  const wfDefs = doc.workflows || {};
  const lines: string[] = [];

  lines.push('digraph mistral {');
  lines.push('  rankdir=LR;');
  lines.push('  node [shape=box, style=rounded];');

  for (const [wfName, wfDef] of Object.entries<any>(wfDefs)) {
    lines.push(`  subgraph cluster_${wfName} {`);
    lines.push(`    label = "${wfName}";`);
    lines.push('    style = dashed;');

    const tasks = wfDef.tasks || {};
    // Declare each node
    for (const taskName of Object.keys(tasks)) {
      lines.push(`    "${wfName}.${taskName}";`);
    }
    // Draw edges
    for (const [taskName, taskDef] of Object.entries<any>(tasks)) {
      const src = `"${wfName}.${taskName}"`;
      const targets = [
        ...(taskDef.requires || []),
        ...(taskDef['on-success'] || []),
        ...(taskDef['on-error'] || [])
      ] as string[];

      for (const t of targets) {
        lines.push(`    ${src} -> "${wfName}.${t}";`);
      }
      // Loop arrow for with-items
      if (taskDef['with-items'] && typeof taskDef['with-items'] === 'object') {
        const item = taskDef['with-items'].item;
        if (typeof item === 'string') {
          lines.push(`    ${src} -> ${src} [label="loop ${item}"];`);
        }
      }
    }

    lines.push('  }');
  }

  lines.push('}');
  return lines.join('\n');
}