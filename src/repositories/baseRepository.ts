import { supabase } from '@/services/supabase';
import type { Database } from '@/types/supabase';

type TableName = keyof Database['public']['Tables'] & string;
type Row<T extends TableName> = Database['public']['Tables'][T]['Row'];
type InsertRow<T extends TableName> = Database['public']['Tables'][T]['Insert'];
type UpdateRow<T extends TableName> = Database['public']['Tables'][T]['Update'];

export class BaseRepository<T extends TableName> {
  constructor(private readonly table: T) {}

  async findAll(): Promise<Row<T>[]> {
    let query = supabase.from(this.table).select('*');
    if (this.table === 'contracts') {
      query = query.is('deleted_at', null);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data as Row<T>[] | null) ?? [];
  }

  async findById(id: string): Promise<Row<T> | null> {
    let query = supabase.from(this.table).select('*').eq('id', id as never);
    if (this.table === 'contracts') {
      query = query.is('deleted_at', null);
    }
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return (data as Row<T> | null) ?? null;
  }

  async insert(payload: InsertRow<T>): Promise<Row<T>> {
    const { data, error } = await supabase.from(this.table).insert(payload).select().single();
    if (error) throw error;
    return data as Row<T>;
  }

  async update(id: string, payload: UpdateRow<T>): Promise<Row<T> | null> {
    const { data, error } = await supabase.from(this.table).update(payload).eq('id', id as never).select().maybeSingle();
    if (error) throw error;
    return (data as Row<T> | null) ?? null;
  }

  async delete(id: string): Promise<void> {
    const query = supabase.from(this.table);
    const { error } = this.table === 'contracts'
      ? await query
          .update({ deleted_at: new Date().toISOString() } as UpdateRow<T>)
          .eq('id', id as never)
          .is('deleted_at', null)
      : await query.delete().eq('id', id as never);
    if (error) throw error;
  }
}
