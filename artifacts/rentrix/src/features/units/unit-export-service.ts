import { supabase } from '@/integrations/supabase/client';
import type { Unit } from '@/types/domain';

const unitExportColumns = 'id,property_id,owner_id,unit_number,status,rent_amount,floor,notes,created_at,updated_at,deleted_at';

export async function listUnitsForExport(propertyId: string): Promise<Unit[]> {
  const { data, error } = await supabase
    .from('units')
    .select(unitExportColumns)
    .eq('property_id', propertyId)
    .is('deleted_at', null)
    .order('unit_number', { ascending: true })
    .limit(1000)
    .returns<Unit[]>();

  if (error) throw error;
  return data ?? [];
}
