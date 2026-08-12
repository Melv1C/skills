import { Hono } from "hono";

import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { useAuth } from "@/middlewares/use-auth";
import { useLogger } from "@/middlewares/use-logger";

import { assetRoutes } from "./assets";
import { healthRoutes } from "./health";
import { tokenRoutes } from "./tokens";

export const routes = new Hono()
  .use(useAuth)
  .on(["POST", "GET"], "/auth/*", (c) => auth.handler(c.req.raw))
  .use(useLogger)
  .route("/health", healthRoutes)
  .route("/assets", assetRoutes)
  .route("/tokens", tokenRoutes)
  .onError((error, c) => {
    logger.error("Unhandled error occurred", {
      error:
        error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : error,
    });
    return c.json({ error: "Internal Server Error" }, 500);
  });
