import { getSupabaseClient } from '@/services/api/supabaseClient';
import { handleError, NotFoundError } from '@/services/utils/errorHandler';

export interface Contract {
  id: string;
  no: string;
  unitId: string;
  tenantId: string;
  status: 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'DRAFT';
  startDate: number;
  endDate: number;
  rentAmount: number;
  deposit?: number;
  createdAt: number;
  updatedAt: number;
}

export class ContractService {
  static async list(): Promise<Contract[]> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(c => this.mapContract(c));
    } catch (error) {
      throw handleError(error);
    }
  }

  static async get(id: string): Promise<Contract> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      if (!data) throw new NotFoundError('العقد', id);
      return this.mapContract(data);
    } catch (error) {
      throw handleError(error);
    }
  }

  static async create(contract: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contract> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('contracts')
        .insert([{
          no: contract.no,
          unit_id: contract.unitId,
          tenant_id: contract.tenantId,
          status: contract.status,
          start_date: new Date(contract.startDate).toISOString(),
          end_date: new Date(contract.endDate).toISOString(),
          rent_amount: contract.rentAmount,
          deposit: contract.deposit,
        }])
        .select()
        .single();
      if (error) throw error;
      return this.mapContract(data);
    } catch (error) {
      throw handleError(error);
    }
  }

  static async update(id: string, updates: Partial<Contract>): Promise<Contract> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('contracts')
        .update({
          status: updates.status,
          rent_amount: updates.rentAmount,
          deposit: updates.deposit,
          end_date: updates.endDate ? new Date(updates.endDate).toISOString() : undefined,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return this.mapContract(data);
    } catch (error) {
      throw handleError(error);
    }
  }

  static async renew(id: string, newEndDate: number): Promise<Contract> {
    return this.update(id, { endDate: newEndDate, status: 'ACTIVE' });
  }

  static async terminate(id: string): Promise<Contract> {
    return this.update(id, { status: 'TERMINATED' });
  }

  private static mapContract(data: any): Contract {
    return {
      id: data.id,
      no: data.no,
      unitId: data.unit_id,
      tenantId: data.tenant_id,
      status: data.status,
      startDate: new Date(data.start_date).getTime(),
      endDate: new Date(data.end_date).getTime(),
      rentAmount: data.rent_amount,
      deposit: data.deposit,
      createdAt: new Date(data.created_at).getTime(),
      updatedAt: new Date(data.updated_at).getTime(),
    };
  }
}
