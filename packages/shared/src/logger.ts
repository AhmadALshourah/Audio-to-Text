/**
 * Minimal structured logger — no external service. Every call prints one
 * JSON line (level, message, timestamp, plus arbitrary fields) so logs stay
 * greppable/parseable without adopting Sentry/Datadog/etc. Fits the
 * self-contained stack: the only thing "shipping" these logs anywhere is
 * whatever captures stdout/stderr (a VPS's systemd journal, a `docker logs`,
 * or the terminal in dev).
 */

export type LogLevel = 'info' | 'warn' | 'error';
export type LogFields = Record<string, unknown>;

function write(level: LogLevel, msg: string, fields?: LogFields): void {
  const line = JSON.stringify({ level, msg, time: new Date().toISOString(), ...fields });
  // eslint-disable-next-line no-console
  if (level === 'error') console.error(line);
  // eslint-disable-next-line no-console
  else if (level === 'warn') console.warn(line);
  // eslint-disable-next-line no-console
  else console.log(line);
}

export interface Logger {
  info(msg: string, fields?: LogFields): void;
  warn(msg: string, fields?: LogFields): void;
  error(msg: string, fields?: LogFields): void;
}

export const logger: Logger = {
  info: (msg, fields) => write('info', msg, fields),
  warn: (msg, fields) => write('warn', msg, fields),
  error: (msg, fields) => write('error', msg, fields),
};

/** A logger with fields pre-bound to every call (e.g. a request id or job id). */
export function createLogger(bindings: LogFields): Logger {
  return {
    info: (msg, fields) => write('info', msg, { ...bindings, ...fields }),
    warn: (msg, fields) => write('warn', msg, { ...bindings, ...fields }),
    error: (msg, fields) => write('error', msg, { ...bindings, ...fields }),
  };
}
