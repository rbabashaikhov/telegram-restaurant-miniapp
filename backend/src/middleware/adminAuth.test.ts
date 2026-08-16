import { describe, expect, it } from 'vitest';
import { authorizeAdminRequest } from './adminAuth.js';

describe('admin authorization', () => {
  it('fails closed when ADMIN_TOKEN is missing', () => {
    expect(
      authorizeAdminRequest({
        expectedToken: '',
        providedToken: undefined,
      }),
    ).toBe(false);
    expect(
      authorizeAdminRequest({
        expectedToken: '',
        providedToken: 'anything',
      }),
    ).toBe(false);
  });

  it('accepts the configured token', () => {
    expect(
      authorizeAdminRequest({
        expectedToken: 'ops-secret',
        providedToken: 'ops-secret',
      }),
    ).toBe(true);
  });

  it('rejects a missing or wrong token when ADMIN_TOKEN is set', () => {
    expect(
      authorizeAdminRequest({
        expectedToken: 'ops-secret',
        providedToken: undefined,
      }),
    ).toBe(false);
    expect(
      authorizeAdminRequest({
        expectedToken: 'ops-secret',
        providedToken: 'nope',
      }),
    ).toBe(false);
  });
});
