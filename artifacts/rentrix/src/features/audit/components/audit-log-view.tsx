import { ShieldCheck } from 'lucide-react';
import { DataErrorScreen } from '@/components/data-error-screen';
import { EmptyState } from '@/components/empty-state';
import { RouteLoadingState } from '@/components/loading-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { AuditLogResult } from '../types';

export type AuditLogViewState =
  | Readonly<{ status: 'loading' }>
  | Readonly<{ status: 'error'; error: unknown }>
  | Readonly<{ status: 'ready'; result: AuditLogResult }>;

function formatAuditDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('ar-OM');
}

export function AuditLogView({ state }: Readonly<{ state: AuditLogViewState }>) {
  if (state.status === 'loading') return <RouteLoadingState />;

  if (state.status === 'error') {
    return <DataErrorScreen title="تعذر تحميل سجل التدقيق" fallbackMessage="يمكن إعادة المحاولة لاحقاً دون تغيير أي بيانات." error={state.error} />;
  }

  if (state.result.status === 'unavailable') {
    return <EmptyState title="سجل التدقيق غير متاح بأمان" description={state.result.reason} role="alert" ariaLive="assertive" />;
  }

  if (state.result.records.length === 0) {
    return <EmptyState title="لا توجد أحداث تدقيق" description="لم يرجع مصدر سجل التدقيق أي أحداث للعرض." />;
  }

  return (
    <section className="space-y-4">
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary" />سجل التدقيق</CardTitle>
          <CardDescription>عرض قراءة فقط لأحداث الحوكمة المتاحة من مصدر التدقيق الحالي.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-muted/70 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-right font-black">الوقت</th>
                  <th className="px-4 py-3 text-right font-black">المستخدم</th>
                  <th className="px-4 py-3 text-right font-black">الإجراء</th>
                  <th className="px-4 py-3 text-right font-black">النطاق</th>
                  <th className="px-4 py-3 text-right font-black">الوصف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {state.result.records.map((record) => (
                  <tr key={record.id}>
                    <td className="px-4 py-3 font-bold">{formatAuditDate(record.occurredAt)}</td>
                    <td className="px-4 py-3">{record.actor}</td>
                    <td className="px-4 py-3"><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-black text-primary">{record.action}</span></td>
                    <td className="px-4 py-3 text-muted-foreground">{record.entityType}{record.entityId ? ` / ${record.entityId}` : ''}</td>
                    <td className="px-4 py-3 text-muted-foreground">{record.description ?? 'لا يوجد وصف'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

