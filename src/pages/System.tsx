import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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

const Settings: React.FC = () => {
  return (
    <Card>
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
        </Routes>
      </main>
    </Card>
  );
};

export default Settings;
