const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
type LogLevel = (typeof LOG_LEVELS)[number];

function getCurrentLevel(): LogLevel {
  return (process.env.LOG_LEVEL as LogLevel) ?? 'info';
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS.indexOf(level) >= LOG_LEVELS.indexOf(getCurrentLevel());
}

function formatMessage(level: LogLevel, message: string, meta?: unknown): string {
  const timestamp = new Date().toISOString();
  const metaStr = meta !== undefined ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

function writeStderr(msg: string): void {
  process.stderr.write(msg + '\n');
}

export const logger = {
  debug(message: string, meta?: unknown): void {
    if (shouldLog('debug')) writeStderr(formatMessage('debug', message, meta));
  },
  info(message: string, meta?: unknown): void {
    if (shouldLog('info')) writeStderr(formatMessage('info', message, meta));
  },
  warn(message: string, meta?: unknown): void {
    if (shouldLog('warn')) writeStderr(formatMessage('warn', message, meta));
  },
  error(message: string, meta?: unknown): void {
    if (shouldLog('error')) writeStderr(formatMessage('error', message, meta));
  },
};
