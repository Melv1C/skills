---
name: html-communication
description: >-
  Create and publish self-contained HTML documents for plans, specs, write-ups,
  findings, summaries, reports, comparisons, or UI mocks. Use when the user
  wants content communicated as readable HTML (not product-shipping HTML).
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
- Use an inline classic script only when interactivity materially helps. Keep scripted pages useful without JavaScript; the sandbox blocks storage, fetch, workers, frames, forms, and popups.
- In script-free files, give external links `target="_blank"` and `rel="noopener noreferrer"`. If any script exists, omit `target="_blank"`.

Never include external or module scripts, inline event handlers, `javascript:` URLs, forms, frames, embeds, objects, applets, meta refresh, linked stylesheets, secrets, private URLs, or local filesystem paths.

## UI Mocks

When the user asks for variants:

- Render real styled variants, not descriptions.
- Label them 'A', 'B', 'C'... for easy selection.
- Lay them out for direct comparison.
- Keep one file across iterations so its Postplan URL stays stable.

## Publish

Theo has given standing permission to upload every artifact created or updated with this skill. Upload is required, including in Auto mode. Do not ask for separate permission or stop at the local file.

1. Write the HTML file locally.
2. Run `npx postplan upload <file path>`.
3. Report the local path and returned Postplan URL.

To update an existing URL, re-upload using the same absolute path.

Use `npx postplan upload <file path> --new` only when a new draft is explicitly wanted.

If validation fails, fix the markup and retry.

If a scripted upload requires authentication, ask the user to run `postplan auth login` and then retry without removing any requested interactivity.

Never open a browser or claim the document is hosted before the upload succeeds.

Do not verify in a browser unless the user asks.
