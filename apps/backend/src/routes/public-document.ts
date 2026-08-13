import type { Context } from "hono";
import { Hono } from "hono";

import { auth, headersWithApiKeySupport } from "@/lib/auth";
import { getPublicDocumentVersion } from "@/services/documents";

const CSP = [
  "default-src 'none'",
  "script-src 'none'",
  "style-src 'unsafe-inline'",
  "img-src https: data:",
  "font-src data:",
  "connect-src 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "base-uri 'none'",
].join("; ");

function parseVersionNumber(raw: string | undefined) {
  if (raw === undefined) return undefined;
  if (!/^[1-9]\d*$/.test(raw)) return null;
  return Number(raw);
}

async function serveDocument(c: Context, id: string, versionRaw?: string, immutable = false) {
  const versionNumber = parseVersionNumber(versionRaw);
  if (versionNumber === null) {
    return c.json({ error: "Document not found" }, 404);
  }

  const result = await getPublicDocumentVersion(id, versionNumber);
  if (!result) {
    return c.json({ error: "Document not found" }, 404);
  }

  if (result.document.visibility !== "PUBLIC") {
    const session = await auth.api.getSession({
      headers: headersWithApiKeySupport(c.req.raw.headers),
    });
    if (!session?.user || session.user.id !== result.document.ownerId) {
      return c.json({ error: "Authentication required" }, 401);
    }
  }

  return c.body(result.version.html, 200, {
    "Content-Type": "text/html; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "X-Skills-Document-Id": result.document.id,
    "X-Skills-Document-Version": String(result.version.versionNumber),
    "Cache-Control": immutable ? "public, max-age=31536000, immutable" : "no-store",
    "Content-Security-Policy": CSP,
  });
}

export const publicDocumentRoutes = new Hono()
  .get("/:id/v/:n/raw", (c) => serveDocument(c, c.req.param("id"), c.req.param("n"), true))
  .get("/:id/v/:n", (c) => serveDocument(c, c.req.param("id"), c.req.param("n"), true))
  .get("/:id/raw", (c) => serveDocument(c, c.req.param("id")))
  .get("/:id", (c) => serveDocument(c, c.req.param("id")));
