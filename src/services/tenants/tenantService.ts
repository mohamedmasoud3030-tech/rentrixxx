import { getSupabaseClient } from '@/services/api/supabaseClient';

export interface Tenant {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  nationalId?: string;
  createdAt: number;
  updatedAt: number;
}

export class TenantService {
  static async list(): Promise<Tenant[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(t => ({
      id: t.id,
      name: t.name || t.fullName,
      email: t.email,
      phone: t.phone,
      nationalId: t.national_id,
      createdAt: new Date(t.created_at).getTime(),
      updatedAt: new Date(t.updated_at).getTime(),
    }));
  }

  static async get(id: string): Promise<Tenant | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;

    return {
      id: data.id,
      name: data.name || data.fullName,
      email: data.email,
      phone: data.phone,
      nationalId: data.national_id,
      createdAt: new Date(data.created_at).getTime(),
      updatedAt: new Date(data.updated_at).getTime(),
    };
  }

  static async create(tenant: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tenant> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tenants')
      .insert([{
        name: tenant.name,
        email: tenant.email,
        phone: tenant.phone,
        national_id: tenant.nationalId,
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      nationalId: data.national_id,
      createdAt: new Date(data.created_at).getTime(),
      updatedAt: new Date(data.updated_at).getTime(),
    };
  }

  static async update(id: string, updates: Partial<Tenant>): Promise<Tenant> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tenants')
      .update({
        name: updates.name,
        email: updates.email,
        phone: updates.phone,
        national_id: updates.nationalId,
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      nationalId: data.national_id,
      createdAt: new Date(data.created_at).getTime(),
      updatedAt: new Date(data.updated_at).getTime(),
    };
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('tenants')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}
