import React from 'react';
import { useApp } from '../contexts/AppContext';
import ReportsDashboard from '../components/reports/ReportsDashboard';

const Reports: React.FC = () => {
  const { db, settings } = useApp();
  const currency = settings?.operational?.currency ?? 'OMR';
  const today = new Date().toISOString().slice(0, 10);
  const firstOfCurrentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [startDate, setStartDate] = React.useState(firstOfCurrentMonth);
  const [endDate, setEndDate] = React.useState(today);

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
    <div className="space-y-4">
      <div className="bg-surface-container-low border border-outline-variant/40 rounded-2xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-on-surface-variant mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-sm border border-outline-variant/40 rounded-xl px-3 py-2 bg-surface-container-high"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-sm border border-outline-variant/40 rounded-xl px-3 py-2 bg-surface-container-high"
            />
          </div>
        </div>
      </div>
      <ReportsDashboard
        currency={currency}
        owners={db.owners || []}
        contracts={contractsForDropdown}
        startDate={startDate}
        endDate={endDate}
      />
    </div>
  );
};

export default Reports;
