import { createHash } from "node:crypto";

import type { Document, DocumentVersion, Visibility } from "@generated/prisma/client";
import { Prisma } from "@generated/prisma/client";
import { ulid } from "ulid";
import { ENV } from "varlock/env";

import { validateHtml } from "@/lib/html-policy";
import { prisma } from "@/lib/prisma";

const DEFAULT_MAX_HTML_BYTES = 512 * 1024;

const versionMetaSelect = {
  versionNumber: true,
  size: true,
  sha256: true,
  hasInlineScript: true,
  createdAt: true,
} satisfies Prisma.DocumentVersionSelect;

type VersionMeta = Pick<
  DocumentVersion,
  "versionNumber" | "size" | "sha256" | "hasInlineScript" | "createdAt"
>;

export class DocumentError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 403 | 404 | 413 = 400,
    readonly errors?: string[],
  ) {
    super(message);
    this.name = "DocumentError";
  }
}

export type DocumentVersionDto = {
  version: number;
  size: number;
  sha256: string;
  hasInlineScript: boolean;
  createdAt: string;
  url: string;
};

export type DocumentDto = {
  id: string;
  description: string | null;
  title: string | null;
  filename: string;
  visibility: "private" | "public";
  clientKey: string | null;
  size: number;
  sha256: string;
  version: number;
  versionCount: number;
  hasInlineScript: boolean;
  url: string;
  rawUrl: string;
  versionUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type DocumentDetailDto = DocumentDto & {
  versions: DocumentVersionDto[];
};

function toVisibilityDto(visibility: Visibility): "private" | "public" {
  return visibility === "PUBLIC" ? "public" : "private";
}

function toVisibilityEnum(visibility: "private" | "public"): Visibility {
  return visibility === "public" ? "PUBLIC" : "PRIVATE";
}

function publicBaseUrl() {
  return ENV.PUBLIC_ASSET_BASE_URL.replace(/\/$/, "");
}

function documentUrl(id: string) {
  return `${publicBaseUrl()}/d/${id}`;
}

function documentRawUrl(id: string) {
  return `${documentUrl(id)}/raw`;
}

function documentVersionUrl(id: string, version: number) {
  return `${documentUrl(id)}/v/${version}`;
}

function toDocumentDto(document: Document, latest: VersionMeta): DocumentDto {
  const url = documentUrl(document.id);
  return {
    id: document.id,
    description: document.description,
    title: document.title,
    filename: document.filename,
    visibility: toVisibilityDto(document.visibility),
    clientKey: document.clientKey,
    size: latest.size,
    sha256: latest.sha256,
    version: latest.versionNumber,
    versionCount: document.latestVersionNumber,
    hasInlineScript: latest.hasInlineScript,
    url,
    rawUrl: documentRawUrl(document.id),
    versionUrl: documentVersionUrl(document.id, latest.versionNumber),
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

function toVersionDto(documentId: string, version: VersionMeta): DocumentVersionDto {
  return {
    version: version.versionNumber,
    size: version.size,
    sha256: version.sha256,
    hasInlineScript: version.hasInlineScript,
    createdAt: version.createdAt.toISOString(),
    url: documentVersionUrl(documentId, version.versionNumber),
  };
}

function assertHtmlContentType(filename: string, contentType: string) {
  const type = contentType.toLowerCase().split(";")[0]?.trim() ?? "";
  const htmlName = /\.html?$/i.test(filename);
  if (type === "text/html" || type === "application/xhtml+xml") return;
  if ((type === "" || type === "application/octet-stream") && htmlName) return;
  throw new DocumentError("Content-Type must be text/html", 400);
}

function prepareHtml(input: { html: string; filename: string; contentType: string }) {
  assertHtmlContentType(input.filename, input.contentType);

  const maxBytes = ENV.DOCUMENT_MAX_HTML_BYTES ?? DEFAULT_MAX_HTML_BYTES;
  const size = Buffer.byteLength(input.html, "utf8");
  if (size > maxBytes) {
    throw new DocumentError(`File exceeds max upload size of ${maxBytes} bytes`, 413);
  }

  const policy = validateHtml(input.html, { maxBytes });
  if (!policy.ok) {
    throw new DocumentError("Invalid HTML", 400, policy.errors);
  }

  const title = policy.title || input.filename || "Untitled";
  const sha256 = createHash("sha256").update(input.html, "utf8").digest("hex");

  return {
    html: input.html,
    size,
    sha256,
    title,
    hasInlineScript: policy.hasInlineScript,
  };
}

function isUniqueClientKeyViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export type UpsertDocumentInput = {
  ownerId: string;
  html: string;
  filename: string;
  contentType: string;
  clientKey?: string;
  description?: string | null;
  visibility?: "private" | "public";
  forceNew?: boolean;
};

export async function upsertDocument(input: UpsertDocumentInput): Promise<{
  document: DocumentDto;
  created: boolean;
}> {
  const prepared = prepareHtml(input);

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await writeDocument(input, prepared);
    } catch (error) {
      if (
        attempt === 0 &&
        isUniqueClientKeyViolation(error) &&
        input.clientKey &&
        !input.forceNew
      ) {
        continue;
      }
      throw error;
    }
  }

  throw new DocumentError("Failed to save document", 400);
}

async function writeDocument(
  input: UpsertDocumentInput,
  prepared: ReturnType<typeof prepareHtml>,
): Promise<{ document: DocumentDto; created: boolean }> {
  if (input.forceNew) {
    const created = await prisma.$transaction(async (tx) => {
      if (input.clientKey) {
        await tx.document.updateMany({
          where: { ownerId: input.ownerId, clientKey: input.clientKey },
          data: { clientKey: null },
        });
      }

      return createDocumentRecord(tx, input, prepared);
    });
    return { document: created, created: true };
  }

  if (input.clientKey) {
    const existing = await prisma.document.findUnique({
      where: {
        ownerId_clientKey: { ownerId: input.ownerId, clientKey: input.clientKey },
      },
    });
    if (existing) {
      const updated = await appendVersion(existing, input, prepared);
      return { document: updated, created: false };
    }
  }

  const created = await prisma.$transaction((tx) => createDocumentRecord(tx, input, prepared));
  return { document: created, created: true };
}

async function createDocumentRecord(
  tx: Prisma.TransactionClient,
  input: UpsertDocumentInput,
  prepared: ReturnType<typeof prepareHtml>,
) {
  const id = ulid();
  const versionId = ulid();
  const visibility = toVisibilityEnum(input.visibility ?? "public");

  const document = await tx.document.create({
    data: {
      id,
      ownerId: input.ownerId,
      clientKey: input.clientKey,
      description: input.description ?? null,
      title: prepared.title,
      filename: input.filename,
      visibility,
      latestVersionNumber: 1,
      versions: {
        create: {
          id: versionId,
          versionNumber: 1,
          html: prepared.html,
          sha256: prepared.sha256,
          size: prepared.size,
          hasInlineScript: prepared.hasInlineScript,
        },
      },
    },
  });

  return toDocumentDto(document, {
    versionNumber: 1,
    size: prepared.size,
    sha256: prepared.sha256,
    hasInlineScript: prepared.hasInlineScript,
    createdAt: document.createdAt,
  });
}

async function appendVersion(
  existing: Document,
  input: UpsertDocumentInput,
  prepared: ReturnType<typeof prepareHtml>,
) {
  const nextVersion = existing.latestVersionNumber + 1;
  const now = new Date();

  const document = await prisma.document.update({
    where: { id: existing.id },
    data: {
      title: prepared.title,
      filename: input.filename,
      latestVersionNumber: nextVersion,
      updatedAt: now,
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.visibility !== undefined ? { visibility: toVisibilityEnum(input.visibility) } : {}),
      versions: {
        create: {
          id: ulid(),
          versionNumber: nextVersion,
          html: prepared.html,
          sha256: prepared.sha256,
          size: prepared.size,
          hasInlineScript: prepared.hasInlineScript,
        },
      },
    },
  });

  return toDocumentDto(document, {
    versionNumber: nextVersion,
    size: prepared.size,
    sha256: prepared.sha256,
    hasInlineScript: prepared.hasInlineScript,
    createdAt: now,
  });
}

