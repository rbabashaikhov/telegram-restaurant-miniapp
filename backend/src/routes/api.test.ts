import express from 'express';
import http from 'node:http';
import { Socket } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createExternalPosProvider } from '../providers/pos/adapters.js';
import { AppError } from '../errors.js';
import { createTestWorld, type TestWorld } from '../test/harness.js';
import { createPublicRouter } from './public.js';
import { createAdminRouter } from './admin.js';
import { createDemoAdminRouter } from './demoAdmin.js';

function dispatch(
  app: express.Express,
  method: string,
  url: string,
  body?: unknown,
  headers?: Record<string, string>,
): Promise<{ status: number; json: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const req = new http.IncomingMessage(new Socket());
    req.method = method;
    req.url = url;
    req.headers = { host: '127.0.0.1', 'content-type': 'application/json', ...headers };

    const payload = body === undefined ? '' : JSON.stringify(body);
    if (payload) {
      req.headers['content-length'] = String(Buffer.byteLength(payload));
    }

    const res = new http.ServerResponse(req);
    const chunks: Buffer[] = [];
    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);

    res.write = ((chunk: unknown, encoding?: BufferEncoding, cb?: () => void) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), encoding));
      return originalWrite(chunk as never, encoding as never, cb);
    }) as typeof res.write;

    res.end = ((chunk?: unknown, encoding?: BufferEncoding, cb?: () => void) => {
      if (chunk && typeof chunk !== 'function') {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), encoding));
      }
      const raw = Buffer.concat(chunks).toString('utf8');
      let json: Record<string, unknown> = {};
      if (raw) {
        try {
          json = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          json = { raw };
        }
      }
      resolve({ status: res.statusCode || 0, json });
      return originalEnd(chunk as never, encoding as never, cb);
    }) as typeof res.end;

    req.on('error', reject);
    res.on('error', reject);
    app(req, res);

    if (payload) req.push(payload);
    req.push(null);
  });
}

function testApp(world: TestWorld) {
  const app = express();
  app.use(express.json());
  app.use('/api', createPublicRouter(world.providers));
  app.use('/api/admin', createAdminRouter(world.providers));
  app.use(
    '/api/demo-admin',
    createDemoAdminRouter(world.providers, { isEnabled: () => true }),
  );
  return app;
}

describe('security and demo admin', () => {
  let world: TestWorld;
  let app: express.Express;

  beforeEach(() => {
    world = createTestWorld();
    app = testApp(world);
  });

  afterEach(() => {
    world.db.close();
  });

  it('creates a reservation for the demo guest', async () => {
    const response = await dispatch(app, 'POST', '/api/reservations', {
      date: '2030-05-16',
      startTime: '19:00',
      partySize: 2,
      diningAreaId: 2,
      occasion: 'date',
    });
    expect(response.status).toBe(201);
    const data = response.json.data as { occasion: string; tableAssigned: boolean };
    expect(data.occasion).toBe('date');
    expect(data.tableAssigned).toBe(true);
  });

  it('rejects admin writes without a token', async () => {
    const response = await dispatch(app, 'POST', '/api/admin/reservations/1/status', {
      status: 'confirmed',
    });
    expect(response.status).toBe(401);
    expect((response.json.error as { code: string }).code).toBe('ADMIN_UNAUTHORIZED');
  });

  it('allows admin writes with the configured token', async () => {
    const response = await dispatch(
      app,
      'POST',
      '/api/admin/reservations/1/status',
      { status: 'confirmed' },
      { 'x-admin-token': 'test-admin-token' },
    );
    expect(response.status).toBe(200);
  });

  it('forbids demo-admin writes', async () => {
    const response = await dispatch(app, 'POST', '/api/demo-admin/dashboard', {});
    expect(response.status).toBe(405);
    expect((response.json.error as { code: string }).code).toBe('DEMO_READ_ONLY');
  });

  it('reads live demo-admin data', async () => {
    const response = await dispatch(app, 'GET', '/api/demo-admin/dashboard');
    expect(response.status).toBe(200);
    expect(response.json.ok).toBe(true);
    const data = response.json.data as { reservationsToday: number };
    expect(typeof data.reservationsToday).toBe('number');
  });
});

describe('POS stub', () => {
  it('returns a controlled 501 instead of crashing', () => {
    const pos = createExternalPosProvider();
    try {
      pos.submitOrder({} as never);
      throw new Error('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe('POS_NOT_CONFIGURED');
      expect((error as AppError).status).toBe(501);
    }
  });
});
