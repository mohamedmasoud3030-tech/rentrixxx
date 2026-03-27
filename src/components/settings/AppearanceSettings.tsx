import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { toast } from 'react-hot-toast';
import { Settings } from '../../types';
import { supabase } from '../../services/supabase';

type Appearance = Settings['appearance'];

const MAX_FILE_SIZE_KB = 500;
const MAX_IMG_DIMENSION = 2000;

const validateImageDimensions = (file: File): Promise<boolean> => {
    return new Promise(resolve => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img.width <= MAX_IMG_DIMENSION && img.height <= MAX_IMG_DIMENSION);
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(false); };
        img.src = url;
    });
};

const uploadToStorage = async (file: File, path: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
        .from('company-assets')
        .upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
        console.error('[Storage] upload error:', error);
        return null;
    }
    const { data: urlData } = supabase.storage.from('company-assets').getPublicUrl(data.path);
    return urlData.publicUrl;
};

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
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [stampFile, setStampFile] = useState<File | null>(null);

    useEffect(() => {
        setAppearance(settings.appearance);
        setLogoFile(null);
        setStampFile(null);
    }, [settings.appearance]);

    const handleAppearanceChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setAppearance({ ...appearance, [e.target.name]: e.target.value });
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > MAX_FILE_SIZE_KB * 1024) {
            toast.error(`حجم الشعار كبير جداً. يرجى اختيار ملف أصغر من ${MAX_FILE_SIZE_KB} كيلوبايت.`);
            return;
        }
        const validDimensions = await validateImageDimensions(file);
        if (!validDimensions) {
            toast.error(`أبعاد الشعار كبيرة جداً. الحد الأقصى ${MAX_IMG_DIMENSION}×${MAX_IMG_DIMENSION} بكسل.`);
            return;
        }
        setLogoFile(file);
        const preview = await fileToBase64(file);
        setAppearance(prev => ({ ...prev, logoDataUrl: preview }));
    };

    const handleStampUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > MAX_FILE_SIZE_KB * 1024) {
            toast.error(`حجم الختم كبير جداً. يرجى اختيار ملف أصغر من ${MAX_FILE_SIZE_KB} كيلوبايت.`);
            return;
        }
        const validDimensions = await validateImageDimensions(file);
        if (!validDimensions) {
            toast.error(`أبعاد الختم كبيرة جداً. الحد الأقصى ${MAX_IMG_DIMENSION}×${MAX_IMG_DIMENSION} بكسل.`);
            return;
        }
        setStampFile(file);
        const preview = await fileToBase64(file);
        setAppearance(prev => ({ ...prev, stampDataUrl: preview }));
    };

    const handleSave = async () => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            let updatedAppearance = { ...appearance };

            if (logoFile) {
                const ext = logoFile.name.split('.').pop();
                const url = await uploadToStorage(logoFile, `logo.${ext}`);
                if (url) {
                    updatedAppearance = { ...updatedAppearance, logoDataUrl: url };
                } else {
                    toast.error('فشل رفع الشعار إلى التخزين السحابي. تأكد من إعداد Supabase Storage.');
                    setIsSaving(false);
                    return;
                }
            }

            if (stampFile) {
                const ext = stampFile.name.split('.').pop();
                const url = await uploadToStorage(stampFile, `stamp.${ext}`);
                if (url) {
                    updatedAppearance = { ...updatedAppearance, stampDataUrl: url };
                } else {
                    toast.error('فشل رفع الختم إلى التخزين السحابي. تأكد من إعداد Supabase Storage.');
                    setIsSaving(false);
                    return;
                }
            }

            await updateSettings({ appearance: updatedAppearance });
            toast.success('تم حفظ إعدادات المظهر.');
            setLogoFile(null);
            setStampFile(null);
        } catch (err: any) {
            toast.error('فشل حفظ إعدادات المظهر: ' + (err?.message || 'خطأ غير معروف'));
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
                        <input id="primaryColor" type="color" name="primaryColor" value={appearance.primaryColor} onChange={handleAppearanceChange} className="w-12 h-10 p-1" />
                        <span className="p-2 rounded-md" style={{ backgroundColor: appearance.primaryColor, color: '#fff' }}>{appearance.primaryColor}</span>
                    </div>
                </div>
            </div>

            <div className="bg-background rounded-lg border border-border p-6 space-y-4">
                <h3 className="text-lg font-bold text-text">شعار المؤسسة</h3>
                <p className="text-sm text-text-muted">سيظهر هذا الشعار في التقارير المطبوعة وبوابة المالك. الحد الأقصى: {MAX_FILE_SIZE_KB} كيلوبايت، {MAX_IMG_DIMENSION}×{MAX_IMG_DIMENSION} بكسل.</p>
                <div className="flex items-center gap-6">
                    {appearance.logoDataUrl && (
                        <img src={appearance.logoDataUrl} alt="شعار المؤسسة" className="h-20 w-auto bg-white p-2 rounded-md border border-border" />
                    )}
                    <div>
                        <input id="logo-upload" name="logo" type="file" accept="image/png, image/jpeg" onChange={handleLogoUpload} />
                        {logoFile && <p className="text-xs text-green-600 mt-1">تم اختيار: {logoFile.name} — سيُرفع عند الحفظ</p>}
                    </div>
                </div>
            </div>

            <div className="bg-background rounded-lg border border-border p-6 space-y-4">
                <h3 className="text-lg font-bold text-text">ختم المؤسسة</h3>
                <p className="text-sm text-text-muted">سيظهر هذا الختم في العقود والسندات المطبوعة. الحد الأقصى: {MAX_FILE_SIZE_KB} كيلوبايت، {MAX_IMG_DIMENSION}×{MAX_IMG_DIMENSION} بكسل.</p>
                <div className="flex items-center gap-6">
                    {appearance.stampDataUrl && (
                        <img src={appearance.stampDataUrl} alt="ختم المؤسسة" className="h-24 w-auto bg-white p-2 rounded-md border border-border" />
                    )}
                    <div>
                        <input id="stamp-upload" name="stamp" type="file" accept="image/png, image/jpeg" onChange={handleStampUpload} />
                        {stampFile && <p className="text-xs text-green-600 mt-1">تم اختيار: {stampFile.name} — سيُرفع عند الحفظ</p>}
                    </div>
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
