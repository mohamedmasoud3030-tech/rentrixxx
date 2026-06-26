import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/types/database';
import type { Unit } from '@/types/domain';
import { normalizeUnitStatus, type UnitPayload } from './unit-schema';

type UnitInsert = Database['public']['Tables']['units']['Insert'];
type UnitUpdate = Database['public']['Tables']['units']['Update'];

function getWriteErrorMessage(action: 'create' | 'update' | 'archive', error: unknown) {
  const fallback = action === 'create' ? 'تعذر إنشاء الوحدة' : action === 'update' ? 'تعذر تحديث الوحدة' : 'تعذر أرشفة الوحدة';
  const message = error instanceof Error ? error.message : String(error ?? '');
  const lower = message.toLowerCase();

  if (lower.includes('permission denied') || lower.includes('rls') || lower.includes('row-level security') || lower.includes('not authorized')) {
    return `${fallback}: لا تملك صلاحية الكتابة على الوحدات. تواصل مع المسؤول أو استخدم حساباً بصلاحيات أعلى.`;
  }

  if (message) return `${fallback}: ${message}`;
  return fallback;
}

export function normalizeUnitPayload(propertyId: string, payload: UnitPayload): UnitInsert {
  return { ...payload, property_id: propertyId };
}

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
  const insertPayload = normalizeUnitPayload(propertyId, payload);
  const { data, error } = await supabase.from('units').insert(insertPayload).select('*').single().returns<Unit>();
  if (error) throw new Error(getWriteErrorMessage('create', error));
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
  if (error) throw new Error(getWriteErrorMessage('update', error));
  return normalizeUnit(data);
}

export async function softDeleteUnit(unitId: string): Promise<void> {
  const updatePayload: UnitUpdate = { deleted_at: new Date().toISOString() };
  const { error } = await supabase.from('units').update(updatePayload).eq('id', unitId).is('deleted_at', null);
  if (error) throw new Error(getWriteErrorMessage('archive', error));
}
