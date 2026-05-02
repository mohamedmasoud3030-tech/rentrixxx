export type ErrorSeverity = 'recoverable' | 'non-recoverable';

export type ClassifiedError = {
  severity: ErrorSeverity;
  code: string;
};

const NON_RECOVERABLE_PATTERNS = [
  /chunkloaderror/i,
  /loading chunk/i,
  /failed to fetch dynamically imported module/i,
  /hydration failed/i,
];

export const classifyError = (error: Error | null): ClassifiedError => {
  if (!error) return { severity: 'recoverable', code: 'unknown' };

  const message = error.message || '';
  if (NON_RECOVERABLE_PATTERNS.some((pattern) => pattern.test(message))) {
    return { severity: 'non-recoverable', code: 'runtime-bootstrap-failure' };
  }

  return { severity: 'recoverable', code: 'render-subtree-failure' };
};
