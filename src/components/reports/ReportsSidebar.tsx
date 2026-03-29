import React from 'react';
import Card from '../ui/Card';
import { ChevronLeft } from 'lucide-react';

export type ReportTab =
  | 'overview'
  | 'rent_roll'
  | 'owner'
  | 'tenant'
  | 'income_statement'
  | 'balance_sheet'
  | 'trial_balance'
  | 'aged_receivables'
  | 'property_report'
  | 'daily_collection'
  | 'maintenance_report'
  | 'deposits_report'
  | 'expenses_report'
  | 'utilities_report'
  | 'overdue_tenants'
  | 'vacant_units';

export interface ReportGroup {
  label: string;
  items: { id: ReportTab; label: string; icon: React.ReactNode }[];
}

interface ReportsSidebarProps {
  sidebarCollapsed: boolean;
  onToggleCollapse: () => void;
  activeTab: ReportTab;
  reportGroups: ReportGroup[];
  onTabChange: (tab: ReportTab) => void;
}

const ReportsSidebar: React.FC<ReportsSidebarProps> = ({
  sidebarCollapsed,
  onToggleCollapse,
  activeTab,
  reportGroups,
  onTabChange,
}) => {
  return (
    <Card className={`flex-shrink-0 transition-all duration-300 ${sidebarCollapsed ? 'w-12' : 'w-56'} self-start sticky top-4`}>
      <div className="flex items-center justify-between p-3 border-b border-border">
        {!sidebarCollapsed && <span className="text-xs font-black text-text-muted uppercase tracking-wide">التقارير</span>}
        <button onClick={onToggleCollapse} className="p-1 rounded hover:bg-background text-text-muted" title="طي القائمة">
          <ChevronLeft size={16} className={`transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>
      <nav className="py-2">
        {reportGroups.map(group => (
          <div key={group.label} className="mb-2">
            {!sidebarCollapsed && (
              <p className="px-3 py-1 text-[10px] font-black text-text-muted uppercase tracking-widest opacity-60">{group.label}</p>
            )}
            {group.items.map(item => (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                title={sidebarCollapsed ? item.label : undefined}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-semibold transition-all rounded-lg mx-1 ${
                  activeTab === item.id
                    ? 'bg-primary text-white'
                    : 'text-text-muted hover:bg-background hover:text-text'
                } ${sidebarCollapsed ? 'justify-center' : ''}`}
                style={{ width: 'calc(100% - 8px)' }}
              >
                {item.icon}
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            ))}
          </div>
        ))}
      </nav>
    </Card>
  );
};

export default ReportsSidebar;
