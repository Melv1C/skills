import type { Context } from "hono";
import { Hono } from "hono";
import * as z from "zod";

import { isAuthenticated } from "@/middlewares/use-auth";
import {
  documentClientKey$,
  documentDescription$,
  documentFilename$,
  forceNew$,
  listDocumentsQuery$,
  updateDocumentBody$,
  visibility$,
} from "@/schemas";
import {
  addDocumentVersion,
  deleteDocument,
  DocumentError,
  getOwnedDocument,
  listDocuments,
  updateDocument,
  upsertDocument,
} from "@/services/documents";

function formString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function optionalTrimmed(schema: z.ZodType<string>, value: unknown) {
  if (typeof value !== "string") return undefined;
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new DocumentError(parsed.error.issues[0]?.message ?? "Invalid field", 400);
  }
  return parsed.data;
}

function parseForceNew(value: unknown) {
  if (value === undefined) return false;
  if (typeof value !== "string") return false;
  const parsed = forceNew$.safeParse(value);
  return parsed.success && (parsed.data === "true" || parsed.data === "1");
}

function descriptionFromForm(value: unknown) {
  if (typeof value !== "string") return undefined;
  const parsed = documentDescription$.safeParse(value);
  if (!parsed.success) {
    throw new DocumentError(parsed.error.issues[0]?.message ?? "Invalid description", 400);
  }
  return parsed.data.length > 0 ? parsed.data : null;
}

async function readHtmlFile(file: File) {
  return file.text();
}

export const documentRoutes = new Hono()
  .use("*", isAuthenticated)
  .get("/", async (c) => {
    const user = c.get("user")!;
    const parsed = listDocumentsQuery$.safeParse(c.req.query());
    if (!parsed.success) {
      return c.json({ error: "Invalid query parameters" }, 400);
    }

    const result = await listDocuments({
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

      const visibilityRaw = formString(form.visibility);
      const visibilityParsed = visibilityRaw ? visibility$.safeParse(visibilityRaw) : null;
      if (visibilityParsed && !visibilityParsed.success) {
        return c.json({ error: "visibility must be private or public" }, 400);
      }

      const clientKey = optionalTrimmed(documentClientKey$, form.clientKey);
      const filename =
        optionalTrimmed(documentFilename$, form.filename) ?? (file.name || "document.html");
      const description = descriptionFromForm(form.description);

      const { document, created } = await upsertDocument({
        ownerId: user.id,
        html: await readHtmlFile(file),
        filename,
        contentType: file.type || "application/octet-stream",
        clientKey,
        description,
        visibility: visibilityParsed?.data,
        forceNew: parseForceNew(form.forceNew),
      });

      return c.json(document, created ? 201 : 200);
    } catch (error) {
      return documentErrorResponse(c, error);
    }
  })
  .get("/:id", async (c) => {
    const user = c.get("user")!;
    try {
      const document = await getOwnedDocument({ ownerId: user.id, id: c.req.param("id") });
      return c.json(document);
    } catch (error) {
      return documentErrorResponse(c, error);
    }
  })
  .put("/:id", async (c) => {
    const user = c.get("user")!;
    try {
      const form = await c.req.parseBody({ all: true });
      const file = form.file;
      if (!(file instanceof File)) {
        return c.json({ error: "file is required" }, 400);
      }

      const visibilityRaw = formString(form.visibility);
      const visibilityParsed = visibilityRaw ? visibility$.safeParse(visibilityRaw) : null;
      if (visibilityParsed && !visibilityParsed.success) {
        return c.json({ error: "visibility must be private or public" }, 400);
      }

      const document = await addDocumentVersion({
        ownerId: user.id,
        id: c.req.param("id"),
        html: await readHtmlFile(file),
        filename: optionalTrimmed(documentFilename$, form.filename),
        contentType: file.type || "application/octet-stream",
        description: descriptionFromForm(form.description),
        visibility: visibilityParsed?.data,
      });
      return c.json(document);
    } catch (error) {
      return documentErrorResponse(c, error);
    }
  })
  .patch("/:id", async (c) => {
    const user = c.get("user")!;
    const body = updateDocumentBody$.safeParse(await c.req.json());
    if (!body.success) {
      return c.json({ error: body.error.message }, 400);
    }

    try {
      const document = await updateDocument({
        ownerId: user.id,
        id: c.req.param("id"),
        filename: body.data.filename,
        visibility: body.data.visibility,
        description:
          body.data.description !== undefined
            ? body.data.description.length > 0
              ? body.data.description
              : null
            : undefined,
      });
      return c.json(document);
    } catch (error) {
      return documentErrorResponse(c, error);
    }
  })
  .delete("/:id", async (c) => {
    const user = c.get("user")!;
    try {
      const result = await deleteDocument({ ownerId: user.id, id: c.req.param("id") });
      return c.json(result);
    } catch (error) {
      return documentErrorResponse(c, error);
    }
  });

function documentErrorResponse(c: Context, error: unknown) {
  if (error instanceof DocumentError) {
    return c.json(
      error.errors ? { error: error.message, errors: error.errors } : { error: error.message },
      error.status,
    );
  }
  throw error;
}
