import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
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
  plugins: [admin()],
});
