import React, { useMemo, useEffect, useState } from 'react';
import { useApp } from '../../../contexts/AppContext';
import Card from '../../ui/Card';
import { formatCurrency, formatDate } from '../../../utils/helpers';
import {
  FileText, BarChart3, TrendingUp, Wallet, TrendingDown, Users,
  PieChart, ArrowUp, ArrowDown, Banknote, Percent,
  Building2, CalendarRange, Filter, Zap
} from 'lucide-react';
import { UtilityRecord, UtilityType, UTILITY_TYPE_AR, UTILITY_ICON } from '../../../types';
import PrintPreviewModal from '../../shared/PrintPreviewModal';
import { ActionBar, CHART_COLORS, MiniKpi, ReportPrintableContent, SectionHeader } from '../ReportPrimitives';
import {
  exportRentRollToPdf, exportOwnerLedgerToPdf, exportTenantStatementToPdf,
  exportIncomeStatementToPdf, exportTrialBalanceToPdf, exportBalanceSheetToPdf,
  exportAgedReceivablesToPdf, exportDailyCollectionToPdf, exportExpensesReportToPdf,
  exportDepositsReportToPdf, exportMaintenanceReportToPdf, exportOverdueTenantsToPdf,
  exportVacantUnitsToPdf, exportUtilitiesReportToPdf, exportPropertyReportToPdf
} from '../../../services/pdfService';
import { calculateBalanceSheetData, calculateIncomeStatementData, calculateAgedReceivables } from '../../../services/accountingService';
import { startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, isWithinInterval, format, eachMonthOfInterval } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart as RechartsPie, Pie, Cell, Legend, AreaChart, Area,
  LineChart, Line
} from 'recharts';
import { ReportTab } from './ReportsSidebar';

interface OwnerLedgerTransaction {
  date: string;
  details: string;
  type: 'receipt' | 'expense' | 'settlement';
  gross: number;
  officeShare: number;
  net: number;
}

interface BalanceSheetLine {
  no: string;
  name: string;
  isParent: boolean;
  balance: number;
  children: BalanceSheetLine[];
}


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
