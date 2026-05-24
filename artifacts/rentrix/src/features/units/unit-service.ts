import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/types/database';
import type { Unit } from '@/types/domain';
import type { UnitPayload } from './unit-schema';

type UnitInsert = Database['public']['Tables']['units']['Insert'];
type UnitUpdate = Database['public']['Tables']['units']['Update'];


const unitListColumns = 'id,property_id,owner_id,unit_number,status,rent_amount,floor,notes,created_at,updated_at,deleted_at';

export async function listUnits(): Promise<Unit[]> {
  const { data, error } = await supabase
    .from('units')
    .select(unitListColumns)
    .is('deleted_at', null)
    .order('property_id', { ascending: true })
    .order('unit_number', { ascending: true })
    .returns<Unit[]>();
  if (error) throw error;
  return data ?? [];
}

export async function listUnitsByProperty(propertyId: string): Promise<Unit[]> {
  const { data, error } = await supabase
    .from('units')
    .select(unitListColumns)
    .eq('property_id', propertyId)
    .is('deleted_at', null)
    .order('unit_number', { ascending: true })
    .returns<Unit[]>();
  if (error) throw error;
  return data ?? [];
}

export async function createUnit(propertyId: string, payload: UnitPayload): Promise<Unit> {
  const insertPayload: UnitInsert = { ...payload, property_id: propertyId };
  const { data, error } = await supabase.from('units').insert(insertPayload).select(unitListColumns).single().returns<Unit>();
  if (error) throw error;
  return data;
}

export async function updateUnit(unitId: string, payload: UnitPayload): Promise<Unit> {
  const updatePayload: UnitUpdate = payload;
  const { data, error } = await supabase
    .from('units')
    .update(updatePayload)
    .eq('id', unitId)
    .is('deleted_at', null)
    .select(unitListColumns)
    .single()
    .returns<Unit>();
  if (error) throw error;
  return data;
}

export async function softDeleteUnit(unitId: string): Promise<void> {
  const updatePayload: UnitUpdate = { deleted_at: new Date().toISOString() };
  const { error } = await supabase.from('units').update(updatePayload).eq('id', unitId).is('deleted_at', null);
  if (error) throw error;
}
