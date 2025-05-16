#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
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
    .command('lint [files...]')
    .description('Run validation on one or more workflow files or directories')
    .option('-s, --strict', 'treat warnings as errors (hide success messages)', false)
    .action((files: string[] = [], cmd) => {
      if (files.length === 0) {
        files = ['.'];
      }
      lint(files, { strict: cmd.strict });
    });

  program.parse(process.argv);

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
