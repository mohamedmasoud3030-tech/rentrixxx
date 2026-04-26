import { getSupabaseClient } from '@/services/api/supabaseClient';
import { handleError, NotFoundError } from '@/services/utils/errorHandler';

export interface MaintenanceRecord {
  id: string;
  no: string;
  unitId: string;
  description: string;
  status: 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  cost?: number;
  requestDate: number;
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export class MaintenanceService {
  static async list(): Promise<MaintenanceRecord[]> {
    try {
      const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('maintenance_records')
        .select('*')
        .order('request_date', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(m => this.mapMaintenance(m));
    } catch (error) {
      throw handleError(error);
    }
  }

  static async get(id: string): Promise<MaintenanceRecord> {
    try {
      const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('maintenance_records')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      if (!data) throw new NotFoundError('سجل الصيانة', id);
      
      return this.mapMaintenance(data);
    } catch (error) {
      throw handleError(error);
    }
  }

  static async create(record: Omit<MaintenanceRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<MaintenanceRecord> {
    try {
      const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('maintenance_records')
        .insert([{
          no: record.no,
          unit_id: record.unitId,
          description: record.description,
          status: record.status,
          priority: record.priority,
          cost: record.cost,
          request_date: new Date(record.requestDate).toISOString(),
        }])
        .select()
        .single();
      
      if (error) throw error;
      return this.mapMaintenance(data);
    } catch (error) {
      throw handleError(error);
    }
  }

  static async update(id: string, updates: Partial<MaintenanceRecord>): Promise<MaintenanceRecord> {
    try {
      const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('maintenance_records')
        .update({
          status: updates.status,
          priority: updates.priority,
          cost: updates.cost,
          completed_at: updates.completedAt ? new Date(updates.completedAt).toISOString() : null,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return this.mapMaintenance(data);
    } catch (error) {
      throw handleError(error);
    }
  }

  static async complete(id: string): Promise<MaintenanceRecord> {
    return this.update(id, {
      status: 'COMPLETED',
      completedAt: Date.now(),
    });
  }

  static async cancel(id: string): Promise<MaintenanceRecord> {
    return this.update(id, { status: 'CANCELLED' });
  }

  private static mapMaintenance(data: any): MaintenanceRecord {
    return {
      id: data.id,
      no: data.no,
      unitId: data.unit_id,
      description: data.description,
      status: data.status,
      priority: data.priority,
      cost: data.cost,
      requestDate: new Date(data.request_date).getTime(),
      completedAt: data.completed_at ? new Date(data.completed_at).getTime() : undefined,
      createdAt: new Date(data.created_at).getTime(),
      updatedAt: new Date(data.updated_at).getTime(),
    };
  }
}
