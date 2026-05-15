import { useMemo, useState } from 'react';
import { ArrearsWorkflowSection } from '../components/arrears-workflow-section';
import type { ArrearsBucketFilter } from '../components/arrears-workflow-helpers';
import { getTodayLocalDateString } from '../financials-date-utils';
import { useAgedReceivablesReport, useArrearsSummaryReport, useOverdueInvoicesReport } from '../reports/useFinancialReports';

export function ArrearsPage() {
  const [arrearsAsOf, setArrearsAsOf] = useState(() => getTodayLocalDateString());
  const [arrearsSearch, setArrearsSearch] = useState('');
  const [arrearsBucketFilter, setArrearsBucketFilter] = useState<ArrearsBucketFilter>('all');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const arrearsReportFilters = useMemo(() => ({ asOf: arrearsAsOf }), [arrearsAsOf]);
  const {
    data: overdueInvoicesReport,
    isLoading: isOverdueInvoicesReportLoading,
    isError: isOverdueInvoicesReportError,
    error: overdueInvoicesReportError,
  } = useOverdueInvoicesReport(arrearsReportFilters);
  const {
    data: agedReceivablesReport,
    isLoading: isAgedReceivablesReportLoading,
    isError: isAgedReceivablesReportError,
    error: agedReceivablesReportError,
  } = useAgedReceivablesReport(arrearsReportFilters);
  const {
    data: arrearsSummaryReport,
    isLoading: isArrearsSummaryReportLoading,
    isError: isArrearsSummaryReportError,
    error: arrearsSummaryReportError,
  } = useArrearsSummaryReport(arrearsReportFilters);

  const isArrearsWorkflowLoading = isOverdueInvoicesReportLoading || isAgedReceivablesReportLoading || isArrearsSummaryReportLoading;
  const isArrearsWorkflowError = isOverdueInvoicesReportError || isAgedReceivablesReportError || isArrearsSummaryReportError;
  const arrearsWorkflowError = overdueInvoicesReportError ?? agedReceivablesReportError ?? arrearsSummaryReportError;

  return (
    <div className="space-y-6" dir="rtl">
      <ArrearsWorkflowSection
        asOf={arrearsAsOf}
        search={arrearsSearch}
        bucketFilter={arrearsBucketFilter}
        overdueReport={overdueInvoicesReport}
        agedReceivablesReport={agedReceivablesReport}
        arrearsSummaryReport={arrearsSummaryReport}
        selectedInvoiceId={selectedInvoiceId}
        isLoading={isArrearsWorkflowLoading}
        isError={isArrearsWorkflowError}
        error={arrearsWorkflowError}
        onAsOfChange={setArrearsAsOf}
        onSearchChange={setArrearsSearch}
        onBucketFilterChange={setArrearsBucketFilter}
        onSelectInvoice={setSelectedInvoiceId}
      />
    </div>
  );
}
