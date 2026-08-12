import type { Context, Next } from "hono";

import { logger } from "@/lib/logger";

export const useLogger = async (c: Context, next: Next) => {
  const start = Date.now();
  logger.info("Incoming request", { method: c.req.method, path: c.req.path });

  try {
    await next();
  } finally {
    const logLevel = c.res.status >= 500 ? "error" : c.res.status >= 400 ? "warn" : "info";
    logger.log({
      level: logLevel,
      message: `Request ${c.req.method} ${c.req.path} completed`,
      statusCode: c.res.status,
      durationMs: Date.now() - start,
    });
  }
};
