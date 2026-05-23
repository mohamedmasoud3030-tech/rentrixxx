import { beforeEach, describe, expect, it, vi } from 'vitest';
import { propertyKeys } from '@/features/properties/use-properties';

const mutationMock = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  useMutation: vi.fn((options) => options),
  useQuery: vi.fn((options) => options),
  useQueryClient: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: mutationMock.useMutation,
  useQuery: mutationMock.useQuery,
  useQueryClient: mutationMock.useQueryClient,
}));

vi.mock('sonner', () => ({
  toast: {
    success: mutationMock.toastSuccess,
    error: mutationMock.toastError,
  },
}));

vi.mock('./ownerService', () => ({
  createOwner: vi.fn(),
  getOwner: vi.fn(),
  linkOwnerToProperty: vi.fn(),
  listOwners: vi.fn(),
  listPropertiesWithOwners: vi.fn(),
  listPropertyOwners: vi.fn(),
  unlinkOwnerFromProperty: vi.fn(),
  updateOwner: vi.fn(),
  updatePropertyOwnerLink: vi.fn(),
}));

describe('owner hooks', () => {
  async function expectOwnerLinkMutationInvalidation(options: {
    hook: 'useLinkOwnerToProperty' | 'useUpdatePropertyOwnerLink';
    successMessage: string;
  }) {
    const { ownerKeys, [options.hook]: hookFactory } = await import('./useOwners');
    const mutationOptions = hookFactory() as unknown as { onSuccess: (link: { property_id: string; owner_id: string }) => Promise<void> };
    await mutationOptions.onSuccess({ property_id: 'property-1', owner_id: 'owner-1' });

    expect(mutationMock.invalidateQueries).toHaveBeenCalledWith({ queryKey: ownerKeys.all });
    expect(mutationMock.invalidateQueries).toHaveBeenCalledWith({ queryKey: propertyKeys.all });
    expect(mutationMock.invalidateQueries).toHaveBeenCalledWith({ queryKey: ownerKeys.propertyOwners('property-1') });
    expect(mutationMock.invalidateQueries).toHaveBeenCalledWith({ queryKey: ownerKeys.detail('owner-1') });
    expect(mutationMock.toastSuccess).toHaveBeenCalledWith(options.successMessage);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mutationMock.useQueryClient.mockReturnValue({ invalidateQueries: mutationMock.invalidateQueries });
    mutationMock.invalidateQueries.mockResolvedValue(undefined);
  });

  it('invalidates owner and property ownership queries after linking an owner to a property', async () => {
    await expectOwnerLinkMutationInvalidation({
      hook: 'useLinkOwnerToProperty',
      successMessage: 'تم ربط المالك بالعقار بنجاح',
    });
  });

  it('invalidates owner and property ownership queries after updating an owner-property link', async () => {
    await expectOwnerLinkMutationInvalidation({
      hook: 'useUpdatePropertyOwnerLink',
      successMessage: 'تم تحديث علاقة الملكية بنجاح',
    });
  });

  it('invalidates owner and property ownership queries after unlinking an owner from a property', async () => {
    const { ownerKeys, useUnlinkOwnerFromProperty } = await import('./useOwners');

    const mutationOptions = useUnlinkOwnerFromProperty() as unknown as {
      onSuccess: (link: { property_id: string; owner_id: string }, variables: { propertyId?: string; ownerId?: string }) => Promise<void>;
    };
    await mutationOptions.onSuccess({ property_id: 'property-1', owner_id: 'owner-1' }, { propertyId: 'property-fallback', ownerId: 'owner-fallback' });

    expect(mutationMock.invalidateQueries).toHaveBeenCalledWith({ queryKey: ownerKeys.all });
    expect(mutationMock.invalidateQueries).toHaveBeenCalledWith({ queryKey: propertyKeys.all });
    expect(mutationMock.invalidateQueries).toHaveBeenCalledWith({ queryKey: ownerKeys.propertyOwners('property-1') });
    expect(mutationMock.invalidateQueries).toHaveBeenCalledWith({ queryKey: ownerKeys.detail('owner-1') });
    expect(mutationMock.toastSuccess).toHaveBeenCalledWith('تم إنهاء علاقة الملكية بنجاح');
  });

});
