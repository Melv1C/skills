#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import { stdin, stdout } from "node:process";

import { Command } from "commander";

import { authFilePath, readStoredToken, removeStoredToken, writeStoredToken } from "./auth-store";
import { ApiError, requestJson } from "./client";

const DEFAULT_BASE_URL = "https://api.skills.melvyn.be";
type Visibility = "public" | "private";
type GlobalOptions = { baseUrl: string };
type JsonOptions = { json: boolean };
type AuthSource = { kind: "environment" | "stored"; token: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringField(value: unknown, field: string): string {
  if (!isRecord(value) || typeof value[field] !== "string") {
    throw new Error(`The API returned an invalid response: missing ${field}`);
  }
  return value[field];
}

function baseUrl(options: GlobalOptions): string {
  const value = options.baseUrl.trim();
  if (!/^https?:\/\//i.test(value)) {
    throw new Error("Base URL must start with http:// or https://");
  }
  return value;
}

async function authSource(): Promise<AuthSource> {
  const storedToken = await readStoredToken();
  if (storedToken) return { kind: "stored", token: storedToken };

  const environmentToken = process.env.SKILLS_API_TOKEN?.trim();
  if (environmentToken) return { kind: "environment", token: environmentToken };

  throw new Error("Not authenticated. Run `skills auth login` or set SKILLS_API_TOKEN.");
}

async function checkToken(options: GlobalOptions, token: string): Promise<void> {
  await requestJson({
    baseUrl: baseUrl(options),
    token,
    path: "/api/assets?limit=1",
  });
}

async function promptHidden(label: string): Promise<string> {
  if (!stdin.isTTY || !stdout.isTTY || typeof stdin.setRawMode !== "function") {
    throw new Error("Login needs an interactive terminal. Set SKILLS_API_TOKEN for CI.");
  }

  stdout.write(label);
  stdin.setRawMode(true);
  stdin.resume();

  return new Promise((resolve, reject) => {
    let value = "";

    const cleanup = () => {
      stdin.setRawMode?.(false);
      stdin.pause();
      stdin.off("data", onData);
    };

    const onData = (chunk: Buffer | string) => {
      const input = String(chunk);
      if (input === "\u0003") {
        cleanup();
        stdout.write("\n");
        reject(new Error("Login cancelled"));
      } else if (input === "\r" || input === "\n") {
        cleanup();
        stdout.write("\n");
        resolve(value.trim());
      } else if (input === "\u007f") {
        value = value.slice(0, -1);
      } else {
        value += input;
      }
    };

    stdin.on("data", onData);
  });
}

async function login(options: GlobalOptions, force: boolean): Promise<void> {
  const storedToken = await readStoredToken();
  if (storedToken && !force) {
    try {
      await checkToken(options, storedToken);
      stdout.write("Already connected\n");
      return;
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) {
        throw new Error("Stored token is invalid. Run `skills auth login --force`.");
      }
      throw error;
    }
  }

  const token = await promptHidden("Paste your token: ");
  if (!token) throw new Error("Token cannot be empty");
  await checkToken(options, token);
  await writeStoredToken(token);
  stdout.write(`Connected. Token saved to ${authFilePath()}\n`);
}

async function status(options: GlobalOptions): Promise<void> {
  const source = await authSource();
  await checkToken(options, source.token);
  stdout.write(`Connected (${source.kind} token)\n`);
}

async function logout(): Promise<void> {
  const storedToken = await readStoredToken();
  await removeStoredToken();
  if (storedToken) {
    stdout.write(
      process.env.SKILLS_API_TOKEN
        ? "Stored token removed. SKILLS_API_TOKEN is still active.\n"
        : "Logged out\n",
    );
  } else {
    stdout.write("No stored token\n");
  }
}

function mimeType(filePath: string): string {
  const types: Record<string, string> = {
    ".avif": "image/avif",
    ".gif": "image/gif",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".webm": "video/webm",
    ".webp": "image/webp",
    ".mp4": "video/mp4",
  };
  return types[extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

async function formFor(
  filePath: string,
  fields: Record<string, string>,
  contentType = mimeType(filePath),
): Promise<FormData> {
  const bytes = await readFile(filePath);
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: contentType }), basename(filePath));
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  return form;
}

function printResult(payload: unknown, options: JsonOptions, summary: string): void {
  stdout.write(options.json ? `${JSON.stringify(payload, null, 2)}\n` : `${summary}\n`);
}

