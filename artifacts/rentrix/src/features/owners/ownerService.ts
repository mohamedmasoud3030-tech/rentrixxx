import { supabase } from '@/integrations/supabase/client';
import { handleSupabaseError } from '@/lib/supabase-error';
import type { Database } from '@/types/database';
import type { Contract, Property } from '@/types/domain';

export type Owner = Database['public']['Tables']['owners']['Row'];
export type OwnerInsert = Database['public']['Tables']['owners']['Insert'];
export type OwnerUpdate = Database['public']['Tables']['owners']['Update'];
export type PropertyOwner = Database['public']['Tables']['property_owners']['Row'];
export type PropertyOwnerInsert = Database['public']['Tables']['property_owners']['Insert'];
export type PropertyOwnerUpdate = Database['public']['Tables']['property_owners']['Update'];
export type OwnerActiveContract = Pick<Contract, 'id' | 'property_id'>;

export type OwnerPayload = Pick<OwnerInsert, 'full_name'> & Partial<Pick<OwnerInsert,
  | 'display_name'
  | 'phone'
  | 'email'
  | 'national_id'
  | 'tax_number'
  | 'address'
  | 'notes'
  | 'is_active'
>>;

export type OwnerUpdatePayload = Partial<OwnerPayload>;

export type PropertyOwnerPayload = Pick<PropertyOwnerInsert, 'property_id' | 'owner_id'> & Partial<Pick<PropertyOwnerInsert,
  | 'ownership_percentage'
  | 'is_primary'
  | 'starts_on'
  | 'ends_on'
>>;

export type PropertyOwnerUpdatePayload = Partial<Pick<PropertyOwnerUpdate,
  | 'ownership_percentage'
  | 'is_primary'
  | 'starts_on'
  | 'ends_on'
>>;

export type PropertyOwnerWithOwner = PropertyOwner & {
  owner: Owner | null;
};

export type PropertyWithOwners = Property & {
  property_owners: PropertyOwnerWithOwner[];
};

const nullableOwnerStringFields = [
  'display_name',
  'phone',
  'email',
  'national_id',
  'tax_number',
  'address',
  'notes',
] as const;

function normalizeNullableString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return value.trim() || null;
}

function normalizeRequiredString(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

export function normalizeOwnerPayload(payload: OwnerPayload): OwnerInsert {
  const fullName = normalizeRequiredString(payload.full_name);
  if (!fullName) throw new Error('اسم المالك مطلوب');

  const normalized: OwnerInsert = {
    full_name: fullName,
    is_active: payload.is_active ?? true,
  };

  for (const field of nullableOwnerStringFields) {
    normalized[field] = normalizeNullableString(payload[field]);
  }

  return normalized;
}

export function normalizeOwnerUpdatePayload(payload: OwnerUpdatePayload): OwnerUpdate {
  const normalized: OwnerUpdate = {};

  if ('full_name' in payload) {
    const fullName = normalizeRequiredString(payload.full_name);
    if (!fullName) throw new Error('اسم المالك مطلوب');
    normalized.full_name = fullName;
  }

  if ('is_active' in payload) {
    normalized.is_active = payload.is_active ?? true;
  }

  for (const field of nullableOwnerStringFields) {
    if (field in payload) normalized[field] = normalizeNullableString(payload[field]);
  }

  return normalized;
}

export function normalizeOwnershipPercentage(value: unknown): number {
  if (value === null || value === undefined || value === '') return 100;
  const percentage = typeof value === 'number' ? value : Number(value);
  const roundedPercentage = Math.round(percentage * 100) / 100;

  if (!Number.isFinite(roundedPercentage) || roundedPercentage <= 0 || roundedPercentage > 100) {
    throw new Error('نسبة الملكية يجب أن تكون أكبر من 0 وأقل من أو تساوي 100');
  }

  return roundedPercentage;
}

function normalizeNullableDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return value.trim() || null;
}

function requireSupabaseData<T>(data: T | null, fallbackMessage: string): T {
  if (!data) throw new Error(fallbackMessage);
  return data;
}

export function normalizePropertyOwnerPayload(payload: PropertyOwnerPayload): PropertyOwnerInsert {
  const propertyId = normalizeRequiredString(payload.property_id);
  const ownerId = normalizeRequiredString(payload.owner_id);

  if (!propertyId) throw new Error('العقار مطلوب');
  if (!ownerId) throw new Error('المالك مطلوب');

  return {
    property_id: propertyId,
    owner_id: ownerId,
    ownership_percentage: normalizeOwnershipPercentage(payload.ownership_percentage),
    is_primary: payload.is_primary ?? true,
    starts_on: normalizeNullableDate(payload.starts_on),
    ends_on: normalizeNullableDate(payload.ends_on),
  };
}