export async function addDocumentVersion(input: {
  ownerId: string;
  id: string;
  html: string;
  filename?: string;
  contentType: string;
  description?: string | null;
  visibility?: "private" | "public";
}) {
  const existing = await prisma.document.findFirst({
    where: { id: input.id, ownerId: input.ownerId },
  });
  if (!existing) {
    throw new DocumentError("Document not found", 404);
  }

  const filename = input.filename ?? existing.filename;
  const prepared = prepareHtml({
    html: input.html,
    filename,
    contentType: input.contentType,
  });

  return appendVersion(
    existing,
    {
      ownerId: input.ownerId,
      html: input.html,
      filename,
      contentType: input.contentType,
      description: input.description,
      visibility: input.visibility,
    },
    prepared,
  );
}

export async function listDocuments(input: { ownerId: string; cursor?: string; limit?: number }) {
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);

  const documents = await prisma.document.findMany({
    where: { ownerId: input.ownerId },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(input.cursor
      ? {
          cursor: { id: input.cursor },
          skip: 1,
        }
      : {}),
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        select: versionMetaSelect,
      },
    },
  });

  const hasMore = documents.length > limit;
  const items = hasMore ? documents.slice(0, limit) : documents;

  return {
    items: items.map((document) => {
      const latest = document.versions[0];
      if (!latest) {
        throw new DocumentError("Document is missing versions", 400);
      }
      return toDocumentDto(document, latest);
    }),
    nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null,
  };
}

