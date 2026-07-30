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

/** Parses "field:asc" / "field:desc" into a Prisma orderBy object, restricted to an allow-list of sortable fields to prevent arbitrary-field probing. */
export function toPrismaOrderBy<T extends string>(
  sort: string | undefined,
  allowedFields: readonly T[],
  fallback: T,
): Record<string, 'asc' | 'desc'> {
  if (!sort) return { [fallback]: 'asc' };
  const [field, direction] = sort.split(':');
  const safeField = allowedFields.includes(field as T) ? field : fallback;
  const safeDirection = direction === 'desc' ? 'desc' : 'asc';
  return { [safeField]: safeDirection };
}

export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}
