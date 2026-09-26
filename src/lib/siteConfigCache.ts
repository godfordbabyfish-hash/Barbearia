/**
 * Cache em memória para site_config.
 * Evita múltiplas queries ao Supabase para a mesma chave na mesma sessão.
 * TTL padrão: 5 minutos.
 */
import { supabase } from '@/integrations/supabase/client';

const TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  value: any;
  expiresAt: number;
}

const cache: Record<string, CacheEntry> = {};
const pending = new Map<string, Promise<any | null>>();

export async function getSiteConfig(key: string): Promise<any | null> {
  const now = Date.now();
  const entry = cache[key];
  if (entry && entry.expiresAt > now) {
    return entry.value;
  }

  const existing = pending.get(key);
  if (existing) return existing;

  const request = (async () => {
    const { data, error } = await supabase
      .from('site_config')
      .select('config_value')
      .eq('config_key', key)
      .maybeSingle();

    if (error || !data) return null;
    // An invalidation during the request must not repopulate stale cache.
    if (pending.get(key) === request) {
      cache[key] = { value: data.config_value, expiresAt: Date.now() + TTL_MS };
    }
    return data.config_value;
  })();
  pending.set(key, request);
  try {
    return await request;
  } finally {
    if (pending.get(key) === request) pending.delete(key);
  }
}

export function invalidateSiteConfig(key: string) {
  delete cache[key];
  pending.delete(key);
}

export function invalidateAllSiteConfig() {
  Object.keys(cache).forEach(k => delete cache[k]);
  pending.clear();
}
