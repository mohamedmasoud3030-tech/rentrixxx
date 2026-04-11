import React, { useState } from 'react';
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import Card from '../components/ui/Card';
import {
    Settings as SettingsIcon, ShieldCheck, Database, Users, Bell,
    Palette, Zap, Bot, SearchCheck, Calculator, FileText,
    ChevronDown, ChevronUp, AlertTriangle, Lock
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import GeneralSettings from '../components/settings/GeneralSettings';
import AppearanceSettings from '../components/settings/AppearanceSettings';
import UsersSettings from '../components/settings/UsersSettings';
import NotificationsSettings from '../components/settings/NotificationsSettings';
import SecuritySettings from '../components/settings/SecuritySettings';
import BackupSettings from '../components/settings/BackupSettings';
import IntegrationsSettings from '../components/settings/IntegrationsSettings';
import FinancialSettings from '../components/settings/FinancialSettings';
import AutomationSettings from '../components/settings/AutomationSettings';
import DataIntegrityAudit from './DataIntegrityAudit';
import DocumentTemplatesSettings from '../components/settings/DocumentTemplatesSettings';
import { useApp } from '../contexts/AppContext';

interface SettingsSection {
    id: string;
    label: string;
    icon: LucideIcon;
    path: string;
    sensitive?: boolean;
}

const basicSections: SettingsSection[] = [
    { id: 'general', label: 'الإعدادات العامة', icon: SettingsIcon, path: '/settings/general' },
    { id: 'appearance', label: 'المظهر والتخصيص', icon: Palette, path: '/settings/appearance' },
    { id: 'documents', label: 'قوالب المستندات', icon: FileText, path: '/settings/documents' },
    { id: 'notifications', label: 'الإشعارات والقوالب', icon: Bell, path: '/settings/notifications' },
    { id: 'automation', label: 'الأتمتة', icon: Bot, path: '/settings/automation' },
];

const sensitiveSections: SettingsSection[] = [
    { id: 'financial', label: 'الإعدادات المالية', icon: Calculator, path: '/settings/financial', sensitive: true },
    { id: 'users', label: 'المستخدمون والصلاحيات', icon: Users, path: '/settings/users', sensitive: true },
    { id: 'security', label: 'الأمان والتحكم', icon: ShieldCheck, path: '/settings/security', sensitive: true },
    { id: 'integrations', label: 'التكاملات والربط', icon: Zap, path: '/settings/integrations', sensitive: true },
    { id: 'backup', label: 'النسخ الاحتياطي', icon: Database, path: '/settings/backup', sensitive: true },
    { id: 'integrity', label: 'سلامة البيانات', icon: SearchCheck, path: '/settings/integrity', sensitive: true },
];

const SectionLink: React.FC<{ section: SettingsSection }> = ({ section }) => (
    <NavLink
        to={section.path}
        className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2.5 font-semibold text-sm transition-all ${
                isActive
                    ? 'bg-primary text-white shadow-md'
                    : 'text-text-muted hover:bg-background hover:text-primary'
            }`
        }
    >
        <section.icon size={16} className="flex-shrink-0" />
        <span className="truncate">{section.label}</span>
        {section.sensitive && <Lock size={11} className="mr-auto opacity-50 flex-shrink-0" />}
    </NavLink>
);

const AdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { auth } = useApp();
    if (auth.currentUser?.role !== 'ADMIN') {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                <Lock size={40} className="text-amber-500" />
                <h3 className="text-lg font-bold">صلاحية غير كافية</h3>
                <p className="text-sm text-text-muted max-w-xs">هذا القسم مخصص للمديرين فقط. تواصل مع مدير النظام للحصول على الصلاحيات اللازمة.</p>
            </div>
        );
    }
    return <>{children}</>;
};

const Settings: React.FC = () => {
    const location = useLocation();
    const { auth } = useApp();
    const isAdmin = auth.currentUser?.role === 'ADMIN';
    const [showSensitive, setShowSensitive] = useState(() => {
        return sensitiveSections.some(s => location.pathname.startsWith(s.path));
    });

    return (
        <Card>
            <div className="flex flex-col md:flex-row gap-6">
                <aside className="md:w-56 lg:w-60 flex-shrink-0">
                    <h2 className="text-lg font-black mb-4 px-1">مركز التحكم</h2>

                    <nav className="flex flex-col gap-1 mb-4">
                        {basicSections.map(section => (
                            <SectionLink key={section.id} section={section} />
                        ))}
                    </nav>

                    {isAdmin && (
                        <>
                            <button
                                onClick={() => setShowSensitive(v => !v)}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 text-amber-700 dark:text-amber-400 text-xs font-bold mb-2 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all"
                            >
                                <AlertTriangle size={13} className="flex-shrink-0" />
                                <span className="flex-1 text-right">الإعدادات الحساسة</span>
                                {showSensitive ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </button>

                            {showSensitive && (
                                <div className="flex flex-col gap-1 border border-amber-200 dark:border-amber-800 rounded-lg p-2 bg-amber-50/50 dark:bg-amber-900/10">
                                    <p className="text-[10px] text-amber-600 dark:text-amber-400 px-1 mb-1 leading-tight">
                                        هذه الإعدادات تؤثر على البيانات المالية والأمان. تأكد قبل أي تغيير.
                                    </p>
                                    {sensitiveSections.map(section => (
                                        <SectionLink key={section.id} section={section} />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </aside>

                <main className="flex-1 min-w-0 border-r border-border pr-6">
                    <Routes>
                        <Route path="general" element={<GeneralSettings />} />
                        <Route path="financial" element={<AdminGuard><FinancialSettings /></AdminGuard>} />
                        <Route path="appearance" element={<AppearanceSettings />} />
                        <Route path="documents" element={<DocumentTemplatesSettings />} />
                        <Route path="users" element={<AdminGuard><UsersSettings /></AdminGuard>} />
                        <Route path="notifications" element={<NotificationsSettings />} />
                        <Route path="security" element={<AdminGuard><SecuritySettings /></AdminGuard>} />
                        <Route path="backup" element={<AdminGuard><BackupSettings /></AdminGuard>} />
                        <Route path="integrations" element={<AdminGuard><IntegrationsSettings /></AdminGuard>} />
                        <Route path="automation" element={<AutomationSettings />} />
                        <Route path="integrity" element={<AdminGuard><DataIntegrityAudit /></AdminGuard>} />
                        <Route index element={<Navigate to="general" replace />} />
                    </Routes>
                </main>
            </div>
        </Card>
    );
};

export default Settings;
