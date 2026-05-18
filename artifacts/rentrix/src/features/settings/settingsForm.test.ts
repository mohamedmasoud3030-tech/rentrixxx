import { describe, expect, it } from 'vitest';
import {
  areCompanySettingsDraftsEqual,
  companySettingsDraftToLocalSettings,
  companySettingsDraftToPayload,
  validateCompanySettingsDraft,
  type CompanySettingsDraft,
} from './settingsForm';

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
