import type { NextFunction, Request, Response, Router } from 'express';
import { ZodError } from 'zod';
import { AppError, errorBody, statusFromError } from '../errors.js';

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => unknown | Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function sendError(res: Response, error: unknown): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: error.flatten() },
    });
    return;
  }
  res.status(statusFromError(error)).json(errorBody(error));
}

export function ok<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ ok: true, data });
}

export function readIdempotencyKey(req: Request): string | undefined {
  const header = req.header('idempotency-key') || req.header('x-idempotency-key');
  if (header) return header;
  if (req.body && typeof req.body.idempotencyKey === 'string') return req.body.idempotencyKey;
  return undefined;
}

export function mountErrorHandler(router: Router): void {
  router.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    sendError(res, err);
  });
}

export function parseId(value: string | undefined): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError('Invalid id', 400, 'VALIDATION_ERROR');
  }
  return id;
}
