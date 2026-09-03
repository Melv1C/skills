# Agent Tools CLI

Small CLI for authenticating with Skills and publishing assets or HTML documents.

## Install

```bash
npm install --global @melv1c/skills-cli
```

## Authenticate

Create an API token in the Skills dashboard, then run:

```text
agent-tools auth login
Paste your token: ...
```

The CLI validates the token before saving it in the user config directory. If a valid token is
already saved, it prints `Already connected`. To replace it:

```bash
agent-tools auth login --force
```

For CI, set `SKILLS_API_TOKEN` instead of storing a token on disk. Check or remove credentials with
`agent-tools auth status` and `agent-tools auth logout`.

The CLI requires HTTPS for API requests. For a local loopback server only, pass
`--allow-insecure-http` with the command.

## Publish

```bash
agent-tools asset upload ./screenshot.png
agent-tools document publish ./report.html --description "Weekly report"
agent-tools document publish ./report.html --key reports/weekly
```

Both commands print the hosted URL. Add `--json` for scripting. Assets and documents are public by
default because they are intended for hosted HTML and shared reports. Use `--visibility private` when
the result must remain private.

## Release

The repository publishes this package from GitHub Actions when a Changesets release tag such as
`@melv1c/skills-cli@0.2.0` is pushed. Maintainers need an `NPM_TOKEN` repository secret with
permission to publish the `@melv1c` scope. The release flow builds and tests the CLI before npm
publishes it.
