import { useQuery } from '@tanstack/react-query';
import { LandsView } from './components/lands-view';
import { fetchLandsReadModel } from './services/lands-service';

export function LandsPage() {
  const landsQuery = useQuery({ queryKey: ['lands', 'read-model'], queryFn: fetchLandsReadModel });
  return <LandsView state={landsQuery.data ?? { status: 'unavailable', reason: 'لم يتم التحقق من مصدر بيانات الأراضي بعد.' }} />;
}
