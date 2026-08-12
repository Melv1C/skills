import { Hono } from "hono";

import { auth, headersWithApiKeySupport } from "@/lib/auth";
import { getAssetRecord } from "@/services/assets";
import { getStorage } from "@/services/storage";

export const publicAssetRoutes = new Hono().get("/:id", async (c) => {
  const id = c.req.param("id");
  const asset = await getAssetRecord(id);

  if (!asset) {
    return c.json({ error: "Asset not found" }, 404);
  }

  if (asset.expiresAt && asset.expiresAt.getTime() < Date.now()) {
    return c.json({ error: "Asset expired" }, 410);
  }

  if (asset.visibility !== "PUBLIC") {
    const session = await auth.api.getSession({
      headers: headersWithApiKeySupport(c.req.raw.headers),
    });

    if (!session?.user || session.user.id !== asset.ownerId) {
      return c.json({ error: "Authentication required" }, 401);
    }
  }

  const disposition = `inline; filename="${asset.filename.replaceAll('"', "")}"`;

  try {
    const signedUrl = await getStorage().createPresignedUrl(asset.storageKey, {
      expiresInSeconds: 60 * 5,
      responseContentType: asset.contentType,
      responseContentDisposition: disposition,
    });
    return c.redirect(signedUrl, 302);
  } catch {
    return c.json({ error: "Failed to resolve asset" }, 500);
  }
});
