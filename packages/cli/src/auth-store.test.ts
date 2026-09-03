import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { readStoredToken, removeStoredToken, writeStoredToken } from "./auth-store";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  );
});

async function temporaryAuthFile(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "skills-cli-"));
  temporaryDirectories.push(directory);
  return join(directory, "auth.json");
}

describe("auth store", () => {
  test("writes and reads a token with restrictive permissions", async () => {
    const filePath = await temporaryAuthFile();

    await writeStoredToken("av_test", filePath);

    expect(await readStoredToken(filePath)).toBe("av_test");
    expect((await stat(dirname(filePath))).mode & 0o777).toBe(0o700);
    expect((await stat(filePath)).mode & 0o777).toBe(0o600);
    expect(await readFile(filePath, "utf8")).not.toContain("password");
  });

  test("removes a stored token", async () => {
    const filePath = await temporaryAuthFile();
    await writeStoredToken("av_test", filePath);

    await removeStoredToken(filePath);

    expect(await readStoredToken(filePath)).toBeNull();
  });

  test("does not hide token removal errors", async () => {
    const directory = await mkdtemp(join(tmpdir(), "skills-cli-"));
    temporaryDirectories.push(directory);

    expect(removeStoredToken(directory)).rejects.toBeDefined();
  });
});
