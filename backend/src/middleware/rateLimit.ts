import type { NextFunction, Request, Response } from 'express';
import { config } from '../config.js';

const hits = new Map<string, number[]>();

export function writeRateLimit(req: Request, res: Response, next: NextFunction): void {
  const { windowMs, max } = config.rateLimit;
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((ts) => now - ts < windowMs);
  recent.push(now);
  hits.set(key, recent);

  if (recent.length > max) {
    res.status(429).json({
      ok: false,
      error: { code: 'RATE_LIMITED', message: 'Too many requests' },
    });
    return;
  }

  next();
}