export function normalizePropertyOwnerUpdatePayload(payload: PropertyOwnerUpdatePayload): PropertyOwnerUpdate {
  const normalized: PropertyOwnerUpdate = {};

  if ('ownership_percentage' in payload) {
    normalized.ownership_percentage = normalizeOwnershipPercentage(payload.ownership_percentage);
  }
  if ('is_primary' in payload) {
    normalized.is_primary = payload.is_primary ?? true;
  }
  if ('starts_on' in payload) {
    normalized.starts_on = normalizeNullableDate(payload.starts_on);
  }
  if ('ends_on' in payload) {
    normalized.ends_on = normalizeNullableDate(payload.ends_on);
  }

  return normalized;
}

export function getPropertyOwnerDisplayName(property: Pick<Property, 'owner_name'> & { property_owners?: PropertyOwnerWithOwner[] | null }): string | null {
  const relationshipNames = (property.property_owners ?? [])
    .map((link) => link.owner?.display_name || link.owner?.full_name || null)
    .filter((name): name is string => Boolean(name));

  if (relationshipNames.length > 0) return relationshipNames.join('، ');
  return normalizeNullableString(property.owner_name);
}

export async function listOwners(): Promise<Owner[]> {
  const { data, error } = await supabase
    .from('owners')
    .select('*')
    .order('full_name', { ascending: true })
    .returns<Owner[]>();

  if (error) handleSupabaseError(error, 'تعذر تحميل الملاك');
  return data ?? [];
}

export async function getOwner(ownerId: string): Promise<Owner> {
  const { data, error } = await supabase
    .from('owners')
    .select('*')
    .eq('id', ownerId)
    .single()
    .returns<Owner>();

  if (error) handleSupabaseError(error, 'تعذر تحميل بيانات المالك');
  return requireSupabaseData(data, 'تعذر تحميل بيانات المالك');
}

export async function createOwner(payload: OwnerPayload): Promise<Owner> {
  const { data, error } = await supabase
    .from('owners')
    .insert(normalizeOwnerPayload(payload))
    .select('*')
    .single()
    .returns<Owner>();

  if (error) handleSupabaseError(error, 'تعذر إنشاء المالك');
  return requireSupabaseData(data, 'تعذر إنشاء المالك');
}

export async function updateOwner(ownerId: string, payload: OwnerUpdatePayload): Promise<Owner> {
  const { data, error } = await supabase
    .from('owners')
    .update(normalizeOwnerUpdatePayload(payload))
    .eq('id', ownerId)
    .select('*')
    .single()
    .returns<Owner>();

  if (error) handleSupabaseError(error, 'تعذر تحديث بيانات المالك');
  return requireSupabaseData(data, 'تعذر تحديث بيانات المالك');
}

export async function listPropertyOwners(propertyId: string): Promise<PropertyOwnerWithOwner[]> {
  const { data, error } = await supabase
    .from('property_owners')
    .select('*, owner:owners(*)')
    .eq('property_id', propertyId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true })
    .returns<PropertyOwnerWithOwner[]>();

  if (error) handleSupabaseError(error, 'تعذر تحميل ملاك العقار');
  return data ?? [];
}

export async function listPropertiesWithOwners(): Promise<PropertyWithOwners[]> {
  const { data, error } = await supabase
    .from('properties')
    .select('*, property_owners(*, owner:owners(*))')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .returns<PropertyWithOwners[]>();

  if (error) handleSupabaseError(error, 'تعذر تحميل العقارات وملاكها');
  return data ?? [];
}

export async function linkOwnerToProperty(payload: PropertyOwnerPayload): Promise<PropertyOwner> {
  const { data, error } = await supabase
    .from('property_owners')
    .insert(normalizePropertyOwnerPayload(payload))
    .select('*')
    .single()
    .returns<PropertyOwner>();

  if (error) handleSupabaseError(error, 'تعذر ربط المالك بالعقار');
  return requireSupabaseData(data, 'تعذر ربط المالك بالعقار');
}

export async function updatePropertyOwnerLink(linkId: string, payload: PropertyOwnerUpdatePayload): Promise<PropertyOwner> {
  const { data, error } = await supabase
    .from('property_owners')
    .update(normalizePropertyOwnerUpdatePayload(payload))
    .eq('id', linkId)
    .select('*')
    .single()
    .returns<PropertyOwner>();

  if (error) handleSupabaseError(error, 'تعذر تحديث علاقة ملكية العقار');
  return requireSupabaseData(data, 'تعذر تحديث علاقة ملكية العقار');
}

export async function unlinkOwnerFromProperty(linkId: string): Promise<void> {
  const { error } = await supabase
    .from('property_owners')
    .delete()
    .eq('id', linkId);

  if (error) handleSupabaseError(error, 'تعذر إلغاء ربط المالك بالعقار');
}

export async function listActiveContractsForProperties(propertyIds: string[]): Promise<OwnerActiveContract[]> {
  if (propertyIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('contracts')
    .select('id,property_id')
    .in('property_id', propertyIds)
    .eq('status', 'active')
    .is('deleted_at', null)
    .returns<OwnerActiveContract[]>();

  if (error) handleSupabaseError(error, 'تعذر تحميل العقود النشطة لعقارات الملاك');
  return data ?? [];
}
