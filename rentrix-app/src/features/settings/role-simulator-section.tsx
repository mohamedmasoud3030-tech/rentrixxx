import { Cog, ShieldCheck, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { useSimulatedRole, setSimulatedRole } from '@/services/mock-role-simulator';
import type { UserRole } from '@/domain/types';

const roleMeta: Record<UserRole, { label: string; desc: string; tone: 'danger' | 'primary' | 'neutral' }> = {
  ADMIN: { label: 'مسؤول نظام (ADMIN)', desc: 'صلاحيات كاملة للوصول لجميع الصفحات وسجل التدقيق وتنفيذ الإجراءات فوراً.', tone: 'danger' },
  MANAGER: { label: 'مدير مكتب (MANAGER)', desc: 'إدارة قوالب المكتب واعتماد طلبات الفسخ في طابور الموافقات الحساسة.', tone: 'primary' },
  USER: { label: 'موظف تشغيل (USER)', desc: 'صلاحيات محدودة؛ العمليات الحساسة كفسخ العقود تُحال لطابور موافقات المديرين.', tone: 'neutral' },
};

export function RoleSimulatorSection() {
  const currentRole = useSimulatedRole();
  const meta = roleMeta[currentRole];

  return (
    <div className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-start" dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary" />
          <h3 className="text-base font-black text-foreground">محاكي الصلاحيات وأدوار الموظفين (Phase 6 RBAC Simulator)</h3>
        </div>
        <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
      </div>

      <p className="text-xs font-semibold leading-relaxed text-muted-foreground">
        {meta.desc}
      </p>

      <div className="flex flex-wrap items-center gap-2 pt-2">
        <span className="text-xs font-bold text-foreground me-2">التبديل الفوري للدور المحاكٍ:</span>
        <Button
          variant={currentRole === 'ADMIN' ? 'danger' : 'secondary'}
          onClick={() => setSimulatedRole('ADMIN')}
          className="min-h-9 px-3 text-xs"
        >
          ADMIN (مسؤول)
        </Button>
        <Button
          variant={currentRole === 'MANAGER' ? 'primary' : 'secondary'}
          onClick={() => setSimulatedRole('MANAGER')}
          className="min-h-9 px-3 text-xs"
        >
          MANAGER (مدير)
        </Button>
        <Button
          variant={currentRole === 'USER' ? 'outline' : 'secondary'}
          onClick={() => setSimulatedRole('USER')}
          className="min-h-9 px-3 text-xs"
        >
          USER (موظف)
        </Button>
      </div>
    </div>
  );
}
