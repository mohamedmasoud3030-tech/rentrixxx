import { useCallback, useSyncExternalStore } from 'react';
import type { MockDatabaseState } from '@/store/mock-db-store';
import { getMockDatabaseSnapshot, useMockDatabaseStore } from '@/store/mock-db-store';
import { contractRepo, ownerRepo, propertyRepo } from '@/services/mock-repos';

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
