import { supabase } from '@/services/supabase';

export interface PlatformUsageMetric {
  metric_code: string;
  total_quantity: number;
  events_count: number;
  usage_month: string;
}

export const createPlatformApiKey = async (
  tenantId: string,
  name: string,
): Promise<{ apiKey: string }> => {
  const { data, error } = await supabase.rpc('platform_create_api_key', {
    p_tenant_id: tenantId,
    p_name: name,
    p_role: 'ADMIN',
    p_scopes: ['receipts:write', 'invoices:write', 'contracts:write', 'ledger:read', 'reports:read', 'ledger:write'],
  });

  if (error) throw new Error(error.message || 'فشل إنشاء API Key');
  const payload = data as { api_key?: string };
  return { apiKey: payload?.api_key || '' };
};

export const getPlatformUsageMetrics = async (
  tenantId: string,
): Promise<PlatformUsageMetric[]> => {
  const { data, error } = await supabase.rpc('platform_get_usage_metrics', {
    p_tenant_id: tenantId,
  });

  if (error) throw new Error(error.message || 'فشل تحميل استخدام المنصة');
  return (data as { usage?: PlatformUsageMetric[] })?.usage || [];
};

