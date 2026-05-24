import { Printer } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { canPrintOperationalReport, runOperationalPrint } from '@/lib/operationalPrint';
import type { ArrearsBucketFilter } from './arrears-workflow-helpers';
import { ArrearsWorkflowSection } from './arrears-workflow-section';
import { getTodayLocalDateString } from '../financials-date-utils';
import { useAgedReceivablesReport, useArrearsSummaryReport, useOverdueInvoicesReport } from '../reports/useFinancialReports';

export function ArrearsWorkspaceSection() {
  const [arrearsAsOf, setArrearsAsOf] = useState(() => getTodayLocalDateString());
  const [arrearsSearch, setArrearsSearch] = useState('');
  const [arrearsBucketFilter, setArrearsBucketFilter] = useState<ArrearsBucketFilter>('all');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const arrearsReportFilters = useMemo(() => ({ asOf: arrearsAsOf }), [arrearsAsOf]);
  const overdueInvoicesReport = useOverdueInvoicesReport(arrearsReportFilters);
  const agedReceivablesReport = useAgedReceivablesReport(arrearsReportFilters);
  const arrearsSummaryReport = useArrearsSummaryReport(arrearsReportFilters);

  const isLoading = overdueInvoicesReport.isLoading || agedReceivablesReport.isLoading || arrearsSummaryReport.isLoading;
  const isError = overdueInvoicesReport.isError || agedReceivablesReport.isError || arrearsSummaryReport.isError;
  const error = overdueInvoicesReport.error ?? agedReceivablesReport.error ?? arrearsSummaryReport.error;

  const overdueRows = overdueInvoicesReport.data?.rows ?? [];
  const agedRows = agedReceivablesReport.data?.rows ?? [];
  const arrearsSummary = arrearsSummaryReport.data;
  const hasSummaryData = Boolean(arrearsSummary && (arrearsSummary.totalOverdue > 0 || arrearsSummary.overdueInvoiceCount > 0));
  const hasPrintData = overdueRows.length > 0 || agedRows.length > 0 || hasSummaryData;

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button variant="secondary" disabled={!canPrintOperationalReport(hasPrintData, isLoading, isError)} onClick={() => { const err = runOperationalPrint(hasPrintData, isLoading, isError, { title: 'ملخص المتأخرات', generatedAt: arrearsAsOf, summaryItems: arrearsSummary ? [{ label: 'إجمالي المتأخر', value: String(arrearsSummary.totalOverdue) }, { label: 'عدد الفواتير', value: String(arrearsSummary.overdueInvoiceCount) }] : [], tables: [{ title: 'فواتير متأخرة', columns: ['الفاتورة', 'المستأجر', 'المتبقي'], rows: overdueRows.slice(0, 40).map((row) => [row.shortInvoiceId, row.tenantName ?? '—', String(row.remainingAmount)]) }] }); if (err) globalThis.alert(err); }}><Printer className="ms-2 size-4" />طباعة ملخص المتأخرات</Button></div>
    <ArrearsWorkflowSection
      asOf={arrearsAsOf}
      search={arrearsSearch}
      bucketFilter={arrearsBucketFilter}
      overdueReport={overdueInvoicesReport.data}
      agedReceivablesReport={agedReceivablesReport.data}
      arrearsSummaryReport={arrearsSummaryReport.data}
      selectedInvoiceId={selectedInvoiceId}
      isLoading={isLoading}
      isError={isError}
      error={error}
      onAsOfChange={setArrearsAsOf}
      onSearchChange={setArrearsSearch}
      onBucketFilterChange={setArrearsBucketFilter}
      onSelectInvoice={setSelectedInvoiceId}
    />
    </div>
  );
}