async function uploadAsset(
  options: GlobalOptions,
  filePath: string,
  commandOptions: JsonOptions & { filename?: string; visibility: Visibility },
): Promise<void> {
  const source = await authSource();
  const fields: Record<string, string> = { visibility: commandOptions.visibility };
  if (commandOptions.filename) fields.filename = commandOptions.filename;
  const payload = await requestJson({
    baseUrl: baseUrl(options),
    token: source.token,
    path: "/api/assets",
    init: { method: "POST", body: await formFor(filePath, fields) },
  });
  const url = stringField(payload, "url");
  const markdown =
    isRecord(payload) && typeof payload.markdown === "string" ? payload.markdown : url;
  printResult(payload, commandOptions, `Uploaded ${basename(filePath)}\nURL: ${url}\n${markdown}`);
}

async function publishDocument(
  options: GlobalOptions,
  filePath: string,
  commandOptions: JsonOptions & {
    description?: string;
    forceNew: boolean;
    key?: string;
    visibility: Visibility;
  },
): Promise<void> {
  const source = await authSource();
  const fields: Record<string, string> = {
    filename: basename(filePath),
    visibility: commandOptions.visibility,
  };
  if (commandOptions.description) fields.description = commandOptions.description;
  if (commandOptions.key) fields.clientKey = commandOptions.key;
  if (commandOptions.forceNew) fields.forceNew = "true";

  const payload = await requestJson({
    baseUrl: baseUrl(options),
    token: source.token,
    path: "/api/documents",
    init: { method: "POST", body: await formFor(filePath, fields, "text/html") },
  });
  const url = stringField(payload, "url");
  const version =
    isRecord(payload) && typeof payload.version === "number" ? ` v${payload.version}` : "";
  printResult(payload, commandOptions, `Published ${basename(filePath)}${version}\nURL: ${url}`);
}

function visibility(value: string): Visibility {
  if (value !== "public" && value !== "private") {
    throw new Error("Visibility must be public or private");
  }
  return value;
}

const program = new Command();
program
  .name("skills")
  .description("Authenticate with and publish files to Skills")
  .option("--base-url <url>", "API base URL", process.env.SKILLS_API_URL ?? DEFAULT_BASE_URL)
  .showHelpAfterError();

const authCommand = program.command("auth").description("Manage CLI authentication");
authCommand
  .command("login")
  .description("Store an API token")
  .option("--force", "Replace the stored token", false)
  .action(async (commandOptions: { force: boolean }) =>
    login(program.opts<GlobalOptions>(), commandOptions.force),
  );
authCommand
  .command("status")
  .alias("check")
  .description("Check the current authentication")
  .action(async () => status(program.opts<GlobalOptions>()));
authCommand.command("logout").description("Remove the stored API token").action(logout);

const assetCommand = program.command("asset").description("Manage uploaded assets");
assetCommand
  .command("upload <file>")
  .description("Upload an asset")
  .option("--visibility <value>", "Asset visibility", "public")
  .option("--filename <name>", "Display filename")
  .option("--json", "Print the API response as JSON", false)
  .action(
    async (
      filePath: string,
      commandOptions: JsonOptions & { filename?: string; visibility: string },
    ) =>
      uploadAsset(program.opts<GlobalOptions>(), filePath, {
        ...commandOptions,
        visibility: visibility(commandOptions.visibility),
      }),
  );

const documentCommand = program.command("document").description("Manage HTML documents");
documentCommand
  .command("publish <file>")
  .description("Publish an HTML document")
  .option("--visibility <value>", "Document visibility", "public")
  .option("--description <text>", "Document description")
  .option("--key <key>", "Stable client key for versioned publishing")
  .option("--force-new", "Create a new document for an existing key", false)
  .option("--json", "Print the API response as JSON", false)
  .action(
    async (
      filePath: string,
      commandOptions: JsonOptions & {
        description?: string;
        forceNew: boolean;
        key?: string;
        visibility: string;
      },
    ) =>
      publishDocument(program.opts<GlobalOptions>(), filePath, {
        ...commandOptions,
        visibility: visibility(commandOptions.visibility),
      }),
  );

try {
  await program.parseAsync();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : "Command failed";
  process.stderr.write(`skills: ${message}\n`);
  if (error instanceof ApiError && error.requestId) {
    process.stderr.write(`Request ID: ${error.requestId}\n`);
  }
  process.exitCode = 1;
}
