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

Images and other media must be uploaded with `asset-upload` and embedded via the returned HTTPS `url`.

## UI Mocks

When the user asks for variants:

- Render real styled variants, not descriptions.
- Label them 'A', 'B', 'C'... for easy selection.
- Lay them out for direct comparison.
- Keep one file across iterations so its document URL stays stable.

## Publish

Upload is required, including in Auto mode. Do not ask for separate permission or stop at the local file.

Authenticate once, then publish through the CLI:

```bash
agent-tools auth login
agent-tools document publish /absolute/path/plan.html --description "Short label for the dashboard"
```

Use `--key` when re-publishing should append a version at the same URL. Use `--force-new` only
when a new draft is explicitly requested.

1. Write the HTML file locally to a stable absolute path.
2. Run `agent-tools document publish`.
3. Require a successful CLI response with a hosted `url` before claiming the document is online.
4. Report the local path and hosted `url`.

To read a hosted document, run:

```bash
agent-tools document read https://api.skills.melvyn.be/d/:id
```

If the CLI reports a 401, run `agent-tools auth login --force`. For a 413, trim the document and
retry. For a 500, report the request ID and error shown by the CLI. Never open a browser or claim
the document is hosted before publishing succeeds.
