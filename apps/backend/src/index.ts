import { prometheus } from "@hono/prometheus";
import "varlock/auto-load";
import { Hono } from "hono";
import { contextStorage } from "hono/context-storage";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { ENV } from "varlock/env";

import { logger } from "./lib/logger";
import { routes } from "./routes";
import { publicAssetRoutes } from "./routes/public-asset";
import { publicDocumentRoutes } from "./routes/public-document";
import "./hono-context.types";

const { printMetrics, registerMetrics } = prometheus();

const app = new Hono()
  .use(
    cors({
      origin: [ENV.FRONTEND_URL],
      credentials: true,
    }),
  )
  .use(contextStorage())
  .use(requestId())
  .use("*", registerMetrics)
  .get("/metrics", printMetrics)
  .route("/a", publicAssetRoutes)
  .route("/d", publicDocumentRoutes)
  .route("/api", routes);

export type AppType = typeof app;

export default {
  port: ENV.BACKEND_PORT,
  fetch: app.fetch,
};

logger.info("Backend started", {
  port: `${ENV.BACKEND_PORT}`,
  url: ENV.BACKEND_URL,
});
