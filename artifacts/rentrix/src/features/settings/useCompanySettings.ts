import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { normalizeCompanySettingsContract, type CompanySettingsContract } from '@/lib/companySettings';
import { getCompanySettings, updateCompanySettings, type CompanySettingsRecord, type CompanySettingsUpdatePayload } from './companySettingsService';

export const companySettingsKeys = {
  all: ['company-settings'] as const,
  detail: () => [...companySettingsKeys.all, 'detail'] as const,
};

export function useCompanySettings() {
  return useQuery({ queryKey: companySettingsKeys.detail(), queryFn: getCompanySettings });
}

export function companySettingsRecordToContract(settings: CompanySettingsRecord | null | undefined): CompanySettingsContract {
  return normalizeCompanySettingsContract({
    companyName: settings?.company_name,
    logoUrl: settings?.logo_url,
    locale: settings?.locale,
    defaultCurrency: settings?.currency,
    country: settings?.country,
    timezone: settings?.timezone,
    receiptPrefix: settings?.receipt_prefix,
    invoicePrefix: settings?.invoice_prefix,
  });
}

export function useCompanySettingsContract(): CompanySettingsContract {
  const companySettingsQuery = useCompanySettings();

  return useMemo(() => companySettingsRecordToContract(companySettingsQuery.data), [companySettingsQuery.data]);
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
