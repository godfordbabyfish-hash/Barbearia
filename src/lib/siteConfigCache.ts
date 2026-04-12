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

export async function getSiteConfig(key: string): Promise<any | null> {
  const now = Date.now();
  const entry = cache[key];
  if (entry && entry.expiresAt > now) {
    return entry.value;
  }

  const { data, error } = await supabase
    .from('site_config')
    .select('config_value')
    .eq('config_key', key)
    .maybeSingle();

  if (error || !data) return null;

  cache[key] = { value: data.config_value, expiresAt: now + TTL_MS };
  return data.config_value;
}

export function invalidateSiteConfig(key: string) {
  delete cache[key];
}

export function invalidateAllSiteConfig() {
  Object.keys(cache).forEach(k => delete cache[k]);
}
