export {
  createSessionRefreshScheduler,
  refreshSessionOrInvalidate,
  isSessionExpired,
  shouldRefreshSession,
  getSessionExpiryMs,
  sanitizeHtmlInput,
  sanitizeMultilineText,
  sanitizeUiTextPayload,
  DEFAULT_REFRESH_THRESHOLD_MS,
} from '@/infrastructure/security';
