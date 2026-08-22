import { readFile } from "node:fs/promises";
import path from "node:path";
import { stdin } from "node:process";
import { createInterface } from "node:readline/promises";

import type { ApiClient } from "../api";
import { getClient, type CommandContextOptions } from "../context";
import { CliError, messageOf } from "../errors";
import { ExitCode } from "../exit-codes";
import { MAX_UPLOAD_BYTES, mimeFor } from "../mime";
import { isJsonMode } from "../output-mode";
import { emit, printLine } from "../printer";

export interface UploadOptions extends CommandContextOptions {
  visibility?: "public" | "private";
  name?: string;
}

interface AssetDto {
  id: string;
  filename: string;
  size: number;
  visibility: string;
  url: string;
  markdown: string;
}

interface AssetList {
  items: AssetDto[];
  nextCursor: string | null;
}

async function readUpload(file: string): Promise<{ bytes: Buffer; filename: string }> {
  let bytes: Buffer;
  try {
    bytes = await readFile(file);
  } catch (cause) {
    throw new CliError(`Cannot read ${file}: ${messageOf(cause)}`, ExitCode.USAGE);
  }

  if (bytes.byteLength === 0) {
    throw new CliError(`${file} is empty; refusing to upload.`, ExitCode.API);
  }
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    throw new CliError(
      `${file} is ${bytes.byteLength} bytes; over the ${MAX_UPLOAD_BYTES}-byte limit.`,
      ExitCode.API,
    );
  }
  return { bytes, filename: path.basename(file) };
}

async function confirm(question: string): Promise<boolean> {
  if (!stdin.isTTY) return false;
  const rl = createInterface({ input: stdin, output: process.stdout });
  const answer = await rl.question(`${question} [y/N] `);
  rl.close();
  return answer.trim().toLowerCase() === "y";
}

export async function pushAsset(
  client: ApiClient,
  file: string,
  options: UploadOptions,
): Promise<AssetDto> {
  const mime = mimeFor(file);
  if (!mime) {
    throw new CliError(
      `Unsupported file type for ${file}. Allowed extensions: png, jpg, jpeg, gif, webp, webm, mp4, pdf.`,
      ExitCode.USAGE,
    );
  }

  const { bytes, filename } = await readUpload(file);
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(bytes)], { type: mime }), options.name ?? filename);
  if (options.visibility) {
    form.append("visibility", options.visibility);
  }

  const response = await client.request<AssetDto>("/api/assets", { method: "POST", body: form });
  return response.body;
}

export async function assetsPushAction(files: string[], options: UploadOptions): Promise<void> {
  if (options.name && files.length > 1) {
    throw new CliError("--name applies to a single file only.", ExitCode.USAGE);
  }

  const client = await getClient(options);
  const results: AssetDto[] = [];
  const verbose = !isJsonMode();
  for (const file of files) {
    const asset = await pushAsset(client, file, options);
    results.push(asset);
    if (verbose) {
      printLine(`${file} → ${asset.url}`);
      printLine(asset.markdown);
    }
  }
  emit({ assets: results });
}

export async function assetsListAction(
  options: CommandContextOptions & { limit?: number; cursor?: string },
): Promise<void> {
  const client = await getClient(options);
  const params = new URLSearchParams();
  if (options.limit !== undefined) params.set("limit", String(options.limit));
  if (options.cursor !== undefined) params.set("cursor", options.cursor);
  const query = params.size > 0 ? `?${params.toString()}` : "";

  const response = await client.request<AssetList>(`/api/assets${query}`);
  emit(response.body);

  if (!isJsonMode()) {
    for (const asset of response.body.items) {
      printLine(`${asset.id}  ${asset.visibility.padEnd(7)}  ${asset.url}`);
    }
  }
}

export async function assetsRemoveAction(
  ids: string[],
  options: CommandContextOptions & { force?: boolean },
): Promise<void> {
  if (!options.force && !(await confirm(`Delete ${ids.length} asset(s)?`))) {
    throw new CliError("Aborted. Pass -f to delete without confirmation.", ExitCode.USAGE);
  }

  const client = await getClient(options);
  for (const id of ids) {
    await client.request(`/api/assets/${id}`, { method: "DELETE" });
    printLine(`Deleted asset ${id}.`);
  }
  emit({ deleted: ids });
}
