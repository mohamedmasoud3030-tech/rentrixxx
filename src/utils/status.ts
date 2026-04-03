import { LEGACY_WORKFLOW_STATUS, WORKFLOW_STATUS, type WorkflowStatus } from '../constants/status.ts';

export const normalizeWorkflowStatus = (status: string | null | undefined): WorkflowStatus => {
  if (!status) return WORKFLOW_STATUS.Pending;

  if (status === WORKFLOW_STATUS.Pending || status === WORKFLOW_STATUS.Completed) {
    return status;
  }

  const normalizedLegacy = LEGACY_WORKFLOW_STATUS[status as keyof typeof LEGACY_WORKFLOW_STATUS];
  return normalizedLegacy || WORKFLOW_STATUS.Pending;
};

export const isWorkflowStatus = (status: string): status is WorkflowStatus => {
  return status === WORKFLOW_STATUS.Pending || status === WORKFLOW_STATUS.Completed;
};
