import { getAppEnv } from '../config/env';
import { errorTracker } from './errorTracker';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const resolveLogLevel = (): LogLevel => {
  try {
    const fromEnv = getAppEnv().logLevel;
    if (fromEnv) return fromEnv;
  } catch {
    // fallback during early boot
  }

  return import.meta.env.DEV ? 'debug' : 'warn';
};

const threshold = LEVEL_WEIGHT[resolveLogLevel()] ?? LEVEL_WEIGHT.warn;

const shouldLog = (level: LogLevel): boolean => LEVEL_WEIGHT[level] >= threshold;

const formatPayload = (message: string, meta?: unknown) => {
  const ts = new Date().toISOString();
  return meta === undefined ? [`[${ts}] ${message}`] : [`[${ts}] ${message}`, meta];
};

export const logger = {
  debug(message: string, meta?: unknown) {
    if (!shouldLog('debug')) return;
    // eslint-disable-next-line no-console
    console.debug(...formatPayload(message, meta));
  },
  info(message: string, meta?: unknown) {
    if (!shouldLog('info')) return;
    // eslint-disable-next-line no-console
    console.info(...formatPayload(message, meta));
  },
  warn(message: string, meta?: unknown) {
    if (!shouldLog('warn')) return;
    // eslint-disable-next-line no-console
    console.warn(...formatPayload(message, meta));
  },
  error(message: string, meta?: unknown) {
    if (!shouldLog('error')) return;
    const payload = formatPayload(message, meta);
    // eslint-disable-next-line no-console
    console.error(...payload);
    errorTracker.capture(meta ?? message, { area: 'logger', action: message });
  },
};
