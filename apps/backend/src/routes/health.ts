import { Hono } from "hono";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export const healthRoutes = new Hono().get("/", async (c) => {
  let isDatabaseConnected = false;

  try {
    const result = await prisma.$queryRaw`SELECT 1`; // Simple query to check database connectivity;
    isDatabaseConnected = !!result;
  } catch (error) {
    logger.error("Error checking database connectivity", { error });
    isDatabaseConnected = false;
  }

  return c.json(
    {
      status: isDatabaseConnected ? "ok" : "error",
      database: isDatabaseConnected ? "connected" : "disconnected",
    },
    isDatabaseConnected ? 200 : 503,
  );
});
