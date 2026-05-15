import type { CompanyLocalSettings } from '@/lib/companySettings';
import type { SupportedCurrency } from '@/lib/formatters';
import type { CompanySettingsRecord, CompanySettingsUpdatePayload } from './companySettingsService';

export type CompanySettingsDraft = {
  company_name: string;
  legal_name: string;
  tax_number: string;
  registration_number: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  country: string;
  currency: string;
  locale: string;
  timezone: string;
  date_format: string;
  number_format: string;
  logo_url: string;
  invoice_prefix: string;
  receipt_prefix: string;
};

export type CompanySettingsDraftField = keyof CompanySettingsDraft;
export type CompanySettingsValidationErrors = Partial<Record<CompanySettingsDraftField, string>>;

const draftFields = [
  'company_name',
  'legal_name',
  'tax_number',
  'registration_number',
  'phone',
  'email',
  'address',
  'city',
  'country',
  'currency',
  'locale',
  'timezone',
  'date_format',
  'number_format',
  'logo_url',
  'invoice_prefix',
  'receipt_prefix',
] as const satisfies readonly CompanySettingsDraftField[];

const requiredFields = [
  'company_name',
  'currency',
  'locale',
  'timezone',
  'date_format',
  'number_format',
  'invoice_prefix',
  'receipt_prefix',
] as const satisfies readonly CompanySettingsDraftField[];

const requiredLabels: Record<(typeof requiredFields)[number], string> = {
  company_name: 'اسم الشركة مطلوب',
  currency: 'العملة مطلوبة',
  locale: 'اللغة/المحلية مطلوبة',
  timezone: 'المنطقة الزمنية مطلوبة',
  date_format: 'صيغة التاريخ مطلوبة',
  number_format: 'صيغة الأرقام مطلوبة',
  invoice_prefix: 'بادئة الفواتير مطلوبة',
  receipt_prefix: 'بادئة الإيصالات مطلوبة',
};

function hasWhitespace(value: string): boolean {
  return Array.from(value).some((character) => character.trim() === '');
}

function isValidEmailAddress(value: string): boolean {
  const email = value.trim();
  const atIndex = email.indexOf('@');

  if (atIndex <= 0 || atIndex !== email.lastIndexOf('@') || hasWhitespace(email)) return false;

  const localPart = email.slice(0, atIndex);
  const domainPart = email.slice(atIndex + 1);
  const dotIndex = domainPart.indexOf('.');

  return Boolean(
    localPart
      && domainPart
      && dotIndex > 0
      && dotIndex < domainPart.length - 1
      && !domainPart.includes('..'),
  );
}

export function companySettingsRecordToDraft(settings: CompanySettingsRecord): CompanySettingsDraft {
  return {
    company_name: settings.company_name,
    legal_name: settings.legal_name ?? '',
    tax_number: settings.tax_number ?? '',
    registration_number: settings.registration_number ?? '',
    phone: settings.phone ?? '',
    email: settings.email ?? '',
    address: settings.address ?? '',
    city: settings.city ?? '',
    country: settings.country ?? '',
    currency: settings.currency,
    locale: settings.locale,
    timezone: settings.timezone,
    date_format: settings.date_format,
    number_format: settings.number_format,
    logo_url: settings.logo_url ?? '',
    invoice_prefix: settings.invoice_prefix,
    receipt_prefix: settings.receipt_prefix,
  };
}

export function companySettingsDraftToPayload(draft: CompanySettingsDraft): CompanySettingsUpdatePayload {
  return { ...draft };
}

export function companySettingsDraftToLocalSettings(draft: CompanySettingsDraft): CompanyLocalSettings {
  return {
    companyName: draft.company_name,
    logoUrl: draft.logo_url || null,
    defaultLanguage: draft.locale.trim().toLowerCase().startsWith('en') ? 'en' : 'ar',
    defaultCurrency: draft.currency as SupportedCurrency,
    country: draft.country,
    timezone: draft.timezone,
    receiptPrefix: draft.receipt_prefix,
    invoicePrefix: draft.invoice_prefix,
  };
}

export function areCompanySettingsDraftsEqual(left: CompanySettingsDraft | null, right: CompanySettingsDraft | null): boolean {
  if (!left || !right) return left === right;
  return draftFields.every((field) => left[field] === right[field]);
}

export function getNextDraftAfterServerSettingsChange(
  currentDraft: CompanySettingsDraft | null,
  currentBaseDraft: CompanySettingsDraft | null,
  nextServerDraft: CompanySettingsDraft,
): CompanySettingsDraft {
  if (currentDraft && currentBaseDraft && !areCompanySettingsDraftsEqual(currentDraft, currentBaseDraft)) {
    return currentDraft;
  }

  return nextServerDraft;
}

export function validateCompanySettingsDraft(draft: CompanySettingsDraft): CompanySettingsValidationErrors {
  const errors: CompanySettingsValidationErrors = {};

  for (const field of requiredFields) {
    if (!draft[field].trim()) errors[field] = requiredLabels[field];
  }

  if (draft.email.trim() && !isValidEmailAddress(draft.email)) {
    errors.email = 'صيغة البريد الإلكتروني غير صحيحة';
  }

  if (draft.logo_url.trim()) {
    try {
      const url = new URL(draft.logo_url.trim());
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.logo_url = 'رابط الشعار يجب أن يبدأ بـ http أو https';
      }
    } catch {
      errors.logo_url = 'رابط الشعار غير صحيح';
    }
  }

  return errors;
}

export function hasCompanySettingsValidationErrors(errors: CompanySettingsValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}
