import { useQuery } from '@tanstack/react-query';
import { listTenantWorkspace, listTenantWorkspaceByIds, type TenantWorkspaceParams } from './tenantWorkspaceService';

export const tenantWorkspaceKeys = {
  all: ['tenant-workspace'] as const,
  lists: () => [...tenantWorkspaceKeys.all, 'list'] as const,
  list: (params: TenantWorkspaceParams) => [...tenantWorkspaceKeys.lists(), params] as const,
  byIds: (ids: string[]) => [...tenantWorkspaceKeys.all, 'by-ids', ...ids] as const,
};

export function useTenantWorkspace(params: TenantWorkspaceParams) {
  return useQuery({ queryKey: tenantWorkspaceKeys.list(params), queryFn: () => listTenantWorkspace(params) });
}

export function useTenantWorkspaceByIds(ids: string[]) {
  return useQuery({
    queryKey: tenantWorkspaceKeys.byIds(ids),
    queryFn: () => listTenantWorkspaceByIds(ids),
    enabled: ids.length > 0,
  });
}
