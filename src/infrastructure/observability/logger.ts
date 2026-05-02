import { getAppEnv } from '../../config/env';
import { errorTracker } from './errorTracker';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const resolveLogLevel = (): number => {
  try {
    const fromEnv = getAppEnv().logLevel;
    if (fromEnv) return LEVEL_WEIGHT[fromEnv];
  } catch {
    // fallback during early boot
  }

  return import.meta.env.DEV ? LEVEL_WEIGHT.debug : LEVEL_WEIGHT.warn;
};

const threshold = resolveLogLevel();

const shouldLog = (level: LogLevel): boolean => LEVEL_WEIGHT[level] >= threshold;

const formatPayload = (message: string, meta?: unknown) => {
  const ts = new Date().toISOString();
  return meta === undefined ? [`[${ts}] ${message}`] : [`[${ts}] ${message}`, meta];
};

export const logger = {
  debug(message: string, meta?: unknown) {
    if (!shouldLog('debug')) return;
     
    console.debug(...formatPayload(message, meta));
  },
  info(message: string, meta?: unknown) {
    if (!shouldLog('info')) return;
     
    console.info(...formatPayload(message, meta));
  },
  warn(message: string, meta?: unknown) {
    if (!shouldLog('warn')) return;
     
    console.warn(...formatPayload(message, meta));
  },
  error(message: string, meta?: unknown) {
    if (!shouldLog('error')) return;
    const payload = formatPayload(message, meta);
     
    console.error(...payload);
    errorTracker.capture(meta ?? message, { area: 'logger', action: message });
  },
};
