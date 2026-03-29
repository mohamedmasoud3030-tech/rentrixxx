import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { toast } from 'react-hot-toast';
import { Settings } from '../../types';
import { Building2, Phone, MapPin, Mail, FileText, DollarSign, Clock, Hash, Shield, AlertTriangle } from 'lucide-react';
import { normalizeArabicNumerals } from '../../utils/helpers';

type GeneralCompany = Settings['general']['company'];
type Operational = Settings['operational'];

const SettingsSection: React.FC<{ title: string; icon?: React.ReactNode; description?: string; children: React.ReactNode }> = ({ title, icon, description, children }) => (
    <div className="bg-background rounded-lg border border-border p-6">
        <div className="flex items-center gap-3 mb-1">
            {icon && <div className="text-primary">{icon}</div>}
            <h3 className="text-lg font-bold text-text">{title}</h3>
        </div>
        {description && <p className="text-sm text-text-muted mb-4 mr-9">{description}</p>}
        {!description && <div className="mb-4" />}
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

const InputField: React.FC<{
    label: string;
    name: string;
    value: string | number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    type?: string;
    colSpan?: number;
    icon?: React.ReactNode;
    dir?: string;
}> = ({ label, name, value, onChange, placeholder, type = 'text', colSpan = 1, icon, dir }) => (
    <div className={colSpan === 2 ? 'md:col-span-2' : colSpan === 3 ? 'md:col-span-3' : ''}>
        <label className="text-xs font-medium text-text-muted flex items-center gap-1.5 mb-1">
            {icon && <span className="text-text-muted">{icon}</span>}
            {label}
        </label>
        <input
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            dir={dir}
            className="w-full"
        />
    </div>
);

const GeneralSettings: React.FC = () => {
    const { settings, updateSettings } = useApp();
    const [company, setCompany] = useState<GeneralCompany>(settings.general.company);
    const [operational, setOperational] = useState<Operational>(settings.operational);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setCompany(settings.general.company);
        setOperational(settings.operational);
    }, [settings]);

    const handleCompanyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCompany({ ...company, [e.target.name]: e.target.value });
    };

    const handleOperationalChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, type } = e.target;
        const rawValue = e.target.value;
        const value = type === 'number' ? Number(normalizeArabicNumerals(rawValue)) : rawValue;
        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            if (parent === 'lateFee') {
                setOperational(prev => ({
                    ...prev,
                    lateFee: { ...prev.lateFee, [child]: value as never },
                }));
            }
        } else {
            setOperational(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const handleDocumentNumberingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
         setOperational(prev => ({ ...prev, documentNumbering: { ...prev.documentNumbering, [name]: value } }));
    };

    const handleSave = async () => {
        if (isSaving) return;
        if (operational.taxRate < 0 || operational.taxRate > 100) {
            toast.error('نسبة الضريبة يجب أن تكون بين 0 و 100.');
            return;
        }
        setIsSaving(true);
        try {
            await updateSettings({ general: { company }, operational });
            toast.success("تم حفظ الإعدادات العامة.");
        } catch {
            toast.error("فشل حفظ الإعدادات العامة.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">الإعدادات العامة</h2>
                <button onClick={handleSave} disabled={isSaving} className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                    {isSaving ? 'جاري الحفظ...' : 'حفظ جميع التغييرات'}
                </button>
            </div>
            
            <SettingsSection title="بيانات المؤسسة الأساسية" icon={<Building2 size={20} />} description="اسم المؤسسة والمعلومات التعريفية التي تظهر في ترويسة المستندات المطبوعة">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField label="اسم المؤسسة" name="name" value={company.name} onChange={handleCompanyChange} placeholder="مثال: شركة النور العقارية" icon={<Building2 size={14} />} colSpan={2} />
                    <InputField label="رقم السجل التجاري" name="crNumber" value={company.crNumber || ''} onChange={handleCompanyChange} placeholder="مثال: 1234567" icon={<FileText size={14} />} />
                    <InputField label="الرقم الضريبي" name="taxNumber" value={company.taxNumber || ''} onChange={handleCompanyChange} placeholder="مثال: 300000000000003" icon={<Hash size={14} />} />
                </div>
            </SettingsSection>

            <SettingsSection title="بيانات الاتصال والعنوان" icon={<MapPin size={20} />} description="معلومات التواصل والعنوان التي تظهر في الترويسة والمستندات">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField label="العنوان الكامل" name="address" value={company.address} onChange={handleCompanyChange} placeholder="المدينة - الحي - الشارع" icon={<MapPin size={14} />} colSpan={2} />
                    <InputField label="رقم الهاتف الرئيسي" name="phone" value={company.phone} onChange={handleCompanyChange} placeholder="مثال: 0512345678" icon={<Phone size={14} />} />
                    <InputField label="رقم هاتف إضافي" name="phone2" value={company.phone2 || ''} onChange={handleCompanyChange} placeholder="اختياري" icon={<Phone size={14} />} />
                    <InputField label="البريد الإلكتروني" name="email" value={company.email || ''} onChange={handleCompanyChange} placeholder="info@company.com" icon={<Mail size={14} />} dir="ltr" />
                    <InputField label="الرمز البريدي" name="postalCode" value={company.postalCode || ''} onChange={handleCompanyChange} placeholder="مثال: 12345" icon={<Mail size={14} />} />
                </div>
            </SettingsSection>

            <SettingsSection title="إعدادات التشغيل والمالية" icon={<DollarSign size={20} />} description="العملة والضرائب وأيام التنبيه للعقود">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="text-xs font-medium text-text-muted flex items-center gap-1.5 mb-1">
                            <DollarSign size={14} />
                            العملة
                        </label>
                        <select name="currency" value={operational.currency} onChange={handleOperationalChange}>
                            <option value="OMR">ريال عماني (OMR)</option>
                            <option value="SAR">ريال سعودي (SAR)</option>
                            <option value="EGP">جنيه مصري (EGP)</option>
                        </select>
                    </div>
                     <div>
                        <label className="text-xs font-medium text-text-muted flex items-center gap-1.5 mb-1">
                            <Hash size={14} />
                            نسبة الضريبة (%)
                        </label>
                        <input type="number" name="taxRate" value={operational.taxRate} onChange={handleOperationalChange} min="0" max="100" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-text-muted flex items-center gap-1.5 mb-1">
                            <Clock size={14} />
                            أيام تنبيه انتهاء العقد
                        </label>
                        <input type="number" name="contractAlertDays" value={operational.contractAlertDays} onChange={handleOperationalChange} min="0" />
                    </div>
                </div>
            </SettingsSection>

            <SettingsSection title="إعدادات غرامات التأخير" icon={<AlertTriangle size={20} />} description="تطبيق غرامات تلقائية على المستأجرين المتأخرين في السداد">
                <div className="flex items-center gap-3 mb-3">
                    <input
                        type="checkbox"
                        id="lateFeeEnabled"
                        checked={operational.lateFee.isEnabled}
                        onChange={e => setOperational(prev => ({ ...prev, lateFee: { ...prev.lateFee, isEnabled: e.target.checked } }))}
                        className="w-4 h-4"
                    />
                    <label htmlFor="lateFeeEnabled" className="text-sm font-medium">تفعيل غرامات التأخير تلقائياً</label>
                </div>
                {operational.lateFee.isEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-200 dark:border-yellow-800/30">
                        <div>
                            <label className="text-xs font-medium text-text-muted">نوع الغرامة</label>
                            <select
                                value={operational.lateFee.type}
                                onChange={e => setOperational(prev => ({ ...prev, lateFee: { ...prev.lateFee, type: e.target.value as Settings['operational']['lateFee']['type'] } }))}
                            >
                                <option value="FIXED_AMOUNT">مبلغ ثابت</option>
                                <option value="PERCENTAGE_OF_RENT">نسبة من الإيجار (%)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-text-muted">
                                {operational.lateFee.type === 'FIXED_AMOUNT' ? 'قيمة الغرامة' : 'نسبة الغرامة (%)'}
                            </label>
                            <input
                                type="number"
                                value={operational.lateFee.value}
                                onChange={e => setOperational(prev => ({ ...prev, lateFee: { ...prev.lateFee, value: Number(e.target.value) } }))}
                                min="0"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-text-muted">أيام السماح قبل تطبيق الغرامة</label>
                            <input
                                type="number"
                                value={operational.lateFee.graceDays}
                                onChange={e => setOperational(prev => ({ ...prev, lateFee: { ...prev.lateFee, graceDays: Number(e.target.value) } }))}
                                min="0"
                            />
                        </div>
                    </div>
                )}
            </SettingsSection>

             <SettingsSection title="ترقيم المستندات" icon={<FileText size={20} />} description="بادئة مميزة لكل نوع مستند لتسهيل التمييز والتتبع">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <label className="text-xs font-medium text-text-muted">الفواتير</label>
                        <input name="invoicePrefix" value={operational.documentNumbering.invoicePrefix} onChange={handleDocumentNumberingChange} placeholder="INV-" dir="ltr" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-text-muted">سندات القبض</label>
                        <input name="receiptPrefix" value={operational.documentNumbering.receiptPrefix} onChange={handleDocumentNumberingChange} placeholder="REC-" dir="ltr" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-text-muted">المصروفات</label>
                        <input name="expensePrefix" value={operational.documentNumbering.expensePrefix} onChange={handleDocumentNumberingChange} placeholder="EXP-" dir="ltr" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-text-muted">العقود</label>
                        <input name="contractPrefix" value={operational.documentNumbering.contractPrefix} onChange={handleDocumentNumberingChange} placeholder="CNTR-" dir="ltr" />
                    </div>
                </div>
            </SettingsSection>

            <SettingsSection title="نوع التاريخ" icon={<Clock size={20} />} description="اختر بين التقويم الهجري والميلادي لعرض التواريخ في كل أنحاء التطبيق">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-medium text-text-muted flex items-center gap-1.5 mb-1">
                            <Clock size={14} />
                            نوع التقويم
                        </label>
                        <select 
                            name="calendarType" 
                            value={operational.calendarType || 'gregorian'} 
                            onChange={handleOperationalChange}
                        >
                            <option value="gregorian">التقويم الميلادي (Gregorian)</option>
                            <option value="hijri">التقويم الهجري (Hijri)</option>
                        </select>
                    </div>
                    <div className="flex items-end">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800/30 text-sm">
                            <p className="font-medium text-blue-900 dark:text-blue-200">
                                {operational.calendarType === 'hijri' ? 'التواريخ ستعرض بالصيغة الهجرية' : 'التواريخ ستعرض بالصيغة الميلادية'}
                            </p>
                            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                                يؤثر على جميع التواريخ في التطبيق والمستندات المطبوعة
                            </p>
                        </div>
                    </div>
                </div>
            </SettingsSection>

            <div className="pt-4 flex justify-end">
                <button onClick={handleSave} className="btn btn-primary px-8 py-3 text-base">حفظ جميع التغييرات</button>
            </div>
        </div>
    );
};

export default GeneralSettings;
