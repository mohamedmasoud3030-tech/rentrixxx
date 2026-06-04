import { useQuery } from '@tanstack/react-query';
import {
  fetchOwnerDetailSnapshot,
  fetchOwnerHubSnapshot,
  getOwner,
  listOwners,
  listPropertiesWithOwners,
} from './ownerService';

export const ownerKeys = {
  all: ['owners'] as const,
  lists: () => [...ownerKeys.all, 'list'] as const,
  hub: () => [...ownerKeys.all, 'hub'] as const,
  detail: (ownerId: string) => [...ownerKeys.all, 'detail', ownerId] as const,
  detailSnapshot: (ownerId: string) => [...ownerKeys.all, 'detail-snapshot', ownerId] as const,
  propertiesWithOwners: () => [...ownerKeys.all, 'properties-with-owners'] as const,
};

export function useOwners() {
  return useQuery({ queryKey: ownerKeys.lists(), queryFn: listOwners });
}

export function useOwner(ownerId: string) {
  return useQuery({
    queryKey: ownerKeys.detail(ownerId),
    queryFn: () => getOwner(ownerId),
    enabled: Boolean(ownerId),
  });
}

export function usePropertiesWithOwners() {
  return useQuery({ queryKey: ownerKeys.propertiesWithOwners(), queryFn: listPropertiesWithOwners });
}

export function useOwnerHubSnapshot() {
  return useQuery({ queryKey: ownerKeys.hub(), queryFn: fetchOwnerHubSnapshot });
}

export function useOwnerDetailSnapshot(ownerId: string) {
  return useQuery({
    queryKey: ownerKeys.detailSnapshot(ownerId),
    queryFn: () => fetchOwnerDetailSnapshot(ownerId),
    enabled: Boolean(ownerId),
  });
}
