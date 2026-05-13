import React from 'react';
import AuditLog from '@/ui/AuditLog';

const SecuritySettings: React.FC = () => {
    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold mb-2">الأمان والتحكم</h2>
                <p className="text-sm text-text-muted">
                    مراقبة شاملة لجميع الأنشطة وفحص سلامة البيانات لضمان استقرار النظام وأمانه.
                </p>
            </div>

            <div className="border-t border-border pt-6">
                <AuditLog />
            </div>
        </div>
    );
};

export default SecuritySettings;
