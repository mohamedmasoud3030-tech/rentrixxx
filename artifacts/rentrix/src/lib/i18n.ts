export const supportedLanguages = ['ar', 'en'] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number];
export type TextDirection = 'rtl' | 'ltr';

export const DEFAULT_LANGUAGE: SupportedLanguage = 'ar';

export const languageLocales: Record<SupportedLanguage, string> = {
  ar: 'ar',
  en: 'en',
};

export const languageDirections: Record<SupportedLanguage, TextDirection> = {
  ar: 'rtl',
  en: 'ltr',
};

export const translations = {
  ar: {
    'common.all': 'الكل',
    'common.actions': 'إجراءات',
    'common.details': 'تفاصيل',
    'common.status': 'الحالة',
    'common.currency': 'العملة',
    'common.phone': 'هاتف',
    'common.email': 'بريد',
    'common.identity': 'هوية',
    'common.floor': 'الدور',
    'common.address': 'العنوان',
    'common.unitStatus': 'حالة الوحدة',

    'contracts.phaseLabel': 'مرحلة 2B',
    'contracts.title': 'العقود',
    'contracts.description': 'إدارة دورة العقد من مسودة إلى نشط ثم منتهي أو ملغي.',
    'contracts.create': 'إنشاء عقد',
    'contracts.exportCsv': 'تصدير CSV',
    'contracts.searchPlaceholder': 'بحث باسم المستأجر، الوحدة، العقار، أو رقم العقد',
    'contracts.searchAriaLabel': 'بحث العقود',
    'contracts.showDetails': 'عرض تفاصيل العقد',
    'contracts.hideDetails': 'إخفاء تفاصيل العقد',
    'contracts.contractNumber': 'العقد رقم',
    'contracts.tenant': 'المستأجر',
    'contracts.unit': 'الوحدة',
    'contracts.startDate': 'تاريخ البداية',
    'contracts.endDate': 'تاريخ النهاية',
    'contracts.rentAmount': 'قيمة الإيجار',
    'contracts.paymentCycle': 'دورة السداد',
    'contracts.tenantDetails': 'بيانات المستأجر',
    'contracts.unitPropertyDetails': 'بيانات الوحدة والعقار',
    'contracts.contractPeriod': 'فترة العقد',
    'contracts.emptyTitle': 'لا توجد عقود',
    'contracts.emptyDescription': 'ابدأ بإنشاء أول عقد وربطه بالعقار والوحدة والمستأجر.',
    'contracts.noMatchesTitle': 'لا توجد عقود مطابقة',
    'contracts.noMatchesDescription': 'جرّب تغيير عبارة البحث أو فلتر الحالة لعرض عقود أخرى.',
    'contracts.csv.contractNumber': 'رقم العقد',
    'contracts.csv.tenantPhone': 'هاتف المستأجر',
    'contracts.csv.property': 'العقار',
    'contracts.csv.propertyAddress': 'عنوان العقار',

    'contractStatus.draft': 'مسودة',
    'contractStatus.active': 'نشط',
    'contractStatus.expired': 'منتهي',
    'contractStatus.terminated': 'ملغي',
  },
  en: {
    'common.all': 'All',
    'common.actions': 'Actions',
    'common.details': 'Details',
    'common.status': 'Status',
    'common.currency': 'Currency',
    'common.phone': 'Phone',
    'common.email': 'Email',
    'common.identity': 'ID',
    'common.floor': 'Floor',
    'common.address': 'Address',
    'common.unitStatus': 'Unit status',

    'contracts.phaseLabel': 'Phase 2B',
    'contracts.title': 'Contracts',
    'contracts.description': 'Manage the contract lifecycle from draft to active, expired, or terminated.',
    'contracts.create': 'Create contract',
    'contracts.exportCsv': 'Export CSV',
    'contracts.searchPlaceholder': 'Search by tenant, unit, property, or contract number',
    'contracts.searchAriaLabel': 'Search contracts',
    'contracts.showDetails': 'Show contract details',
    'contracts.hideDetails': 'Hide contract details',
    'contracts.contractNumber': 'Contract no.',
    'contracts.tenant': 'Tenant',
    'contracts.unit': 'Unit',
    'contracts.startDate': 'Start date',
    'contracts.endDate': 'End date',
    'contracts.rentAmount': 'Rent amount',
    'contracts.paymentCycle': 'Payment cycle',
    'contracts.tenantDetails': 'Tenant details',
    'contracts.unitPropertyDetails': 'Unit and property details',
    'contracts.contractPeriod': 'Contract period',
    'contracts.emptyTitle': 'No contracts',
    'contracts.emptyDescription': 'Create the first contract and connect it to a property, unit, and tenant.',
    'contracts.noMatchesTitle': 'No matching contracts',
    'contracts.noMatchesDescription': 'Try changing the search term or status filter.',
    'contracts.csv.contractNumber': 'Contract number',
    'contracts.csv.tenantPhone': 'Tenant phone',
    'contracts.csv.property': 'Property',
    'contracts.csv.propertyAddress': 'Property address',

    'contractStatus.draft': 'Draft',
    'contractStatus.active': 'Active',
    'contractStatus.expired': 'Expired',
    'contractStatus.terminated': 'Terminated',
  },
} as const;

export type TranslationKey = keyof typeof translations.ar;

export function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return typeof value === 'string' && supportedLanguages.includes(value as SupportedLanguage);
}

export function normalizeLanguage(value: unknown): SupportedLanguage {
  return isSupportedLanguage(value) ? value : DEFAULT_LANGUAGE;
}

export function getLanguageDirection(language: unknown): TextDirection {
  return languageDirections[normalizeLanguage(language)];
}

export function getLanguageLocale(language: unknown): string {
  return languageLocales[normalizeLanguage(language)];
}

export function translate(key: TranslationKey, language: unknown = DEFAULT_LANGUAGE): string {
  const safeLanguage = normalizeLanguage(language);
  return translations[safeLanguage][key] ?? translations[DEFAULT_LANGUAGE][key];
}
