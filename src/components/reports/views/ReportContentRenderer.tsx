import React from 'react';
import { ReportTab } from '../ReportsSidebar';
import ReportsOverview from './ReportsOverview';
import RentRoll from './RentRoll';
import OwnerLedger from './OwnerLedger';
import TenantStatement from './TenantStatement';
import IncomeStatement from './IncomeStatement';
import BalanceSheet from './BalanceSheet';
import TrialBalance from './TrialBalance';
import AgedReceivables from './AgedReceivables';
import PropertyReport from './PropertyReport';
import DailyCollectionReport from './DailyCollectionReport';
import MaintenanceReport from './MaintenanceReport';
import DepositsReport from './DepositsReport';
import ExpensesReport from './ExpensesReport';
import UtilitiesReport from './UtilitiesReport';
import OverdueTenants from './OverdueTenants';
import VacantUnits from './VacantUnits';

const ReportContentRenderer: React.FC<{ activeTab: ReportTab; currency: string }> = ({ activeTab, currency }) => {
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

export default ReportContentRenderer;
