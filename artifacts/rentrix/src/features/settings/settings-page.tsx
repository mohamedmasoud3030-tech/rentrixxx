import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatCompanyDate, formatCompanyMoney } from '@lib/format';
import {
  normalizeCompanyLocale,
  supportedCompanyLocales,
  supportedCountries,
  supportedTimezones,
  type SupportedLanguage,
} from '@/lib/companySettings';
import { supportedCurrencies } from '@lib/format';
import { getAppLanguageState } from '@/lib/i18n';
import { useUiStore } from '@/store/ui-store';
import { supabase } from '@/integrations/supabase/client';
import { useCompanySettings, useUpdateCompanySettings } from './useCompanySettings';
import {
  areCompanySettingsDraftsEqual,
  companySettingsDraftToLocalSettings,
  companySettingsDraftToPayload,
  companySettingsRecordToDraft,
  getCompanySettingsPreviewModel,
  hasCompanySettingsValidationErrors,
  validateCompanySettingsDraft,
  type CompanySettingsDraft,
  type CompanySettingsDraftField,
  type CompanySettingsValidationErrors,
} from './settingsForm';

const currencyOptions = supportedCurrencies;
const localeOptions = supportedCompanyLocales;
const countryOptions = supportedCountries;
const numberFormatOptions = ['ar-OM', 'en-OM', 'ar', 'en-US'];
const dateFormatOptions = ['dd/MM/yyyy', 'yyyy-MM-dd', 'MM/dd/yyyy'];
const timezoneOptions = supportedTimezones;

type BaseFieldProps = Readonly<{
  label: string;
  field: CompanySettingsDraftField;
  draft: CompanySettingsDraft;
  errors: CompanySettingsValidationErrors;
  disabled: boolean;
  onChange: (field: CompanySettingsDraftField, value: string) => void;
}>;

type FormFieldProps = BaseFieldProps & Readonly<{
  placeholder?: string;
  type?: string;
}>;

function FormField({ label, field, draft, errors, disabled, placeholder, type = 'text', onChange }: FormFieldProps) {
  return (
    <label className="space-y-1 text-sm font-medium text-foreground">
      <span>{label}</span>
      <Input
        type={type}
        value={draft[field]}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={Boolean(errors[field])}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(field, event.target.value)}
      />
      {errors[field] ? <span className="block text-xs text-destructive">{errors[field]}</span> : null}
    </label>
  );
}

type SelectFieldProps = BaseFieldProps & Readonly<{
  options: readonly string[];
}>;

function SelectField({ label, field, draft, errors, disabled, options, onChange }: SelectFieldProps) {
  return (
    <label className="space-y-1 text-sm font-medium text-foreground">
      <span>{label}</span>
      <Select
        value={draft[field]}
        disabled={disabled}
        aria-invalid={Boolean(errors[field])}
        onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(field, event.target.value)}
      >
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </Select>
      {errors[field] ? <span className="block text-xs text-destructive">{errors[field]}</span> : null}
    </label>
  );
}

type UserAccount = { email: string; active: boolean };

type UserManagementCardProps = Readonly<{
  users: UserAccount[];
  inviteEmail: string;
  onInviteEmailChange: (value: string) => void;
  onInviteUser: () => void;
  onToggleUser: (email: string) => void;
}>;

