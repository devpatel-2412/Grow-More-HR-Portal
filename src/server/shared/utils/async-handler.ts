import type { Request, Response, NextFunction, RequestHandler } from 'express';

/** Wraps an async Express handler so a rejected promise is forwarded to the centralized error middleware instead of crashing the process. */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
