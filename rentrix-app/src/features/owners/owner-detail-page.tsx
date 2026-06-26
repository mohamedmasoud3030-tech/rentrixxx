import { useParams } from '@tanstack/react-router';
import { OwnerDetailView } from './components/owner-detail-view';
import { useOwnerDetailSnapshot } from './useOwners';

export function OwnerDetailPage() {
  const { ownerId } = useParams({ from: '/protected/owners/$ownerId' });
  const ownerDetailQuery = useOwnerDetailSnapshot(ownerId);

  if (!ownerId) return <OwnerDetailView state={{ status: 'unavailable', reason: 'معرف المالك غير موجود في الرابط.' }} />;
  if (ownerDetailQuery.isPending) return <OwnerDetailView state={{ status: 'loading' }} />;
  if (ownerDetailQuery.isError) return <OwnerDetailView state={{ status: 'error', error: ownerDetailQuery.error }} />;

  return <OwnerDetailView state={{ status: 'ready', snapshot: ownerDetailQuery.data }} />;
}
