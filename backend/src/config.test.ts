import { describe, expect, it } from 'vitest';
import { isDemoAdminPreviewEnabled } from './config.js';

describe('config helpers', () => {
  it('enables demo admin only when demo mode and feature flag are on', () => {
    expect(
      isDemoAdminPreviewEnabled({
        allowDemoMode: true,
        features: { demoAdminPreview: true },
      }),
    ).toBe(true);
    expect(
      isDemoAdminPreviewEnabled({
        allowDemoMode: false,
        features: { demoAdminPreview: true },
      }),
    ).toBe(false);
    expect(
      isDemoAdminPreviewEnabled({
        allowDemoMode: true,
        features: { demoAdminPreview: false },
      }),
    ).toBe(false);
  });
});
