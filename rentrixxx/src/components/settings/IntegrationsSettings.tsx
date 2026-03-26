import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { toast } from 'react-hot-toast';

const IntegrationsSettings: React.FC = () => {
    const { settings, updateSettings } = useApp();
    const [integrations, setIntegrations] = useState(settings.integrations);

    useEffect(() => {
        setIntegrations(settings.integrations);
    }, [settings.integrations]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setIntegrations({ ...integrations, [e.target.name]: e.target.value });
    };

    const handleSave = () => {
        updateSettings({ integrations });
        toast.success("تم حفظ إعدادات التكامل.");
    };
    
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">التكاملات والربط الخارجي</h2>

            <div className="bg-background rounded-lg border border-border p-6 space-y-4">
                <h3 className="text-lg font-bold text-text">Google Gemini AI</h3>
                <p className="text-sm text-text-muted">
                    أضف مفتاح API الخاص بك من Google AI Studio لتفعيل المساعد الذكي في النظام.
                </p>
                <div>
                    <label className="text-xs font-medium text-text-muted">Gemini API Key</label>
                    <input
                        type="password"
                        name="geminiApiKey"
                        value={integrations.geminiApiKey}
                        onChange={handleChange}
                        placeholder="ادخل مفتاح API هنا"
                    />
                </div>
            </div>
            
            <div className="bg-background rounded-lg border border-border p-6 space-y-4 opacity-50">
                <h3 className="text-lg font-bold text-text">Google Drive Sync (قريباً)</h3>
                <p className="text-sm text-text-muted">
                    قم بربط حسابك في Google Drive لتمكين النسخ الاحتياطي السحابي التلقائي.
                </p>
                 <div>
                    <label className="text-xs font-medium text-text-muted">Google Client ID</label>
                    <input
                        name="googleClientId"
                        value={integrations.googleClientId || ''}
                        onChange={handleChange}
                        placeholder="مطلوب لتفعيل المزامنة"
                        disabled
                    />
                </div>
            </div>

            <div className="pt-4 flex justify-end">
                <button onClick={handleSave} className="btn btn-primary">حفظ الإعدادات</button>
            </div>
        </div>
    );
};

export default IntegrationsSettings;
