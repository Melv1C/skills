---
name: html-document-read
description: Use when the user provides a hosted HTML document URL from the skills API (api.skills.melvyn.be/d/...).
---

# HTML Document Read

Fetch the uploaded HTML with the shell. Do not use web search or a browser.

## Our documents

URLs look like `https://api.skills.melvyn.be/d/:id` with optional `/raw` and optional `/v/:n`.

1. Remove a trailing slash, then append `/raw` unless the URL already ends in `/raw`.
2. Run `curl --fail --silent --show-error --location --max-time 30 --output /tmp/document.html '<raw-url>'`.
3. Read `/tmp/document.html` and continue the user's request from its contents.

## Leftover Postplan URLs

If the host is `postplan.dev` or `*.postplan.dev`, keep the same steps (strip slash, append `/raw` unless present). Write to `/tmp/document.html`.

If `curl` fails, report its actual status or network error. Do not substitute search results.
