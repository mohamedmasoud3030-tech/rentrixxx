import { useQuery } from '@tanstack/react-query';
import { CommunicationHubView } from './components/communication-hub-view';
import { fetchCommunicationReadModel } from './services/communication-service';

export function CommunicationPage() {
  const communicationQuery = useQuery({ queryKey: ['communication', 'read-model'], queryFn: fetchCommunicationReadModel });
  return <CommunicationHubView state={communicationQuery.data ?? { status: 'unavailable', reason: 'لم يتم التحقق من مصدر بيانات التواصل بعد.' }} />;
}
