import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatCompanyDate, formatCompanyMoney } from '@/lib/companyFormatters';
import { useUiStore } from '@/store/ui-store';
import { useCompanySettings, useUpdateCompanySettings } from './useCompanySettings';
import {
  areCompanySettingsDraftsEqual,
  companySettingsDraftToLocalSettings,
  companySettingsDraftToPayload,
  companySettingsRecordToDraft,
  hasCompanySettingsValidationErrors,
  validateCompanySettingsDraft,
  type CompanySettingsDraft,
  type CompanySettingsDraftField,
  type CompanySettingsValidationErrors,
} from './settingsForm';

const currencyOptions = ['OMR', 'AED', 'SAR', 'QAR', 'KWD', 'BHD', 'USD', 'EGP'];
const localeOptions = ['ar-OM', 'en-OM', 'ar', 'en'];
const numberFormatOptions = ['ar-OM', 'en-OM', 'ar', 'en-US'];
const dateFormatOptions = ['dd/MM/yyyy', 'yyyy-MM-dd', 'MM/dd/yyyy'];
const timezoneOptions = ['Asia/Muscat', 'Asia/Dubai', 'Asia/Riyadh', 'UTC'];

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
  lang: 'ar' | 'en';
  theme: string;
  onLanguageChange: (language: 'ar' | 'en') => void;
  onToggleTheme: () => void;
}>;

function AppPreferencesCard({ lang, theme, onLanguageChange, onToggleTheme }: AppPreferencesCardProps) {
  return (
    <Card>
      <CardHeader><CardTitle>تفضيلات التطبيق</CardTitle></CardHeader>
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

function toggleUserStatus(users: UserAccount[], email: string): UserAccount[] {
  return users.map((user) => user.email === email ? { ...user, active: !user.active } : user);
}

export function SettingsPage() {
  const { theme, setTheme } = useUiStore();
  const companySettingsQuery = useCompanySettings();
  const updateCompanySettingsMutation = useUpdateCompanySettings();
  const [baseDraft, setBaseDraft] = useState<CompanySettingsDraft | null>(null);
  const [draft, setDraft] = useState<CompanySettingsDraft | null>(null);
  const [errors, setErrors] = useState<CompanySettingsValidationErrors>({});
  const [users, setUsers] = useState<UserAccount[]>([{ email: 'admin@rentrix.app', active: true }]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [lang, setLang] = useState<'ar' | 'en'>('ar');

  const isDirty = !areCompanySettingsDraftsEqual(draft, baseDraft);
  const isSaving = updateCompanySettingsMutation.isPending;

  useEffect(() => {
    if (!companySettingsQuery.data) return;

    const nextDraft = companySettingsRecordToDraft(companySettingsQuery.data);
    setBaseDraft((currentBaseDraft) => {
      setDraft((currentDraft) => {
        if (currentDraft && currentBaseDraft && !areCompanySettingsDraftsEqual(currentDraft, currentBaseDraft)) {
          return currentDraft;
        }
        return nextDraft;
      });
      return nextDraft;
    });
  }, [companySettingsQuery.data]);

  const previewSettings = useMemo(() => draft ? companySettingsDraftToLocalSettings(draft) : null, [draft]);
  const formattedPreviewDate = previewSettings ? formatCompanyDate(previewSettings, new Date()) : '—';
  const formattedPreviewMoney = previewSettings ? formatCompanyMoney(previewSettings, 1234.56) : '—';

  const handleDraftChange = (field: CompanySettingsDraftField, value: string) => {
    setDraft((currentDraft) => currentDraft ? { ...currentDraft, [field]: value } : currentDraft);
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
      setBaseDraft(savedDraft);
      setDraft(savedDraft);
      toast.success('تم حفظ إعدادات الشركة بنجاح');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حفظ إعدادات الشركة');
    }
  };

  if (companySettingsQuery.isError) {
    return (
      <div className="grid gap-4" dir="rtl">
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
      <div className="grid gap-4" dir="rtl">
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

  return <div className="grid gap-4 lg:grid-cols-2" dir="rtl">
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
            <FormField label="الدولة" field="country" draft={draft} errors={errors} disabled={isSaving} onChange={handleDraftChange} />
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

          <div className="grid gap-3 rounded-xl border bg-muted/20 p-4 text-sm md:grid-cols-2">
            <div>
              <div className="font-semibold">معاينة التاريخ</div>
              <div className="text-muted-foreground">{formattedPreviewDate}</div>
            </div>
            <div>
              <div className="font-semibold">معاينة المبلغ</div>
              <div className="text-muted-foreground">{formattedPreviewMoney}</div>
            </div>
          </div>

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
    <AppPreferencesCard lang={lang} theme={theme} onLanguageChange={setLang} onToggleTheme={handleToggleTheme} />
  </div>;
}
