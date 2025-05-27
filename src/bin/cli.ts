#!/usr/bin/env node

import { spawnSync } from 'child_process';
import { Command } from 'commander';
import * as fs from 'fs';
import { readFileSync, writeFileSync } from 'fs';
import * as path from 'path';
import { generateDotFromYaml } from '../core/diagramGenerator';
import { Range } from '../core/types';
import { MistralValidationError, MistralValidator } from '../core/validator';
import { YaqlParsingError } from '../core/yaqlParser';

// Script entry for CLIs
(async () => {
  const pkg = require('../../../package.json');
  const program = new Command();

  program
    .name('mistral-linter')
    .version(pkg.version)
    .description('Lint OpenStack Mistral v2 workflows (YAQL/Jinja)');

  program
    .command('init files...')
    .description('Initialize a new Mistral workflow project')
    .action((file: string) => {
      if (file === undefined || file === null || file === '') {
        return console.error('Please specify a file to initialize.');
      }
      init(file);
    });

  program
    .command('lint [files...]')
    .description('Run validation on one or more workflow files or directories')
    .option('-s, --strict', 'treat warnings as errors (hide success messages)', false)
    .action((files: string[] = [], cmd) => {
      if (files.length === 0) {
        files = ['.'];
      }
      lint(files, { strict: cmd.strict });
    });

  program
    .command('diagram <workflow.yaml>')
    .description('Generate a Graphviz diagram from a Mistral YAML')
    .option('-o, --output <file>', 'output filename (SVG or DOT)', 'workflow.svg')
    .action((yamlPath, opts) => {
      const text = readFileSync(yamlPath, 'utf8');
      const dot = generateDotFromYaml(text);

      if (opts.output.endsWith('.dot')) {
        writeFileSync(opts.output, dot, 'utf8');
        console.log(`Wrote DOT to ${opts.output}`);
      } else {
        // assume Graphviz is installed: dot -Tsvg
        const dotProc = spawnSync('dot', ['-Tsvg'], {
          input: dot,
          encoding: 'utf8'
        });
        if (dotProc.status !== 0) {
          console.error(dotProc.stderr);
          process.exit(dotProc.status || 1);
        }
        writeFileSync(opts.output, dotProc.stdout, 'utf8');
        console.log(`Wrote diagram to ${opts.output}`);
      }
    });

  program.parse(process.argv);

  async function init(file: string) {
    const filePath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${file}`);
      return;
    }
    console.log(`Initialized new Mistral workflow file: ${file}`);
    const initWorkflow = `---
  version: '2.0'
  name: ${file}
  description: A simple workflow that does nothing.
  workflows:
    workflow_name:
      type: direct,
      description: Short description of workflow
      input:
        - input1

      tasks:
        task1:
          action: std.noop
          publish:
            out_var: <% $.input1 %>
          on-success:
            - next_task
`;
    fs.writeFileSync(filePath, initWorkflow);
  }

  async function lint(
    files: string[],
    options: { strict: boolean }
  ) {
    const validator = new MistralValidator();
    let hasErrors = false;

    for (const file of files) {
      const filePath = path.resolve(process.cwd(), file);
      if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${file}`);
        hasErrors = true;
        continue;
      }

      const stat = fs.statSync(filePath);
      const targets = stat.isDirectory()
        ? fs.readdirSync(filePath).map(f => path.join(filePath, f))
        : [filePath];

      for (const target of targets) {
        if (fs.statSync(target).isDirectory()) {
          // Skip nested directories by default
          continue;
        }
        const ext = path.extname(target).toLowerCase();
        if (!['.yaml', '.yml', '.mistral'].includes(ext)) {
          continue;
        }

        const content = fs.readFileSync(target, 'utf8');
        const errors = validator.validateDocument(content);

        if (errors.length === 0) {
          if (!options.strict) {
            console.log(`✔ ${path.relative(process.cwd(), target)} OK`);
          }
        } else {
          console.error(`✖ ${path.relative(process.cwd(), target)} - ${errors.length} error(s)`);
          for (const err of errors) {
            // err.range is core Range
            if (err instanceof MistralValidationError) {
              const pos = (err.range as Range).start;
              console.error(`  [${pos.line + 1}:${pos.character + 1}] ${err.message}`);
            }
            else if (err instanceof YaqlParsingError) {
              const pos = err.position;
              console.error(`  [${pos.line + 1}:${pos.character + 1}] ${err.message}`);
            }
            hasErrors = true;
          }
        }
      }

      process.exit(hasErrors ? 1 : 0);
    }
  }
})();
