import { CheckCircle2, Clock, ShieldAlert, ShieldCheck, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EntityCell } from '@/components/ui/entity-cell';
import { EntityTable, type ColumnDef } from '@/components/ui/entity-table';
import { Input } from '@/components/ui/input';
import { KpiCard } from '@/components/ui/kpi-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { useMockAuditEvents } from '@/hooks/use-mock-repositories';
import { usePendingActions, approveAction, rejectAction, type PendingActionRecord } from '@/services/mock-approvals';
import { useSimulatedRole } from '@/services/mock-role-simulator';
import { RoleSimulatorSection } from '@/features/settings/role-simulator-section';
import type { AuditEvent, UserRole } from '@/domain/types';

const roleBadgeMap: Record<UserRole, { tone: 'danger' | 'primary' | 'neutral' }> = {
  ADMIN: { tone: 'danger' },
  MANAGER: { tone: 'primary' },
  USER: { tone: 'neutral' },
};

export function Phase6AuditHubPage() {
  const currentRole = useSimulatedRole();
  const pendingActions = usePendingActions();
  const auditEvents = useMockAuditEvents().data;
  const [search, setSearch] = useState('');

  const filteredEvents = auditEvents.filter((ev: AuditEvent) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return ev.action.toLowerCase().includes(term) || ev.details.toLowerCase().includes(term) || ev.entityId.toLowerCase().includes(term);
  });

  const pendingCols: ColumnDef<PendingActionRecord>[] = [
    {
      key: 'title',
      header: 'الطلب الحساس',
      render: (p: PendingActionRecord) => <EntityCell icon={ShieldAlert} title={p.title} subtitle={`الكيان: ${p.entityType} (${p.entityId})`} />,
    },
    {
      key: 'reason',
      header: 'السبب والتاريخ',
      render: (p: PendingActionRecord) => (
        <div className="text-sm">
          <p className="font-bold">{p.reason}</p>
          <span dir="ltr" className="text-xs text-muted-foreground">{p.requestedAt}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'قرار المدير',
      render: (p: PendingActionRecord) => (
        <div className="flex gap-2">
          <Button onClick={() => approveAction(p.id)} className="min-h-9 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
            اعتماد التنفيذ
          </Button>
          <Button variant="danger" onClick={() => rejectAction(p.id)} className="min-h-9 px-3 text-xs">
            رفض
          </Button>
        </div>
      ),
    },
  ];

  const auditCols: ColumnDef<AuditEvent>[] = [
    {
      key: 'action',
      header: 'العملية',
      render: (a: AuditEvent) => <EntityCell icon={ShieldCheck} title={a.action} subtitle={`${a.entityType}: ${a.entityId}`} />,
    },
    {
      key: 'role',
      header: 'الموظف / الصلاحية',
      render: (a: AuditEvent) => {
        const tone = roleBadgeMap[a.role]?.tone ?? 'neutral';
        return <StatusBadge tone={tone}>{a.role}</StatusBadge>;
      },
    },
    {
      key: 'details',
      header: 'التفاصيل',
      render: (a: AuditEvent) => <p className="text-sm font-semibold">{a.details}</p>,
    },
    {
      key: 'time',
      header: 'التوقيت',
      render: (a: AuditEvent) => <span dir="ltr" className="text-xs text-muted-foreground font-mono">{a.timestamp}</span>,
    },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
          <ShieldCheck className="size-4" />
          المرحلة 6: محاكاة الصلاحيات، موافقات المديرين وسجل التدقيق
        </div>
        <h1 className="mt-2 text-3xl font-black">مركز الحوكمة وسجل التدقيق (Phase 6 Governance Hub)</h1>
        <p className="text-sm text-muted-foreground">تطبيق صلاحيات الموظفين (RBAC)، إدارة طابور موافقات المديرين وتدقيق كافة العمليات التشغيلية.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <RoleSimulatorSection />
        </CardContent>
      </Card>

      {currentRole === 'USER' ? (
        <Card className="border-rose-200 bg-rose-50/50 dark:border-rose-900 dark:bg-rose-950/20">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <ShieldAlert className="size-16 text-rose-600 mb-4" />
            <h2 className="text-2xl font-black text-rose-700 dark:text-rose-300">وصول مقيَّد (Restricted Access)</h2>
            <p className="mt-2 max-w-md text-sm font-bold text-rose-600/80 dark:text-rose-400">
              عفواً، يتطلب عرض سجل العمليات وطابور الموافقات الحساسة صلاحيات مدير أو مسؤول (MANAGER / ADMIN). دورك الحالي محاكٍ كموظف تشغيل (USER). استخدم محاكي الصلاحيات أعلاه للتبديل الفوري لـ MANAGER أو ADMIN.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <KpiCard label="طلبات حساسة بانتظار المدير" value={pendingActions.length} sub="طلبات فسخ أو إلغاء معلّقة" accent="amber" icon={Clock} />
            <KpiCard label="إجمالي حركات سجل التدقيق" value={auditEvents.length} sub="إجمالي الحركات الموثّقة" accent="primary" icon={ShieldCheck} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-black">طابور موافقات المديرين (Pending Manager Approvals)</CardTitle>
              <CardDescription>العمليات الحساسة المقيدة بالصلاحيات (كفسخ العقود أو عكس الدفعات) بانتظار اعتماد المدير</CardDescription>
            </CardHeader>
            <CardContent>
              <EntityTable<PendingActionRecord>
                aria-label="جدول الموافقات المعلقة"
                rows={pendingActions}
                keyOf={(p) => p.id}
                emptyTitle="لا توجد طلبات معلقة بانتظار الاعتماد"
                emptyDescription="كافة حركات المكتب معتمدة حالياً."
                columns={pendingCols}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-xl font-black">سجل عمليات المكتب (Frontend Audit Log)</CardTitle>
                <CardDescription>توثيق محلي غير قابل للمسح لجميع حركات المستخدمين</CardDescription>
              </div>
              <div className="w-full sm:w-72">
                <Input placeholder="بحث في السجل..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </CardHeader>
            <CardContent>
              <EntityTable<AuditEvent>
                aria-label="جدول سجل التدقيق"
                rows={filteredEvents}
                keyOf={(a) => a.id}
                emptyTitle="لا توجد حركات في السجل"
                emptyDescription="قم بإجراء أي حركة في النظام."
                columns={auditCols}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
