import { beforeEach, describe, expect, it, vi } from 'vitest';

const { read } = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: read }) }) }) },
}));
import { getSiteConfig, invalidateAllSiteConfig, invalidateSiteConfig } from './siteConfigCache';

describe('site config concurrent reads', () => {
  beforeEach(() => { invalidateAllSiteConfig(); read.mockReset(); });

  it('shares a pending request and caches its result', async () => {
    read.mockResolvedValue({ data: { config_value: { open: '09:00' } }, error: null });
    const values = await Promise.all([getSiteConfig('hours'), getSiteConfig('hours')]);
    expect(values[0]).toEqual(values[1]);
    await getSiteConfig('hours');
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('does not cache errors and permits a subsequent read', async () => {
    read.mockResolvedValueOnce({ data: null, error: { code: '57014' } });
    expect(await getSiteConfig('hours')).toBeNull();
    read.mockResolvedValueOnce({ data: { config_value: 'updated' }, error: null });
    expect(await getSiteConfig('hours')).toBe('updated');
    expect(read).toHaveBeenCalledTimes(2);
  });

  it('does not restore an invalidated result from an older request', async () => {
    let finish!: (value: unknown) => void;
    read.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const older = getSiteConfig('hours');
    invalidateSiteConfig('hours');
    read.mockResolvedValueOnce({ data: { config_value: 'new' }, error: null });
    expect(await getSiteConfig('hours')).toBe('new');
    finish({ data: { config_value: 'old' }, error: null });
    await older;
    expect(await getSiteConfig('hours')).toBe('new');
    expect(read).toHaveBeenCalledTimes(2);
  });

  it('clears a rejected request so a later read can recover', async () => {
    read.mockRejectedValueOnce(new Error('network unavailable'));
    await expect(getSiteConfig('hours')).rejects.toThrow('network unavailable');
    read.mockResolvedValueOnce({ data: { config_value: 'recovered' }, error: null });
    expect(await getSiteConfig('hours')).toBe('recovered');
    expect(read).toHaveBeenCalledTimes(2);
  });
});
