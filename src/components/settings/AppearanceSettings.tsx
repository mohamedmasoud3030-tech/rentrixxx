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

    useEffect(() => {
        setAppearance(settings.appearance);
    }, [settings.appearance]);

    const handleAppearanceChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setAppearance({ ...appearance, [e.target.name]: e.target.value });
    };
    
    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 500 * 1024) { // 500 KB limit
                toast.error("حجم الشعار كبير جداً. يرجى اختيار ملف أصغر من 500 كيلوبايت.");
                return;
            }
            const logoDataUrl = await fileToBase64(file);
            setAppearance(prev => ({...prev, logoDataUrl}));
        }
    };

    const handleSave = () => {
        updateSettings({ appearance });
        toast.success("تم حفظ إعدادات المظهر.");
    };
    
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">المظهر والتخصيص</h2>
            
             <div className="bg-background rounded-lg border border-border p-6 space-y-4">
                <h3 className="text-lg font-bold text-text">السمة واللون الأساسي</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div>
                        <label className="text-xs font-medium text-text-muted">السمة (Theme)</label>
                        <select name="theme" value={appearance.theme} onChange={handleAppearanceChange}>
                            <option value="light">فاتح</option>
                            <option value="dark">داكن</option>
                        </select>
                    </div>
                     <div className="flex items-center gap-4">
                        <label className="text-xs font-medium text-text-muted">اللون الأساسي</label>
                        <input type="color" name="primaryColor" value={appearance.primaryColor} onChange={handleAppearanceChange} className="w-12 h-10 p-1"/>
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
                    <input type="file" accept="image/png, image/jpeg" onChange={handleLogoUpload} />
                </div>
            </div>

            <div className="pt-4 flex justify-end">
                <button onClick={handleSave} className="btn btn-primary">حفظ التغييرات</button>
            </div>
        </div>
    );
};

export default AppearanceSettings;
