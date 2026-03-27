import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { NotificationTemplate } from '../../types';
import Modal from '../ui/Modal';
import { Edit2 } from 'lucide-react';

const TemplateEditor: React.FC<{
    template: NotificationTemplate;
    onClose: () => void;
    onSave: (id: string, updates: Partial<NotificationTemplate>) => Promise<void>;
}> = ({ template, onClose, onSave }) => {
    const [name, setName] = useState(template.name);
    const [text, setText] = useState(template.template);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!text.trim()) return;
        setIsSaving(true);
        try {
            await onSave(template.id, { name, template: text });
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    const preview = text
        .replace(/{tenantName}/g, 'أحمد السيد')
        .replace(/{amountDue}/g, '250.000')
        .replace(/{unitName}/g, 'شقة A101')
        .replace(/{dueDate}/g, new Date().toLocaleDateString('ar-EG'));

    return (
        <Modal isOpen={true} onClose={onClose} title={`تعديل القالب: ${template.name}`}>
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">اسم القالب</label>
                    <input value={name} onChange={e => setName(e.target.value)} className="w-full" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">نص الرسالة</label>
                    <p className="text-xs text-text-muted mb-1">
                        {'المتغيرات المتاحة: {tenantName} · {amountDue} · {unitName} · {dueDate}'}
                    </p>
                    <textarea
                        value={text}
                        onChange={e => setText(e.target.value)}
                        rows={5}
                        className="w-full border border-border rounded-lg p-3 text-sm bg-background resize-y"
                        dir="rtl"
                    />
                </div>
                <div>
                    <p className="text-xs font-medium text-text-muted mb-1">معاينة الرسالة</p>
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm whitespace-pre-wrap text-text" dir="rtl">
                        {preview}
                    </div>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t">
                    <button type="button" onClick={onClose} className="btn btn-ghost">إلغاء</button>
                    <button type="button" onClick={handleSave} disabled={isSaving} className="btn btn-primary disabled:opacity-50">
                        {isSaving ? 'جاري الحفظ...' : 'حفظ القالب'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const NotificationsSettings: React.FC = () => {
    const { db, updateNotificationTemplate } = useApp();
    const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);

    const handleToggle = (id: string, isEnabled: boolean) => {
        updateNotificationTemplate(id, { isEnabled: !isEnabled });
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">قوالب الإشعارات</h2>
            <p className="text-sm text-text-muted">
                {'قم بإدارة الرسائل التلقائية التي يرسلها النظام. يمكنك استخدام متغيرات مثل "{tenantName}" و "{amountDue}" ليتم استبدالها تلقائياً.'}
            </p>

            <div className="space-y-4">
                {db.notificationTemplates.map(template => (
                    <div key={template.id} className="bg-background rounded-lg border border-border p-4">
                        <div className="flex justify-between items-start gap-4">
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-text">{template.name}</h3>
                                <p className="text-sm text-text-muted mt-1 p-2 bg-card rounded-md truncate">{template.template}</p>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                                <button
                                    onClick={() => setEditingTemplate(template)}
                                    className="text-primary text-xs flex items-center gap-1 hover:underline"
                                    title="تعديل القالب"
                                >
                                    <Edit2 size={13} /> تعديل
                                </button>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold">{template.isEnabled ? 'مفعّل' : 'معطّل'}</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={template.isEnabled}
                                            onChange={() => handleToggle(template.id, template.isEnabled)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {editingTemplate && (
                <TemplateEditor
                    template={editingTemplate}
                    onClose={() => setEditingTemplate(null)}
                    onSave={updateNotificationTemplate}
                />
            )}
        </div>
    );
};

export default NotificationsSettings;
