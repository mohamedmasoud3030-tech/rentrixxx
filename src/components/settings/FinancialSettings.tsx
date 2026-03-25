import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { toast } from 'react-hot-toast';
import { Settings } from '../../types';

type AccountMappings = Settings['accounting']['accountMappings'];

const FinancialSettings: React.FC = () => {
    const { db, settings, updateSettings } = useApp();
    const accounts = db.accounts || [];

    const [mappings, setMappings] = useState<AccountMappings>(
        settings.accounting.accountMappings
    );

    useEffect(() => {
        setMappings(settings.accounting.accountMappings);
    }, [settings]);

    const leafAccounts = accounts.filter(a => !a.isParent);

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

    const handleSave = async () => {
        await updateSettings({ accounting: { accountMappings: mappings } });
        toast.success('تم حفظ إعدادات الحسابات.');
    };

    const AccountSelect: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
        <div>
            <label className="block text-xs font-medium text-text-muted mb-1">{label}</label>
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                className="w-full"
            >
                <option value="">-- اختر الحساب --</option>
                {leafAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                        {acc.no} - {acc.name}
                    </option>
                ))}
            </select>
        </div>
    );

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">إعدادات الحسابات المالية</h2>

            <div className="bg-background rounded-lg border border-border p-6 space-y-4">
                <h3 className="text-lg font-bold">طرق الدفع (الحسابات النقدية)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AccountSelect label="نقدي (صندوق)" value={mappings.paymentMethods.CASH} onChange={v => setPaymentMethod('CASH', v)} />
                    <AccountSelect label="تحويل بنكي" value={mappings.paymentMethods.BANK} onChange={v => setPaymentMethod('BANK', v)} />
                    <AccountSelect label="شبكة (POS)" value={mappings.paymentMethods.POS} onChange={v => setPaymentMethod('POS', v)} />
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
                <p className="text-sm text-text-muted">ربط كل تصنيف مصروفات بالحساب المحاسبي المناسب.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AccountSelect label="صيانة" value={mappings.expenseCategories['صيانة'] || ''} onChange={v => setExpenseCategory('صيانة', v)} />
                    <AccountSelect label="عمولات موظفين" value={mappings.expenseCategories['عمولات موظفين'] || ''} onChange={v => setExpenseCategory('عمولات موظفين', v)} />
                    <AccountSelect label="افتراضي (لباقي التصنيفات)" value={mappings.expenseCategories.default} onChange={v => setExpenseCategory('default', v)} />
                </div>
            </div>

            <div className="pt-4 flex justify-end">
                <button onClick={handleSave} className="btn btn-primary">حفظ إعدادات الحسابات</button>
            </div>
        </div>
    );
};

export default FinancialSettings;
