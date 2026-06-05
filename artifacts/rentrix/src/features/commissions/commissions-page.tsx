import { useQuery } from '@tanstack/react-query';
import { CommissionsView } from './components/commissions-view';
import { fetchCommissionsReadModel } from './services/commissions-service';

export function CommissionsPage() {
  const commissionsQuery = useQuery({ queryKey: ['commissions', 'read-model'], queryFn: fetchCommissionsReadModel });
  return <CommissionsView state={commissionsQuery.data ?? { status: 'unavailable', reason: 'لم يتم التحقق من مصدر بيانات العمولات بعد.' }} />;
}
