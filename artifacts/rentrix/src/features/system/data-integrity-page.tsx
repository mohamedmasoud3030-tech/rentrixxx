import { useQuery } from '@tanstack/react-query';
import { DataIntegrityView } from './components/data-integrity-view';
import { runDataIntegrityAudit } from './services/data-integrity-service';

export function DataIntegrityPage() {
  const integrityQuery = useQuery({ queryKey: ['data-integrity-audit'], queryFn: runDataIntegrityAudit });

  if (integrityQuery.isPending) return <DataIntegrityView state={{ status: 'loading' }} />;
  if (integrityQuery.isError) return <DataIntegrityView state={{ status: 'error', error: integrityQuery.error }} />;

  return <DataIntegrityView state={{ status: 'ready', result: integrityQuery.data }} />;
}

