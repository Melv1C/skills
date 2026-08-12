import { tryGetContext } from "hono/context-storage";
import { ENV } from "varlock/env";
import winston from "winston";
import LokiTransport from "winston-loki";

import rootPackageJson from "../../../../package.json";
import packageJson from "../../package.json";

const appLabel = `${rootPackageJson.name}-${packageJson.name}`;

const isDev = ENV.APP_ENV === "development";

/**
 * Add context to the log message
 */
const addContext = winston.format((info) => {
  const c = tryGetContext();

  return {
    ...info,
    requestId: c?.var.requestId,
    method: c?.req.method,
    path: c?.req.path,
    userId: c?.var.user?.id,
    labels: {
      requestId: c?.var.requestId,
      method: c?.req.method,
      path: c?.req.path,
      userId: c?.var.user?.id,
      ...(info.labels ? info.labels : {}),
    },
  };
});

/**
 * Remove labels from the log message for console output
 */
const removeLabels = winston.format((info) => {
  delete info.labels;
  return info;
});

export const logger = winston.createLogger({
  level: "debug",
  format: winston.format.combine(winston.format.json(), addContext()),
  transports: [
    ...(isDev || !ENV.LOKI_HOST
      ? [
          new winston.transports.Console({
            level: isDev ? "debug" : "info",
            format: winston.format.combine(
              winston.format.colorize(),
              removeLabels(),
              winston.format.simple(),
            ),
          }),
        ]
      : []),
    ...(ENV.LOKI_HOST && ENV.APP_ENV !== "test"
      ? [
          new LokiTransport({
            host: ENV.LOKI_HOST,
            labels: {
              app: appLabel,
              environment: ENV.APP_ENV,
              version: packageJson.version,
            },
          }),
        ]
      : []),
  ],
});
