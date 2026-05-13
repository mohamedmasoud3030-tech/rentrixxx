import { supabase } from '@/integrations/supabase/client';
import { rentrixCache } from '@/db/local-cache';
import type { Property } from '@/types/domain';

export async function listProperties(): Promise<Property[]> {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(25);

  if (error) throw error;

  const cachedAt = new Date().toISOString();
  const properties = (data ?? []) as Property[];
  await rentrixCache.properties.bulkPut(properties.map((property) => ({ ...property, cached_at: cachedAt })));
  return properties;
}
