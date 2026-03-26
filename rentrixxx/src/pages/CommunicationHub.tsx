
import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { OutgoingNotification } from '../types';
import Card from '../components/ui/Card';
import { getStatusBadgeClass, sanitizePhoneNumber } from '../utils/helpers';
import { Send, MessageSquare, Copy, Check, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

const CommunicationHub: React.FC = () => {
    // FIX: Use dataService for data manipulation
    const { db, generateNotifications, dataService } = useApp();
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerate = async () => {
        setIsLoading(true);
        const count = await generateNotifications();
        toast.success(`تم توليد ${count} إشعار جديد.`);
        setIsLoading(false);
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('تم نسخ الرسالة.');
    };

    const handleMarkAsSent = async (id: string) => {
        await dataService.update('outgoingNotifications', id, { status: 'SENT' });
    };

    const handleSendWhatsApp = (notification: OutgoingNotification) => {
        const phone = sanitizePhoneNumber(notification.recipientContact);
        if (!phone) {
            toast.error('رقم هاتف المستلم غير صالح.');
            return;
        }
        const text = encodeURIComponent(notification.message);
        const url = `https://wa.me/${phone}?text=${text}`;
        window.open(url, '_blank');
        // Optimistically mark as sent
        handleMarkAsSent(notification.id);
    };

    const notifications = useMemo(() => {
        return [...db.outgoingNotifications].sort((a,b) => b.createdAt - a.createdAt);
    }, [db.outgoingNotifications]);

    return (
        <Card>
            <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <MessageSquare />
                    مركز التواصل
                </h2>
                <button 
                    onClick={handleGenerate} 
                    disabled={isLoading}
                    className="bg-primary text-white px-4 py-2 rounded-md disabled:bg-slate-400 flex items-center gap-2"
                >
                    <Send size={16} />
                    {isLoading ? 'جاري التوليد...' : 'توليد الإشعارات'}
                </button>
            </div>
            <p className="text-sm text-text-muted mb-6">
                يقوم النظام بالبحث عن الفواتير المتأخرة والعقود التي قاربت على الانتهاء لإنشاء رسائل تذكيرية جاهزة.
            </p>

            <div className="space-y-4">
                {notifications.map(n => (
                    <div key={n.id} className="border border-border rounded-lg p-4">
                        <div className="flex justify-between items-start gap-4">
                            <div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(n.status === 'SENT' ? 'PAID' : 'UNPAID')}`}>
                                        {n.status === 'PENDING' ? 'جاهز للإرسال' : 'تم الإرسال'}
                                    </span>
                                    <span className="font-bold">{n.recipientName}</span>
                                    <span className="text-sm text-text-muted font-mono">{n.recipientContact}</span>
                                </div>
                                <p className="mt-2 text-sm bg-background p-3 rounded-md">{n.message}</p>
                            </div>
                            <div className="flex items-center flex-wrap justify-end gap-2 flex-shrink-0">
                                <button onClick={() => handleSendWhatsApp(n)} className="text-xs flex items-center gap-1 bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 px-2 py-1 rounded-md">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                                    إرسال واتساب
                                </button>
                                {n.status === 'PENDING' && (
                                     <button onClick={() => handleMarkAsSent(n.id)} className="text-xs flex items-center gap-1 bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-200 px-2 py-1 rounded-md">
                                        <Check size={14} /> تأشير كمرسل
                                    </button>
                                )}
                                <button onClick={() => handleCopy(n.message)} className="text-xs flex items-center gap-1 bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 px-2 py-1 rounded-md">
                                    <Copy size={14} /> نسخ
                                </button>
                                <button onClick={async () => await dataService.remove('outgoingNotifications', n.id)} className="text-xs flex items-center gap-1 text-red-500 hover:text-red-700">
                                     <Trash2 size={14} /> حذف
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
                 {notifications.length === 0 && (
                    <div className="text-center py-10">
                        <p className="text-text-muted">لا توجد إشعارات حاليًا.</p>
                        <p className="text-sm text-text-muted">اضغط على "توليد الإشعارات" للبدء.</p>
                    </div>
                )}
            </div>
        </Card>
    );
};

export default CommunicationHub;
