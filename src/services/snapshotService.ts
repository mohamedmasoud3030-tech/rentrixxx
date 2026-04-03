import type {
  AccountBalance,
  AppNotification,
  ContractBalance,
  Database,
  KpiSnapshot,
  OwnerBalance,
  Snapshot,
  TenantBalance,
} from '../types';
import { round3, toNumber } from './financeService';

export const buildSnapshotState = (sourceDb: Database): {
  accountBalances: AccountBalance[];
  contractBalances: ContractBalance[];
  tenantBalances: TenantBalance[];
  ownerBalances: OwnerBalance[];
  kpiSnapshots: KpiSnapshot[];
} => {
  const accountBalancesMap = new Map<string, number>();
  sourceDb.accounts.forEach(acc => accountBalancesMap.set(acc.id, 0));
  sourceDb.journalEntries.forEach(je => {
    const signed = je.type === 'DEBIT' ? toNumber(je.amount) : -toNumber(je.amount);
    accountBalancesMap.set(je.accountId, round3((accountBalancesMap.get(je.accountId) || 0) + signed));
  });
  const accountBalances: AccountBalance[] = Array.from(accountBalancesMap.entries()).map(([accountId, balance]) => ({ accountId, balance: round3(balance) }));

  const arAccount = sourceDb.settings.accounting.accountMappings.accountsReceivable;
  const contractsMap = new Map(sourceDb.contracts.map(c => [c.id, c]));
  const contractBalancesMap = new Map<string, number>();
  const tenantBalancesMap = new Map<string, number>();

  sourceDb.journalEntries.forEach(je => {
    if (je.accountId !== arAccount) return;
    const signed = je.type === 'DEBIT' ? toNumber(je.amount) : -toNumber(je.amount);
    if (je.entityType === 'CONTRACT' && je.entityId) {
      contractBalancesMap.set(je.entityId, round3((contractBalancesMap.get(je.entityId) || 0) + signed));
      const tenantId = contractsMap.get(je.entityId)?.tenantId;
      if (tenantId) tenantBalancesMap.set(tenantId, round3((tenantBalancesMap.get(tenantId) || 0) + signed));
    } else if (je.entityType === 'TENANT' && je.entityId) {
      tenantBalancesMap.set(je.entityId, round3((tenantBalancesMap.get(je.entityId) || 0) + signed));
    }
  });

  const contractBalances: ContractBalance[] = Array.from(contractBalancesMap.entries()).map(([contractId, balance]) => {
    const contract = contractsMap.get(contractId);
    return {
      contractId,
      tenantId: contract?.tenantId || '',
      unitId: contract?.unitId || '',
      balance: round3(balance),
      depositBalance: 0,
      lastUpdatedAt: Date.now(),
    };
  }).filter(row => row.tenantId && row.unitId);

  const tenantBalances: TenantBalance[] = Array.from(tenantBalancesMap.entries()).map(([tenantId, balance]) => ({
    tenantId,
    balance: round3(balance),
    lastUpdatedAt: Date.now(),
  }));

  const ownerBalances: OwnerBalance[] = sourceDb.owners.map(owner => ({
    ownerId: owner.id,
    collections: 0,
    expenses: 0,
    settlements: 0,
    officeShare: 0,
    net: 0,
  }));

  const kpiSnapshot: KpiSnapshot = {
    id: 'main',
    totalOwnerNetBalance: 0,
    totalContractARBalance: round3(contractBalances.reduce((sum, row) => sum + row.balance, 0)),
    totalTenantARBalance: round3(tenantBalances.reduce((sum, row) => sum + row.balance, 0)),
  };

  return { accountBalances, contractBalances, tenantBalances, ownerBalances, kpiSnapshots: [kpiSnapshot] };
};

export const createSnapshotPayload = (db: Database, note: string, userId: string): Snapshot => ({
  id: crypto.randomUUID(),
  ts: Date.now(),
  note,
  userId,
  data: JSON.stringify(db),
});

export const shouldTriggerBackup = (operationCounter: number, threshold: number, enabled: boolean): boolean => {
  return enabled && threshold > 0 && operationCounter >= threshold;
};

export const restoreSnapshotData = (snapshot: Snapshot): Database => {
  const parsed = JSON.parse(snapshot.data) as Database;
  return parsed;
};

export const findMissingOverdueNotifications = (invoices: Database['invoices'], notifications: AppNotification[]): string[] => {
  const existing = new Set(
    notifications
      .filter(n => n.type === 'OVERDUE_BALANCE')
      .map(n => n.link.split('invoiceId=')[1])
      .filter(Boolean) as string[],
  );
  return invoices.filter(inv => inv.status === 'OVERDUE' && !existing.has(inv.id)).map(inv => inv.id);
};
