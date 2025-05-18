import * as fs from 'fs';
import * as path from 'path';
import { MistralValidator } from '../src/core/validator';

describe('MistralValidator – Advanced functions via YAML fixtures', () => {
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

  it('correctly handles with-items and propagates the iteration variable', () => {
    const yaml = loadValid('with-items.yaml');
    const errs = validator.validateDocument(yaml);
    expect(errs.some(e => /Unknown YAQL variable '\$\.vm'/.test(e.message))).toBe(false);
  });

  it('Detects a task name not conforming to naming conventions', () => {
    const yaml = loadInvalid('bad-task-names.yaml');
    const errs = validator.validateDocument(yaml);
    expect(errs.some(e => /Task name 'Task-One' must match/.test(e.message))).toBe(true);
    expect(errs.some(e => /Task name 'task_two' must match/.test(e.message))).toBe(false);
  });

  it('finds orphan tasks that are inaccessible', () => {
    const yaml = loadInvalid('orphan-tasks.yaml');
    const errs = validator.validateDocument(yaml);
    expect(errs.some(e => /Orphan task 'ghost'/.test(e.message))).toBe(true);
    expect(errs.some(e => /Orphan task 'start'/.test(e.message))).toBe(false);
  });

  it('authorizes the definition of inputs as a mapping with default values', () => {
    const yaml = loadValid('map-inputs.yaml');
    const errs = validator.validateDocument(yaml);
    expect(errs).toHaveLength(0);
  });
});