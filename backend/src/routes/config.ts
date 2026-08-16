import { Router } from 'express';
import { publicAppConfig } from '../config.js';
import { ok } from './helpers.js';

export const configRouter = Router();

configRouter.get('/', (_req, res) => {
  ok(res, publicAppConfig());
});
