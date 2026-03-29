import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { toast } from 'react-hot-toast';
import { Settings } from '../../types';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { confirmDialog } from '../shared/confirmDialog';

type AccountMappings = Settings['accounting']['accountMappings'];

const FinancialSettings: React.FC = () => {
    const { db, settings, updateSettings } = useApp();
    const accounts = db.accounts || [];
    const expenses = db.expenses || [];
    const [isSaving, setIsSaving] = useState(false);

    const [mappings, setMappings] = useState<AccountMappings>(
        settings.accounting.accountMappings
    );

    useEffect(() => {
        setMappings(settings.accounting.accountMappings);
    }, [settings]);

    const leafAccounts = accounts.filter(a => !a.isParent);

    const accountMap = useMemo(() => {
        const map: Record<string, string> = {};
        for (const acc of accounts) { map[acc.id] = acc.name; }
        return map;
    }, [accounts]);

    const expenseCategories = useMemo(() => {
        const cats = new Set<string>();
        for (const e of expenses) { if (e.category) cats.add(e.category); }
        ['صيانة', 'عمولات موظفين'].forEach(c => cats.add(c));
        return Array.from(cats);
    }, [expenses]);

    const setTopLevel = <K extends 'accountsReceivable' | 'ownersPayable' | 'vatPayable' | 'vatReceivable'>(key: K, value: string) => {
        setMappings(prev => ({ ...prev, [key]: value }));
    };

    const setPaymentMethod = (key: keyof AccountMappings['paymentMethods'], value: string) => {
        setMappings(prev => ({ ...prev, paymentMethods: { ...prev.paymentMethods, [key]: value } }));
    };

    const setRevenue = (key: keyof AccountMappings['revenue'], value: string) => {
        setMappings(prev => ({ ...prev, revenue: { ...prev.revenue, [key]: value } }));
    };

    const setExpenseCategory = (key: string, value: string) => {
        setMappings(prev => ({ ...prev, expenseCategories: { ...prev.expenseCategories, [key]: value } }));
    };

    const missingMappings = useMemo(() => {
        const missing: string[] = [];
        const check = (label: string, val: string | undefined) => {
            if (!val) { missing.push(`${label}: غير محدد`); return; }
            if (!accountMap[val]) missing.push(`${label}: الحساب (${val}) غير موجود`);
        };
        check('ذمم المستأجرين', mappings.accountsReceivable);
        check('ذمم الملاك', mappings.ownersPayable);
        check('ضريبة القيمة المضافة (مستحق)', mappings.vatPayable);
        check('ضريبة القيمة المضافة (مدين)', mappings.vatReceivable);
        check('إيرادات الإيجار', mappings.revenue?.RENT);
        check('إيرادات عمولة المكتب', mappings.revenue?.OFFICE_COMMISSION);
        check('نقدي (صندوق)', mappings.paymentMethods?.CASH);
        check('تحويل بنكي', mappings.paymentMethods?.BANK);
        return missing;
    }, [mappings, accountMap]);

    const handleSave = async () => {
        if (isSaving) return;
        if (missingMappings.length > 0) {
            const confirmed = await confirmDialog({
                title: 'تأكيد الحفظ مع روابط ناقصة',
                message: `تحذير: يوجد ${missingMappings.length} ربط مفقود أو مكسور. هل تريد الحفظ على أي حال؟`,
                confirmLabel: 'حفظ على أي حال',
                tone: 'danger',
            });
            if (!confirmed) return;
        }
        setIsSaving(true);
        try {
            await updateSettings({ accounting: { accountMappings: mappings } });
            toast.success('تم حفظ إعدادات الحسابات.');
        } catch {
            toast.error('فشل حفظ إعدادات الحسابات.');
        } finally {
            setIsSaving(false);
        }
    };

    const AccountSelect: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => {
        const isMissing = value && !accountMap[value];
        return (
            <div>
                <label className="block text-xs font-medium text-text-muted mb-1">{label}</label>
                <select
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className={`w-full ${isMissing ? 'border-red-400' : ''}`}
                >
                    <option value="">-- اختر الحساب --</option>
                    {leafAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                            {acc.no} - {acc.name}
                        </option>
                    ))}
                </select>
                {isMissing && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertTriangle size={11} /> الحساب المربوط ({value}) غير موجود
                    </p>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">إعدادات الحسابات المالية</h2>

            {missingMappings.length > 0 ? (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                        <AlertTriangle size={18} className="text-red-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-bold text-red-700 dark:text-red-400 text-sm">تحذير: روابط محاسبية مفقودة أو مكسورة</p>
                            <ul className="mt-1 space-y-0.5">
                                {missingMappings.map((m, i) => (
                                    <li key={i} className="text-xs text-red-600 dark:text-red-400">• {m}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center gap-2 text-green-700 dark:text-green-400 text-sm">
                    <CheckCircle2 size={16} />
                    <span>جميع الروابط المحاسبية الأساسية صحيحة وتشير إلى حسابات موجودة.</span>
                </div>
            )}

            <div className="bg-background rounded-lg border border-border p-6 space-y-4">
                <h3 className="text-lg font-bold">طرق الدفع (الحسابات النقدية)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AccountSelect label="نقدي (صندوق)" value={mappings.paymentMethods.CASH} onChange={v => setPaymentMethod('CASH', v)} />
                    <AccountSelect label="تحويل بنكي" value={mappings.paymentMethods.BANK} onChange={v => setPaymentMethod('BANK', v)} />
                    <AccountSelect label="شبكة (POS)" value={mappings.paymentMethods.POS} onChange={v => setPaymentMethod('POS', v)} />
                    <AccountSelect label="شيك" value={mappings.paymentMethods.CHECK} onChange={v => setPaymentMethod('CHECK', v)} />
                    <AccountSelect label="أخرى" value={mappings.paymentMethods.OTHER} onChange={v => setPaymentMethod('OTHER', v)} />
                </div>
            </div>

            <div className="bg-background rounded-lg border border-border p-6 space-y-4">
                <h3 className="text-lg font-bold">حسابات الإيرادات</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AccountSelect label="إيرادات الإيجار" value={mappings.revenue.RENT} onChange={v => setRevenue('RENT', v)} />
                    <AccountSelect label="إيرادات عمولة المكتب" value={mappings.revenue.OFFICE_COMMISSION} onChange={v => setRevenue('OFFICE_COMMISSION', v)} />
                </div>
            </div>

            <div className="bg-background rounded-lg border border-border p-6 space-y-4">
                <h3 className="text-lg font-bold">الحسابات الختامية</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AccountSelect label="ذمم المستأجرين (الحسابات المدينة)" value={mappings.accountsReceivable} onChange={v => setTopLevel('accountsReceivable', v)} />
                    <AccountSelect label="ذمم الملاك (الحسابات الدائنة)" value={mappings.ownersPayable} onChange={v => setTopLevel('ownersPayable', v)} />
                    <AccountSelect label="ضريبة القيمة المضافة (مستحق)" value={mappings.vatPayable} onChange={v => setTopLevel('vatPayable', v)} />
                    <AccountSelect label="ضريبة القيمة المضافة (مدين)" value={mappings.vatReceivable} onChange={v => setTopLevel('vatReceivable', v)} />
                </div>
            </div>

            <div className="bg-background rounded-lg border border-border p-6 space-y-4">
                <h3 className="text-lg font-bold">تصنيفات المصروفات</h3>
                <p className="text-sm text-text-muted">ربط كل تصنيف مصروفات بالحساب المحاسبي المناسب. يتم توليد القائمة تلقائياً من المصروفات المسجّلة.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {expenseCategories.map(cat => (
                        <AccountSelect
                            key={cat}
                            label={cat}
                            value={mappings.expenseCategories[cat] || ''}
                            onChange={v => setExpenseCategory(cat, v)}
                        />
                    ))}
                    <AccountSelect
                        label="افتراضي (لباقي التصنيفات)"
                        value={mappings.expenseCategories.default || ''}
                        onChange={v => setExpenseCategory('default', v)}
                    />
                </div>
            </div>

            <div className="pt-4 flex justify-end">
                <button onClick={handleSave} disabled={isSaving} className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                    {isSaving ? 'جاري الحفظ...' : 'حفظ إعدادات الحسابات'}
                </button>
            </div>
        </div>
    );
};

export default FinancialSettings;
