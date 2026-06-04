import { supabase } from '@/integrations/supabase/client';
import { handleSupabaseError } from '@/lib/supabase-error';
import type { Database } from '@/types/database';
import type { Contract, Property, Unit } from '@/types/domain';

export type Owner = Database['public']['Tables']['owners']['Row'];
export type PropertyOwner = Database['public']['Tables']['property_owners']['Row'];

export type PropertyOwnerWithOwner = PropertyOwner & {
  owner: Owner | null;
};

export type PropertyWithOwners = Property & {
  property_owners: PropertyOwnerWithOwner[];
};

export type OwnerProperty = Property & {
  property_owners: PropertyOwner[];
};

export type OwnerUnit = Pick<Unit, 'id' | 'property_id' | 'unit_number' | 'floor' | 'status' | 'rent_amount'>;
export type OwnerContract = Pick<Contract, 'id' | 'property_id' | 'unit_id' | 'start_date' | 'end_date' | 'status'>;

export type OwnerHubSnapshot = Readonly<{
  owners: Owner[];
  properties: PropertyWithOwners[];
}>;

export type OwnerDetailSnapshot = Readonly<{
  owner: Owner;
  properties: OwnerProperty[];
  units: OwnerUnit[];
  contracts: OwnerContract[];
}>;

function requireSupabaseData<T>(data: T | null, fallbackMessage: string): T {
  if (!data) throw new Error(fallbackMessage);
  return data;
}

export function getOwnerDisplayName(owner: Pick<Owner, 'full_name' | 'display_name'>): string {
  return owner.display_name?.trim() || owner.full_name;
}

export function getPropertyOwnerDisplayName(property: Pick<Property, 'owner_name'> & { property_owners?: PropertyOwnerWithOwner[] | null }): string | null {
  const relationshipNames = (property.property_owners ?? [])
    .filter((link) => !link.ends_on)
    .map((link) => link.owner ? getOwnerDisplayName(link.owner) : null)
    .filter((name): name is string => Boolean(name));

  if (relationshipNames.length > 0) return relationshipNames.join('، ');
  return property.owner_name?.trim() || null;
}

export function getActiveOwnerLinks(property: Pick<PropertyWithOwners, 'property_owners'>): PropertyOwnerWithOwner[] {
  return property.property_owners.filter((link) => !link.ends_on);
}

export function getOwnerActivePropertyCount(ownerId: string, properties: readonly PropertyWithOwners[]): number {
  return properties.filter((property) => property.property_owners.some((link) => link.owner_id === ownerId && !link.ends_on)).length;
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

export async function listPropertiesWithOwners(): Promise<PropertyWithOwners[]> {
  const { data, error } = await supabase
    .from('properties')
    .select('*, property_owners(*, owner:owners(*))')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .returns<PropertyWithOwners[]>();

  if (error) handleSupabaseError(error, 'تعذر تحميل عقارات الملاك');
  return data ?? [];
}

export async function listOwnerProperties(ownerId: string): Promise<OwnerProperty[]> {
  const { data, error } = await supabase
    .from('properties')
    .select('*, property_owners(*)')
    .eq('property_owners.owner_id', ownerId)
    .is('property_owners.ends_on', null)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .returns<OwnerProperty[]>();

  if (error) handleSupabaseError(error, 'تعذر تحميل عقارات المالك');
  return data ?? [];
}

export async function listUnitsForProperties(propertyIds: readonly string[]): Promise<OwnerUnit[]> {
  if (propertyIds.length === 0) return [];

  const { data, error } = await supabase
    .from('units')
    .select('id, property_id, unit_number, floor, status, rent_amount')
    .in('property_id', [...propertyIds])
    .is('deleted_at', null)
    .order('unit_number', { ascending: true })
    .returns<OwnerUnit[]>();

  if (error) handleSupabaseError(error, 'تعذر تحميل وحدات المالك');
  return data ?? [];
}

export async function listContractsForProperties(propertyIds: readonly string[]): Promise<OwnerContract[]> {
  if (propertyIds.length === 0) return [];

  const { data, error } = await supabase
    .from('contracts')
    .select('id, property_id, unit_id, start_date, end_date, status')
    .in('property_id', [...propertyIds])
    .is('deleted_at', null)
    .order('start_date', { ascending: false })
    .returns<OwnerContract[]>();

  if (error) handleSupabaseError(error, 'تعذر تحميل عقود المالك');
  return data ?? [];
}

export async function fetchOwnerHubSnapshot(): Promise<OwnerHubSnapshot> {
  const [owners, properties] = await Promise.all([listOwners(), listPropertiesWithOwners()]);
  return { owners, properties };
}

export async function fetchOwnerDetailSnapshot(ownerId: string): Promise<OwnerDetailSnapshot> {
  const owner = await getOwner(ownerId);
  const properties = await listOwnerProperties(ownerId);
  const propertyIds = properties.map((property) => property.id);
  const [units, contracts] = await Promise.all([listUnitsForProperties(propertyIds), listContractsForProperties(propertyIds)]);

  return { owner, properties, units, contracts };
}
