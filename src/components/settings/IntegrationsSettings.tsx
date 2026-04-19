import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { toast } from 'react-hot-toast';
import { supabase } from '../../services/supabase';

const IntegrationsSettings: React.FC = () => {
    const { settings, updateSettings } = useApp();
    const [integrations, setIntegrations] = useState(settings.integrations);
    const [isSaving, setIsSaving] = useState(false);
    const [tenantId, setTenantId] = useState('');
    const [apiKeyName, setApiKeyName] = useState('Default API Key');
    const [createdApiKey, setCreatedApiKey] = useState('');
    const [usageMetrics, setUsageMetrics] = useState<Array<{ metric_code: string; total_quantity: number; events_count: number; usage_month: string }>>([]);

    useEffect(() => {
        setIntegrations(settings.integrations);
    }, [settings.integrations]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setIntegrations({ ...integrations, [e.target.name]: e.target.value });
    };

    const handleSave = async () => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            await updateSettings({ integrations });
            toast.success("تم حفظ إعدادات التكامل.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreateApiKey = async () => {
        if (!tenantId.trim()) {
            toast.error('Tenant ID مطلوب لإنشاء API Key.');
            return;
        }
        const { data, error } = await supabase.rpc('platform_create_api_key', {
            p_tenant_id: tenantId,
            p_name: apiKeyName,
            p_role: 'ADMIN',
            p_scopes: ['receipts:write', 'invoices:write', 'contracts:write', 'ledger:read', 'reports:read', 'ledger:write'],
        });
        if (error) {
            toast.error(error.message || 'فشل إنشاء API Key');
            return;
        }
        const payload = data as { api_key?: string };
        setCreatedApiKey(payload?.api_key || '');
        toast.success('تم إنشاء API Key جديد.');
    };

    const loadUsageMetrics = async () => {
        if (!tenantId.trim()) return;
        const { data, error } = await supabase.rpc('platform_get_usage_metrics', {
            p_tenant_id: tenantId,
        });
        if (error) {
            toast.error(error.message || 'فشل تحميل استخدام المنصة');
            return;
        }
        const usage = (data as { usage?: Array<{ metric_code: string; total_quantity: number; events_count: number; usage_month: string }> })?.usage || [];
        setUsageMetrics(usage);
    };
    
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">التكاملات والربط الخارجي</h2>

            <div className="bg-background rounded-lg border border-border p-6 space-y-4">
                <h3 className="text-lg font-bold text-text">Google Gemini AI</h3>
                <p className="text-sm text-text-muted">
                    تم نقل التكامل إلى Proxy آمن على الخادم. إدارة المفتاح تتم عبر متغيرات البيئة الخلفية فقط.
                </p>
                <div>
                    <label className="text-xs font-medium text-text-muted">Gemini API Key (Server Managed)</label>
                    <input
                        type="password"
                        name="geminiApiKey"
                        value={integrations.geminiApiKey ? '********' : ''}
                        onChange={() => undefined}
                        placeholder="Managed on backend"
                        disabled
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

            <div className="bg-background rounded-lg border border-border p-6 space-y-4">
                <h3 className="text-lg font-bold text-text">Platform API Management</h3>
                <div className="grid md:grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs font-medium text-text-muted">Tenant ID</label>
                        <input value={tenantId} onChange={(e) => setTenantId(e.target.value)} placeholder="UUID" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-text-muted">Key Name</label>
                        <input value={apiKeyName} onChange={(e) => setApiKeyName(e.target.value)} />
                    </div>
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-primary" onClick={handleCreateApiKey}>إنشاء API Key</button>
                    <button className="btn btn-secondary" onClick={loadUsageMetrics}>تحميل الاستخدام</button>
                </div>
                {createdApiKey && (
                    <div className="rounded border border-amber-300 bg-amber-50 p-3 text-xs">
                        <p className="font-bold mb-1">API Key (اعرضه مرة واحدة):</p>
                        <code className="break-all">{createdApiKey}</code>
                    </div>
                )}
                {usageMetrics.length > 0 && (
                    <div className="overflow-x-auto border border-border rounded-lg">
                        <table className="w-full text-xs">
                            <thead className="bg-background/60">
                                <tr>
                                    <th className="px-3 py-2 text-right">Metric</th>
                                    <th className="px-3 py-2 text-right">Quantity</th>
                                    <th className="px-3 py-2 text-right">Events</th>
                                    <th className="px-3 py-2 text-right">Month</th>
                                </tr>
                            </thead>
                            <tbody>
                                {usageMetrics.map((item, idx) => (
                                    <tr key={`${item.metric_code}-${idx}`} className="border-t border-border">
                                        <td className="px-3 py-2">{item.metric_code}</td>
                                        <td className="px-3 py-2" dir="ltr">{item.total_quantity}</td>
                                        <td className="px-3 py-2" dir="ltr">{item.events_count}</td>
                                        <td className="px-3 py-2">{new Date(item.usage_month).toLocaleDateString('ar-SA')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="pt-4 flex justify-end">
                <button onClick={handleSave} disabled={isSaving} className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                    {isSaving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                </button>
            </div>
        </div>
    );
};

export default IntegrationsSettings;
