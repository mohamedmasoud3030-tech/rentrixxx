import React, { Suspense, lazy } from 'react';
import { ReportTab } from './ReportsSidebar';

const ReportsOverview = lazy(() => import('./views/ReportsOverview'));
const RentRoll = lazy(() => import('./views/RentRoll'));
const TrialBalance = lazy(() => import('./views/TrialBalance'));
const OwnerLedger = lazy(() => import('./views/OwnerLedger'));
const TenantStatement = lazy(() => import('./views/TenantStatement'));
const IncomeStatement = lazy(() => import('./views/IncomeStatement'));
const BalanceSheet = lazy(() => import('./views/BalanceSheet'));
const AgedReceivables = lazy(() => import('./views/AgedReceivables'));
const PropertyReport = lazy(() => import('./views/PropertyReport'));
const DailyCollectionReport = lazy(() => import('./views/DailyCollectionReport'));
const MaintenanceReport = lazy(() => import('./views/MaintenanceReport'));
const DepositsReport = lazy(() => import('./views/DepositsReport'));
const ExpensesReport = lazy(() => import('./views/ExpensesReport'));
const OverdueTenants = lazy(() => import('./views/OverdueTenants'));
const VacantUnits = lazy(() => import('./views/VacantUnits'));
const UtilitiesReport = lazy(() => import('./views/UtilitiesReport'));

const ReportsSkeleton: React.FC = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-8 w-48 rounded-lg bg-background" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div className="h-24 rounded-xl bg-background" />
      <div className="h-24 rounded-xl bg-background" />
      <div className="h-24 rounded-xl bg-background" />
    </div>
    <div className="h-72 rounded-xl bg-background" />
  </div>
);

export const ReportContentRenderer: React.FC<{ activeTab: ReportTab; currency: string }> = ({ activeTab, currency }) => {
  const content = (() => {
    switch (activeTab) {
      case 'overview': return <ReportsOverview currency={currency} />;
      case 'rent_roll': return <RentRoll />;
      case 'owner': return <OwnerLedger />;
      case 'tenant': return <TenantStatement />;
      case 'income_statement': return <IncomeStatement />;
      case 'balance_sheet': return <BalanceSheet />;
      case 'trial_balance': return <TrialBalance />;
      case 'aged_receivables': return <AgedReceivables />;
      case 'property_report': return <PropertyReport />;
      case 'daily_collection': return <DailyCollectionReport />;
      case 'maintenance_report': return <MaintenanceReport />;
      case 'deposits_report': return <DepositsReport />;
      case 'expenses_report': return <ExpensesReport />;
      case 'utilities_report': return <UtilitiesReport />;
      case 'overdue_tenants': return <OverdueTenants />;
      case 'vacant_units': return <VacantUnits />;
      default: return <ReportsOverview currency={currency} />;
    }
  })();

  return <Suspense fallback={<ReportsSkeleton />}>{content}</Suspense>;
};
