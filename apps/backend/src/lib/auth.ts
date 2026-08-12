import { apiKey } from "@better-auth/api-key";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, bearer } from "better-auth/plugins";
import "varlock/auto-load";
import { ENV } from "varlock/env";

import { prismaWithoutLog } from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prismaWithoutLog, {
    provider: "postgresql",
  }),
  trustedOrigins: [ENV.FRONTEND_URL],
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    admin(),
    bearer(),
    apiKey({
      enableSessionForAPIKeys: true,
      defaultPrefix: "av_",
      requireName: true,
      rateLimit: {
        enabled: true,
        timeWindow: 1000 * 60 * 60,
        maxRequests: 1000,
      },
      apiKeyHeaders: ["x-api-key"],
    }),
  ],
});

/** Normalize Authorization: Bearer av_… into x-api-key for Better Auth session mocking. */
export function headersWithApiKeySupport(headers: Headers): Headers {
  const normalized = new Headers(headers);

  if (normalized.get("x-api-key")) {
    return normalized;
  }

  const authorization = normalized.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return normalized;
  }

  const token = authorization.slice("Bearer ".length).trim();
  if (token.startsWith("av_")) {
    normalized.set("x-api-key", token);
  }

  return normalized;
}
