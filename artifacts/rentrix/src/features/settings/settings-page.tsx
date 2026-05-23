import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatCompanyDate, formatCompanyMoney, supportedCurrencies } from '@lib/format';
import { normalizeCompanyLocale, supportedCompanyLocales, supportedCountries, supportedTimezones } from '@/lib/companySettings';
import { getAppLanguageState } from '@/lib/i18n';
import { useUiStore } from '@/store/ui-store';
import { supabase } from '@/integrations/supabase/client';
import { useCompanySettings, useUpdateCompanySettings } from './useCompanySettings';
import { areCompanySettingsDraftsEqual, companySettingsDraftToLocalSettings, companySettingsDraftToPayload, companySettingsRecordToDraft, getCompanySettingsPreviewModel, hasCompanySettingsValidationErrors, validateCompanySettingsDraft, type CompanySettingsDraft, type CompanySettingsDraftField, type CompanySettingsValidationErrors } from './settingsForm';

const currencyOptions = supportedCurrencies;
const localeOptions = supportedCompanyLocales;
const countryOptions = supportedCountries;
const numberFormatOptions = ['ar-OM', 'en-OM', 'ar', 'en-US'];
const dateFormatOptions = ['dd/MM/yyyy', 'yyyy-MM-dd', 'MM/dd/yyyy'];
const timezoneOptions = supportedTimezones;

type SettingsTabId = 'company' | 'security' | 'users' | 'preferences' | 'templates';
const settingsTabs: ReadonlyArray<{ id: SettingsTabId; label: string }> = [
  { id: 'company', label: 'ملف الشركة' },
  { id: 'security', label: 'الأمان وكلمة المرور' },
  { id: 'users', label: 'المستخدمون والفريق' },
  { id: 'preferences', label: 'التفضيلات' },
  { id: 'templates', label: 'قوالب المستندات' },
];

type BaseFieldProps = Readonly<{ label: string; field: CompanySettingsDraftField; draft: CompanySettingsDraft; errors: CompanySettingsValidationErrors; disabled: boolean; onChange: (field: CompanySettingsDraftField, value: string) => void }>;
function FormField({ label, field, draft, errors, disabled, onChange, placeholder, type = 'text' }: BaseFieldProps & Readonly<{ placeholder?: string; type?: string }>) {
  return <label className="space-y-1 text-sm font-medium"><span>{label}</span><Input type={type} value={draft[field]} placeholder={placeholder} disabled={disabled} aria-invalid={Boolean(errors[field])} onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(field, event.target.value)} />{errors[field] ? <span className="block text-xs text-destructive">{errors[field]}</span> : null}</label>;
}
function SelectField({ label, field, draft, errors, disabled, options, onChange }: BaseFieldProps & Readonly<{ options: readonly string[] }>) {
  return <label className="space-y-1 text-sm font-medium"><span>{label}</span><Select value={draft[field]} disabled={disabled} aria-invalid={Boolean(errors[field])} onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(field, event.target.value)}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</Select>{errors[field] ? <span className="block text-xs text-destructive">{errors[field]}</span> : null}</label>;
}

function ChangePasswordCard() { const [nextPassword, setNextPassword] = useState(''); const [confirmPassword, setConfirmPassword] = useState(''); const [saving, setSaving] = useState(false); const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!nextPassword || nextPassword.length < 8 || nextPassword !== confirmPassword) { toast.error('تحقق من كلمة المرور الجديدة والتأكيد (8 أحرف على الأقل).'); return; } setSaving(true); try { const { error } = await supabase.auth.updateUser({ password: nextPassword }); if (error) { throw error; } setNextPassword(''); setConfirmPassword(''); toast.success('تم تحديث كلمة المرور بنجاح'); } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر تحديث كلمة المرور'); } finally { setSaving(false); } }; return <Card><CardHeader><CardTitle>تغيير كلمة المرور</CardTitle><CardDescription>يتم استخدام نفس مسار المصادقة الحالي بدون أي منطق إضافي.</CardDescription></CardHeader><CardContent><form className="space-y-3" onSubmit={handleChangePassword}><Input type="password" placeholder="كلمة المرور الجديدة" value={nextPassword} onChange={(e) => setNextPassword(e.target.value)} /><Input type="password" placeholder="تأكيد كلمة المرور الجديدة" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /><Button type="submit" disabled={saving}>{saving ? 'جارٍ التحديث...' : 'تحديث كلمة المرور'}</Button></form></CardContent></Card>; }

