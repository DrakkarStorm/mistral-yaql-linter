import * as fs from 'fs';
import * as path from 'path';
import { MistralValidator } from '../src/core/validator';

describe('MistralValidator – Fonctions avancées via fixtures YAML', () => {
  let validator: MistralValidator;

  beforeAll(() => {
    validator = new MistralValidator();
  });

  const loadValid = (name: string) =>
    fs.readFileSync(
      path.resolve(__dirname, 'fixtures', 'valid', name),
      'utf8'
    );

  const loadInvalid = (name: string) =>
    fs.readFileSync(
      path.resolve(__dirname, 'fixtures', 'invalid', name),
      'utf8'
    );

  it('gère correctement with-items et propage la variable d’itération', () => {
    const yaml = loadValid('with-items.yaml');
    const errs = validator.validateDocument(yaml);
    expect(errs.some(e => /Unknown YAQL variable '\$\.vm'/.test(e.message))).toBe(false);
  });

  it('détecte un nom de tâche non conforme aux conventions', () => {
    const yaml = loadInvalid('bad-task-names.yaml');
    const errs = validator.validateDocument(yaml);
    expect(errs.some(e => /Task name 'Task-One' must match/.test(e.message))).toBe(true);
    expect(errs.some(e => /Task name 'task_two' must match/.test(e.message))).toBe(false);
  });

  it('repère les tâches orphelines inaccessibles', () => {
    const yaml = loadInvalid('orphan-tasks.yaml');
    const errs = validator.validateDocument(yaml);
    expect(errs.some(e => /Orphan task 'ghost'/.test(e.message))).toBe(true);
    expect(errs.some(e => /Orphan task 'start'/.test(e.message))).toBe(false);
  });

  it('autorise la définition d\'inputs sous forme de mapping avec valeur par défaut', () => {
    const yaml = loadValid('map-inputs.yaml');
    const errs = validator.validateDocument(yaml);
    expect(errs).toHaveLength(0);
  });
});