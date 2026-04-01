type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

function formatLog(entry: LogEntry): string {
  const { level, message, context, timestamp } = entry;
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  const ctx = context ? ` ${JSON.stringify(context)}` : "";
  return `${prefix} ${message}${ctx}`;
}

export const logger = {
  info(message: string, context?: Record<string, unknown>) {
    const entry: LogEntry = {
      level: "info",
      message,
      context,
      timestamp: new Date().toISOString(),
    };
    console.log(formatLog(entry));
  },

  warn(message: string, context?: Record<string, unknown>) {
    const entry: LogEntry = {
      level: "warn",
      message,
      context,
      timestamp: new Date().toISOString(),
    };
    console.warn(formatLog(entry));
  },

  error(message: string, error?: unknown, context?: Record<string, unknown>) {
    const entry: LogEntry = {
      level: "error",
      message,
      context: {
        ...context,
        error: error instanceof Error
          ? { message: error.message, stack: error.stack }
          : error,
      },
      timestamp: new Date().toISOString(),
    };
    console.error(formatLog(entry));
  },
};
