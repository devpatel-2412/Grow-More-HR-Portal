import { describe, it, expect } from 'vitest';
import { escapeCsvCell, toCsv } from './csv-export';

describe('escapeCsvCell', () => {
  it('leaves a plain value untouched', () => {
    expect(escapeCsvCell('Ada Admin')).toBe('Ada Admin');
  });

  it('quotes a value containing a comma', () => {
    expect(escapeCsvCell('Admin, Ada')).toBe('"Admin, Ada"');
  });

  it('doubles an embedded quote and wraps the value', () => {
    expect(escapeCsvCell('She said "hi"')).toBe('"She said ""hi"""');
  });

  it('quotes a value containing a newline', () => {
    expect(escapeCsvCell('line one\nline two')).toBe('"line one\nline two"');
  });
});

describe('toCsv', () => {
  it('joins headers and rows with CRLF, comma-separated', () => {
    const csv = toCsv(['Name', 'Role'], [['Ada Admin', 'ADMIN'], ['Wanda Worker', 'EMPLOYEE']]);
    expect(csv).toBe('Name,Role\r\nAda Admin,ADMIN\r\nWanda Worker,EMPLOYEE');
  });

  it('escapes cells that need it within a full CSV', () => {
    const csv = toCsv(['Name'], [['Smith, John']]);
    expect(csv).toBe('Name\r\n"Smith, John"');
  });

  it('produces just the header row when there are no rows', () => {
    expect(toCsv(['Name', 'Role'], [])).toBe('Name,Role');
  });
});
