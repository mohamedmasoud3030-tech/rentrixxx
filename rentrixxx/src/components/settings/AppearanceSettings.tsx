import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { toast } from 'react-hot-toast';
import { Settings } from '../../types';

type Appearance = Settings['appearance'];

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const AppearanceSettings: React.FC = () => {
    const { settings, updateSettings } = useApp();
    const [appearance, setAppearance] = useState<Appearance>(settings.appearance || { theme: 'light', primaryColor: '#B8860B' });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setAppearance(settings.appearance);
    }, [settings.appearance]);

    const handleAppearanceChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setAppearance({ ...appearance, [e.target.name]: e.target.value });
    };
    
    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 500 * 1024) {
                toast.error("حجم الشعار كبير جداً. يرجى اختيار ملف أصغر من 500 كيلوبايت.");
                return;
            }
            const logoDataUrl = await fileToBase64(file);
            setAppearance(prev => ({...prev, logoDataUrl}));
        }
    };

    const handleStampUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 500 * 1024) {
                toast.error("حجم الختم كبير جداً. يرجى اختيار ملف أصغر من 500 كيلوبايت.");
                return;
            }
            const stampDataUrl = await fileToBase64(file);
            setAppearance(prev => ({...prev, stampDataUrl}));
        }
    };

    const handleSave = async () => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            await updateSettings({ appearance });
            toast.success("تم حفظ إعدادات المظهر.");
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">المظهر والتخصيص</h2>
            
             <div className="bg-background rounded-lg border border-border p-6 space-y-4">
                <h3 className="text-lg font-bold text-text">السمة واللون الأساسي</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div>
                        <label htmlFor="theme" className="text-xs font-medium text-text-muted">السمة (Theme)</label>
                        <select id="theme" name="theme" value={appearance.theme} onChange={handleAppearanceChange}>
                            <option value="light">فاتح</option>
                            <option value="dark">داكن</option>
                        </select>
                    </div>
                     <div className="flex items-center gap-4">
                        <label htmlFor="primaryColor" className="text-xs font-medium text-text-muted">اللون الأساسي</label>
                        <input id="primaryColor" type="color" name="primaryColor" value={appearance.primaryColor} onChange={handleAppearanceChange} className="w-12 h-10 p-1"/>
                        <span className="p-2 rounded-md" style={{ backgroundColor: appearance.primaryColor, color: '#fff' }}>{appearance.primaryColor}</span>
                    </div>
                </div>
             </div>

             <div className="bg-background rounded-lg border border-border p-6 space-y-4">
                <h3 className="text-lg font-bold text-text">شعار المؤسسة</h3>
                <p className="text-sm text-text-muted">سيظهر هذا الشعار في التقارير المطبوعة وبوابة المالك.</p>
                <div className="flex items-center gap-6">
                    {appearance.logoDataUrl && (
                        <img src={appearance.logoDataUrl} alt="شعار المؤسسة" className="h-20 w-auto bg-white p-2 rounded-md border border-border"/>
                    )}
                    <input id="logo-upload" name="logo" type="file" accept="image/png, image/jpeg" onChange={handleLogoUpload} />
                </div>
            </div>

             <div className="bg-background rounded-lg border border-border p-6 space-y-4">
                <h3 className="text-lg font-bold text-text">ختم المؤسسة</h3>
                <p className="text-sm text-text-muted">سيظهر هذا الختم في العقود والسندات المطبوعة.</p>
                <div className="flex items-center gap-6">
                    {appearance.stampDataUrl && (
                        <img src={appearance.stampDataUrl} alt="ختم المؤسسة" className="h-24 w-auto bg-white p-2 rounded-md border border-border"/>
                    )}
                    <input id="stamp-upload" name="stamp" type="file" accept="image/png, image/jpeg" onChange={handleStampUpload} />
                </div>
            </div>

            <div className="pt-4 flex justify-end">
                <button onClick={handleSave} disabled={isSaving} className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                    {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </button>
            </div>
        </div>
    );
};

export default AppearanceSettings;
