import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import cors from 'cors';
import express from 'express';
import { ZodError } from 'zod';
import { config, publicAppConfig } from './config.js';
import { providers } from './container.js';
import { seed } from './db/index.js';
import { db, migrate } from './db/schema.js';
import { logger } from './logger.js';
import { AppError, errorBody, statusFromError } from './errors.js';
import { adminRouter } from './routes/admin.js';
import { configRouter } from './routes/config.js';
import { demoAdminRouter } from './routes/demoAdmin.js';
import { publicRouter } from './routes/public.js';
import type { Providers } from './providers/types.js';
import { createAdminRouter } from './routes/admin.js';
import { createDemoAdminRouter } from './routes/demoAdmin.js';
import { createPublicRouter } from './routes/public.js';

export function createApp(data: Providers = providers): express.Express {
  const app = express();
  const allowedOrigins = new Set([
    config.appUrl,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
  ]);

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '64kb' }));
  app.set('trust proxy', 1);

  app.get('/api/health', (_req, res) => {
    try {
      db.prepare('SELECT 1 AS ok').get();
      res.json({
        ok: true,
        dataMode: config.dataMode,
        posAdapter: config.posAdapter,
        paymentAdapter: config.paymentAdapter,
        demoMode: config.allowDemoMode,
        adminProtected: Boolean(config.admin.token),
        eventAdapter: config.eventAdapter,
      });
    } catch (error) {
      logger.error('Healthcheck database failure', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(503).json({
        ok: false,
        error: { code: 'DB_UNAVAILABLE', message: 'Database unavailable' },
      });
    }
  });

  app.use('/api/config', configRouter);
  app.use('/api', data === providers ? publicRouter : createPublicRouter(data));
  app.use('/api/demo-admin', data === providers ? demoAdminRouter : createDemoAdminRouter(data));
  app.use('/api/admin', data === providers ? adminRouter : createAdminRouter(data));

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const publicDirCandidates = [
    config.publicDir || undefined,
    path.join(__dirname, '../public'),
    path.join(process.cwd(), 'public'),
  ].filter(Boolean) as string[];

  const publicDir = publicDirCandidates.find((dir) => fs.existsSync(dir));

  if (publicDir) {
    app.use(express.static(publicDir, { index: false, maxAge: '1h' }));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Not found' } });
        return;
      }
      res.sendFile(path.join(publicDir, 'index.html'), (err) => {
        if (err) next(err);
      });
    });
  }

  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      if (err instanceof ZodError) {
        res.status(400).json({
          ok: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: err.flatten() },
        });
        return;
      }
      if (!(err instanceof AppError)) {
        logger.error('Unhandled request error', { error: err.message });
      }
      res.status(statusFromError(err)).json(errorBody(err));
    },
  );

  return app;
}

if (!config.isTest) {
  migrate();
  seed(db);
}

export const app = createApp();

if (!config.isTest) {
  app.listen(config.port, '0.0.0.0', () => {
    logger.info('App started', {
      port: config.port,
      database: process.env.DATABASE_PATH || 'local default',
      dataMode: config.dataMode,
      posAdapter: config.posAdapter,
      eventAdapter: config.eventAdapter,
      demoMode: config.allowDemoMode,
      adminProtected: Boolean(config.admin.token),
      business: publicAppConfig(),
    });
    if (!config.admin.token) {
      logger.warn('ADMIN_TOKEN is not set; /api/admin write operations are locked (fail closed).');
    }
  });
}
