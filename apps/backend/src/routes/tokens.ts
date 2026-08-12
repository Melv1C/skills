import { Hono } from "hono";

import { auth } from "@/lib/auth";
import { isAuthenticated } from "@/middlewares/use-auth";
import { createTokenBody$ } from "@/schemas";

function toTokenDto(key: {
  id: string;
  name?: string | null;
  start?: string | null;
  prefix?: string | null;
  enabled?: boolean | null;
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: key.id,
    name: key.name ?? null,
    start: key.start ?? null,
    prefix: key.prefix ?? null,
    enabled: key.enabled ?? null,
    expiresAt: key.expiresAt ? key.expiresAt.toISOString() : null,
    createdAt: key.createdAt.toISOString(),
    updatedAt: key.updatedAt.toISOString(),
  };
}

export const tokenRoutes = new Hono()
  .use("*", isAuthenticated)
  .get("/", async (c) => {
    const result = await auth.api.listApiKeys({
      headers: c.req.raw.headers,
    });

    return c.json({
      items: result.apiKeys.map(toTokenDto),
      total: result.total,
    });
  })
  .post("/", async (c) => {
    const body = createTokenBody$.safeParse(await c.req.json());
    if (!body.success) {
      return c.json({ error: body.error.message }, 400);
    }

    const user = c.get("user")!;
    const created = await auth.api.createApiKey({
      body: {
        name: body.data.name,
        expiresIn: body.data.expiresIn,
        userId: user.id,
        prefix: "av_",
      },
    });

    return c.json(
      {
        ...toTokenDto(created),
        key: created.key,
      },
      201,
    );
  })
  .delete("/:id", async (c) => {
    const id = c.req.param("id");
    const result = await auth.api.deleteApiKey({
      body: { keyId: id },
      headers: c.req.raw.headers,
    });

    return c.json(result);
  });
