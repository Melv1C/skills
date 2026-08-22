import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";

import { ApiClient } from "../api";
import {
  clearToken,
  maskKey,
  readStoredToken,
  resolveBaseUrl,
  resolveTokenWithFile,
  storeToken,
  tokenPath,
} from "../auth";
import { CliError } from "../errors";
import { ExitCode } from "../exit-codes";
import { isJsonMode } from "../output-mode";
import { emit, printErrorLine, printLine } from "../printer";

async function promptForKey(): Promise<string> {
  if (!stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const chunk of stdin) {
      chunks.push(chunk as Buffer);
    }
    const key = Buffer.concat(chunks).toString("utf8").trim();
    if (key.length === 0) {
      throw new CliError("No API key received on stdin.", ExitCode.USAGE);
    }
    return key;
  }

  const rl = createInterface({ input: stdin, output: stdout });
  const answer = await rl.question("Paste your av_ API key: ");
  rl.close();
  const key = answer.trim();
  if (key.length === 0) {
    throw new CliError("No key provided.", ExitCode.USAGE);
  }
  return key;
}

export async function loginAction(options: {
  token?: string;
  baseUrl?: string;
  rotate?: boolean;
}): Promise<void> {
  let key: string;
  if (options.token) {
    printErrorLine("warning: --token values can land in shell history");
    key = options.token.trim();
  } else {
    key = await promptForKey();
  }

  if (!key.startsWith("av_")) {
    throw new CliError("API keys are prefixed av_. Check the value and try again.", ExitCode.USAGE);
  }

  const client = new ApiClient(resolveBaseUrl(options.baseUrl), key);
  try {
    await client.request("/api/tokens");
  } catch (error) {
    if (error instanceof CliError && error.exitCode === ExitCode.AUTH) {
      throw new CliError("Key rejected by the API. Nothing was stored.", ExitCode.AUTH);
    }
    throw error;
  }

  if (options.rotate && (await readStoredToken()) === null) {
    printLine("note: no previously stored key; storing a new one.");
  }

  const file = await storeToken(key);
  printLine(`Authenticated as ${maskKey(key)}. Key stored at ${file}.`);
}

export async function logoutAction(): Promise<void> {
  const removed = await clearToken();
  printLine(removed ? `Removed ${tokenPath()}.` : "No stored key found. Nothing to do.");
}

export async function whoamiAction(options: { baseUrl?: string }): Promise<void> {
  const baseUrl = resolveBaseUrl(options.baseUrl);
  const resolved = await resolveTokenWithFile().catch(() => null);

  if (!resolved) {
    throw new CliError(
      "Not authenticated. Set SKILLS_API_TOKEN or run `melv1c-skills auth login`.",
      ExitCode.AUTH,
    );
  }

  const client = new ApiClient(baseUrl, resolved.token);
  try {
    await client.request("/api/tokens");
  } catch (error) {
    if (error instanceof CliError && error.exitCode === ExitCode.AUTH) {
      throw new CliError(
        "Stored credentials are invalid or expired. Run `melv1c-skills auth login --rotate`.",
        ExitCode.AUTH,
      );
    }
    throw error;
  }

  emit({
    baseUrl,
    source: resolved.source,
    key: maskKey(resolved.token),
    valid: true,
  });

  if (!isJsonMode()) {
    printLine(`${resolved.source}: ${maskKey(resolved.token)} @ ${baseUrl}`);
  }
}
