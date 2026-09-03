import pino from "pino";

export type Logger = pino.Logger;

export function createLogger(level = "info"): Logger {
  return pino({ level });
}
export const logger = createLogger(process.env.LOG_LEVEL ?? "info");
