import { createHash } from "node:crypto";

import type { Visibility } from "@generated/prisma/client";
import { ulid } from "ulid";
import { ENV } from "varlock/env";

import { prisma } from "@/lib/prisma";
import { getStorage } from "@/services/storage";

export class AssetError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 403 | 404 | 413 = 400,
  ) {
    super(message);
    this.name = "AssetError";
  }
}

export type AssetDto = {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  sha256: string;
  visibility: "private" | "public";
  url: string;
  markdown: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
};

function toVisibilityDto(visibility: Visibility): "private" | "public" {
  return visibility === "PUBLIC" ? "public" : "private";
}

function toVisibilityEnum(visibility: "private" | "public"): Visibility {
  return visibility === "public" ? "PUBLIC" : "PRIVATE";
}

function publicUrl(id: string): string {
  return `${ENV.PUBLIC_ASSET_BASE_URL.replace(/\/$/, "")}/a/${id}`;
}

function markdownFor(filename: string, url: string, contentType: string): string {
  if (contentType.startsWith("image/")) {
    return `![${filename}](${url})`;
  }
  return `[${filename}](${url})`;
}

export function toAssetDto(asset: {
  id: string;
  filename: string;
  contentType: string;
  size: bigint;
  sha256: string;
  visibility: Visibility;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;
}): AssetDto {
  const url = publicUrl(asset.id);
  return {
    id: asset.id,
    filename: asset.filename,
    contentType: asset.contentType,
    size: Number(asset.size),
    sha256: asset.sha256,
    visibility: toVisibilityDto(asset.visibility),
    url,
    markdown: markdownFor(asset.filename, url, asset.contentType),
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
    expiresAt: asset.expiresAt?.toISOString() ?? null,
  };
}

export async function createAsset(input: {
  ownerId: string;
  filename: string;
  contentType: string;
  bytes: Buffer;
  visibility?: "private" | "public";
}) {
  const maxBytes = ENV.ASSET_MAX_UPLOAD_BYTES ?? 50 * 1024 * 1024;
  if (input.bytes.byteLength > maxBytes) {
    throw new AssetError(`File exceeds max upload size of ${maxBytes} bytes`, 413);
  }
  if (input.bytes.byteLength === 0) {
    throw new AssetError("Empty file uploads are not allowed", 400);
  }

  const id = ulid();
  const storageKey = `${input.ownerId}/${id}`;
  const sha256 = createHash("sha256").update(input.bytes).digest("hex");
  const visibility = toVisibilityEnum(input.visibility ?? "private");

  const storage = getStorage();
  await storage.put(storageKey, input.bytes, {
    contentType: input.contentType,
    contentLength: input.bytes.byteLength,
  });

  try {
    const asset = await prisma.asset.create({
      data: {
        id,
        ownerId: input.ownerId,
        filename: input.filename,
        contentType: input.contentType,
        size: BigInt(input.bytes.byteLength),
        sha256,
        storageKey,
        visibility,
      },
    });
    return toAssetDto(asset);
  } catch (error) {
    await storage.delete(storageKey).catch(() => undefined);
    throw error;
  }
}

export async function listAssets(input: {
  ownerId: string;
  cursor?: string;
  limit?: number;
}) {
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);

  const assets = await prisma.asset.findMany({
    where: { ownerId: input.ownerId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(input.cursor
      ? {
          cursor: { id: input.cursor },
          skip: 1,
        }
      : {}),
  });

  const hasMore = assets.length > limit;
  const items = hasMore ? assets.slice(0, limit) : assets;

  return {
    items: items.map(toAssetDto),
    nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null,
  };
}

export async function getOwnedAsset(input: { ownerId: string; id: string }) {
  const asset = await prisma.asset.findFirst({
    where: { id: input.id, ownerId: input.ownerId },
  });
  if (!asset) {
    throw new AssetError("Asset not found", 404);
  }
  return toAssetDto(asset);
}

export async function getAssetRecord(id: string) {
  return prisma.asset.findUnique({ where: { id } });
}

export async function updateAsset(input: {
  ownerId: string;
  id: string;
  filename?: string;
  visibility?: "private" | "public";
}) {
  const existing = await prisma.asset.findFirst({
    where: { id: input.id, ownerId: input.ownerId },
  });
  if (!existing) {
    throw new AssetError("Asset not found", 404);
  }

  const asset = await prisma.asset.update({
    where: { id: input.id },
    data: {
      ...(input.filename !== undefined ? { filename: input.filename } : {}),
      ...(input.visibility !== undefined
        ? { visibility: toVisibilityEnum(input.visibility) }
        : {}),
    },
  });

  return toAssetDto(asset);
}

export async function deleteAsset(input: { ownerId: string; id: string }) {
  const existing = await prisma.asset.findFirst({
    where: { id: input.id, ownerId: input.ownerId },
  });
  if (!existing) {
    throw new AssetError("Asset not found", 404);
  }

  await prisma.asset.delete({ where: { id: input.id } });
  await getStorage().delete(existing.storageKey).catch(() => undefined);
  return { success: true as const };
}
