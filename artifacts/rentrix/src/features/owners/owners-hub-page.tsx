import { OwnersHubView } from './components/owners-hub-view';
import { useOwnerHubSnapshot } from './useOwners';

export function OwnersHubPage() {
  const ownersHubQuery = useOwnerHubSnapshot();

  if (ownersHubQuery.isPending) return <OwnersHubView state={{ status: 'loading' }} />;
  if (ownersHubQuery.isError) return <OwnersHubView state={{ status: 'error', error: ownersHubQuery.error }} />;

  return <OwnersHubView state={{ status: 'ready', snapshot: ownersHubQuery.data }} />;
}
