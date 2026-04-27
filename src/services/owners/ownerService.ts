import { getSupabaseClient } from '@/services/api/supabaseClient';
import { handleError, NotFoundError } from '@/services/utils/errorHandler';

export interface Owner {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  nationalId?: string;
  createdAt: number;
  updatedAt: number;
}

export class OwnerService {
  static async list(): Promise<Owner[]> {
    try {
      const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('owners')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map((o: any) => this.mapOwner(o));
    } catch (error) {
      throw handleError(error);
    }
  }

  static async get(id: string): Promise<Owner> {
    try {
      const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('owners')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      if (!data) throw new NotFoundError('المالك', id);
      
      return this.mapOwner(data);
    } catch (error) {
      throw handleError(error);
    }
  }

  static async create(owner: Omit<Owner, 'id' | 'createdAt' | 'updatedAt'>): Promise<Owner> {
    try {
      const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('owners')
        .insert([{
          name: owner.name,
          email: owner.email,
          phone: owner.phone,
          national_id: owner.nationalId,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return this.mapOwner(data);
    } catch (error) {
      throw handleError(error);
    }
  }

  static async update(id: string, updates: Partial<Owner>): Promise<Owner> {
    try {
      const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('owners')
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
      return this.mapOwner(data);
    } catch (error) {
      throw handleError(error);
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('owners')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      throw handleError(error);
    }
  }

  private static mapOwner(data: any): Owner {
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
}
