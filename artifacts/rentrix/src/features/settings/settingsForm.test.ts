import { describe, expect, it } from 'vitest';
import {
  areCompanySettingsDraftsEqual,
  companySettingsDraftToLocalSettings,
  companySettingsDraftToPayload,
  companySettingsRecordToDraft,
  getCompanySettingsPreviewModel,
  validateCompanySettingsDraft,
  type CompanySettingsDraft,
} from './settingsForm';

const validRecord = {
  id: 'settings_1',
  singleton_key: true,
  company_name: 'Rentrix',
  legal_name: null,
  tax_number: null,
  registration_number: null,
  phone: null,
  email: null,
  address: null,
  city: 'Muscat',
  country: 'OM',
  currency: 'OMR',
  locale: 'ar-OM',
  timezone: 'Asia/Muscat',
  date_format: 'dd/MM/yyyy',
  number_format: 'ar-OM',
  logo_url: null,
  invoice_prefix: 'INV',
  receipt_prefix: 'REC',
  created_at: '2026-05-18T00:00:00.000Z',
  updated_at: '2026-05-18T00:00:00.000Z',
} as const;

const validDraft: CompanySettingsDraft = {
  company_name: 'Rentrix',
  legal_name: '',
  tax_number: '',
  registration_number: '',
  phone: '',
  email: '',
  address: '',
  city: 'Muscat',
  country: 'OM',
  currency: 'OMR',
  locale: 'ar-OM',
  timezone: 'Asia/Muscat',
  date_format: 'dd/MM/yyyy',
  number_format: 'ar-OM',
  logo_url: '',
  invoice_prefix: 'INV',
  receipt_prefix: 'REC',
};

