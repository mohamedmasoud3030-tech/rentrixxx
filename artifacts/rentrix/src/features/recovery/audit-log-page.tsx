import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { EmptyState } from '@/components/empty-state';
import { DataErrorScreen } from '@/components/data-error-screen';
import { RouteLoadingState } from '@/components/loading-state';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUserRole } from './useCurrentUserRole';

function useAuditLog() {
  return useQuery({
    queryKey: ['recovery', 'audit-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_log')
        .select('id, actor_user_id, action, entity_type, entity_id, details, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });
}

export function AuditLogPage() {
  const roleQuery = useCurrentUserRole();
  const logQuery = useAuditLog();
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('all');
  const [actor, setActor] = useState('');

  const canView = roleQuery.data === 'ADMIN' || roleQuery.data === 'MANAGER';
  const entityOptions = useMemo(() => {
    const values = new Set<string>();
    (logQuery.data ?? []).forEach((item) => {
      if (item.entity_type) values.add(item.entity_type);
    });
    return ['all', ...Array.from(values)];
  }, [logQuery.data]);

  const filtered = useMemo(() => (logQuery.data ?? []).filter((item) => {
    const byAction = action ? item.action.toLowerCase().includes(action.toLowerCase()) : true;
    const byEntity = entity === 'all' ? true : item.entity_type === entity;
    const byActor = actor ? (item.actor_user_id ?? '').toLowerCase().includes(actor.toLowerCase()) : true;
    return byAction && byEntity && byActor;
  }), [logQuery.data, action, entity, actor]);

  if (roleQuery.isLoading || logQuery.isLoading) return <RouteLoadingState />;
  if (roleQuery.isError) return <DataErrorScreen title="تعذر التحقق من الصلاحيات" fallbackMessage="حاول تحديث الصفحة." />;
  if (!canView) return <DataErrorScreen title="غير مصرح" fallbackMessage="هذه الصفحة متاحة للمدير أو المشرف فقط." />;
  if (logQuery.isError) return <DataErrorScreen title="تعذر تحميل سجل التدقيق" fallbackMessage="تحقق من صلاحيات قاعدة البيانات أو الاتصال." />;

  return (
    <section className="space-y-4" dir="rtl">
      <Card>
        <CardHeader><CardTitle>سجل التدقيق</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Input placeholder="تصفية حسب الإجراء" value={action} onChange={(e) => setAction(e.target.value)} />
          <Select value={entity} onChange={(e) => setEntity(e.target.value)}>
            {entityOptions.map((opt) => <option key={opt} value={opt}>{opt === 'all' ? 'كل الكيانات' : opt}</option>)}
          </Select>
          <Input placeholder="تصفية حسب معرّف المنفذ" value={actor} onChange={(e) => setActor(e.target.value)} />
        </CardContent>
      </Card>

      {filtered.length === 0 ? <EmptyState title="لا توجد سجلات" description="لم يتم العثور على نتائج مطابقة للتصفية الحالية." /> : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b"><th className="p-3 text-right">التاريخ</th><th className="p-3 text-right">الإجراء</th><th className="p-3 text-right">الكيان</th><th className="p-3 text-right">المنفذ</th></tr></thead>
              <tbody>
                {filtered.map((row) => <tr key={row.id} className="border-b"><td className="p-3">{new Date(row.created_at).toLocaleString('ar')}</td><td className="p-3">{row.action}</td><td className="p-3">{row.entity_type ?? '-'}</td><td className="p-3">{row.actor_user_id ?? '-'}</td></tr>)}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
