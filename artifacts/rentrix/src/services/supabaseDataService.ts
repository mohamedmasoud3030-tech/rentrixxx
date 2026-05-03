import { supabase } from '@/services/api/supabaseClient';
import { Database, Settings, Governance, Serials } from '../types';
import { logger } from '@/infrastructure/observability';
import type { GovernanceRow, SerialsRow, SettingsRow, UsersRow } from '../types/database';

function clearTableCache(jsTable: string): void {
  tableCache.delete(jsTable);
}

const CACHE_TTL_MS = 30_000;
type CacheEntry = { expiresAt: number; value: unknown };
const tableCache = new Map<string, CacheEntry>();

function getFromCache<T>(key: string): T | null {
  const entry = tableCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    tableCache.delete(key);
    return null;
  }
  return entry.value as T;
}

function setCache<T>(key: string, value: T): void {
  tableCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

const TABLE_MAP: Record<string, string> = {
  owners: 'owners',
  properties: 'properties',
  units: 'units',
  tenants: 'tenants',
  contracts: 'contracts',
  invoices: 'invoices',
  receipts: 'receipts',
  receiptAllocations: 'receipt_allocations',
  expenses: 'expenses',
  maintenanceRecords: 'maintenance_records',
  depositTxs: 'deposit_txs',
  auditLog: 'audit_log',
  ownerSettlements: 'owner_settlements',
  snapshots: 'snapshots',
  accounts: 'accounts',
  journalEntries: 'journal_entries',
  autoBackups: 'auto_backups',
  ownerBalances: 'owner_balances',
  contractBalances: 'contract_balances',
  tenantBalances: 'tenant_balances',
  notificationTemplates: 'notification_templates',
  outgoingNotifications: 'outgoing_notifications',
  appNotifications: 'app_notifications',
  leads: 'leads',
  lands: 'lands',
  commissions: 'commissions',
  missions: 'missions',
  budgets: 'budgets',
  attachments: 'attachments',
  utilityRecords: 'utility_bills',
  accountBalances: 'account_balances',
  kpiSnapshots: 'kpi_snapshots',
  users: 'profiles',
  automationRuns: 'automation_runs',
  automationRunLogs: 'automation_run_logs',
  automationJobs: 'automation_jobs',
  payments: 'payments',
};

const SPECIAL_FIELD_MAP: Record<string, Record<string, string>> = {
  contracts: { start: 'start_date', end: 'end_date', rent: 'rent_amount' },
  units: { rentDefault: 'rent_default', minRent: 'min_rent' },
  ownerBalances: { collections: 'total_income', expenses: 'total_expenses', officeShare: 'commission', net: 'net_balance', updatedAt: 'updated_at' },
  contractBalances: { balance: 'balance_due', lastUpdatedAt: 'updated_at' },
  tenantBalances: { balance: 'balance_due', lastUpdatedAt: 'updated_at' },
};

const REVERSE_SPECIAL_MAP: Record<string, Record<string, string>> = {
  contracts: { start_date: 'start', end_date: 'end', rent_amount: 'rent' },
  units: { rent_default: 'rentDefault', min_rent: 'minRent' },
  ownerBalances: { total_income: 'collections', total_expenses: 'expenses', commission: 'officeShare', net_balance: 'net', updated_at: 'updatedAt' },
  contractBalances: { balance_due: 'balance', updated_at: 'lastUpdatedAt' },
  tenantBalances: { balance_due: 'balance', updated_at: 'lastUpdatedAt' },
};

// Known sort column per SQL table — avoids 400 trial-and-error loops
const TABLE_SORT_COLUMN: Record<string, string> = {
  automation_runs:     'started_at',
  automation_run_logs: 'started_at',
  audit_log:           'created_at',
  auto_backups:        'created_at',
  app_notifications:   'created_at',
  outgoing_notifications: 'created_at',
  snapshots:           'created_at',
  kpi_snapshots:       'created_at',
  journal_entries:     'created_at',
  receipts:            'created_at',
  expenses:            'created_at',
  invoices:            'created_at',
  contracts:           'created_at',
  maintenance_records: 'created_at',
  deposit_txs:         'created_at',
  owner_settlements:   'created_at',
};

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function toSnakeObj(obj: object, tableName?: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const specialMap = tableName ? SPECIAL_FIELD_MAP[tableName] : undefined;
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (value === undefined) continue;
    const snakeKey = specialMap?.[key] ?? camelToSnake(key);
    result[snakeKey] = value;
  }
  return result;
}

