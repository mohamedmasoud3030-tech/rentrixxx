import { Link } from '@tanstack/react-router';
import { KeyRound, ListChecks, SearchCheck, Settings, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { canAccess, type AppPermission } from '@/features/auth/permissions';
import { useAuth } from '@/hooks/use-auth';

type GovernanceLink = Readonly<{
  to: string;
  title: string;
  description: string;
  permission: AppPermission;
  icon: typeof ShieldCheck;
}>;

const governanceLinks: readonly GovernanceLink[] = [
  { to: '/audit-log', title: 'سجل التدقيق', description: 'عرض أحداث الحوكمة المتاحة قراءة فقط.', permission: 'audit.view', icon: ListChecks },
  { to: '/data-integrity', title: 'سلامة البيانات', description: 'تشغيل فحوصات قراءة فقط على العلاقات الأساسية.', permission: 'integrity.view', icon: SearchCheck },
  { to: '/change-password', title: 'تغيير كلمة المرور', description: 'تحديث كلمة مرور المستخدم الحالي عبر Supabase.', permission: 'auth.password.change', icon: KeyRound },
  { to: '/settings', title: 'إعدادات الشركة', description: 'إدارة إعدادات الشركة المدعومة حالياً.', permission: 'settings.manage', icon: Settings },
];

export function SystemPage() {
  const { authorization } = useAuth();
  const visibleLinks = governanceLinks.filter((item) => canAccess(authorization, item.permission));

  return (
    <section className="space-y-4">
      <Card className="overflow-hidden">
        <div className="h-1.5 bg-accent" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl"><ShieldCheck className="size-6 text-primary" />النظام والحوكمة</CardTitle>
          <CardDescription>مركز وصول آمن للوظائف النظامية المستردة في هذا المسار دون إضافة إعدادات غير مدعومة.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs font-bold text-muted-foreground">نموذج الصلاحيات</p>
              <p className="mt-1 text-lg font-black">يفشل مغلقاً</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs font-bold text-muted-foreground">التدقيق</p>
              <p className="mt-1 text-lg font-black">قراءة فقط</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs font-bold text-muted-foreground">سلامة البيانات</p>
              <p className="mt-1 text-lg font-black">بلا RPC</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs font-bold text-muted-foreground">المخطط</p>
              <p className="mt-1 text-lg font-black">دون تغييرات</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {visibleLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.to}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Icon className="size-5 text-primary" />{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="secondary">
                  <Link to={item.to}>فتح</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

