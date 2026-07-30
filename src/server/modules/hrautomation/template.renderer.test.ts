import { describe, it, expect } from 'vitest';
import { renderBody, resolveField, buildVariables, type TemplateVariables } from './template.renderer.js';

const variables: TemplateVariables = {
  firstName: 'Ada',
  lastName: 'Admin',
  employeeId: 'EMP-001',
  department: 'Engineering',
  designation: 'Manager',
  dateOfJoining: '2020-01-01',
  companyName: 'Acme Inc',
  today: '2026-07-29',
};

describe('renderBody', () => {
  it('substitutes every known placeholder', () => {
    const result = renderBody('Dear {{firstName}} {{lastName}}, welcome to {{companyName}}.', variables);
    expect(result).toBe('Dear Ada Admin, welcome to Acme Inc.');
  });

  it('tolerates extra whitespace inside the braces', () => {
    expect(renderBody('Hi {{ firstName }}', variables)).toBe('Hi Ada');
  });

  it('leaves an unknown placeholder untouched rather than silently dropping it', () => {
    expect(renderBody('Ref {{doesNotExist}}', variables)).toBe('Ref {{doesNotExist}}');
  });

  it('replaces the same placeholder every time it appears', () => {
    expect(renderBody('{{firstName}} and {{firstName}} again', variables)).toBe('Ada and Ada again');
  });

  it('passes through text with no placeholders unchanged', () => {
    expect(renderBody('Plain text', variables)).toBe('Plain text');
  });
});

describe('resolveField', () => {
  it('resolves a known variable key', () => {
    expect(resolveField('designation', variables)).toBe('Manager');
  });

  it('returns an empty string for an unknown key rather than throwing', () => {
    expect(resolveField('nope', variables)).toBe('');
  });
});

describe('buildVariables', () => {
  it('formats the employee into the fixed variable set', () => {
    const result = buildVariables(
      {
        firstName: 'Ada',
        lastName: 'Admin',
        employeeId: 'EMP-001',
        department: 'Engineering',
        designation: 'Manager',
        dateOfJoining: new Date('2020-01-01T00:00:00.000Z'),
      },
      'Acme Inc',
      new Date('2026-07-29T12:00:00.000Z'),
    );
    expect(result).toEqual({
      firstName: 'Ada',
      lastName: 'Admin',
      employeeId: 'EMP-001',
      department: 'Engineering',
      designation: 'Manager',
      dateOfJoining: '2020-01-01',
      companyName: 'Acme Inc',
      today: '2026-07-29',
    });
  });
});
