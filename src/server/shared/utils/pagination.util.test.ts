import { describe, it, expect } from 'vitest';
import { paginationQuerySchema, toPrismaSkipTake, toPrismaOrderBy, buildPaginationMeta } from './pagination.util.js';

describe('pagination.util', () => {
  it('applies defaults for page and limit', () => {
    const parsed = paginationQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(20);
  });

  it('rejects a limit above the max of 100', () => {
    expect(() => paginationQuerySchema.parse({ limit: 101 })).toThrow();
  });

  it('converts page/limit to Prisma skip/take', () => {
    expect(toPrismaSkipTake({ page: 3, limit: 10 })).toEqual({ skip: 20, take: 10 });
  });

  it('parses a valid "field:direction" sort string', () => {
    expect(toPrismaOrderBy('email:desc', ['email', 'createdAt'], 'createdAt')).toEqual({ email: 'desc' });
  });

  it('falls back to the default field for an unknown sort field (prevents arbitrary-field probing)', () => {
    expect(toPrismaOrderBy('passwordHash:asc', ['email', 'createdAt'], 'createdAt')).toEqual({ createdAt: 'asc' });
  });

  it('falls back to ascending for an invalid direction', () => {
    expect(toPrismaOrderBy('email:sideways', ['email'], 'email')).toEqual({ email: 'asc' });
  });

  it('defaults to the fallback field, ascending, when no sort is given and the fallback is a plain string', () => {
    expect(toPrismaOrderBy(undefined, ['email', 'createdAt'], 'createdAt')).toEqual({ createdAt: 'asc' });
  });

  it('preserves a module-specific default direction via an object fallback when no sort is given', () => {
    expect(toPrismaOrderBy(undefined, ['title', 'createdAt'], { field: 'createdAt', direction: 'desc' })).toEqual({
      createdAt: 'desc',
    });
  });

  it('an object fallback still only supplies its direction as the fallback, not for a valid explicit sort', () => {
    expect(toPrismaOrderBy('title:asc', ['title', 'createdAt'], { field: 'createdAt', direction: 'desc' })).toEqual({
      title: 'asc',
    });
  });

  it('an unknown field falls back to the fallback field but keeps an explicitly valid requested direction', () => {
    expect(toPrismaOrderBy('bogus:asc', ['title', 'createdAt'], { field: 'createdAt', direction: 'desc' })).toEqual({
      createdAt: 'asc',
    });
  });

  it('an unknown field with a garbled direction falls back to the field AND direction from the object fallback', () => {
    expect(toPrismaOrderBy('bogus:sideways', ['title', 'createdAt'], { field: 'createdAt', direction: 'desc' })).toEqual({
      createdAt: 'desc',
    });
  });

  it('builds pagination meta with correct totalPages, at least 1', () => {
    expect(buildPaginationMeta(1, 20, 45)).toEqual({ page: 1, limit: 20, total: 45, totalPages: 3 });
    expect(buildPaginationMeta(1, 20, 0)).toEqual({ page: 1, limit: 20, total: 0, totalPages: 1 });
  });
});
