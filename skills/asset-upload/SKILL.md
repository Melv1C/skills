---
name: asset-upload
description: Use when you need to attach media to an MR/PR description, HTML document, review report, or any write-up that must link hosted files instead of local paths. Or when the user asks to upload a file.
---

# Asset Upload

## When to Use

Use this skill when a local file (screenshot, recording, image, PDF, log dump, etc.) must appear in something others can open: MR/PR descriptions, HTML artifacts, review reports, comments. Or when the user asks to upload a file.

Never paste `file://` paths or rely on chat-only image attachments for durable
links. Upload first, then embed the returned URL.

HTML plans, specs, reviews, and mocks go through `/api/documents`
(html-communication), not `/api/assets`. Assets remain media those HTML files
embed.

## Auth and base URL

- API base: `https://api.skills.melvyn.be`
- Token: `SKILLS_API_TOKEN`

Send the token as either:

- `Authorization: Bearer $SKILLS_API_TOKEN` (keys are prefixed `av_`), or
- `x-api-key: $SKILLS_API_TOKEN`

If the env var is missing or empty, stop and ask the user to set it. Do not
invent tokens or fall back to session cookies.

## Upload

`POST /api/assets` with multipart form fields:

| Field        | Required | Notes                                      |
| ------------ | -------- | ------------------------------------------ |
| `file`       | yes      | The binary (`@path` with curl)             |
| `visibility` | no       | `public` (default for embeds) or `private` |
| `filename`   | no       | Override display name                      |

Default max size: 50 MiB.

### Curl

```bash
curl -sS -X POST "https://api.skills.melvyn.be/api/assets" \
  -H "Authorization: Bearer $SKILLS_API_TOKEN" \
  -F "file=@/path/to/screenshot.png;type=image/png" \
  -F "visibility=public" \
  -F "filename=screenshot.png"
```

Set `type=` to the real MIME type when known (`image/png`, `image/jpeg`,
`video/mp4`, `video/webm`, `application/pdf`, …).

### Success (201)

Use these response fields:

- `url` — stable public path (`…/a/<id>`). Prefer this in HTML `src` / `href`.
- `markdown` — ready-made `![name](url)` for images, or `[name](url)` otherwise.
  Prefer this in MR/PR markdown bodies.

Example:

```json
{
  "id": "01KZV…",
  "url": "https://api.skills.melvyn.be/a/01KZV…",
  "markdown": "![screenshot.png](https://api.skills.melvyn.be/a/01KZV…)",
  "visibility": "public"
}
```

Do not claim the file is hosted until this returns `201` with `url`.

### Visibility

- **public** — anyone with the URL can fetch `/a/:id` (302 to a short-lived
  signed object URL). Required for MR descriptions, hosted HTML documents, and anything
  shared without the API key.
- **private** — fetch requires the same API key; do not use for embeds others
  must see.

## Embed

**Markdown (MR/PR):** paste `markdown` as-is, or write your own link using `url`.

**HTML:** use `url` only (HTTPS). Example: `<img src="https://api.skills.melvyn.be/a/…" alt="…">`.
Follow `html-communication` rules when the destination is a hosted HTML document.

## Failures

| Status | Meaning                         | Action                                      |
| ------ | ------------------------------- | ------------------------------------------- |
| 401    | Missing/invalid token           | Check env var; ask user to refresh the key  |
| 400    | Missing `file` / bad visibility | Fix the multipart fields and retry          |
| 413    | Over max upload size            | Compress/split; do not retry the same bytes |
| 500    | Storage/server fault            | Report `x-request-id` and the error body    |

## Optional follow-ups

```bash
# List own assets
curl -sS -H "Authorization: Bearer $SKILLS_API_TOKEN" \
  "https://api.skills.melvyn.be/api/assets"

# Delete
curl -sS -X DELETE -H "Authorization: Bearer $SKILLS_API_TOKEN" \
  "https://api.skills.melvyn.be/api/assets/<id>"
```
