import { chmod, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export type AuthStore = {
  version: 1;
  token: string;
};

export function authFilePath(): string {
  return process.env.SKILLS_AUTH_FILE ?? join(homedir(), ".config", "agent-tool", "auth.json");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAuthStore(value: unknown): value is AuthStore {
  return (
    isRecord(value) &&
    value.version === 1 &&
    typeof value.token === "string" &&
    value.token.trim().length > 0
  );
}

export async function readStoredToken(filePath = authFilePath()): Promise<string | null> {
  try {
    const value: unknown = JSON.parse(await readFile(filePath, "utf8"));
    return isAuthStore(value) ? value.token : null;
  } catch {
    return null;
  }
}

export async function writeStoredToken(token: string, filePath = authFilePath()): Promise<void> {
  const normalized = token.trim();
  if (!normalized) throw new Error("Token cannot be empty");

  const directory = dirname(filePath);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await chmod(directory, 0o700);
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  const contents = `${JSON.stringify({ version: 1, token: normalized })}\n`;

  await writeFile(temporaryPath, contents, { encoding: "utf8", mode: 0o600 });
  await chmod(temporaryPath, 0o600);
  await rename(temporaryPath, filePath);
  await chmod(filePath, 0o600);
}

export async function removeStoredToken(filePath = authFilePath()): Promise<void> {
  try {
    await unlink(filePath);
  } catch (error: unknown) {
    if (isRecord(error) && error.code === "ENOENT") return;
    throw error;
  }
}
