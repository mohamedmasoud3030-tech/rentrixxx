import React from 'react';
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import Card from '../components/ui/Card';
import { Settings as SettingsIcon, ShieldCheck, Database, FileSearch, Users, Bell, Palette, Zap, Bot, SearchCheck, Calculator, FileText } from 'lucide-react';
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


const settingsSections = [
    { id: 'general', label: 'الإعدادات العامة', icon: SettingsIcon, path: '/settings/general' },
    { id: 'financial', label: 'الإعدادات المالية', icon: Calculator, path: '/settings/financial' },
    { id: 'appearance', label: 'المظهر والتخصيص', icon: Palette, path: '/settings/appearance' },
    { id: 'documents', label: 'قوالب المستندات', icon: FileText, path: '/settings/documents' },
    { id: 'users', label: 'المستخدمون والصلاحيات', icon: Users, path: '/settings/users' },
    { id: 'notifications', label: 'الإشعارات والقوالب', icon: Bell, path: '/settings/notifications' },
    { id: 'security', label: 'الأمان والتحكم', icon: ShieldCheck, path: '/settings/security' },
    { id: 'backup', label: 'النسخ الاحتياطي', icon: Database, path: '/settings/backup' },
    { id: 'integrations', label: 'التكاملات والربط', icon: Zap, path: '/settings/integrations' },
    { id: 'automation', label: 'الأتمتة', icon: Bot, path: '/settings/automation' },
    { id: 'integrity', label: 'سلامة البيانات', icon: SearchCheck, path: '/settings/integrity' },
];

const Settings: React.FC = () => {
    const location = useLocation();

    return (
        <Card>
            <div className="flex flex-col md:flex-row gap-8">
                <aside className="md:w-1/4 lg:w-1/5 border-l border-border pl-4">
                    <h2 className="text-xl font-bold mb-6">مركز التحكم</h2>
                    <nav className="flex flex-col gap-2">
                        {settingsSections.map(section => (
                            <NavLink
                                key={section.id}
                                to={section.path}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 rounded-md px-4 py-2 font-semibold text-sm transition-all ${
                                        isActive
                                        ? 'bg-primary text-white shadow-md' 
                                        : 'text-text-muted hover:bg-background hover:text-primary'
                                    }`
                                }
                            >
                                <section.icon size={18} />
                                {section.label}
                            </NavLink>
                        ))}
                    </nav>
                </aside>
                <main className="flex-1 min-w-0">
                    <Routes>
                        <Route path="general" element={<GeneralSettings />} />
                        <Route path="financial" element={<FinancialSettings />} />
                        <Route path="appearance" element={<AppearanceSettings />} />
                        <Route path="documents" element={<DocumentTemplatesSettings />} />
                        <Route path="users" element={<UsersSettings />} />
                        <Route path="notifications" element={<NotificationsSettings />} />
                        <Route path="security" element={<SecuritySettings />} />
                        <Route path="backup" element={<BackupSettings />} />
                        <Route path="integrations" element={<IntegrationsSettings />} />
                        <Route path="automation" element={<AutomationSettings />} />
                        <Route path="integrity" element={<DataIntegrityAudit />} />
                        <Route index element={<Navigate to="general" replace />} />
                    </Routes>
                </main>
            </div>
        </Card>
    );
};

export default Settings;
