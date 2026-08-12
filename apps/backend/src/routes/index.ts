import { Hono } from "hono";

import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { useAuth } from "@/middlewares/use-auth";
import { useLogger } from "@/middlewares/use-logger";

import { healthRoutes } from "./health";

export const routes = new Hono()
  .use(useAuth)
  .on(["POST", "GET"], "/auth/*", (c) => auth.handler(c.req.raw))

  .use(useLogger)
  .route("/health", healthRoutes)
  .onError((error, c) => {
    logger.error("Unhandled error occurred", { error });
    return c.json({ message: "Internal Server Error" }, 500);
  });
