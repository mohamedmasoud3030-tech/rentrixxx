import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/types/database';
import type { Unit } from '@/types/domain';
import { normalizeUnitStatus, type UnitPayload } from './unit-schema';

type UnitInsert = Database['public']['Tables']['units']['Insert'];
type UnitUpdate = Database['public']['Tables']['units']['Update'];

function normalizeUnit(unit: Unit): Unit {
  return {
    ...unit,
    status: normalizeUnitStatus(String(unit.status)),
  };
}

export async function listUnits(): Promise<Unit[]> {
  const { data, error } = await supabase
    .from('units')
    .select('*')
    .is('deleted_at', null)
    .order('property_id', { ascending: true })
    .order('unit_number', { ascending: true })
    .returns<Unit[]>();
  if (error) throw error;
  return (data ?? []).map(normalizeUnit);
}

export async function listUnitsByProperty(propertyId: string): Promise<Unit[]> {
  const { data, error } = await supabase
    .from('units')
    .select('*')
    .eq('property_id', propertyId)
    .is('deleted_at', null)
    .order('unit_number', { ascending: true })
    .returns<Unit[]>();
  if (error) throw error;
  return (data ?? []).map(normalizeUnit);
}

export async function createUnit(propertyId: string, payload: UnitPayload): Promise<Unit> {
  const insertPayload: UnitInsert = { ...payload, property_id: propertyId, name: payload.unit_number ?? payload.name ?? '' };
  const { data, error } = await supabase.from('units').insert(insertPayload).select('*').single().returns<Unit>();
  if (error) throw error;
  return normalizeUnit(data);
}

export async function updateUnit(unitId: string, payload: UnitPayload): Promise<Unit> {
  const updatePayload: UnitUpdate = payload;
  const { data, error } = await supabase
    .from('units')
    .update(updatePayload)
    .eq('id', unitId)
    .is('deleted_at', null)
    .select('*')
    .single()
    .returns<Unit>();
  if (error) throw error;
  return normalizeUnit(data);
}

export async function softDeleteUnit(unitId: string): Promise<void> {
  const updatePayload: UnitUpdate = { deleted_at: new Date().toISOString() };
  const { error } = await supabase.from('units').update(updatePayload).eq('id', unitId).is('deleted_at', null);
  if (error) throw error;
}
