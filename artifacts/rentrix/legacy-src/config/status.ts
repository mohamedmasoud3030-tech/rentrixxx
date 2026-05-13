export const WORKFLOW_STATUS = {
  Pending: 'Pending',
  Completed: 'Completed',
} as const;

export type WorkflowStatus = (typeof WORKFLOW_STATUS)[keyof typeof WORKFLOW_STATUS];

export const LEGACY_WORKFLOW_STATUS = {
  PENDING: WORKFLOW_STATUS.Pending,
  SENT: WORKFLOW_STATUS.Completed,
  COMPLETED: WORKFLOW_STATUS.Completed,
} as const;

export const ALL_WORKFLOW_STATUSES: readonly WorkflowStatus[] = [
  WORKFLOW_STATUS.Pending,
  WORKFLOW_STATUS.Completed,
] as const;
