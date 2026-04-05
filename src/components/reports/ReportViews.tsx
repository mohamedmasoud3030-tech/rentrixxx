import React from 'react';
import { ReportTab } from './ReportsSidebar';
import ReportsOverview from './views/ReportsOverview';
import RentRoll from './views/RentRoll';
import TrialBalance from './views/TrialBalance';
import OwnerLedger from './views/OwnerLedger';
import TenantStatement from './views/TenantStatement';
import IncomeStatement from './views/IncomeStatement';
import BalanceSheet from './views/BalanceSheet';
import AgedReceivables from './views/AgedReceivables';
import PropertyReport from './views/PropertyReport';
import DailyCollectionReport from './views/DailyCollectionReport';
import MaintenanceReport from './views/MaintenanceReport';
import DepositsReport from './views/DepositsReport';
import ExpensesReport from './views/ExpensesReport';
import OverdueTenants from './views/OverdueTenants';
import VacantUnits from './views/VacantUnits';
import UtilitiesReport from './views/UtilitiesReport';

export const ReportContentRenderer: React.FC<{ activeTab: ReportTab; currency: string }> = ({ activeTab, currency }) => {
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
};