function UserManagementCard({ users, inviteEmail, onInviteEmailChange, onInviteUser, onToggleUser }: UserManagementCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>إدارة المستخدمين</CardTitle>
        <CardDescription>دعوة عبر البريد أو تعطيل مستخدم.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex gap-2">
          <Input
            className="flex-1"
            placeholder="email@example.com"
            value={inviteEmail}
            onChange={(event) => onInviteEmailChange(event.target.value)}
          />
          <Button onClick={onInviteUser}>دعوة</Button>
        </div>
        {users.map((user) => (
          <div key={user.email} className="flex items-center justify-between rounded border p-2">
            <span>{user.email}</span>
            <Button variant="secondary" onClick={() => onToggleUser(user.email)}>
              {user.active ? 'تعطيل' : 'تفعيل'}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

type AppPreferencesCardProps = Readonly<{
  lang: SupportedLanguage;
  theme: string;
  onLanguageChange: (language: SupportedLanguage) => void;
  onToggleTheme: () => void;
}>;

function AppPreferencesCard({ lang, theme, onLanguageChange, onToggleTheme }: AppPreferencesCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>تفضيلات التطبيق</CardTitle>
        <CardDescription>تستخدم أزرار اللغة المحلية المحفوظة كإعداد افتراضي للشركة.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Button variant={lang === 'ar' ? 'primary' : 'secondary'} onClick={() => onLanguageChange('ar')}>AR</Button>
          <Button variant={lang === 'en' ? 'primary' : 'secondary'} onClick={() => onLanguageChange('en')}>EN</Button>
        </div>
        <Button variant="secondary" onClick={onToggleTheme}>تبديل السمة ({theme})</Button>
      </CardContent>
    </Card>
  );
}


type PreviewFieldProps = Readonly<{
  label: string;
  value: string;
  muted?: boolean;
}>;

function PreviewField({ label, value, muted = false }: PreviewFieldProps) {
  return (
    <div className="rounded-xl border bg-background/70 p-3">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className={muted ? 'mt-1 text-sm text-muted-foreground' : 'mt-1 text-sm font-semibold text-foreground'}>
        {value}
      </dd>
    </div>
  );
}

type CompanySettingsPreviewCardProps = Readonly<{
  draft: CompanySettingsDraft;
  formattedPreviewDate: string;
  formattedPreviewMoney: string;
}>;

function CompanySettingsPreviewCard({ draft, formattedPreviewDate, formattedPreviewMoney }: CompanySettingsPreviewCardProps) {
  const preview = getCompanySettingsPreviewModel(draft);

  return (
    <section className="space-y-4 rounded-2xl border bg-muted/20 p-4" aria-labelledby="company-settings-preview-title">
      <div>
        <h3 id="company-settings-preview-title" className="text-base font-semibold text-foreground">معاينة العلامة التجارية والمستندات</h3>
        <p className="text-sm text-muted-foreground">
          عرض آمن للقيم التي ستُستخدم لاحقاً في الفواتير والإيصالات بدون إنشاء مستندات.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_14rem]">
        <dl className="grid gap-3 md:grid-cols-2">
          <PreviewField label="اسم الشركة" value={preview.companyName} />
          <PreviewField label="الاسم القانوني" value={preview.legalName} muted={preview.legalName === 'غير محدد'} />
          <PreviewField label="اللغة الافتراضية" value={`${preview.defaultLanguage} (${preview.locale})`} />
          <PreviewField label="العملة الافتراضية" value={preview.defaultCurrency} />
          <PreviewField label="الدولة" value={preview.country} />
          <PreviewField label="المنطقة الزمنية" value={preview.timezone} />
          <PreviewField label="بادئة الفواتير" value={preview.invoicePrefix} />
          <PreviewField label="بادئة الإيصالات" value={preview.receiptPrefix} />
          <PreviewField label="معاينة التاريخ" value={formattedPreviewDate} />
          <PreviewField label="معاينة المبلغ" value={formattedPreviewMoney} />
        </dl>

        <div className="flex min-h-44 flex-col items-center justify-center rounded-2xl border border-dashed bg-background/70 p-4 text-center">
          {preview.logoUrl ? (
            <>
              <img src={preview.logoUrl} alt={`شعار ${preview.companyName}`} className="max-h-24 max-w-full rounded-lg object-contain" />
              <a
                className="mt-3 break-all text-xs text-primary underline-offset-4 hover:underline"
                href={preview.logoUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                فتح رابط الشعار
              </a>
            </>
          ) : (
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-lg font-bold text-primary">
                {preview.companyName.slice(0, 2)}
              </div>
              <p>{preview.logoFallbackLabel}</p>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground">بيانات التواصل</h4>
        <dl className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {preview.contactDetails.map((detail) => (
            <PreviewField key={detail.label} label={detail.label} value={detail.value} muted={detail.isFallback} />
          ))}
        </dl>
      </div>
    </section>
  );
}


function ChangePasswordCard() {
  const [nextPassword, setNextPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!nextPassword) {
      toast.error('يرجى إدخال كلمة المرور الجديدة');
      return;
    }
    if (nextPassword.length < 8) {
      toast.error('يجب أن تكون كلمة المرور الجديدة 8 أحرف على الأقل');
      return;
    }
    if (nextPassword !== confirmPassword) {
      toast.error('تأكيد كلمة المرور غير مطابق');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: nextPassword });
      if (error) throw error;
      setNextPassword('');
      setConfirmPassword('');
      toast.success('تم تحديث كلمة المرور بنجاح');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحديث كلمة المرور');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>تغيير كلمة المرور</CardTitle>
        <CardDescription>تحديث كلمة مرور الحساب الحالي عبر مزود المصادقة (قد يطلب المزود إعادة تسجيل الدخول).</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={handleChangePassword}>
          <Input type="password" placeholder="كلمة المرور الجديدة" value={nextPassword} onChange={(e) => setNextPassword(e.target.value)} />
          <Input type="password" placeholder="تأكيد كلمة المرور الجديدة" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          <Button type="submit" disabled={saving}>{saving ? 'جارٍ التحديث...' : 'تحديث كلمة المرور'}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function toggleUserStatus(users: UserAccount[], email: string): UserAccount[] {
  return users.map((user) => user.email === email ? { ...user, active: !user.active } : user);
}

export function SettingsPage() {
  const { theme, setTheme } = useUiStore();
  const companySettingsQuery = useCompanySettings();
  const updateCompanySettingsMutation = useUpdateCompanySettings();
  const [baseDraft, setBaseDraft] = useState<CompanySettingsDraft | null>(null);
  const [draft, setDraft] = useState<CompanySettingsDraft | null>(null);
  const baseDraftRef = useRef<CompanySettingsDraft | null>(null);
  const draftRef = useRef<CompanySettingsDraft | null>(null);
  const [errors, setErrors] = useState<CompanySettingsValidationErrors>({});
  const [users, setUsers] = useState<UserAccount[]>([{ email: 'admin@rentrix.app', active: true }]);
  const [inviteEmail, setInviteEmail] = useState('');

  const isDirty = !areCompanySettingsDraftsEqual(draft, baseDraft);
  const isSaving = updateCompanySettingsMutation.isPending;

  useEffect(() => {
    if (!companySettingsQuery.data) return;

    const currentDraft = draftRef.current;
    const currentBaseDraft = baseDraftRef.current;
    const nextDraft = companySettingsRecordToDraft(companySettingsQuery.data);
    const hasUnsavedDraft = Boolean(
      currentDraft
        && currentBaseDraft
        && !areCompanySettingsDraftsEqual(currentDraft, currentBaseDraft),
    );

    baseDraftRef.current = nextDraft;
    setBaseDraft(nextDraft);

    if (!hasUnsavedDraft) {
      draftRef.current = nextDraft;
      setDraft(nextDraft);
    }
  }, [companySettingsQuery.data]);

  const previewSettings = useMemo(() => draft ? companySettingsDraftToLocalSettings(draft) : null, [draft]);
  const pageLanguage = getAppLanguageState(previewSettings?.defaultLanguage);
  const formattedPreviewDate = previewSettings ? formatCompanyDate(previewSettings, new Date()) : '—';
  const formattedPreviewMoney = previewSettings ? formatCompanyMoney(previewSettings, 1234.56) : '—';

  const handleDraftChange = (field: CompanySettingsDraftField, value: string) => {
    setDraft((currentDraft) => {
      const nextDraft = currentDraft ? { ...currentDraft, [field]: value } : currentDraft;
      draftRef.current = nextDraft;
      return nextDraft;
    });
    setErrors((currentErrors) => {
      if (!currentErrors[field]) return currentErrors;
      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
  };

  const handleRetryLoad = async () => {
    await companySettingsQuery.refetch();
  };

  const handleInviteUser = () => {
    if (!inviteEmail) {
      return;
    }

    setUsers((currentUsers) => [{ email: inviteEmail, active: true }, ...currentUsers]);
    setInviteEmail('');
  };

  const handleToggleUser = (email: string) => {
    setUsers((currentUsers) => toggleUserStatus(currentUsers, email));
  };

  const handleToggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleDefaultLanguageChange = (language: SupportedLanguage) => {
    handleDraftChange('locale', normalizeCompanyLocale(undefined, language));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft) return;

    const validationErrors = validateCompanySettingsDraft(draft);
    setErrors(validationErrors);
    if (hasCompanySettingsValidationErrors(validationErrors)) {
      toast.error('يرجى تصحيح أخطاء إعدادات الشركة قبل الحفظ');
      return;
    }

    try {
      const savedSettings = await updateCompanySettingsMutation.mutateAsync(companySettingsDraftToPayload(draft));
      const savedDraft = companySettingsRecordToDraft(savedSettings);
      baseDraftRef.current = savedDraft;
      draftRef.current = savedDraft;
      setBaseDraft(savedDraft);
      setDraft(savedDraft);
      toast.success('تم حفظ إعدادات الشركة بنجاح');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حفظ إعدادات الشركة');
    }
  };

  if (companySettingsQuery.isError) {
    return (
      <div className="grid gap-4" dir={pageLanguage.direction} lang={pageLanguage.locale}>
        <Card>
          <CardHeader>
            <CardTitle>تعذر تحميل إعدادات الشركة</CardTitle>
            <CardDescription>{companySettingsQuery.error instanceof Error ? companySettingsQuery.error.message : 'حدث خطأ غير متوقع أثناء تحميل الإعدادات.'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleRetryLoad}>إعادة المحاولة</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (companySettingsQuery.isLoading || !draft) {
    return (
      <div className="grid gap-4" dir={pageLanguage.direction} lang={pageLanguage.locale}>
        <Card>
          <CardHeader>
            <CardTitle>إعدادات الشركة</CardTitle>
            <CardDescription>جارٍ تحميل الإعدادات المحفوظة...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">يرجى الانتظار بينما يتم تحميل إعدادات الشركة من قاعدة البيانات.</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <div className="grid gap-4 lg:grid-cols-2" dir={pageLanguage.direction} lang={pageLanguage.locale}>
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>ملف الشركة</CardTitle>
        <CardDescription>هذه الإعدادات محفوظة ومستمرة في قاعدة البيانات وتُستخدم كمرجع لتنسيق بيانات الشركة.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-primary">الإعدادات هنا مرتبطة الآن بسجل إعدادات الشركة المحفوظ وليست حالة محلية مؤقتة فقط.</div>

          <div className="grid gap-3 md:grid-cols-2">
            <FormField label="اسم الشركة" field="company_name" draft={draft} errors={errors} disabled={isSaving} placeholder="Rentrix" onChange={handleDraftChange} />
            <FormField label="الاسم القانوني" field="legal_name" draft={draft} errors={errors} disabled={isSaving} placeholder="الاسم القانوني للشركة" onChange={handleDraftChange} />
            <FormField label="الرقم الضريبي" field="tax_number" draft={draft} errors={errors} disabled={isSaving} onChange={handleDraftChange} />
            <FormField label="رقم السجل التجاري" field="registration_number" draft={draft} errors={errors} disabled={isSaving} onChange={handleDraftChange} />
            <FormField label="الهاتف" field="phone" draft={draft} errors={errors} disabled={isSaving} onChange={handleDraftChange} />
            <FormField label="البريد الإلكتروني" field="email" draft={draft} errors={errors} disabled={isSaving} type="email" placeholder="email@example.com" onChange={handleDraftChange} />
            <FormField label="المدينة" field="city" draft={draft} errors={errors} disabled={isSaving} onChange={handleDraftChange} />
            <SelectField label="الدولة" field="country" draft={draft} errors={errors} disabled={isSaving} options={countryOptions} onChange={handleDraftChange} />
            <SelectField label="العملة" field="currency" draft={draft} errors={errors} disabled={isSaving} options={currencyOptions} onChange={handleDraftChange} />
            <SelectField label="المحلية" field="locale" draft={draft} errors={errors} disabled={isSaving} options={localeOptions} onChange={handleDraftChange} />
            <SelectField label="المنطقة الزمنية" field="timezone" draft={draft} errors={errors} disabled={isSaving} options={timezoneOptions} onChange={handleDraftChange} />
            <SelectField label="صيغة التاريخ" field="date_format" draft={draft} errors={errors} disabled={isSaving} options={dateFormatOptions} onChange={handleDraftChange} />
            <SelectField label="صيغة الأرقام" field="number_format" draft={draft} errors={errors} disabled={isSaving} options={numberFormatOptions} onChange={handleDraftChange} />
            <FormField label="رابط الشعار" field="logo_url" draft={draft} errors={errors} disabled={isSaving} type="url" placeholder="https://example.com/logo.png" onChange={handleDraftChange} />
            <FormField label="بادئة الفواتير" field="invoice_prefix" draft={draft} errors={errors} disabled={isSaving} onChange={handleDraftChange} />
            <FormField label="بادئة الإيصالات" field="receipt_prefix" draft={draft} errors={errors} disabled={isSaving} onChange={handleDraftChange} />
          </div>

          <label className="space-y-1 text-sm font-medium text-foreground">
            <span>العنوان</span>
            <Textarea
              value={draft.address}
              disabled={isSaving}
              aria-invalid={Boolean(errors.address)}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => handleDraftChange('address', event.target.value)}
            />
            {errors.address ? <span className="block text-xs text-destructive">{errors.address}</span> : null}
          </label>

          <CompanySettingsPreviewCard draft={draft} formattedPreviewDate={formattedPreviewDate} formattedPreviewMoney={formattedPreviewMoney} />

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={!isDirty || isSaving}>{isSaving ? 'جارٍ الحفظ...' : 'حفظ إعدادات الشركة'}</Button>
            <span className="text-sm text-muted-foreground">{isDirty ? 'توجد تغييرات غير محفوظة' : 'لا توجد تغييرات للحفظ'}</span>
          </div>
        </form>
      </CardContent>
    </Card>

    <UserManagementCard
      users={users}
      inviteEmail={inviteEmail}
      onInviteEmailChange={setInviteEmail}
      onInviteUser={handleInviteUser}
      onToggleUser={handleToggleUser}
    />
    <AppPreferencesCard lang={pageLanguage.language} theme={theme} onLanguageChange={handleDefaultLanguageChange} onToggleTheme={handleToggleTheme} />
    <ChangePasswordCard />
  </div>;
}
