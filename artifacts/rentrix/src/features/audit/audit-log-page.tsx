import { useQuery } from '@tanstack/react-query';
import { AuditLogView } from './components/audit-log-view';
import { fetchAuditLog } from './services/audit-log-service';

export function AuditLogPage() {
  const auditLogQuery = useQuery({ queryKey: ['audit-log'], queryFn: fetchAuditLog });

  if (auditLogQuery.isPending) return <AuditLogView state={{ status: 'loading' }} />;
  if (auditLogQuery.isError) return <AuditLogView state={{ status: 'error', error: auditLogQuery.error }} />;

  return <AuditLogView state={{ status: 'ready', result: auditLogQuery.data }} />;
}

