import React from 'react';
import { useApp } from '../contexts/AppContext';
import ReportsDashboard from '../components/reports/ReportsDashboard';

const Reports: React.FC = () => {
  const { db, settings } = useApp();
  const currency = settings?.operational?.currency ?? 'OMR';

  // Build contracts list with tenant + unit names for dropdowns
  const contractsForDropdown = (db.contracts || []).map(c => {
    const tenant = db.tenants?.find(t => t.id === c.tenantId);
    const unit   = db.units?.find(u => u.id === c.unitId);
    return {
      id:          c.id,
      tenant_name: tenant?.name ?? '—',
      unit_name:   unit?.name   ?? '—',
      start_date:  c.start,
    };
  });

  return (
    <ReportsDashboard
      currency={currency}
      owners={db.owners || []}
      contracts={contractsForDropdown}
    />
  );
};

export default Reports;
