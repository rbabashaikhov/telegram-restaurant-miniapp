import { describe, expect, it } from 'vitest';
import { canRunSalesDemoTour, canShowSalesDemoChrome, shouldAutoStartTour } from './eligibility';
import { createTourStorage, memoryStorage } from './storage';
import { chooseTooltipPlacement } from './placement';
import { findTourTarget, tourTargetSelector } from './targets';

describe('demo tour eligibility', () => {
  const base = {
    isDemo: true,
    isTelegram: false,
    demoMode: true,
    demoTourEnabled: true,
    isAdminPath: false,
  };

  it('runs only in browser demo mode', () => {
    expect(canRunSalesDemoTour(base)).toBe(true);
    expect(canRunSalesDemoTour({ ...base, isTelegram: true })).toBe(false);
    expect(canRunSalesDemoTour({ ...base, demoMode: false })).toBe(false);
  });

  it('auto-starts once', () => {
    expect(shouldAutoStartTour({ ...base, hasBeenSeen: false })).toBe(true);
    expect(shouldAutoStartTour({ ...base, hasBeenSeen: true })).toBe(false);
  });

  it('hides chrome on admin paths', () => {
    expect(canShowSalesDemoChrome({ ...base, demoAdminPreviewEnabled: true, isAdminPath: true })).toBe(false);
  });
});

describe('tour storage', () => {
  it('persists skip/complete', () => {
    const storage = createTourStorage('test-tour', memoryStorage);
    expect(storage.hasBeenSeen()).toBe(false);
    storage.markSeen('skipped');
    expect(storage.readReason()).toBe('skipped');
  });
});

describe('placement and targets', () => {
  it('prefers bottom when there is room', () => {
    expect(
      chooseTooltipPlacement({
        targetTop: 80,
        targetBottom: 140,
        tooltipHeight: 160,
        viewportHeight: 800,
        preferred: 'bottom',
      }),
    ).toBe('bottom');
  });

  it('builds a stable selector', () => {
    expect(tourTargetSelector('home-hero')).toBe('[data-demo-tour="home-hero"]');
    expect(findTourTarget('missing', { querySelector: () => null } as unknown as ParentNode)).toBeNull();
  });
});
