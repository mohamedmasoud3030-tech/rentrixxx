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

  const hasPrintData = (overdueInvoicesReport.data?.rows?.length ?? 0) > 0;

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button variant="secondary" disabled={!canPrintOperationalReport(hasPrintData, isLoading, isError)} onClick={() => { const err = runOperationalPrint(hasPrintData, isLoading, isError); if (err) globalThis.alert(err); }}><Printer className="ms-2 size-4" />طباعة ملخص المتأخرات</Button></div>
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
