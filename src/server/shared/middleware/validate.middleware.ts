import type { Request, Response, NextFunction } from 'express';
import type { ZodTypeAny } from 'zod';
import { ValidationError } from '../errors/app-error.js';

interface ValidationSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/** Generic request validator reused by every module — parses body/query/params against Zod schemas and replaces them with the parsed (typed, defaulted, coerced) result. */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) throw new ValidationError('Invalid request body', result.error.flatten());
      req.body = result.data;
    }
    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) throw new ValidationError('Invalid query parameters', result.error.flatten());
      req.query = result.data as typeof req.query;
    }
    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) throw new ValidationError('Invalid route parameters', result.error.flatten());
      req.params = result.data as typeof req.params;
    }
    next();
  };
}
