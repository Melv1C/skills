/** @typedef { { name: string; newVersion: string; type: string } } Release */

/**
 * Custom version commit message for Changesets (`commit` in `.changeset/config.json`).
 *
 * Version bump commits include `[skip staging]` so the staging workflow skips docker/deploy
 * while tag pushes from the same commit still trigger production deployments. Avoid `[skip ci]`
 * here — it cancels all workflows for the commit, including production tag deploys.
 *
 * @param { { releases: Release[] } } releasePlan
 */
export async function getVersionMessage(releasePlan) {
  const publishable = releasePlan.releases.filter((r) => r.type !== "none");
  if (publishable.length === 0) {
    return "release: (no versioned packages) [skip staging]";
  }

  const parts = publishable
    .map((r) => `${r.name}@${r.newVersion}`)
    .sort((a, b) => a.localeCompare(b));
  return `release: ${parts.join(", ")} [skip staging]`;
}
