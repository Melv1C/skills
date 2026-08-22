import { readFile } from "node:fs/promises";
import path from "node:path";

import type { ApiClient } from "../api";
import { getClient, type CommandContextOptions } from "../context";
import { CliError, messageOf } from "../errors";
import { ExitCode } from "../exit-codes";
import { HTML_MIME, isHtmlPath } from "../mime";
import { isJsonMode } from "../output-mode";
import { emit, printLine } from "../printer";

export interface PublishOptions extends CommandContextOptions {
  description?: string;
  newDraft?: boolean;
  visibility?: "public" | "private";
  clientKey?: string;
}

interface DocumentDto {
  id: string;
  filename: string;
  visibility: string;
  url: string;
  versionUrl: string;
  version: number;
}

interface DocumentList {
  items: DocumentDto[];
  nextCursor: string | null;
}

export function resolveClientKey(file: string): string {
  return path.resolve(file);
}

async function readHtml(file: string): Promise<Buffer> {
  if (!isHtmlPath(file)) {
    throw new CliError(
      `${file} is not an HTML file (.html/.htm). Use assets push instead.`,
      ExitCode.USAGE,
    );
  }

  try {
    return await readFile(file);
  } catch (cause) {
    throw new CliError(`Cannot read ${file}: ${messageOf(cause)}`, ExitCode.USAGE);
  }
}

export async function publishDocument(
  client: ApiClient,
  file: string,
  options: PublishOptions,
): Promise<{ document: DocumentDto; created: boolean }> {
  const bytes = await readHtml(file);
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(bytes)], { type: HTML_MIME }), path.basename(file));
  form.append("clientKey", options.clientKey ?? resolveClientKey(file));
  if (options.description) {
    form.append("description", options.description);
  }
  if (options.newDraft) {
    form.append("forceNew", "true");
  }
  if (options.visibility) {
    form.append("visibility", options.visibility);
  }

  const response = await client.request<DocumentDto>("/api/documents", {
    method: "POST",
    body: form,
  });
  return { document: response.body, created: response.status === 201 };
}

export async function docsPublishAction(files: string[], options: PublishOptions): Promise<void> {
  const client = await getClient(options);
  const published: DocumentDto[] = [];
  const createdFlags: boolean[] = [];
  const verbose = !isJsonMode();
  for (const file of files) {
    const { document, created } = await publishDocument(client, file, options);
    published.push(document);
    createdFlags.push(created);
    if (verbose) {
      printLine(
        `${file} → ${document.url} (${created ? "created" : "updated"}, v${document.version})`,
      );
    }
  }
  emit({ documents: published });
}

export async function docsListAction(
  options: CommandContextOptions & { limit?: number; cursor?: string },
): Promise<void> {
  const client = await getClient(options);
  const params = new URLSearchParams();
  if (options.limit !== undefined) params.set("limit", String(options.limit));
  if (options.cursor !== undefined) params.set("cursor", options.cursor);
  const query = params.size > 0 ? `?${params.toString()}` : "";

  const response = await client.request<DocumentList>(`/api/documents${query}`);
  emit(response.body);

  if (!isJsonMode()) {
    for (const document of response.body.items) {
      printLine(`${document.id}  ${document.visibility.padEnd(7)}  ${document.url}`);
    }
  }
}

export async function docsRemoveAction(
  id: string,
  options: CommandContextOptions & { force?: boolean },
): Promise<void> {
  const client = await getClient(options);
  await client.request(`/api/documents/${id}`, { method: "DELETE" });
  printLine(`Deleted document ${id}.`);
  emit({ deleted: [id] });
}
