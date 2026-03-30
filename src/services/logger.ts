export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const envLevel = (import.meta.env.VITE_LOG_LEVEL as LogLevel | undefined) ?? (import.meta.env.DEV ? 'debug' : 'warn');
const threshold = LEVEL_WEIGHT[envLevel] ?? LEVEL_WEIGHT.warn;

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
    // eslint-disable-next-line no-console
    console.error(...formatPayload(message, meta));
  },
};
