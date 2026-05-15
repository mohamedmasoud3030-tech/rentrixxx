import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryMock = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  useMutation: vi.fn((options) => options),
  useQuery: vi.fn((options) => options),
  useQueryClient: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: queryMock.useMutation,
  useQuery: queryMock.useQuery,
  useQueryClient: queryMock.useQueryClient,
}));

vi.mock('./companySettingsService', () => ({
  getCompanySettings: vi.fn(),
  updateCompanySettings: vi.fn(),
}));

describe('useCompanySettings hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryMock.useQueryClient.mockReturnValue({ invalidateQueries: queryMock.invalidateQueries });
    queryMock.invalidateQueries.mockResolvedValue(undefined);
  });

  it('invalidates company settings queries after updating settings', async () => {
    const { companySettingsKeys, useUpdateCompanySettings } = await import('./useCompanySettings');

    const mutationOptions = useUpdateCompanySettings() as unknown as { onSuccess: () => Promise<void> };
    await mutationOptions.onSuccess();

    expect(queryMock.invalidateQueries).toHaveBeenCalledWith({ queryKey: companySettingsKeys.all });
    expect(queryMock.invalidateQueries).toHaveBeenCalledTimes(1);
  });
});
