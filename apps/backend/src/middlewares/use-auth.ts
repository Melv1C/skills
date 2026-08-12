import type { Context, Next } from "hono";

import { auth, headersWithApiKeySupport } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { user$ } from "@/schemas";

export const useAuth = async (c: Context, next: Next) => {
  let sessionData: Awaited<ReturnType<typeof auth.api.getSession>> = null;

  try {
    sessionData = await auth.api.getSession({
      headers: headersWithApiKeySupport(c.req.raw.headers),
    });
  } catch (error) {
    logger.warn("Failed to resolve session", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const user = sessionData?.user ? user$.safeParse(sessionData.user) : null;

  if (user && !user.success) {
    logger.error("Invalid user data in session", { error: user.error.message });
    throw user.error;
  }

  c.set("session", sessionData?.session || null);
  c.set("user", user?.data || null);

  await next();
};

export const isAuthenticated = async (c: Context, next: Next) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Authentication required" }, 401);
  }

  await next();
};

export const isAdmin = async (c: Context, next: Next) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Authentication required" }, 401);
  }

  if (user.role !== "admin") {
    return c.json({ error: "Admin role required" }, 403);
  }

  await next();
};
