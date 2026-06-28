import { getMockDatabaseSnapshot, useMockDatabaseStore, type MockDatabaseState } from '@/store/mock-db-store';

export interface MockRepositoryResult<T> {
  readonly data: T;
}

export class MockRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MockRepositoryError';
  }
}

const latencyMs = 10;

export async function simulateLatency(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, latencyMs));
}

export async function readMockDatabase<T>(selector: (state: MockDatabaseState) => T): Promise<MockRepositoryResult<T>> {
  await simulateLatency();
  return { data: selector(getMockDatabaseSnapshot()) };
}

export async function writeMockDatabase<T>(writer: (state: MockDatabaseState) => { nextState: MockDatabaseState; data: T }): Promise<MockRepositoryResult<T>> {
  await simulateLatency();
  const result = writer(getMockDatabaseSnapshot());
  useMockDatabaseStore.getState().replaceDatabase(result.nextState);
  return { data: result.data };
}