export function SettingsPage() {
  const { theme, setTheme } = useUiStore();
  const [activeTab, setActiveTab] = useState<SettingsTabId>('company');
  const companySettingsQuery = useCompanySettings();
  const updateCompanySettingsMutation = useUpdateCompanySettings();
  const [baseDraft, setBaseDraft] = useState<CompanySettingsDraft | null>(null);
  const [draft, setDraft] = useState<CompanySettingsDraft | null>(null);
  const [errors, setErrors] = useState<CompanySettingsValidationErrors>({});
  const baseDraftRef = useRef<CompanySettingsDraft | null>(null);
  const draftRef = useRef<CompanySettingsDraft | null>(null);
  const isSaving = updateCompanySettingsMutation.isPending;
  const isDirty = !areCompanySettingsDraftsEqual(draft, baseDraft);

  useEffect(() => {
    if (!companySettingsQuery.data) {
      return;
    }
    const nextDraft = companySettingsRecordToDraft(companySettingsQuery.data);
    const hasUnsaved = Boolean(draftRef.current && baseDraftRef.current && !areCompanySettingsDraftsEqual(draftRef.current, baseDraftRef.current));
    baseDraftRef.current = nextDraft;
    setBaseDraft(nextDraft);
    if (!hasUnsaved) {
      draftRef.current = nextDraft;
      setDraft(nextDraft);
    }
  }, [companySettingsQuery.data]);

  const previewSettings = useMemo(() => draft ? companySettingsDraftToLocalSettings(draft) : null, [draft]);
  const pageLanguage = getAppLanguageState(previewSettings?.defaultLanguage);
  const preview = useMemo(() => (draft ? getCompanySettingsPreviewModel(draft) : null), [draft]);

  const handleDraftChange = (field: CompanySettingsDraftField, value: string) => { setDraft((current) => { const next = current ? { ...current, [field]: value } : current; draftRef.current = next; return next; }); };
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!draft) { return; } const validationErrors = validateCompanySettingsDraft(draft); setErrors(validationErrors); if (hasCompanySettingsValidationErrors(validationErrors)) { return; } try { const saved = await updateCompanySettingsMutation.mutateAsync(companySettingsDraftToPayload(draft)); const savedDraft = companySettingsRecordToDraft(saved); baseDraftRef.current = savedDraft; draftRef.current = savedDraft; setBaseDraft(savedDraft); setDraft(savedDraft); toast.success('تم حفظ إعدادات الشركة بنجاح'); } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر حفظ إعدادات الشركة'); } };

  if (companySettingsQuery.isLoading || !draft || !previewSettings || !preview) return <Card><CardHeader><CardTitle>إعدادات الشركة</CardTitle><CardDescription>جارٍ تحميل الإعدادات...</CardDescription></CardHeader></Card>;
  if (companySettingsQuery.isError) return <Card><CardHeader><CardTitle>تعذر تحميل إعدادات الشركة</CardTitle></CardHeader><CardContent><Button onClick={() => companySettingsQuery.refetch()}>إعادة المحاولة</Button></CardContent></Card>;

  return <div className="space-y-4" dir={pageLanguage.direction} lang={pageLanguage.locale}><Card><CardHeader><CardTitle>الإعدادات</CardTitle><CardDescription>تنقل تبويبي آمن يعتمد على الخدمات الحالية فقط.</CardDescription></CardHeader><CardContent><div className="flex gap-2 overflow-x-auto pb-1">{settingsTabs.map((tab) => <Button key={tab.id} variant={activeTab === tab.id ? 'primary' : 'secondary'} className="shrink-0" onClick={() => setActiveTab(tab.id)}>{tab.label}</Button>)}</div></CardContent></Card>

    {activeTab === 'company' ? <Card><CardHeader><CardTitle>ملف الشركة</CardTitle><CardDescription>تُحفظ في سجل إعدادات الشركة الحالي.</CardDescription></CardHeader><CardContent><form onSubmit={handleSubmit} className="space-y-4"><div className="grid gap-3 md:grid-cols-2"><FormField label="اسم الشركة" field="company_name" draft={draft} errors={errors} disabled={isSaving} onChange={handleDraftChange} /><FormField label="العنوان" field="address" draft={draft} errors={errors} disabled={isSaving} onChange={handleDraftChange} /><FormField label="الهاتف" field="phone" draft={draft} errors={errors} disabled={isSaving} onChange={handleDraftChange} /><FormField label="البريد الإلكتروني" field="email" draft={draft} errors={errors} disabled={isSaving} onChange={handleDraftChange} type="email" /><SelectField label="العملة" field="currency" draft={draft} errors={errors} disabled={isSaving} options={currencyOptions} onChange={handleDraftChange} /><FormField label="السجل التجاري" field="registration_number" draft={draft} errors={errors} disabled={isSaving} onChange={handleDraftChange} /><FormField label="الرقم الضريبي" field="tax_number" draft={draft} errors={errors} disabled={isSaving} onChange={handleDraftChange} /><FormField label="رابط الشعار" field="logo_url" draft={draft} errors={errors} disabled={isSaving} onChange={handleDraftChange} type="url" /></div><div className="grid gap-3 md:grid-cols-2"><SelectField label="المحلية" field="locale" draft={draft} errors={errors} disabled={isSaving} options={localeOptions} onChange={handleDraftChange} /><SelectField label="الدولة" field="country" draft={draft} errors={errors} disabled={isSaving} options={countryOptions} onChange={handleDraftChange} /><SelectField label="المنطقة الزمنية" field="timezone" draft={draft} errors={errors} disabled={isSaving} options={timezoneOptions} onChange={handleDraftChange} /><SelectField label="صيغة التاريخ" field="date_format" draft={draft} errors={errors} disabled={isSaving} options={dateFormatOptions} onChange={handleDraftChange} /><SelectField label="صيغة الأرقام" field="number_format" draft={draft} errors={errors} disabled={isSaving} options={numberFormatOptions} onChange={handleDraftChange} /></div><label className="space-y-1 text-sm font-medium"><span>العنوان التفصيلي</span><Textarea value={draft.address} onChange={(event) => handleDraftChange('address', event.target.value)} /></label><div className="rounded-xl border p-3 text-sm">معاينة: {preview.companyName} — {formatCompanyDate(previewSettings, new Date())} — <span dir="ltr">{formatCompanyMoney(previewSettings, 1234.56)}</span></div><Button type="submit" disabled={isSaving || !isDirty}>{isSaving ? 'جارٍ الحفظ...' : 'حفظ إعدادات الشركة'}</Button></form></CardContent></Card> : null}

    {activeTab === 'security' ? <ChangePasswordCard /> : null}
    {activeTab === 'users' ? <Card><CardHeader><CardTitle>المستخدمون والفريق</CardTitle><CardDescription>معلّق لحين توفر جداول/خدمات إدارة المستخدمين في المخطط الحالي.</CardDescription></CardHeader><CardContent><p className="text-sm text-muted-foreground">لا يوجد حالياً Service/Hook معتمد لإدارة أعضاء الفريق أو الصلاحيات داخل هذا التطبيق.</p></CardContent></Card> : null}
    {activeTab === 'preferences' ? <Card><CardHeader><CardTitle>التفضيلات</CardTitle><CardDescription>عرض آمن لتفضيلات اللغة والسمة الحالية.</CardDescription></CardHeader><CardContent className="space-y-3"><p>اللغة الحالية: <strong>{pageLanguage.language === 'ar' ? 'العربية' : 'English'}</strong></p><div className="flex gap-2"><Button variant="secondary" onClick={() => handleDraftChange('locale', normalizeCompanyLocale(undefined, 'ar'))}>العربية</Button><Button variant="secondary" onClick={() => handleDraftChange('locale', normalizeCompanyLocale(undefined, 'en'))}>English</Button></div><Button variant="secondary" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>تبديل السمة ({theme})</Button></CardContent></Card> : null}
    {activeTab === 'templates' ? <Card><CardHeader><CardTitle>قوالب المستندات</CardTitle><CardDescription>هذه الصفحة توضيحية فقط في الوقت الحالي، إلى أن يتوفر نموذج قاعدة بيانات للقوالب والإصدارات والاعتماد.</CardDescription></CardHeader><CardContent><p className="text-sm text-muted-foreground">الطباعة/المعاينة المتاحة الآن تعمل فقط على بيانات الصفحة الحالية عبر الخدمات الموجودة، بدون حفظ قوالب في قاعدة البيانات.</p></CardContent></Card> : null}
  </div>;
}
