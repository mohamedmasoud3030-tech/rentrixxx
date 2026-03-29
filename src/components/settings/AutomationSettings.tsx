import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { 
    getAutomationConfig, 
    saveAutomationConfig, 
    getAutomationRunLog, 
    getLastRunDate,
    AutomationTaskConfig,
    AutomationRunResult
} from '../../services/automationService';
import { Play, ToggleLeft, ToggleRight, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

const formatTs = (ts: number): string => {
    return new Date(ts).toLocaleString('ar-EG', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};

const ResultBadge: React.FC<{ value: number | boolean; label: string }> = ({ value, label }) => {
    const isNum = typeof value === 'number';
    const active = isNum ? value > 0 : value;
    return (
        <span className={`px-2 py-1 rounded text-xs font-bold ${active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {label}: {isNum ? value : (value ? '✓' : '—')}
        </span>
    );
};

const AutomationSettings: React.FC = () => {
    const { runManualAutomation } = useApp();
    const [config, setConfig] = useState<AutomationTaskConfig>(getAutomationConfig());
    const [runLog, setRunLog] = useState<AutomationRunResult[]>(getAutomationRunLog());
    const [loading, setLoading] = useState(false);
    const lastRunDate = getLastRunDate();

    const taskLabels: { key: keyof AutomationTaskConfig; label: string; desc: string }[] = [
        { key: 'invoices', label: 'توليد الفواتير الشهرية', desc: 'ينشئ فواتير الإيجار للشهر الحالي للعقود النشطة التي لا تملك فاتورة بعد.' },
        { key: 'lateFees', label: 'تطبيق غرامات التأخير', desc: 'يطبق غرامات التأخير على الفواتير المتأخرة وفق إعدادات النظام.' },
        { key: 'notifications', label: 'توليد الإشعارات التلقائية', desc: 'ينشئ إشعارات لانتهاء العقود والأرصدة المتأخرة.' },
        { key: 'snapshots', label: 'إعادة بناء اللقطات المالية', desc: 'يعيد حساب جميع اللقطات المالية من دفتر اليومية.' },
    ];

    const handleToggle = (key: keyof AutomationTaskConfig) => {
        const newConfig = { ...config, [key]: !config[key] };
        setConfig(newConfig);
        saveAutomationConfig(newConfig);
    };

    const handleRunNow = async () => {
        setLoading(true);
        try {
            const result = await runManualAutomation();
            setRunLog(getAutomationRunLog());
            const total = result.invoicesCreated + result.lateFeesApplied + result.notificationsCreated;
            if (result.error) {
                toast.error(`حدث خطأ: ${result.error}`);
            } else if (total > 0) {
                toast.success(`اكتمل التشغيل: ${result.invoicesCreated} فاتورة، ${result.lateFeesApplied} غرامة، ${result.notificationsCreated} إشعار`);
            } else {
                toast.success('اكتمل التشغيل. لم تكن هناك مهام جديدة.');
            }
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'حدث خطأ.';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold mb-1">إعدادات الأتمتة</h2>
                <p className="text-text-muted text-sm">تُشغَّل المهام تلقائياً مرة واحدة يومياً عند تسجيل الدخول.</p>
            </div>

            {lastRunDate && (
                <div className="flex items-center gap-2 text-sm text-text-muted bg-background rounded-lg px-4 py-3 border border-border">
                    <Clock size={16} />
                    <span>آخر تشغيل تلقائي: {lastRunDate}</span>
                </div>
            )}

            <div className="space-y-3">
                {taskLabels.map(task => (
                    <div key={task.key} className="flex items-start gap-4 p-4 border border-border rounded-lg bg-card">
                        <button
                            onClick={() => handleToggle(task.key)}
                            className={`mt-0.5 flex-shrink-0 transition-colors ${config[task.key] ? 'text-primary' : 'text-text-muted'}`}
                        >
                            {config[task.key] ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                        </button>
                        <div className="flex-1">
                            <p className="font-bold text-sm">{task.label}</p>
                            <p className="text-xs text-text-muted mt-0.5">{task.desc}</p>
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded ${config[task.key] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {config[task.key] ? 'مفعّل' : 'موقوف'}
                        </span>
                    </div>
                ))}
            </div>

            <div className="flex justify-end">
                <button
                    onClick={handleRunNow}
                    disabled={loading}
                    className="btn btn-primary flex items-center gap-2"
                >
                    <Play size={16} />
                    {loading ? 'جاري التشغيل...' : 'تشغيل الآن'}
                </button>
            </div>

            <div>
                <h3 className="text-lg font-bold mb-3">سجل آخر 10 تشغيلات</h3>
                {runLog.length === 0 ? (
                    <div className="text-center py-8 text-text-muted border border-border rounded-lg">
                        لم يتم تشغيل الأتمتة بعد.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {runLog.map((run, i) => (
                            <div key={i} className={`p-4 border rounded-lg ${run.error ? 'border-red-300 bg-red-50 dark:bg-red-900/10' : 'border-border bg-card'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        {run.error ? (
                                            <AlertCircle size={16} className="text-red-500" />
                                        ) : (
                                            <CheckCircle size={16} className="text-green-500" />
                                        )}
                                        <span className="font-bold text-sm">{formatTs(run.ts)}</span>
                                    </div>
                                    {i === 0 && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">الأحدث</span>}
                                </div>
                                {run.error ? (
                                    <p className="text-red-600 text-sm">{run.error}</p>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        <ResultBadge value={run.invoicesCreated} label="فواتير" />
                                        <ResultBadge value={run.lateFeesApplied} label="غرامات" />
                                        <ResultBadge value={run.notificationsCreated} label="إشعارات" />
                                        <ResultBadge value={run.snapshotsRebuilt} label="لقطات" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AutomationSettings;