function toCamelObj(obj: Record<string, unknown>, tableName?: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const reverseMap = tableName ? REVERSE_SPECIAL_MAP[tableName] : undefined;
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = reverseMap?.[key] ?? snakeToCamel(key);
    result[camelKey] = value;
  }
  return result;
}

function resolveTable(jsTable: string): string {
  return TABLE_MAP[jsTable] || camelToSnake(jsTable);
}


function applyContractsVisibility<T extends { is: (column: string, value: null) => T }>(query: T, jsTable: string): T {
  if (jsTable === 'contracts') {
    return query.is('deleted_at', null);
  }
  return query;
}

export const supabaseData = {
  async fetchAll<T>(jsTable: string): Promise<T[]> {
    const cacheKey = `fetchAll:${jsTable}`;
    const cached = getFromCache<T[]>(cacheKey);
    if (cached) return cached;
    const sqlTable = resolveTable(jsTable);
    try {
      const columns = '*';
      const { data, error } = await applyContractsVisibility(supabase.from(sqlTable).select(columns), jsTable);
      if (error) {
        logger.error(`[SupabaseData] fetchAll ${sqlTable} error`, { message: error?.message, code: error?.code });
        throw new Error(`fetchAll ${sqlTable}: ${error.message}`);
      }
      const result = (data || []).map(row => toCamelObj(row, jsTable) as T);
      setCache(cacheKey, result);
      return result;
    } catch (err) {
      logger.error(`[SupabaseData] fetchAll ${sqlTable} exception`, { message: (err as any)?.message, code: (err as any)?.code });
      throw err;
    }
  },

  async fetchRecent<T>(jsTable: string, limit = 200): Promise<T[]> {
    const sqlTable = resolveTable(jsTable);
    const preferredSort = TABLE_SORT_COLUMN[sqlTable];
    const orderCandidates = preferredSort
      ? [preferredSort, 'id']
      : ['created_at', 'id'];

    for (const orderBy of orderCandidates) {
      try {
        const columns = '*';
        const { data, error } = await applyContractsVisibility(
          supabase.from(sqlTable).select(columns), jsTable
        ).order(orderBy, { ascending: false, nullsFirst: false }).limit(limit);
        if (!error && data) {
          return data.map(row => toCamelObj(row, jsTable) as T);
        }
        if (error?.code === 'PGRST116' || error?.message?.includes('column')) continue;
        break;
      } catch {
        continue;
      }
    }
    // Final fallback: no ordering
    try {
      const columns = '*';
      const { data, error } = await applyContractsVisibility(
        supabase.from(sqlTable).select(columns), jsTable
      ).limit(limit);
      if (error) {
        logger.error(`[SupabaseData] fetchRecent ${sqlTable} fallback error`, { message: error?.message, code: error?.code });
        throw new Error(`fetchRecent ${sqlTable}: ${error.message}`);
      }
      return (data || []).map(row => toCamelObj(row, jsTable) as T);
    } catch (err) {
      logger.error(`[SupabaseData] fetchRecent ${sqlTable} failed`, { message: (err as any)?.message, code: (err as any)?.code });
      throw err;
    }
  },

  async fetchRecentRaw(jsTable: string, limit = 1): Promise<Record<string, unknown>[]> {
    const sqlTable = resolveTable(jsTable);
    const preferredSort = TABLE_SORT_COLUMN[sqlTable];
    const orderCandidates = preferredSort
      ? [preferredSort, 'id']
      : ['created_at', 'id'];

    for (const orderBy of orderCandidates) {
      try {
        const columns = '*';
        const { data, error } = await applyContractsVisibility(
          supabase.from(sqlTable).select(columns), jsTable
        ).order(orderBy, { ascending: false, nullsFirst: false }).limit(limit);
        if (!error && data) {
          return data as Record<string, unknown>[];
        }
        if (error?.code === 'PGRST116' || error?.message?.includes('column')) continue;
        break;
      } catch {
        continue;
      }
    }

    try {
      const columns = '*';
      const { data, error } = await applyContractsVisibility(
        supabase.from(sqlTable).select(columns), jsTable
      ).limit(limit);
      if (error) {
        logger.error(`[SupabaseData] fetchRecentRaw ${sqlTable} fallback error`, { message: error?.message, code: error?.code });
        throw new Error(`fetchRecentRaw ${sqlTable}: ${error.message}`);
      }
      return (data || []) as Record<string, unknown>[];
    } catch (err) {
      logger.error(`[SupabaseData] fetchRecentRaw ${sqlTable} failed`, { message: (err as any)?.message, code: (err as any)?.code });
      throw err;
    }
  },

  async fetchOne<T>(jsTable: string, id: string | number): Promise<T | null> {
    const cacheKey = `fetchOne:${jsTable}:${id}`;
    const cached = getFromCache<T | null>(cacheKey);
    if (cached !== null) return cached;
    const sqlTable = resolveTable(jsTable);
    const columns = '*';
    const { data, error } = await applyContractsVisibility(supabase.from(sqlTable).select(columns).eq('id', id), jsTable).single();
    if (error) {
      logger.error(`[SupabaseData] fetchOne ${sqlTable} failed`, { message: error?.message, code: error?.code });
      // PGRST116 = "no rows returned" — that is a valid "not found", not a DB failure
      if (error.code === 'PGRST116') return null;
      throw new Error(`fetchOne ${sqlTable} [${id}]: ${error.message}`);
    }
    const result = data ? toCamelObj(data, jsTable) as T : null;
    if (result !== null) setCache(cacheKey, result);
    return result;
  },

  async insert<T>(jsTable: string, record: object): Promise<{ data: T | null; error: string | null }> {
    const sqlTable = resolveTable(jsTable);
    const snakeRecord = toSnakeObj(record, jsTable);
    const { data, error } = await supabase.from(sqlTable).insert([snakeRecord]).select().single();
    if (error) { 
      const errorMsg = error.message || 'خطأ غير معروف';
      logger.error(`[SupabaseData] insert ${sqlTable} failed`, { message: error?.message, code: error?.code });
      return { data: null, error: errorMsg };
    }
    clearTableCache(jsTable);
    return { data: data ? toCamelObj(data, jsTable) as T : null, error: null };
  },

  async upsert<T>(jsTable: string, record: object): Promise<T | null> {
    const sqlTable = resolveTable(jsTable);
    const snakeRecord = toSnakeObj(record, jsTable);
    const { data, error } = await supabase.from(sqlTable).upsert(snakeRecord).select().single();
    if (error) {
      logger.error(`[SupabaseData] upsert ${sqlTable} failed`, { message: error?.message, code: error?.code });
      throw new Error(`upsert ${sqlTable}: ${error.message}`);
    }
    clearTableCache(jsTable);
    return data ? toCamelObj(data, jsTable) as T : null;
  },

  async update(jsTable: string, id: string | number, updates: object): Promise<{ ok: boolean; error: string | null }> {
    const sqlTable = resolveTable(jsTable);
    const snakeUpdates = toSnakeObj(updates, jsTable);
    const { error } = await supabase.from(sqlTable).update(snakeUpdates).eq('id', id);
    if (error) { 
      const errorMsg = error.message || 'خطأ غير معروف';
      logger.error(`[SupabaseData] update ${sqlTable} failed`, { message: error?.message, code: error?.code });
      return { ok: false, error: errorMsg };
    }
    clearTableCache(jsTable);
    return { ok: true, error: null };
  },

  async remove(jsTable: string, id: string | number): Promise<boolean> {
    const sqlTable = resolveTable(jsTable);
    const { error } = jsTable === 'contracts'
      ? await supabase
          .from(sqlTable)
          .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', id)
          .is('deleted_at', null)
      : await supabase.from(sqlTable).delete().eq('id', id);
    if (error) { logger.error(`[SupabaseData] remove ${sqlTable} failed`, { message: error?.message, code: error?.code }); return false; }
    clearTableCache(jsTable);
    return true;
  },

  async removeWhere(jsTable: string, column: string, value: unknown): Promise<boolean> {
    const sqlTable = resolveTable(jsTable);
    const snakeCol = camelToSnake(column);
    const { error } = jsTable === 'contracts'
      ? await supabase
          .from(sqlTable)
          .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq(snakeCol, value)
          .is('deleted_at', null)
      : await supabase.from(sqlTable).delete().eq(snakeCol, value);
    if (error) { logger.error(`[SupabaseData] removeWhere ${sqlTable} failed`, { message: error?.message, code: error?.code }); return false; }
    clearTableCache(jsTable);
    return true;
  },

  async fetchWhere<T>(jsTable: string, column: string, value: unknown): Promise<T[]> {
    const sqlTable = resolveTable(jsTable);
    const snakeCol = jsTable && SPECIAL_FIELD_MAP[jsTable]?.[column]
      ? SPECIAL_FIELD_MAP[jsTable][column]
      : camelToSnake(column);
    const columns = '*';
    const { data, error } = await applyContractsVisibility(supabase.from(sqlTable).select(columns).eq(snakeCol, value), jsTable);
    if (error) {
      logger.error(`[SupabaseData] fetchWhere ${sqlTable} failed`, { message: error?.message, code: error?.code });
      throw new Error(`fetchWhere ${sqlTable} [${column}=${String(value)}]: ${error.message}`);
    }
    return (data || []).map(row => toCamelObj(row, jsTable) as T);
  },

  async bulkInsert<T>(jsTable: string, records: object[]): Promise<T[]> {
    const sqlTable = resolveTable(jsTable);
    const snakeRecords = records.map(r => toSnakeObj(r, jsTable));
    const { data, error } = await supabase.from(sqlTable).insert(snakeRecords).select();
    if (error) {
      logger.error(`[SupabaseData] bulkInsert ${sqlTable} failed`, { message: error?.message, code: error?.code });
      throw new Error(`bulkInsert ${sqlTable}: ${error.message}`);
    }
    clearTableCache(jsTable);
    return (data || []).map(row => toCamelObj(row, jsTable) as T);
  },

  async bulkUpdate(jsTable: string, records: { id: string; updates: object }[]): Promise<boolean> {
    if (!records.length) return true;

    // استخدام upsert للتحديث الجماعي بدلاً من N queries منفصلة
    const sqlTable = resolveTable(jsTable);
    const upsertRecords = records.map(({ id, updates }) => ({
      id,
      ...toSnakeObj(updates, jsTable),
      updated_at: new Date().toISOString(),
    }));

    try {
      const { error } = await supabase.from(sqlTable).upsert(upsertRecords, {
        onConflict: 'id',
        ignoreDuplicates: false
      });

      if (error) {
        logger.error(`[SupabaseData] bulkUpdate ${sqlTable} error`, { message: error?.message, code: error?.code });
        return false;
      }
      clearTableCache(jsTable);
      return true;
    } catch (err) {
      logger.error(`[SupabaseData] bulkUpdate ${sqlTable} exception`, { message: (err as any)?.message, code: (err as any)?.code });
      return false;
    }
  },

  async upsertMany(jsTable: string, records: object[]): Promise<boolean> {
    if (!records.length) return true;
    const sqlTable = resolveTable(jsTable);
    const snakeRecords = records.map(r => toSnakeObj(r, jsTable));
    const { error } = await supabase.from(sqlTable).upsert(snakeRecords);
    if (error) { logger.error(`[SupabaseData] upsertMany ${sqlTable} failed`, { message: error?.message, code: error?.code }); return false; }
    clearTableCache(jsTable);
    return true;
  },

  async getSettings(): Promise<Settings | null> {
    const { data, error } = await supabase.from('settings').select('data').eq('id', 1).single<SettingsRow>();
    if (error || !data) return null;
    return data.data as unknown as Settings;
  },

  async saveSettings(settings: Settings): Promise<boolean> {
    const { error } = await supabase.from('settings').upsert({ id: 1, data: settings });
    if (error) { logger.error('[SupabaseData] saveSettings failed', { message: error?.message, code: error?.code }); return false; }
    return true;
  },

  async updateSettingsPartial(partial: Partial<Settings>): Promise<boolean> {
    const current = await this.getSettings();
    if (!current) return false;
    const merged = deepMerge(current as any, partial as any) as unknown as Settings;
    return this.saveSettings(merged);
  },

  async getGovernance(): Promise<Governance | null> {
    const columns = 'id, read_only, locked_periods';
    const { data, error } = await supabase.from('governance').select(columns).eq('id', 1).single<GovernanceRow>();
    if (error || !data) return null;
    return { readOnly: data.read_only, lockedPeriods: data.locked_periods || [] };
  },

  async saveGovernance(gov: Governance): Promise<boolean> {
    const { error } = await supabase.from('governance').upsert({
      id: 1, read_only: gov.readOnly, locked_periods: gov.lockedPeriods
    });
    if (error) { logger.error('[SupabaseData] saveGovernance failed', { message: error?.message, code: error?.code }); return false; }
    return true;
  },

  async getSerials(): Promise<Serials | null> {
    const columns = 'id, receipt, expense, maintenance, invoice, lead, owner_settlement, journal_entry, mission, contract';
    const { data, error } = await supabase.from('serials').select(columns).eq('id', 1).single<SerialsRow>();
    if (error || !data) return null;
    return {
      receipt: data.receipt, expense: data.expense, maintenance: data.maintenance,
      invoice: data.invoice, lead: data.lead, ownerSettlement: data.owner_settlement,
      journalEntry: data.journal_entry, mission: data.mission, contract: data.contract,
    };
  },

  async incrementSerial(key: string): Promise<number> {
    const serialsSnakeMap: Record<string, string> = {
      receipt: 'receipt', expense: 'expense', maintenance: 'maintenance',
      invoice: 'invoice', lead: 'lead', ownerSettlement: 'owner_settlement',
      journalEntry: 'journal_entry', mission: 'mission', contract: 'contract',
    };
    const col = serialsSnakeMap[key] || key;
    const { data, error } = await supabase.rpc('increment_serial', { serial_column: col });
    if (error || typeof data !== 'number') {
      logger.error('[SupabaseData] incrementSerial rpc failed', { message: error?.message, code: error?.code });
      return 1000;
    }
    return data;
  },

  async fetchPaginated<T>(jsTable: string, page = 1, pageSize = 50, orderBy?: string, ascending = false): Promise<{ data: T[]; total: number; hasMore: boolean }> {
    const sqlTable = resolveTable(jsTable);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    try {
      const columns = '*';
      let query = supabase.from(sqlTable).select(columns, { count: 'exact' });

      if (orderBy) {
        const snakeOrder = camelToSnake(orderBy);
        query = query.order(snakeOrder, { ascending });
      }

      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) {
        logger.error(`[SupabaseData] fetchPaginated ${sqlTable} error`, { message: error?.message, code: error?.code });
        throw new Error(`fetchPaginated ${sqlTable}: ${error.message}`);
      }

      const total = count || 0;
      const hasMore = from + pageSize < total;

      return {
        data: (data || []).map(row => toCamelObj(row, jsTable) as T),
        total,
        hasMore
      };
    } catch (err) {
      logger.error(`[SupabaseData] fetchPaginated ${sqlTable} exception`, { message: (err as any)?.message, code: (err as any)?.code });
      throw err;
    }
  },

  async fetchFiltered<T>(jsTable: string, filters: Record<string, unknown>, orderBy?: string, ascending = false, limit?: number): Promise<T[]> {
    const sqlTable = resolveTable(jsTable);

    try {
      const columns = '*';
      let query = supabase.from(sqlTable).select(columns);

      // تطبيق الفلاتر
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          const snakeKey = camelToSnake(key);
          if (typeof value === 'string' && value.includes('%')) {
            query = query.ilike(snakeKey, value);
          } else {
            query = query.eq(snakeKey, value);
          }
        }
      });

      // الترتيب
      if (orderBy) {
        const snakeOrder = camelToSnake(orderBy);
        query = query.order(snakeOrder, { ascending });
      }

      // الحد
      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      if (error) {
        logger.error(`[SupabaseData] fetchFiltered ${sqlTable} error`, { message: error?.message, code: error?.code });
        throw new Error(`fetchFiltered ${sqlTable}: ${error.message}`);
      }

      return (data || []).map(row => toCamelObj(row, jsTable) as T);
    } catch (err) {
      logger.error(`[SupabaseData] fetchFiltered ${sqlTable} exception`, { message: (err as any)?.message, code: (err as any)?.code });
      throw err;
    }
  },

  async getAllData(): Promise<Database> {
    const tables = [
      'owners', 'properties', 'units', 'tenants', 'contracts',
      'invoices', 'receipts', 'receiptAllocations', 'expenses',
      'maintenanceRecords', 'depositTxs', 'auditLog', 'ownerSettlements',
      'accounts', 'journalEntries', 'notificationTemplates',
      'outgoingNotifications', 'appNotifications', 'leads', 'lands',
      'commissions', 'missions', 'budgets', 'attachments', 'snapshots', 'utilityRecords',
      'accountBalances', 'kpiSnapshots', 'ownerBalances', 'contractBalances', 'tenantBalances',
    ];

    const limitedTables = new Set(['auditLog', 'snapshots', 'appNotifications', 'outgoingNotifications']);
    const results = await Promise.all(
      tables.map(t => limitedTables.has(t) ? this.fetchRecent(t, 200) : this.fetchAll(t))
    );
    const dataMap: Record<string, unknown[]> = {};
    tables.forEach((t, i) => { dataMap[t] = results[i]; });

    const [settings, governance, serials] = await Promise.all([
      this.getSettings(),
      this.getGovernance(),
      this.getSerials(),
    ]);

    const profileColumns = 'id, username, role, must_change_password, created_at, is_disabled';
    const { data: profileRows } = await supabase.from('profiles').select(profileColumns);
    const users = ((profileRows || []) as UsersRow[]).map((p) => ({
      id: p.id, username: p.username || '', email: '', hash: '', salt: '',
      role: p.role || 'USER', mustChange: p.must_change_password || false,
      createdAt: p.created_at || Date.now(),
      isDisabled: p.is_disabled || false,
    }));

    return {
      settings: settings || {} as Settings,
      auth: { users },
      owners: (dataMap.owners || []) as Database['owners'],
      properties: (dataMap.properties || []) as Database['properties'],
      units: (dataMap.units || []) as Database['units'],
      tenants: (dataMap.tenants || []) as Database['tenants'],
      contracts: (dataMap.contracts || []) as Database['contracts'],
      invoices: (dataMap.invoices || []) as Database['invoices'],
      receipts: (dataMap.receipts || []) as Database['receipts'],
      receiptAllocations: (dataMap.receiptAllocations || []) as Database['receiptAllocations'],
      expenses: (dataMap.expenses || []) as Database['expenses'],
      maintenanceRecords: (dataMap.maintenanceRecords || []) as Database['maintenanceRecords'],
      depositTxs: (dataMap.depositTxs || []) as Database['depositTxs'],
      auditLog: (dataMap.auditLog || []) as Database['auditLog'],
      governance: governance || { readOnly: false, lockedPeriods: [] },
      ownerSettlements: (dataMap.ownerSettlements || []) as Database['ownerSettlements'],
      serials: serials || { receipt: 1000, expense: 1000, maintenance: 1000, invoice: 1000, lead: 1000, ownerSettlement: 1000, journalEntry: 1000, mission: 1000, contract: 1000 },
      snapshots: (dataMap.snapshots || []) as Database['snapshots'],
      accounts: (dataMap.accounts || []) as Database['accounts'],
      journalEntries: (dataMap.journalEntries || []) as Database['journalEntries'],
      autoBackups: [],
      ownerBalances: (dataMap.ownerBalances || []) as Database['ownerBalances'],
      accountBalances: (dataMap.accountBalances || []) as Database['accountBalances'],
      kpiSnapshots: (dataMap.kpiSnapshots || []) as Database['kpiSnapshots'],
      contractBalances: (dataMap.contractBalances || []) as Database['contractBalances'],
      tenantBalances: (dataMap.tenantBalances || []) as Database['tenantBalances'],
      notificationTemplates: (dataMap.notificationTemplates || []) as Database['notificationTemplates'],
      outgoingNotifications: (dataMap.outgoingNotifications || []) as Database['outgoingNotifications'],
      appNotifications: (dataMap.appNotifications || []) as Database['appNotifications'],
      leads: (dataMap.leads || []) as Database['leads'],
      lands: (dataMap.lands || []) as Database['lands'],
      commissions: (dataMap.commissions || []) as Database['commissions'],
      missions: (dataMap.missions || []) as Database['missions'],
      budgets: (dataMap.budgets || []) as Database['budgets'],
      attachments: (dataMap.attachments || []) as Database['attachments'],
      utilityRecords: (dataMap.utilityRecords || []) as Database['utilityRecords'],
    };
  },

  async seedDefaults(defaultSettings: Settings, defaultAccounts: Record<string, unknown>[], defaultTemplates: Record<string, unknown>[], defaultSerials: Serials): Promise<void> {
    const existingSettings = await this.getSettings();
    if (!existingSettings) {
      await this.saveSettings(defaultSettings);
    }

    const { data: govData } = await supabase.from('governance').select('id').eq('id', 1).single();
    if (!govData) {
      await this.saveGovernance({ readOnly: false, lockedPeriods: [] });
    }

    const { data: serialData } = await supabase.from('serials').select('id').eq('id', 1).single();
    if (!serialData) {
      const snakeSerials: Record<string, unknown> = { id: 1 };
      for (const [k, v] of Object.entries(defaultSerials)) {
        const snakeKey = camelToSnake(k);
        snakeSerials[snakeKey] = v;
      }
      await supabase.from('serials').insert(snakeSerials);
    }

    const { data: existingAccounts } = await supabase.from('accounts').select('id');
    if (!existingAccounts || existingAccounts.length === 0) {
      const snakeAccounts = defaultAccounts.map(a => toSnakeObj(a, 'accounts'));
      await supabase.from('accounts').insert(snakeAccounts);
    }

    const { data: existingTemplates } = await supabase.from('notification_templates').select('id');
    if (!existingTemplates || existingTemplates.length === 0) {
      const snakeTemplates = defaultTemplates.map(t => toSnakeObj(t, 'notificationTemplates'));
      await supabase.from('notification_templates').insert(snakeTemplates);
    }
  },
};

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = { ...target };
  for (const [key, sourceValue] of Object.entries(source)) {
    const targetValue = output[key];
    if (
      sourceValue &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      output[key] = deepMerge(targetValue as Record<string, unknown>, sourceValue as Record<string, unknown>);
    } else {
      output[key] = sourceValue;
    }
  }
  return output;
}
