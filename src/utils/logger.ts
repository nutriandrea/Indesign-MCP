const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
type LogLevel = (typeof LOG_LEVELS)[number];

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) ?? 'info';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS.indexOf(level) >= LOG_LEVELS.indexOf(currentLevel);
}

function formatMessage(level: LogLevel, message: string, meta?: unknown): string {
  const timestamp = new Date().toISOString();
  const metaStr = meta !== undefined ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

export const logger = {
  debug(message: string, meta?: unknown): void {
    if (shouldLog('debug')) console.debug(formatMessage('debug', message, meta));
  },
  info(message: string, meta?: unknown): void {
    if (shouldLog('info')) console.info(formatMessage('info', message, meta));
  },
  warn(message: string, meta?: unknown): void {
    if (shouldLog('warn')) console.warn(formatMessage('warn', message, meta));
  },
  error(message: string, meta?: unknown): void {
    if (shouldLog('error')) console.error(formatMessage('error', message, meta));
  },
};
