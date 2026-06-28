/**
 * Centralized Arabic-first translation labels, fields, and validation messages.
 * This is supportive of a mobile-first, Arabic-first real estate system,
 * while remaining flexible and not forcing Arabic-only input fields (e.g., owner or tenant names).
 */

export const DOMAIN_LABELS_AR = {
  // Entity Names
  owner: 'المالك',
  ownerAgreement: 'اتفاقية التشغيل',
  property: 'العقار',
  unit: 'الوحدة',
  tenant: 'المستأجر',
  leaseContract: 'عقد الإيجار',
  invoice: 'فاتورة المطالبة',
  paymentReceipt: 'سند القبض',
  expense: 'المصروف',
  ownerSettlement: 'التصفية المالية للمالك',
  auditEvent: 'سجل العمليات',

  // Operating Models
  property_management: 'إدارة أملاك (نسبة/عمولة)',
  master_lease: 'استئجار رئيسي (مبلغ ثابت)',

  // Expense Responsibility
  expense_owner: 'على المالك',
  expense_office: 'على المكتب',
  expense_shared: 'مشترك بين المالك والمكتب',

  // Contract Statuses
  status_draft: 'مسودة',
  status_active: 'نشط',
  status_terminated: 'ملغي / منتهي مبكراً',
  status_expired: 'منتهي الصلاحية',

  // Invoice Statuses
  invoice_unpaid: 'غير مدفوع',
  invoice_partially_paid: 'مدفوع جزئياً',
  invoice_paid: 'مدفوع',
  invoice_overdue: 'متأخر',
  invoice_cancelled: 'ملغي',

  // Settlement Statuses
  settlement_draft: 'مسودة تصفية',
  settlement_approved: 'معتمدة',
  settlement_paid: 'مدفوعة للمالك',

  // Payment Methods
  pay_cash: 'نقدي',
  pay_bank: 'تحويل بنكي',
  pay_check: 'شيك'
};

export const DOMAIN_VALIDATION_AR = {
  // General
  invalid_id: 'المعرف الموفر غير صالح.',
  positive_amount_required: 'يجب أن تكون القيمة المالية قيمة حقيقية منتهية وموجبة تفوق الصفر.',
  date_range_invalid: 'تاريخ البدء يجب أن يكون مساوياً أو سابقاً لتاريخ الانتهاء.',
  date_format_invalid: 'تنسيق التاريخ غير صالح. يرجى استخدام تنسيق ISO الصحيح (YYYY-MM-DD) وتواريخ تقويم حقيقية صالحة.',
  field_required: 'هذا الحقل مطلوب.',

  // Agreements
  agreement_overlap: 'توجد اتفاقية تشغيل أخرى متداخلة في التواريخ لنفس العقار.',
  agreement_not_found: 'اتفاقية التشغيل المغطية غير موجودة.',
  agreement_not_active: 'اتفاقية التشغيل المغطية ليست نشطة.',

  // Contracts
  contract_overlap: 'توجد عقد إيجار آخر متداخل في التواريخ لنفس الوحدة السكنية.',
  contract_out_of_agreement_bounds: 'تاريخ عقد الإيجار يجب أن يقع بالكامل ضمن النطاق الزمني لاتفاقية تشغيل المالك النشطة والمغطية.',
  contract_rent_exceeds_bounds: 'قيمة إيجار العقد غير متوافقة مع القواعد المحددة.',

  // Block Archive and Immutability
  cannot_archive_active_contract: 'لا يمكن أرشفة عقد إيجار نشط حالياً.',
  cannot_archive_active_agreement: 'لا يمكن أرشفة اتفاقية تشغيل نشطة حالياً.',
  immutable_history_error: 'لا يمكن تعديل أو أرشفة هذا الكيان التاريخي أو المالي الحساس للمحافظة على نزاهة السجلات والتدقيق المالي.',
  
  // Block Archive when Related Records Exist
  cannot_archive_owner_with_active_relations: 'لا يمكن أرشفة هذا المالك لارتباطه باتفاقيات تشغيل نشطة حالياً في النظام.',
  cannot_archive_property_with_active_relations: 'لا يمكن أرشفة هذا العقار لارتباطه باتفاقيات تشغيل نشطة حالياً في النظام.',
  cannot_archive_unit_with_active_relations: 'لا يمكن أرشفة هذه الوحدة لارتباطها بعقود إيجار نشطة حالياً في النظام.',
  cannot_archive_tenant_with_active_relations: 'لا يمكن أرشفة هذا المستأجر لارتباطه بعقود إيجار نشطة حالياً في النظام.'
};
