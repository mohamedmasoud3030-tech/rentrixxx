import { supabase } from '@/integrations/supabase/client';
import { handleSupabaseError } from '@/lib/supabase-error';
import type { Database } from '@/types/database';

export type CompanySettingsRecord = Database['public']['Tables']['company_settings']['Row'];

export type CompanySettingsUpdatePayload = Partial<Pick<CompanySettingsRecord,
  | 'company_name'
  | 'legal_name'
  | 'tax_number'
  | 'registration_number'
  | 'phone'
  | 'email'
  | 'address'
  | 'city'
  | 'country'
  | 'currency'
  | 'locale'
  | 'timezone'
  | 'date_format'
  | 'number_format'
  | 'logo_url'
  | 'invoice_prefix'
  | 'receipt_prefix'
>>;

type CompanySettingsUpdate = Database['public']['Tables']['company_settings']['Update'];

type ImmutableCompanySettingsKey = Exclude<keyof CompanySettingsRecord, keyof CompanySettingsUpdatePayload>;

export const DEFAULT_COMPANY_SETTINGS_ID = '00000000-0000-4000-8000-000000000001';

const defaultTimestamps = '1970-01-01T00:00:00.000Z';

const defaultCompanySettings: CompanySettingsRecord = {
  id: DEFAULT_COMPANY_SETTINGS_ID,
  singleton_key: true,
  company_name: 'Rentrix',
  legal_name: null,
  tax_number: null,
  registration_number: null,
  phone: null,
  email: null,
  address: null,
  city: null,
  country: 'Oman',
  currency: 'OMR',
  locale: 'ar-OM',
  timezone: 'Asia/Muscat',
  date_format: 'dd/MM/yyyy',
  number_format: 'ar-OM',
  logo_url: null,
  invoice_prefix: 'INV',
  receipt_prefix: 'REC',
  created_at: defaultTimestamps,
  updated_at: defaultTimestamps,
};

const nullableStringFields = [
  'legal_name',
  'tax_number',
  'registration_number',
  'phone',
  'email',
  'address',
  'city',
  'country',
  'logo_url',
] as const;

const requiredStringFields = [
  'company_name',
  'currency',
  'locale',
  'timezone',
  'date_format',
  'number_format',
  'invoice_prefix',
  'receipt_prefix',
] as const;

const updateableFields = new Set<keyof CompanySettingsUpdatePayload>([
  ...nullableStringFields,
  ...requiredStringFields,
]);

function stringifyPrimitive(value: unknown): string | null {
  switch (typeof value) {
    case 'string':
      return value.trim();
    case 'number':
    case 'boolean':
    case 'bigint':
      return String(value).trim();
    default:
      return null;
  }
}

function cleanNullableString(value: unknown): string | null {
  return stringifyPrimitive(value) || null;
}

function cleanRequiredString(value: unknown, fallback: string): string {
  return stringifyPrimitive(value) || fallback;
}

export function normalizeCompanySettingsRecord(value: Partial<CompanySettingsRecord> | null | undefined): CompanySettingsRecord {
  const source = value ?? defaultCompanySettings;
  const normalized = { ...defaultCompanySettings, ...source };

  for (const field of nullableStringFields) {
    normalized[field] = cleanNullableString(normalized[field]);
  }

  for (const field of requiredStringFields) {
    normalized[field] = cleanRequiredString(normalized[field], defaultCompanySettings[field]);
  }

  normalized.id = cleanRequiredString(normalized.id, defaultCompanySettings.id);
  normalized.created_at = cleanRequiredString(normalized.created_at, defaultCompanySettings.created_at);
  normalized.updated_at = cleanRequiredString(normalized.updated_at, defaultCompanySettings.updated_at);
  normalized.singleton_key = true;

  return normalized;
}

export function normalizeCompanySettingsUpdatePayload(payload: CompanySettingsUpdatePayload): CompanySettingsUpdatePayload {
  const normalized: CompanySettingsUpdatePayload = {};

  for (const [key, value] of Object.entries(payload) as [keyof CompanySettingsUpdatePayload | ImmutableCompanySettingsKey, unknown][]) {
    if (!updateableFields.has(key as keyof CompanySettingsUpdatePayload)) continue;

    if ((nullableStringFields as readonly string[]).includes(key)) {
      normalized[key as (typeof nullableStringFields)[number]] = cleanNullableString(value);
      continue;
    }

    const requiredKey = key as (typeof requiredStringFields)[number];
    normalized[requiredKey] = cleanRequiredString(value, defaultCompanySettings[requiredKey]);
  }

  return normalized;
}

export async function getCompanySettings(): Promise<CompanySettingsRecord> {
  const { data, error } = await supabase
    .from('company_settings')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (error) handleSupabaseError(error, 'تعذر تحميل إعدادات الشركة');
  if (!data) return defaultCompanySettings;

  return normalizeCompanySettingsRecord(data);
}

export async function updateCompanySettings(payload: CompanySettingsUpdatePayload): Promise<CompanySettingsRecord> {
  const currentSettings = await getCompanySettings();
  const updatePayload: CompanySettingsUpdate = normalizeCompanySettingsUpdatePayload(payload);

  const { data, error } = await supabase
    .from('company_settings')
    .update(updatePayload)
    .eq('id', currentSettings.id)
    .select('*')
    .single();

  if (error) handleSupabaseError(error, 'تعذر حفظ إعدادات الشركة');
  return normalizeCompanySettingsRecord(data);
}
