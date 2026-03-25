import React from 'react';
import { Routes, Route, Navigate, NavLink } from 'react-router-dom';
import Card from '../components/ui/Card';
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
import { Settings as SettingsIcon, Users, ShieldCheck, Zap, Bell, FileText, Calculator, Palette, Database, Bot, SearchCheck } from 'lucide-react';

const settingsSections = [
  { path: '/settings/general', label: 'عام', icon: SettingsIcon },
  { path: '/settings/users', label: 'المستخدمون', icon: Users },
  { path: '/settings/security', label: 'الأمان', icon: ShieldCheck },
  { path: '/settings/integrations', label: 'التكاملات', icon: Zap },
  { path: '/settings/notifications', label: 'الإشعارات', icon: Bell },
  { path: '/settings/documents', label: 'المستندات', icon: FileText },
  { path: '/settings/financial', label: 'مالي', icon: Calculator },
  { path: '/settings/appearance', label: 'المظهر', icon: Palette },
  { path: '/settings/backup', label: 'النسخ الاحتياطي', icon: Database },
  { path: '/settings/automation', label: 'الأتمتة', icon: Bot },
  { path: '/settings/integrity', label: 'سلامة البيانات', icon: SearchCheck },
];

const Settings: React.FC = () => {
  return (
    <Card>
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        <aside className="border border-border rounded-xl p-3 h-fit bg-background">
          <h3 className="text-sm font-black text-text-muted mb-2 px-2">الإعدادات</h3>
          <nav className="space-y-1">
            {settingsSections.map(section => (
              <NavLink
                key={section.path}
                to={section.path}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-bold transition ${
                    isActive ? 'bg-primary text-white' : 'text-text-muted hover:bg-card hover:text-text'
                  }`
                }
              >
                <section.icon size={16} />
                <span>{section.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="min-w-0">
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
            <Route path="*" element={<Navigate to="general" replace />} />
          </Routes>
        </main>
      </div>
    </Card>
  );
};

export default Settings;
