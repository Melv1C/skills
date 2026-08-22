import { describe, expect, test } from "bun:test";

import packageJson from "../package.json";

describe("package identity guard", () => {
  test("name is @melv1c/skills", () => {
    expect(packageJson.name).toBe("@melv1c/skills");
  });

  test("bin map installs exactly melv1c-skills, never the skills alias", () => {
    expect(packageJson.bin).toEqual({
      "melv1c-skills": "./dist/index.js",
    });
  });

  test("publishes publicly via publishConfig regardless of changesets default", () => {
    expect(packageJson.publishConfig?.access).toBe("public");
  });
});
