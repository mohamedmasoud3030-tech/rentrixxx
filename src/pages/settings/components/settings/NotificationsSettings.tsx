import React from 'react';
import { useApp } from '../../contexts/AppContext';

const NotificationsSettings: React.FC = () => {
    const { db, updateNotificationTemplate } = useApp();
    
    // In a real scenario, this would open a modal for editing.
    // For now, we'll just toggle the enabled status.
    const handleToggle = (id: string, isEnabled: boolean) => {
        updateNotificationTemplate(id, { isEnabled: !isEnabled });
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">قوالب الإشعارات</h2>
            {/* FIX: Removed backticks from the descriptive text to prevent JSX parsing errors. */}
            {/* FIX: Wrap string in curly braces and quotes to prevent JSX from parsing template variables. */}
            <p className="text-sm text-text-muted">
                {'قم بإدارة الرسائل التلقائية التي يرسلها النظام، مثل تذكيرات الإيجار المتأخر وتنبيهات انتهاء العقود. يمكنك استخدام متغيرات مثل "{tenantName}" و "{amountDue}" ليتم استبدالها تلقائياً.'}
            </p>

            <div className="space-y-4">
                {db.notificationTemplates.map(template => (
                    <div key={template.id} className="bg-background rounded-lg border border-border p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-text">{template.name}</h3>
                                {/* FIX: Correctly render the template string as text content. The previous implementation was incorrect. */}
                                <p className="text-sm text-text-muted mt-1 p-2 bg-card rounded-md">{template.template}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold">{template.isEnabled ? 'مفعّل' : 'معطّل'}</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={template.isEnabled} onChange={() => handleToggle(template.id, template.isEnabled)} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default NotificationsSettings;