import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { BarChart3, TrendingUp, Wallet, TrendingDown, Users, Banknote, CalendarRange, Filter, Building2, Zap, ChevronLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ReportContentRenderer } from '../components/reports/ReportViews';
import ReportsSidebar, { ReportGroup, ReportTab } from '../components/reports/ReportsSidebar';

const Reports: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useApp();
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [activeTab, setActiveTab] = useState<ReportTab>(queryParams.get('tab') as ReportTab || 'overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const currency = settings.operational?.currency ?? 'OMR';

  const handleTabChange = (tab: ReportTab) => {
    setActiveTab(tab);
    navigate(`/reports?tab=${tab}`, { replace: true });
  };

  const reportGroups: ReportGroup[] = [
    {
      label: 'عام',
      items: [
        { id: 'overview', label: 'نظرة عامة', icon: <BarChart3 size={15} /> },
      ],
    },
    {
      label: 'التقارير المالية',
      items: [
        { id: 'income_statement', label: 'قائمة الدخل', icon: <TrendingUp size={15} /> },
        { id: 'balance_sheet', label: 'الميزانية العمومية', icon: <Wallet size={15} /> },
        { id: 'trial_balance', label: 'ميزان المراجعة', icon: <Filter size={15} /> },
        { id: 'aged_receivables', label: 'أعمار الديون', icon: <CalendarRange size={15} /> },
        { id: 'daily_collection', label: 'كشف التحصيل اليومي', icon: <Banknote size={15} /> },
        { id: 'expenses_report', label: 'تقرير المصروفات', icon: <TrendingDown size={15} /> },
        { id: 'deposits_report', label: 'تقرير التأمينات', icon: <Wallet size={15} /> },
      ],
    },
    {
      label: 'تقارير الإيجار',
      items: [
        { id: 'rent_roll', label: 'قائمة الإيجارات', icon: <Building2 size={15} /> },
        { id: 'owner', label: 'كشف حساب المالك', icon: <Users size={15} /> },
        { id: 'tenant', label: 'كشف حساب المستأجر', icon: <Users size={15} /> },
        { id: 'property_report', label: 'تقرير عقار', icon: <Building2 size={15} /> },
      ],
    },
    {
      label: 'تقارير التشغيل',
      items: [
        { id: 'maintenance_report', label: 'تقرير الصيانة', icon: <Filter size={15} /> },
        { id: 'utilities_report', label: 'تقرير المرافق', icon: <Zap size={15} /> },
        { id: 'overdue_tenants', label: 'المتأخرون عن الدفع', icon: <TrendingDown size={15} /> },
        { id: 'vacant_units', label: 'الوحدات الشاغرة', icon: <Building2 size={15} /> },
      ],
    },
  ];

  const activeLabel = reportGroups.flatMap(g => g.items).find(i => i.id === activeTab)?.label || '';

  return (
    <div className="flex gap-4 items-start">
      <ReportsSidebar
        sidebarCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(c => !c)}
        activeTab={activeTab}
        reportGroups={reportGroups}
        onTabChange={handleTabChange}
      />

      <div className="flex-1 min-w-0">
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xs text-text-muted">التقارير</span>
          <ChevronLeft size={12} className="text-text-muted" />
          <span className="text-sm font-bold text-text">{activeLabel}</span>
        </div>
        <ReportContentRenderer activeTab={activeTab} currency={currency} />
      </div>
    </div>
  );
};



export default Reports;
