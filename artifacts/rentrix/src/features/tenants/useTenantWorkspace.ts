import { useQuery } from '@tanstack/react-query';
import { listTenantWorkspace, type TenantWorkspaceParams } from './tenantWorkspaceService';

export const tenantWorkspaceKeys = {
  all: ['tenant-workspace'] as const,
  lists: () => [...tenantWorkspaceKeys.all, 'list'] as const,
  list: (params: TenantWorkspaceParams) => [...tenantWorkspaceKeys.lists(), params] as const,
};

export function useTenantWorkspace(params: TenantWorkspaceParams) {
  return useQuery({ queryKey: tenantWorkspaceKeys.list(params), queryFn: () => listTenantWorkspace(params) });
}
