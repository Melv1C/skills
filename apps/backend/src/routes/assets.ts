import { Hono } from "hono";
import * as z from "zod";

import { isAuthenticated } from "@/middlewares/use-auth";
import { updateAssetBody$, visibility$ } from "@/schemas";
import {
  AssetError,
  createAsset,
  deleteAsset,
  getOwnedAsset,
  listAssets,
  updateAsset,
} from "@/services/assets";

const listQuery$ = z.object({
  cursor: z.string().trim().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

export const assetRoutes = new Hono()
  .use("*", isAuthenticated)
  .get("/", async (c) => {
    const user = c.get("user")!;
    const parsed = listQuery$.safeParse(c.req.query());
    if (!parsed.success) {
      return c.json({ error: "Invalid query parameters" }, 400);
    }

    const result = await listAssets({
      ownerId: user.id,
      cursor: parsed.data.cursor,
      limit: parsed.data.limit,
    });
    return c.json(result);
  })
  .post("/", async (c) => {
    const user = c.get("user")!;

    try {
      const form = await c.req.parseBody({ all: true });
      const file = form.file;

      if (!(file instanceof File)) {
        return c.json({ error: "file is required" }, 400);
      }

      const visibilityRaw = typeof form.visibility === "string" ? form.visibility : undefined;
      const visibilityParsed = visibilityRaw ? visibility$.safeParse(visibilityRaw) : null;
      if (visibilityParsed && !visibilityParsed.success) {
        return c.json({ error: "visibility must be private or public" }, 400);
      }

      const filenameOverride =
        typeof form.filename === "string" && form.filename.trim().length > 0
          ? form.filename.trim()
          : undefined;

      const bytes = Buffer.from(await file.arrayBuffer());
      const asset = await createAsset({
        ownerId: user.id,
        filename: filenameOverride ?? (file.name || "upload.bin"),
        contentType: file.type || "application/octet-stream",
        bytes,
        visibility: visibilityParsed?.data,
      });

      return c.json(asset, 201);
    } catch (error) {
      if (error instanceof AssetError) {
        return c.json({ error: error.message }, error.status);
      }
      throw error;
    }
  })
  .get("/:id", async (c) => {
    const user = c.get("user")!;
    const id = c.req.param("id");

    try {
      const asset = await getOwnedAsset({ ownerId: user.id, id });
      return c.json(asset);
    } catch (error) {
      if (error instanceof AssetError) {
        return c.json({ error: error.message }, error.status);
      }
      throw error;
    }
  })
  .patch("/:id", async (c) => {
    const user = c.get("user")!;
    const id = c.req.param("id");
    const body = updateAssetBody$.safeParse(await c.req.json());

    if (!body.success) {
      return c.json({ error: body.error.message }, 400);
    }

    try {
      const asset = await updateAsset({
        ownerId: user.id,
        id,
        filename: body.data.filename,
        visibility: body.data.visibility,
      });
      return c.json(asset);
    } catch (error) {
      if (error instanceof AssetError) {
        return c.json({ error: error.message }, error.status);
      }
      throw error;
    }
  })
  .delete("/:id", async (c) => {
    const user = c.get("user")!;
    const id = c.req.param("id");

    try {
      const result = await deleteAsset({ ownerId: user.id, id });
      return c.json(result);
    } catch (error) {
      if (error instanceof AssetError) {
        return c.json({ error: error.message }, error.status);
      }
      throw error;
    }
  });
