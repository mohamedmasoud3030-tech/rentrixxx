import type { AuditEvent } from '@/domain/types';
import { readMockDatabase, writeMockDatabase } from './base';
import { getSimulatedRole } from '@/services/mock-role-simulator';

export const auditRepo = {
  list: () => readMockDatabase((state) => state.auditEvents),
  log: (action: string, entityType: string, entityId: string, details: string) => writeMockDatabase((state) => {
    const role = getSimulatedRole();
    const event: AuditEvent = {
      id: `audit-${crypto.randomUUID()}`,
      userId: `user-${role.toLowerCase()}`,
      role,
      action,
      entityType,
      entityId,
      timestamp: new Date().toISOString(),
      details,
    };
    return {
      nextState: { ...state, auditEvents: [event, ...state.auditEvents] },
      data: event,
    };
  }),
};
