import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { configDir, maskKey, readStoredToken, resolveTokenWithFile } from "./auth";

let scratch: string;
const savedEnv: Record<string, string | undefined> = {
  XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME,
  HOME: process.env.HOME,
  SKILLS_API_TOKEN: process.env.SKILLS_API_TOKEN,
};

function useScratchHome(): void {
  scratch = mkdtempSync(path.join(tmpdir(), "melv1c-skills-test-"));
  process.env.XDG_CONFIG_HOME = scratch;
  delete process.env.SKILLS_API_TOKEN;
}

afterEach(() => {
  if (scratch) rmSync(scratch, { recursive: true, force: true });
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("token resolution order", () => {
  test("flag beats env beats file", async () => {
    useScratchHome();
    const dir = configDir();
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "token"), "av_filekey1234567\n", { mode: 0o600 });

    const fromFile = await resolveTokenWithFile();
    expect(fromFile).toEqual({ token: "av_filekey1234567", source: "file" });

    process.env.SKILLS_API_TOKEN = "av_envkey12345678";
    const fromEnv = await resolveTokenWithFile();
    expect(fromEnv.source).toBe("env");

    const fromFlag = await resolveTokenWithFile("av_flagkey123456");
    expect(fromFlag.source).toBe("flag");
    expect(fromFlag.token).toBe("av_flagkey123456");
  });

  test("no sources means not authenticated", async () => {
    useScratchHome();
    expect(await readStoredToken()).toBeNull();
    expect(await resolveTokenWithFile().catch(() => null)).toBeNull();
  });

  test("maskKey never reveals the full key", () => {
    const key = "av_abcdefghijklmnop";
    const masked = maskKey(key);
    expect(masked.length).toBeLessThan(key.length);
    expect(masked).not.toBe(key);
  });
});
