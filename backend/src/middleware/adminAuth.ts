import { timingSafeEqual, createHash } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { config } from '../config.js';

function tokensEqual(provided: string, expected: string): boolean {
  const left = createHash('sha256').update(provided).digest();
  const right = createHash('sha256').update(expected).digest();
  return timingSafeEqual(left, right);
}

export function authorizeAdminRequest(params: {
  expectedToken: string;
  providedToken?: string;
}): boolean {
  if (!params.expectedToken) return false;
  if (!params.providedToken) return false;
  return tokensEqual(params.providedToken, params.expectedToken);
}

function readProvidedToken(req: Request): string | undefined {
  return (
    (req.header('x-admin-token') as string | undefined) ||
    (req.header('authorization')?.replace(/^Bearer\s+/i, '') as string | undefined) ||
    (typeof req.query.adminToken === 'string' ? req.query.adminToken : undefined)
  );
}

export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const allowed = authorizeAdminRequest({
    expectedToken: config.admin.token,
    providedToken: readProvidedToken(req),
  });

  if (!allowed) {
    res.status(401).json({
      ok: false,
      error: { code: 'ADMIN_UNAUTHORIZED', message: 'Admin authentication required' },
    });
    return;
  }

  next();
}
