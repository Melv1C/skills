import { chmod, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

export const DEFAULT_BASE_URL = "https://api.skills.melvyn.be";

export type TokenSource = "flag" | "env" | "file";

export interface ResolvedToken {
  token: string;
  source: TokenSource;
}

export function configDir(): string {
  const xdg = process.env.XDG_CONFIG_HOME;
  if (xdg && xdg.length > 0) return path.join(xdg, "melv1c-skills");
  return path.join(process.env.HOME ?? homedir(), ".config", "melv1c-skills");
}

export function tokenPath(): string {
  return path.join(configDir(), "token");
}

export function resolveBaseUrl(flagBaseUrl?: string): string {
  return flagBaseUrl ?? process.env.SKILLS_API_BASE ?? DEFAULT_BASE_URL;
}

export async function readStoredToken(): Promise<string | null> {
  try {
    const text = await readFile(tokenPath(), "utf8");
    const token = text.trim();
    return token.length > 0 ? token : null;
  } catch {
    return null;
  }
}

export function resolveToken(flagToken?: string): ResolvedToken | null {
  if (flagToken && flagToken.trim().length > 0) {
    return { token: flagToken.trim(), source: "flag" };
  }

  const env = process.env.SKILLS_API_TOKEN;
  if (env && env.trim().length > 0) {
    return { token: env.trim(), source: "env" };
  }

  return null;
}

export async function resolveTokenWithFile(flagToken?: string): Promise<ResolvedToken> {
  const immediate = resolveToken(flagToken);
  if (immediate) return immediate;

  const stored = await readStoredToken();
  if (stored) return { token: stored, source: "file" };

  throw new Error("not authenticated");
}

export async function storeToken(token: string): Promise<string> {
  const dir = configDir();
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await chmod(dir, 0o700).catch(() => {});
  const file = tokenPath();
  await writeFile(file, `${token}\n`, { mode: 0o600 });
  await chmod(file, 0o600);
  return file;
}

export async function clearToken(): Promise<boolean> {
  try {
    await unlink(tokenPath());
    return true;
  } catch {
    return false;
  }
}

export function maskKey(key: string): string {
  if (key.length <= 8) return "***";
  return `${key.slice(0, 6)}…${key.slice(-4)}`;
}
