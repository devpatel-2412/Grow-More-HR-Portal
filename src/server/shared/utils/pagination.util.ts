import { z } from 'zod';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.string().optional(), // format: "field:asc" | "field:desc"
  search: z.string().optional(),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function toPrismaSkipTake(query: Pick<PaginationQuery, 'page' | 'limit'>) {
  return {
    skip: (query.page - 1) * query.limit,
    take: query.limit,
  };
}

/**
 * Parses "field:asc" / "field:desc" into a Prisma orderBy object, restricted to an allow-list of
 * sortable fields to prevent arbitrary-field probing. `fallback` is used whenever `sort` is
 * absent or names a field outside the allow-list — pass `{ field, direction }` to preserve a
 * module's existing default ordering (most lists default to newest-first, i.e. `desc`); a plain
 * field name defaults to `asc`, matching the original two call sites of this function.
 */
export function toPrismaOrderBy<T extends string>(
  sort: string | undefined,
  allowedFields: readonly T[],
  fallback: T | { field: T; direction: 'asc' | 'desc' },
): Record<string, 'asc' | 'desc'> {
  const fallbackField = typeof fallback === 'string' ? fallback : fallback.field;
  const fallbackDirection = typeof fallback === 'string' ? 'asc' : fallback.direction;
  if (!sort) return { [fallbackField]: fallbackDirection };
  const [field, direction] = sort.split(':');
  const safeField = allowedFields.includes(field as T) ? field : fallbackField;
  const safeDirection = direction === 'desc' ? 'desc' : direction === 'asc' ? 'asc' : fallbackDirection;
  return { [safeField]: safeDirection };
}

export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}
