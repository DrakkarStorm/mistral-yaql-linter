import * as fs from 'fs';
import * as path from 'path';
import { MistralValidator } from '../src/core/validator';

describe('MistralValidator - Core Validation', () => {
  let validator: MistralValidator;

  beforeAll(() => {
    validator = new MistralValidator();
  });

  it('should not return errors for basic valid workflow', () => {
    const file = path.resolve(__dirname, 'fixtures', 'valid', 'basic.yaml');
    const yaml = fs.readFileSync(file, 'utf8');
    const errors = validator.validateDocument(yaml);
    expect(errors).toHaveLength(0);
  });

  it('should not return errors for full v2 example', () => {
    const file = path.resolve(__dirname, 'fixtures', 'valid', 'fullv2.yaml');
    const yaml = fs.readFileSync(file, 'utf8');
    const errors = validator.validateDocument(yaml);
    expect(errors).toHaveLength(0);
  });

  it('should detect missing tasks section error', () => {
    const file = path.resolve(__dirname, 'fixtures', 'invalid', 'missing-tasks.yaml');
    const yaml = fs.readFileSync(file, 'utf8');
    const errors = validator.validateDocument(yaml);
    expect(errors.some(err => err.message.includes("tasks"))).toBe(true);
  });

  it('should detect unknown YAQL variable error', () => {
    const file = path.resolve(__dirname, 'fixtures', 'invalid', 'unknown-variable.yaml');
    const yaml = fs.readFileSync(file, 'utf8');
    const errors = validator.validateDocument(yaml);
    expect(errors.some(err => err.message.includes("Unknown YAQL variable"))).toBe(true);
  });

  it('should detect orphan task error', () => {
    const file = path.resolve(__dirname, 'fixtures', 'invalid', 'orphan-task.yaml');
    const yaml = fs.readFileSync(file, 'utf8');
    const errors = validator.validateDocument(yaml);
    expect(errors.some(err => err.message.includes("Orphan task"))).toBe(true);
  });
});
