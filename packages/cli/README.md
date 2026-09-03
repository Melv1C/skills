# Skills CLI

Small CLI for authenticating with Skills and publishing assets or HTML documents.

## Install

```bash
npm install --global @melv1c/skills-cli
```

## Authenticate

Create an API token in the Skills dashboard, then run:

```text
skills auth login
Paste your token: ...
```

The CLI validates the token before saving it in the user config directory. If a valid token is
already saved, it prints `Already connected`. To replace it:

```bash
skills auth login --force
```

For CI, set `SKILLS_API_TOKEN` instead of storing a token on disk. Check or remove credentials with
`skills auth status` and `skills auth logout`.

## Publish

```bash
skills asset upload ./screenshot.png
skills document publish ./report.html --description "Weekly report"
skills document publish ./report.html --key reports/weekly
```

Both commands print the hosted URL. Add `--json` for scripting. Assets and documents are public by
default because they are intended for hosted HTML and shared reports. Use `--visibility private` when
the result must remain private.