describe('settingsForm helpers', () => {
  it('validates required fields and optional email/url formats', () => {
    const errors = validateCompanySettingsDraft({
      ...validDraft,
      company_name: ' ',
      currency: '',
      locale: '',
      timezone: '',
      date_format: '',
      number_format: '',
      invoice_prefix: '',
      receipt_prefix: '',
      email: 'not-email',
      logo_url: 'ftp://example.test/logo.png',
    });

    expect(errors).toMatchObject({
      company_name: 'اسم الشركة مطلوب',
      currency: 'العملة مطلوبة',
      locale: 'اللغة/المحلية مطلوبة',
      timezone: 'المنطقة الزمنية مطلوبة',
      date_format: 'صيغة التاريخ مطلوبة',
      number_format: 'صيغة الأرقام مطلوبة',
      invoice_prefix: 'بادئة الفواتير مطلوبة',
      receipt_prefix: 'بادئة الإيصالات مطلوبة',
      email: 'صيغة البريد الإلكتروني غير صحيحة',
      logo_url: 'رابط الشعار يجب أن يبدأ بـ http أو https',
    });
  });

  it('keeps optional email blank, accepts simple valid email, and rejects malformed email without regex backtracking risk', () => {
    expect(validateCompanySettingsDraft({ ...validDraft, email: '' }).email).toBeUndefined();
    expect(validateCompanySettingsDraft({ ...validDraft, email: 'admin@rentrix.app' }).email).toBeUndefined();
    expect(validateCompanySettingsDraft({ ...validDraft, email: 'admin@@rentrix.app' }).email).toBe('صيغة البريد الإلكتروني غير صحيحة');
    expect(validateCompanySettingsDraft({ ...validDraft, email: `admin@${'a'.repeat(5000)}` }).email).toBe('صيغة البريد الإلكتروني غير صحيحة');
  });

  it('detects dirty state by comparing every persisted draft field', () => {
    expect(areCompanySettingsDraftsEqual(validDraft, { ...validDraft })).toBe(true);
    expect(areCompanySettingsDraftsEqual(validDraft, { ...validDraft, invoice_prefix: 'BILL' })).toBe(false);
  });

  it('converts drafts to normalized local settings for formatter/runtime consumers', () => {
    expect(companySettingsDraftToLocalSettings({
      ...validDraft,
      currency: 'XYZ',
      locale: 'en-OM',
      country: 'Oman',
      timezone: 'Europe/Paris',
    })).toMatchObject({
      defaultLanguage: 'en',
      defaultCurrency: 'OMR',
      country: 'OM',
      timezone: 'Asia/Muscat',
    });
  });

  it('normalizes persisted record values before binding settings controls', () => {
    expect(companySettingsRecordToDraft({
      ...validRecord,
      company_name: '  ',
      country: 'Oman',
      currency: 'XYZ',
      locale: 'en-OM',
      timezone: 'Europe/Paris',
      logo_url: ' https://example.test/logo.png ',
      invoice_prefix: '',
      receipt_prefix: '',
    })).toMatchObject({
      company_name: 'Rentrix',
      country: 'OM',
      currency: 'OMR',
      locale: 'en-OM',
      timezone: 'Asia/Muscat',
      logo_url: 'https://example.test/logo.png',
      invoice_prefix: 'INV',
      receipt_prefix: 'REC',
    });
  });

  it('normalizes draft option values before saving the update payload', () => {
    expect(companySettingsDraftToPayload({
      ...validDraft,
      company_name: '  Rentrix Oman  ',
      country: 'Oman',
      currency: 'XYZ',
      locale: 'fr-FR',
      timezone: 'Europe/Paris',
      logo_url: ' https://example.test/logo.png ',
      invoice_prefix: '',
      receipt_prefix: '',
    })).toMatchObject({
      company_name: 'Rentrix Oman',
      country: 'OM',
      currency: 'OMR',
      locale: 'ar-OM',
      timezone: 'Asia/Muscat',
      logo_url: 'https://example.test/logo.png',
      invoice_prefix: 'INV',
      receipt_prefix: 'REC',
    });
  });


  it('builds a branding and document preview model with safe fallbacks', () => {
    const preview = getCompanySettingsPreviewModel({
      ...validDraft,
      company_name: '  Rentrix Oman  ',
      legal_name: ' ',
      logo_url: 'javascript:alert(1)',
      locale: 'en-OM',
      currency: 'XYZ',
      country: 'Oman',
      timezone: 'Europe/Paris',
      invoice_prefix: '',
      receipt_prefix: '   ',
      phone: '',
      email: '',
      address: '  ',
    });

    expect(preview).toMatchObject({
      companyName: 'Rentrix Oman',
      legalName: 'غير محدد',
      logoUrl: null,
      logoFallbackLabel: 'لا يوجد رابط شعار محفوظ حالياً',
      locale: 'en-OM',
      defaultLanguage: 'الإنجليزية',
      defaultCurrency: 'OMR',
      country: 'OM',
      timezone: 'Asia/Muscat',
      invoicePrefix: 'INV',
      receiptPrefix: 'REC',
    });
    expect(preview.contactDetails).toContainEqual({ label: 'الهاتف', value: 'لا يوجد هاتف', isFallback: true });
    expect(preview.contactDetails).toContainEqual({ label: 'العنوان', value: 'لا يوجد عنوان', isFallback: true });
  });

  it('keeps safe http and https logo URLs available for the preview', () => {
    expect(getCompanySettingsPreviewModel({
      ...validDraft,
      logo_url: ' https://example.test/logo.png ',
    }).logoUrl).toBe('https://example.test/logo.png');
  });

  it('converts drafts to update payloads without dropping persisted fields', () => {
    expect(companySettingsDraftToPayload(validDraft)).toEqual({
      company_name: 'Rentrix',
      legal_name: '',
      tax_number: '',
      registration_number: '',
      phone: '',
      email: '',
      address: '',
      city: 'Muscat',
      country: 'OM',
      currency: 'OMR',
      locale: 'ar-OM',
      timezone: 'Asia/Muscat',
      date_format: 'dd/MM/yyyy',
      number_format: 'ar-OM',
      logo_url: '',
      invoice_prefix: 'INV',
      receipt_prefix: 'REC',
    });
  });
});
