import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { toast } from 'react-hot-toast';
import { Settings } from '../../types';

type GeneralCompany = Settings['general']['company'];
type Operational = Settings['operational'];

const SettingsSection: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-background rounded-lg border border-border p-6">
        <h3 className="text-lg font-bold mb-4 text-text">{title}</h3>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

const GeneralSettings: React.FC = () => {
    const { settings, updateSettings } = useApp();
    const [company, setCompany] = useState<GeneralCompany>(settings.general.company);
    const [operational, setOperational] = useState<Operational>(settings.operational);

    useEffect(() => {
        setCompany(settings.general.company);
        setOperational(settings.operational);
    }, [settings]);

    const handleCompanyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCompany({ ...company, [e.target.name]: e.target.value });
    };

    const handleOperationalChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setOperational(prev => ({ ...prev, [parent]: { ...(prev as any)[parent], [child]: type === 'number' ? Number(value) : value } }));
        } else {
            setOperational(prev => ({ ...prev, [name]: type === 'number' ? Number(value) : value }));
        }
    };
    
    const handleDocumentNumberingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
         setOperational(prev => ({ ...prev, documentNumbering: { ...prev.documentNumbering, [name]: value } }));
    };

    const handleSave = () => {
        updateSettings({ general: { company }, operational });
        toast.success("تم حفظ الإعدادات العامة.");
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">الإعدادات العامة</h2>
            
            <SettingsSection title="معلومات المؤسسة">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input placeholder="اسم المؤسسة" name="name" value={company.name} onChange={handleCompanyChange} />
                    <input placeholder="الهاتف" name="phone" value={company.phone} onChange={handleCompanyChange} />
                    <input className="md:col-span-2" placeholder="العنوان" name="address" value={company.address} onChange={handleCompanyChange} />
                    <input placeholder="رقم السجل التجاري" name="crNumber" value={company.crNumber || ''} onChange={handleCompanyChange} />
                    <input placeholder="الرقم الضريبي" name="taxNumber" value={company.taxNumber || ''} onChange={handleCompanyChange} />
                </div>
            </SettingsSection>
            
            <SettingsSection title="إعدادات التشغيل والمالية">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="text-xs font-medium text-text-muted">العملة</label>
                        <select name="currency" value={operational.currency} onChange={handleOperationalChange}><option value="OMR">ريال عماني</option><option value="SAR">ريال سعودي</option></select>
                    </div>
                     <div>
                        <label className="text-xs font-medium text-text-muted">نسبة الضريبة (%)</label>
                        <input type="number" name="taxRate" value={operational.taxRate} onChange={handleOperationalChange} placeholder="الضريبة %" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-text-muted">أيام تنبيه انتهاء العقد</label>
                        <input type="number" name="contractAlertDays" value={operational.contractAlertDays} onChange={handleOperationalChange} placeholder="أيام التنبيه" />
                    </div>
                </div>
            </SettingsSection>

             <SettingsSection title="ترقيم المستندات">
                <p className="text-sm text-text-muted">أضف بادئة (Prefix) مميزة لكل نوع من المستندات لتسهيل تمييزها.</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <label className="text-xs font-medium text-text-muted">الفواتير</label>
                        <input name="invoicePrefix" value={operational.documentNumbering.invoicePrefix} onChange={handleDocumentNumberingChange} placeholder="INV-" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-text-muted">سندات القبض</label>
                        <input name="receiptPrefix" value={operational.documentNumbering.receiptPrefix} onChange={handleDocumentNumberingChange} placeholder="REC-" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-text-muted">المصروفات</label>
                        <input name="expensePrefix" value={operational.documentNumbering.expensePrefix} onChange={handleDocumentNumberingChange} placeholder="EXP-" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-text-muted">العقود</label>
                        <input name="contractPrefix" value={operational.documentNumbering.contractPrefix} onChange={handleDocumentNumberingChange} placeholder="CNTR-" />
                    </div>
                </div>
            </SettingsSection>

            <div className="pt-4 flex justify-end">
                <button onClick={handleSave} className="btn btn-primary">حفظ جميع التغييرات</button>
            </div>
        </div>
    );
};

export default GeneralSettings;
