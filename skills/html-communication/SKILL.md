---
name: html-communication
description: Use when the user wants content communicated as readable HTML (not product-shipping HTML).
---

# HTML Communication

## When to Use

Use this skill when the user wants a plan, spec, write-up, findings, summary, report, comparison, or set of UI mocks presented as readable HTML.

Do not use it for HTML that ships as part of a product.

## Document

Create one self-contained HTML file, capped at 512 KB.

- Write it like a spec, not a landing page: dense, scannable, no hero, decorative chrome, marketing voice, or em dashes.
- Default to true black (`#000`), white primary text, and dark gray only for secondary surfaces or accents.
- Make it mobile-readable with a responsive viewport and no fixed-width layout.
- Use semantic HTML, inline CSS, inline SVG, and HTTPS or data-URL images.
- Use an inline classic script only when interactivity materially helps. Keep scripted pages useful without JavaScript; hosted documents block storage, fetch, workers, frames, forms, and popups, and the serving CSP uses `script-src 'none'` so inline script will not run in a browser.
- In script-free files, give external links `target="_blank"` and `rel="noopener noreferrer"`. If any script exists, omit `target="_blank"`.

Never include external or module scripts, inline event handlers, `javascript:` URLs, forms, frames, embeds, objects, applets, meta refresh, linked stylesheets, secrets, private URLs, or local filesystem paths.

Images and other media must be uploaded with `asset-upload` and embedded via the returned HTTPS `url`. Do not upload HTML through `/api/assets`.

## UI Mocks

When the user asks for variants:

- Render real styled variants, not descriptions.
- Label them 'A', 'B', 'C'... for easy selection.
- Lay them out for direct comparison.
- Keep one file across iterations so its document URL stays stable.

## Auth and base URL

- API base: `https://api.skills.melvyn.be`
- Token: `SKILLS_API_TOKEN`

Send the token as either:

- `Authorization: Bearer $SKILLS_API_TOKEN` (keys are prefixed `av_`), or
- `x-api-key: $SKILLS_API_TOKEN`

If the env var is missing or empty, stop and ask the user to set it. Do not invent tokens or fall back to session cookies.

## Publish

Upload is required, including in Auto mode. Do not ask for separate permission or stop at the local file.

For interactive local work, prefer the Skills CLI when it is installed:

```bash
skills auth login
skills document publish /absolute/path/plan.html --description "Short label for the dashboard"
```

Use `--key /absolute/path/plan.html` when re-publishing the same local document should append a
version at the same URL. The CLI uses its saved token or `SKILLS_API_TOKEN`. For agent runs where
the token is already available in the environment, curl remains the direct fallback below.

1. Write the HTML file locally to a stable absolute path.
2. Require `SKILLS_API_TOKEN`.
3. Upload with curl. Use the same absolute path as `clientKey` so re-uploads keep the URL:

```bash
curl -sS -X POST "https://api.skills.melvyn.be/api/documents" \
  -H "Authorization: Bearer $SKILLS_API_TOKEN" \
  -F "file=@/absolute/path/plan.html;type=text/html" \
  -F "clientKey=/absolute/path/plan.html" \
  -F "description=Short label for the dashboard"
```

4. Require HTTP 200 or 201 and a `url` field. Do not claim the file is hosted before that.
5. Report the local path and hosted `url`.

To update an existing URL, re-upload using the same absolute path and `clientKey`.

Use `forceNew=true` only when the user explicitly wants a new draft:

```bash
curl -sS -X POST "https://api.skills.melvyn.be/api/documents" \
  -H "Authorization: Bearer $SKILLS_API_TOKEN" \
  -F "file=@/absolute/path/plan.html;type=text/html" \
  -F "clientKey=/absolute/path/plan.html" \
  -F "forceNew=true"
```

If validation fails (400 with `errors[]`), fix the markup and retry. Do not strip requested content if it is valid under the rules above.

On 401, ask the user to set `SKILLS_API_TOKEN`. On 413, trim the document; do not retry the same bytes. On 500, report `x-request-id` and the body.

Never open a browser or claim the document is hosted before the upload succeeds.

Do not verify in a browser unless the user asks.
