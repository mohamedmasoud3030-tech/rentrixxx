import { supabase } from '@/services/api/supabaseClient';
import { handleError, NotFoundError } from '@/services/utils/errorHandler';

export interface Property {
  id: string;
  ownerId: string;
  name: string;
  address: string;
  type: 'apartment' | 'villa' | 'house' | 'commercial';
  area?: number;
  location?: string;
  createdAt: number;
  updatedAt: number;
}

export class PropertyService {
  static async list(): Promise<Property[]> {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(p => this.mapProperty(p));
    } catch (error) {
      throw handleError(error);
    }
  }

  static async get(id: string): Promise<Property> {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      if (!data) throw new NotFoundError('الممتلك', id);
      
      return this.mapProperty(data);
    } catch (error) {
      throw handleError(error);
    }
  }

  static async create(property: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>): Promise<Property> {
    try {
      const { data, error } = await supabase
        .from('properties')
        .insert([{
          owner_id: property.ownerId,
          name: property.name,
          address: property.address,
          type: property.type,
          area: property.area,
          location: property.location,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return this.mapProperty(data);
    } catch (error) {
      throw handleError(error);
    }
  }

  static async update(id: string, updates: Partial<Property>): Promise<Property> {
    try {
      const { data, error } = await supabase
        .from('properties')
        .update({
          name: updates.name,
          address: updates.address,
          type: updates.type,
          area: updates.area,
          location: updates.location,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return this.mapProperty(data);
    } catch (error) {
      throw handleError(error);
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      throw handleError(error);
    }
  }

  private static mapProperty(data: any): Property {
    return {
      id: data.id,
      ownerId: data.owner_id,
      name: data.name,
      address: data.address,
      type: data.type,
      area: data.area,
      location: data.location,
      createdAt: new Date(data.created_at).getTime(),
      updatedAt: new Date(data.updated_at).getTime(),
    };
  }
}
