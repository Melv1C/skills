---
name: asset-upload
description: Upload files to the Skills asset service for hosted HTML documents or write-ups outside GitLab and GitHub. Use when a standalone hosted file URL is needed or the user explicitly requests this service.
---

# Upload a hosted asset

## When to use

Use this skill when a local file must be hosted for an HTML document or a write-up outside GitLab and GitHub, or when the user explicitly requests the Skills asset service. For screenshots and recordings in GitLab merge requests or GitHub pull requests, use `mr-assets`.

Never paste `file://` paths or rely on chat-only image attachments for durable
links. Upload first, then embed the returned URL.

## CLI

Authenticate once, then upload with:

```bash
agent-tools auth login
agent-tools asset upload /path/to/screenshot.png --visibility public
```

The CLI checks the saved token before uploading and prints the hosted `url` and ready-made
`markdown`.

## Upload

Use the CLI flags to control the upload:

```bash
agent-tools asset upload /path/to/file \
  --visibility public \
  --filename display-name.png
```

`--visibility` accepts `public` or `private` and defaults to `public`. `--filename` overrides the
display name. Add `--json` when a script needs the complete response.

Default max size: 50 MiB.

The CLI selects a MIME type from the file extension and uses a binary fallback for unknown types.

### Success

On success, use the CLI output:

- `url` is the stable hosted path (`…/a/<id>`). Prefer this in HTML `src` / `href`.
- `markdown` is ready-made `![name](url)` for images, or `[name](url)` otherwise.
  Use it in Markdown write-ups.

With `--json`, the output includes the complete response. A typical result contains:

```json
{
  "id": "01KZV…",
  "url": "https://api.skills.melvyn.be/a/01KZV…",
  "markdown": "![screenshot.png](https://api.skills.melvyn.be/a/01KZV…)",
  "visibility": "public"
}
```

Do not claim the file is hosted until the command succeeds and returns a `url`.

### Visibility

- **public** lets anyone with the URL fetch the asset. Required for hosted HTML documents and
  anything shared without authentication.
- **private** requires readers to have access to the Skills account. Do not use it for embeds
  others must see.

## Embed

**Markdown:** paste the CLI's `markdown` output as-is, or write your own link using `url`.

**HTML:** use `url` only (HTTPS). Example: `<img src="https://api.skills.melvyn.be/a/…" alt="…">`.
Follow `html-communication` rules when the destination is a hosted HTML document.

## Failures

- 401: run `agent-tools auth login --force` and retry.
- 400: correct the file or CLI options and retry.
- 413: compress or split the file. Do not retry the same bytes.
- 500 or a network failure: report the error and request ID shown by the CLI.
