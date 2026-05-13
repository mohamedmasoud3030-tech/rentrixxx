import Dexie, { type Table } from 'dexie';
import type { Contract, Expense, Invoice, Property, Unit, Person, SyncStatus } from '@/types/domain';

export type CachedRecord<T> = T & {
  cached_at: string;
};

export type SyncQueueItem = {
  id?: number;
  table_name: 'properties' | 'units' | 'people' | 'contracts' | 'invoices' | 'payments' | 'expenses';
  operation: 'insert' | 'update' | 'delete';
  record_id: string;
  payload: unknown;
  attempts: number;
  last_error?: string;
  created_at: string;
  next_retry_at: string;
};

export type SyncMetadata = {
  key: string;
  status: SyncStatus;
  last_synced_at: string | null;
  updated_at: string;
};

class RentrixCacheDatabase extends Dexie {
  properties!: Table<CachedRecord<Property>, string>;
  units!: Table<CachedRecord<Unit>, string>;
  people!: Table<CachedRecord<Person>, string>;
  contracts!: Table<CachedRecord<Contract>, string>;
  invoices!: Table<CachedRecord<Invoice>, string>;
  expenses!: Table<CachedRecord<Expense>, string>;
  sync_queue!: Table<SyncQueueItem, number>;
  sync_metadata!: Table<SyncMetadata, string>;

  constructor() {
    super('rentrix-cache');
    this.version(1).stores({
      properties: 'id, status, cached_at, deleted_at',
      units: 'id, property_id, status, cached_at, deleted_at',
      people: 'id, type, phone, email, cached_at, deleted_at',
      contracts: 'id, property_id, unit_id, tenant_id, status, start_date, end_date, cached_at, deleted_at',
      invoices: 'id, contract_id, status, due_date, cached_at, deleted_at',
      expenses: 'id, property_id, category, expense_date, cached_at, deleted_at',
      sync_queue: '++id, table_name, operation, record_id, attempts, next_retry_at, created_at',
      sync_metadata: 'key, status, last_synced_at, updated_at',
    });
  }
}

export const rentrixCache = new RentrixCacheDatabase();
