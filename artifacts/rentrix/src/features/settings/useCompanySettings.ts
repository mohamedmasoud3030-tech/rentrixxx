import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCompanySettings, updateCompanySettings, type CompanySettingsUpdatePayload } from './companySettingsService';

export const companySettingsKeys = {
  all: ['company-settings'] as const,
  detail: () => [...companySettingsKeys.all, 'detail'] as const,
};

export function useCompanySettings() {
  return useQuery({ queryKey: companySettingsKeys.detail(), queryFn: getCompanySettings });
}

export function useUpdateCompanySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CompanySettingsUpdatePayload) => updateCompanySettings(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: companySettingsKeys.all });
    },
  });
}
