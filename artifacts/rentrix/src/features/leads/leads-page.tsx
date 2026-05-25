import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useCreateLead, useLeads, useUpdateLead } from './use-leads';
import { leadStatusLabels, leadStatusValues } from './leads-schema';

export function LeadsPage() {
  const leadsQuery = useLeads();
  const createMutation = useCreateLead();
  const updateMutation = useUpdateLead();
  const [fullName, setFullName] = useState('');

  const onCreate = async () => {
    if (!fullName.trim()) return;
    await createMutation.mutateAsync({ full_name: fullName.trim(), status: 'new' });
    setFullName('');
  };

  return <div className="space-y-6" dir="rtl">
    <div>
      <h2 className="text-xl font-black">العملاء المحتملون</h2>
      <p className="text-sm text-muted-foreground">وحدة مستقلة لإدارة العملاء المحتملين دون دمجها مع الأشخاص أو الملاك أو المستأجرين.</p>
    </div>

    <div className="grid gap-2 rounded border p-4 md:grid-cols-[1fr_auto]">
      <input className="rounded border px-2 py-2" placeholder="الاسم الكامل" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      <Button type="button" onClick={onCreate} disabled={createMutation.isPending}>{createMutation.isPending ? 'جارٍ الحفظ...' : 'إضافة عميل'}</Button>
    </div>

    {leadsQuery.isLoading ? <div className="space-y-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div> : null}
    {leadsQuery.isError ? <EmptyState title="تعذر تحميل العملاء المحتملين" description="حدث خطأ غير متوقع أثناء تحميل البيانات." action={<Button onClick={() => leadsQuery.refetch()}>إعادة المحاولة</Button>} /> : null}
    {!leadsQuery.isLoading && !leadsQuery.isError && (leadsQuery.data?.length ?? 0) === 0 ? <EmptyState title="لا توجد عملاء محتملون" description="أضف أول عميل محتمل لبدء المتابعة." /> : null}

    {!leadsQuery.isLoading && !leadsQuery.isError && (leadsQuery.data?.length ?? 0) > 0 ? <div className="space-y-2">
      {leadsQuery.data?.map((lead) => <div key={lead.id} className="rounded border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-black">{lead.full_name}</p>
            <p className="text-xs text-muted-foreground">{lead.phone ?? lead.email ?? 'بدون بيانات تواصل'}</p>
          </div>
          <select
            className="rounded border px-2 py-1"
            value={lead.status}
            onChange={(e) => updateMutation.mutate({ leadId: lead.id, payload: { status: e.target.value as (typeof leadStatusValues)[number] } })}
            disabled={updateMutation.isPending}
          >
            {leadStatusValues.map((status) => <option key={status} value={status}>{leadStatusLabels[status]}</option>)}
          </select>
        </div>
      </div>)}
    </div> : null}
  </div>;
}

export default LeadsPage;
