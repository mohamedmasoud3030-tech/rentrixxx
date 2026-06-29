import { useCallback, useSyncExternalStore } from 'react';
import type { MockDatabaseState } from '@/store/mock-db-store';
import { getMockDatabaseSnapshot, useMockDatabaseStore } from '@/store/mock-db-store';
import { agreementRepo, contractRepo, expenseRepo, invoiceRepo, ownerRepo, propertyRepo, receiptRepo, tenantRepo, unitRepo } from '@/services/mock-repos';

interface MockQueryLikeResult<TData, TExecuteArgs extends readonly unknown[] = readonly []> {
  readonly data: TData;
  readonly isLoading: false;
  readonly error: null;
  readonly execute: (...args: TExecuteArgs) => Promise<unknown>;
}

function useMockDatabaseSelector<TData>(selector: (state: MockDatabaseState) => TData): TData {
  return useSyncExternalStore(
    useMockDatabaseStore.subscribe,
    () => selector(getMockDatabaseSnapshot()),
    () => selector(getMockDatabaseSnapshot()),
  );
}

export function useMockOwners(): MockQueryLikeResult<MockDatabaseState['owners'], Parameters<typeof ownerRepo.create>> {
  const data = useMockDatabaseSelector((state) => state.owners.filter((owner) => !owner.isArchived));
  const execute = useCallback((...args: Parameters<typeof ownerRepo.create>) => ownerRepo.create(...args), []);
  return { data, isLoading: false, error: null, execute };
}

export function useMockProperties(): MockQueryLikeResult<MockDatabaseState['properties'], Parameters<typeof propertyRepo.create>> {
  const data = useMockDatabaseSelector((state) => state.properties.filter((property) => !property.isArchived));
  const execute = useCallback((...args: Parameters<typeof propertyRepo.create>) => propertyRepo.create(...args), []);
  return { data, isLoading: false, error: null, execute };
}

export function useMockContracts(): MockQueryLikeResult<MockDatabaseState['contracts'], Parameters<typeof contractRepo.create>> {
  const data = useMockDatabaseSelector((state) => state.contracts);
  const execute = useCallback((...args: Parameters<typeof contractRepo.create>) => contractRepo.create(...args), []);
  return { data, isLoading: false, error: null, execute };
}

export function useMockAgreements(): MockQueryLikeResult<MockDatabaseState['agreements'], Parameters<typeof agreementRepo.create>> {
  const data = useMockDatabaseSelector((state) => state.agreements.filter((agreement) => !agreement.isArchived));
  const execute = useCallback((...args: Parameters<typeof agreementRepo.create>) => agreementRepo.create(...args), []);
  return { data, isLoading: false, error: null, execute };
}

export function useMockUnits(): MockQueryLikeResult<MockDatabaseState['units'], Parameters<typeof unitRepo.create>> {
  const data = useMockDatabaseSelector((state) => state.units.filter((unit) => !unit.isArchived));
  const execute = useCallback((...args: Parameters<typeof unitRepo.create>) => unitRepo.create(...args), []);
  return { data, isLoading: false, error: null, execute };
}

export function useMockTenants(): MockQueryLikeResult<MockDatabaseState['tenants'], Parameters<typeof tenantRepo.create>> {
  const data = useMockDatabaseSelector((state) => state.tenants.filter((tenant) => !tenant.isArchived));
  const execute = useCallback((...args: Parameters<typeof tenantRepo.create>) => tenantRepo.create(...args), []);
  return { data, isLoading: false, error: null, execute };
}

export function useMockInvoices(): MockQueryLikeResult<MockDatabaseState['invoices'], Parameters<typeof invoiceRepo.create>> {
  const data = useMockDatabaseSelector((state) => state.invoices);
  const execute = useCallback((...args: Parameters<typeof invoiceRepo.create>) => invoiceRepo.create(...args), []);
  return { data, isLoading: false, error: null, execute };
}

export function useMockReceipts(): MockQueryLikeResult<MockDatabaseState['receipts'], Parameters<typeof receiptRepo.create>> {
  const data = useMockDatabaseSelector((state) => state.receipts);
  const execute = useCallback((...args: Parameters<typeof receiptRepo.create>) => receiptRepo.create(...args), []);
  return { data, isLoading: false, error: null, execute };
}

export function useMockExpenses(): MockQueryLikeResult<MockDatabaseState['expenses'], Parameters<typeof expenseRepo.create>> {
  const data = useMockDatabaseSelector((state) => state.expenses.filter((expense) => !expense.isArchived));
  const execute = useCallback((...args: Parameters<typeof expenseRepo.create>) => expenseRepo.create(...args), []);
  return { data, isLoading: false, error: null, execute };
}

export function useMockAuditEvents(): MockQueryLikeResult<MockDatabaseState['auditEvents'], readonly []> {
  const data = useMockDatabaseSelector((state) => state.auditEvents);
  const execute = useCallback(async () => {}, []);
  return { data, isLoading: false, error: null, execute };
}
