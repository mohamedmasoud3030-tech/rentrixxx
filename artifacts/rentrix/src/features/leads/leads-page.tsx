import { useQuery } from '@tanstack/react-query';
import { LeadsView } from './components/leads-view';
import { fetchLeadsReadModel } from './services/leads-service';

export function LeadsPage() {
  const leadsQuery = useQuery({ queryKey: ['leads', 'read-model'], queryFn: fetchLeadsReadModel });
  return <LeadsView state={leadsQuery.data ?? { status: 'unavailable', reason: 'لم يتم التحقق من مصدر بيانات العملاء المحتملين بعد.' }} />;
}