export async function getOwnedDocument(input: {
  ownerId: string;
  id: string;
}): Promise<DocumentDetailDto> {
  const document = await prisma.document.findFirst({
    where: { id: input.id, ownerId: input.ownerId },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        select: versionMetaSelect,
      },
    },
  });
  if (!document) {
    throw new DocumentError("Document not found", 404);
  }

  const latest = document.versions[0];
  if (!latest) {
    throw new DocumentError("Document is missing versions", 400);
  }

  return {
    ...toDocumentDto(document, latest),
    versions: document.versions.map((version) => toVersionDto(document.id, version)),
  };
}

export async function updateDocument(input: {
  ownerId: string;
  id: string;
  filename?: string;
  visibility?: "private" | "public";
  description?: string | null;
}) {
  const existing = await prisma.document.findFirst({
    where: { id: input.id, ownerId: input.ownerId },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        select: versionMetaSelect,
      },
    },
  });
  if (!existing) {
    throw new DocumentError("Document not found", 404);
  }

  const document = await prisma.document.update({
    where: { id: input.id },
    data: {
      ...(input.filename !== undefined ? { filename: input.filename } : {}),
      ...(input.visibility !== undefined ? { visibility: toVisibilityEnum(input.visibility) } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
    },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        select: versionMetaSelect,
      },
    },
  });

  const latest = document.versions[0] ?? existing.versions[0];
  if (!latest) {
    throw new DocumentError("Document is missing versions", 400);
  }
  return toDocumentDto(document, latest);
}

export async function deleteDocument(input: { ownerId: string; id: string }) {
  const existing = await prisma.document.findFirst({
    where: { id: input.id, ownerId: input.ownerId },
  });
  if (!existing) {
    throw new DocumentError("Document not found", 404);
  }

  await prisma.document.delete({ where: { id: input.id } });
  return { success: true as const };
}

export async function getPublicDocumentVersion(id: string, versionNumber?: number) {
  const document = await prisma.document.findUnique({
    where: { id },
    select: {
      id: true,
      ownerId: true,
      visibility: true,
      latestVersionNumber: true,
    },
  });
  if (!document) return null;

  const resolvedVersion = versionNumber ?? document.latestVersionNumber;
  const version = await prisma.documentVersion.findUnique({
    where: {
      documentId_versionNumber: { documentId: id, versionNumber: resolvedVersion },
    },
    select: {
      html: true,
      versionNumber: true,
    },
  });
  if (!version) return null;

  return { document, version };
}
