import { supabase } from './supabase';
import { Database, Settings, Governance, Serials } from '../types';

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
  utilityRecords: 'utility_records',
  users: 'profiles',
};

const SPECIAL_FIELD_MAP: Record<string, Record<string, string>> = {
  contracts: { start: 'start_date', end: 'end_date', rent: 'rent_amount' },
  units: { rentDefault: 'rent_default' },
};

const REVERSE_SPECIAL_MAP: Record<string, Record<string, string>> = {
  contracts: { start_date: 'start', end_date: 'end', rent_amount: 'rent' },
  units: { rent_default: 'rentDefault' },
};

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function toSnakeObj(obj: Record<string, any>, tableName?: string): Record<string, any> {
  const result: Record<string, any> = {};
  const specialMap = tableName ? SPECIAL_FIELD_MAP[tableName] : undefined;
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    const snakeKey = specialMap?.[key] ?? camelToSnake(key);
    result[snakeKey] = value;
  }
  return result;
}

function toCamelObj(obj: Record<string, any>, tableName?: string): Record<string, any> {
  const result: Record<string, any> = {};
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

export const supabaseData = {
  async fetchAll<T>(jsTable: string): Promise<T[]> {
    const sqlTable = resolveTable(jsTable);
    const { data, error } = await supabase.from(sqlTable).select('*');
    if (error) { console.error(`[SupabaseData] fetchAll ${sqlTable}:`, error); return []; }
    return (data || []).map(row => toCamelObj(row, jsTable) as T);
  },

  async fetchOne<T>(jsTable: string, id: string | number): Promise<T | null> {
    const sqlTable = resolveTable(jsTable);
    const { data, error } = await supabase.from(sqlTable).select('*').eq('id', id).single();
    if (error) { console.error(`[SupabaseData] fetchOne ${sqlTable}:`, error); return null; }
    return data ? toCamelObj(data, jsTable) as T : null;
  },

  async insert<T>(jsTable: string, record: Record<string, any>): Promise<T | null> {
    const sqlTable = resolveTable(jsTable);
    const snakeRecord = toSnakeObj(record, jsTable);
    const { data, error } = await supabase.from(sqlTable).insert(snakeRecord).select().single();
    if (error) { console.error(`[SupabaseData] insert ${sqlTable}:`, error, snakeRecord); return null; }
    return data ? toCamelObj(data, jsTable) as T : null;
  },

  async upsert<T>(jsTable: string, record: Record<string, any>): Promise<T | null> {
    const sqlTable = resolveTable(jsTable);
    const snakeRecord = toSnakeObj(record, jsTable);
    const { data, error } = await supabase.from(sqlTable).upsert(snakeRecord).select().single();
    if (error) { console.error(`[SupabaseData] upsert ${sqlTable}:`, error, snakeRecord); return null; }
    return data ? toCamelObj(data, jsTable) as T : null;
  },

  async update(jsTable: string, id: string | number, updates: Record<string, any>): Promise<boolean> {
    const sqlTable = resolveTable(jsTable);
    const snakeUpdates = toSnakeObj(updates, jsTable);
    const { error } = await supabase.from(sqlTable).update(snakeUpdates).eq('id', id);
    if (error) { console.error(`[SupabaseData] update ${sqlTable}:`, error); return false; }
    return true;
  },

  async remove(jsTable: string, id: string | number): Promise<boolean> {
    const sqlTable = resolveTable(jsTable);
    const { error } = await supabase.from(sqlTable).delete().eq('id', id);
    if (error) { console.error(`[SupabaseData] remove ${sqlTable}:`, error); return false; }
    return true;
  },

  async removeWhere(jsTable: string, column: string, value: any): Promise<boolean> {
    const sqlTable = resolveTable(jsTable);
    const snakeCol = camelToSnake(column);
    const { error } = await supabase.from(sqlTable).delete().eq(snakeCol, value);
    if (error) { console.error(`[SupabaseData] removeWhere ${sqlTable}:`, error); return false; }
    return true;
  },

  async fetchWhere<T>(jsTable: string, column: string, value: any): Promise<T[]> {
    const sqlTable = resolveTable(jsTable);
    const snakeCol = jsTable && SPECIAL_FIELD_MAP[jsTable]?.[column]
      ? SPECIAL_FIELD_MAP[jsTable][column]
      : camelToSnake(column);
    const { data, error } = await supabase.from(sqlTable).select('*').eq(snakeCol, value);
    if (error) { console.error(`[SupabaseData] fetchWhere ${sqlTable}:`, error); return []; }
    return (data || []).map(row => toCamelObj(row, jsTable) as T);
  },

  async bulkInsert<T>(jsTable: string, records: Record<string, any>[]): Promise<T[]> {
    const sqlTable = resolveTable(jsTable);
    const snakeRecords = records.map(r => toSnakeObj(r, jsTable));
    const { data, error } = await supabase.from(sqlTable).insert(snakeRecords).select();
    if (error) { console.error(`[SupabaseData] bulkInsert ${sqlTable}:`, error); return []; }
    return (data || []).map(row => toCamelObj(row, jsTable) as T);
  },

  async bulkUpdate(jsTable: string, records: { id: string; updates: Record<string, any> }[]): Promise<boolean> {
    const sqlTable = resolveTable(jsTable);
    for (const { id, updates } of records) {
      const snakeUpdates = toSnakeObj(updates, jsTable);
      const { error } = await supabase.from(sqlTable).update(snakeUpdates).eq('id', id);
      if (error) { console.error(`[SupabaseData] bulkUpdate ${sqlTable} id=${id}:`, error); return false; }
    }
    return true;
  },

  async getSettings(): Promise<Settings | null> {
    const { data, error } = await supabase.from('settings').select('data').eq('id', 1).single();
    if (error || !data) return null;
    return data.data as Settings;
  },

  async saveSettings(settings: Settings): Promise<boolean> {
    const { error } = await supabase.from('settings').upsert({ id: 1, data: settings });
    if (error) { console.error('[SupabaseData] saveSettings:', error); return false; }
    return true;
  },

  async updateSettingsPartial(partial: Partial<Settings>): Promise<boolean> {
    const current = await this.getSettings();
    if (!current) return false;
    const merged = deepMerge(current, partial);
    return this.saveSettings(merged);
  },

  async getGovernance(): Promise<Governance | null> {
    const { data, error } = await supabase.from('governance').select('*').eq('id', 1).single();
    if (error || !data) return null;
    return { readOnly: data.read_only, lockedPeriods: data.locked_periods || [] };
  },

  async saveGovernance(gov: Governance): Promise<boolean> {
    const { error } = await supabase.from('governance').upsert({
      id: 1, read_only: gov.readOnly, locked_periods: gov.lockedPeriods
    });
    if (error) { console.error('[SupabaseData] saveGovernance:', error); return false; }
    return true;
  },

  async getSerials(): Promise<Serials | null> {
    const { data, error } = await supabase.from('serials').select('*').eq('id', 1).single();
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
    const { data } = await supabase.from('serials').select(col).eq('id', 1).single();
    if (!data) return 1000;
    const newVal = ((data as unknown) as Record<string, number>)[col] + 1;
    await supabase.from('serials').update({ [col]: newVal }).eq('id', 1);
    return newVal;
  },

  async getAllData(): Promise<Database> {
    const tables = [
      'owners', 'properties', 'units', 'tenants', 'contracts',
      'invoices', 'receipts', 'receiptAllocations', 'expenses',
      'maintenanceRecords', 'depositTxs', 'auditLog', 'ownerSettlements',
      'accounts', 'journalEntries', 'notificationTemplates',
      'outgoingNotifications', 'appNotifications', 'leads', 'lands',
      'commissions', 'missions', 'budgets', 'attachments', 'snapshots', 'utilityRecords',
    ];

    const results = await Promise.all(tables.map(t => this.fetchAll(t)));
    const dataMap: Record<string, any[]> = {};
    tables.forEach((t, i) => { dataMap[t] = results[i]; });

    const [settings, governance, serials] = await Promise.all([
      this.getSettings(),
      this.getGovernance(),
      this.getSerials(),
    ]);

    const ownerBalances = await this.fetchAll('ownerBalances');
    const contractBalances = await this.fetchAll('contractBalances');
    const tenantBalances = await this.fetchAll('tenantBalances');

    const { data: profileRows } = await supabase.from('profiles').select('*');
    const users = (profileRows || []).map((p: any) => ({
      id: p.id, username: p.username || '', email: '', hash: '', salt: '',
      role: p.role || 'USER', mustChange: p.must_change_password || false,
      createdAt: p.created_at || Date.now(),
    }));

    return {
      settings: settings || {} as Settings,
      auth: { users },
      owners: dataMap.owners || [],
      properties: dataMap.properties || [],
      units: dataMap.units || [],
      tenants: dataMap.tenants || [],
      contracts: dataMap.contracts || [],
      invoices: dataMap.invoices || [],
      receipts: dataMap.receipts || [],
      receiptAllocations: dataMap.receiptAllocations || [],
      expenses: dataMap.expenses || [],
      maintenanceRecords: dataMap.maintenanceRecords || [],
      depositTxs: dataMap.depositTxs || [],
      auditLog: dataMap.auditLog || [],
      governance: governance || { readOnly: false, lockedPeriods: [] },
      ownerSettlements: dataMap.ownerSettlements || [],
      serials: serials || { receipt: 1000, expense: 1000, maintenance: 1000, invoice: 1000, lead: 1000, ownerSettlement: 1000, journalEntry: 1000, mission: 1000, contract: 1000 },
      snapshots: dataMap.snapshots || [],
      accounts: dataMap.accounts || [],
      journalEntries: dataMap.journalEntries || [],
      autoBackups: [],
      ownerBalances: ownerBalances || [],
      accountBalances: [],
      kpiSnapshots: [],
      contractBalances: contractBalances || [],
      tenantBalances: tenantBalances || [],
      notificationTemplates: dataMap.notificationTemplates || [],
      outgoingNotifications: dataMap.outgoingNotifications || [],
      appNotifications: dataMap.appNotifications || [],
      leads: dataMap.leads || [],
      lands: dataMap.lands || [],
      commissions: dataMap.commissions || [],
      missions: dataMap.missions || [],
      budgets: dataMap.budgets || [],
      attachments: dataMap.attachments || [],
      utilityRecords: dataMap.utilityRecords || [],
    };
  },

  async seedDefaults(defaultSettings: Settings, defaultAccounts: any[], defaultTemplates: any[], defaultSerials: Serials): Promise<void> {
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
      const snakeSerials: Record<string, any> = { id: 1 };
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

function deepMerge(target: any, source: any): any {
  const output = { ...target };
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      output[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      output[key] = source[key];
    }
  }
  return output;
}
